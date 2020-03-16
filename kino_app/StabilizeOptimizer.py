import cvxpy as cvx
import numpy as np
import scipy as sp
import scipy.sparse
from scipy.ndimage.filters import gaussian_filter

# see https://stackoverflow.com/a/19800305/2607517


def csr_zero_rows(csr, rows_to_zero):
    rows, cols = csr.shape
    mask = np.ones((rows,), dtype=np.bool)
    mask[rows_to_zero] = False
    nnz_per_row = np.diff(csr.indptr)

    mask = np.repeat(mask, nnz_per_row)
    nnz_per_row[rows_to_zero] = 0
    csr.data = csr.data[mask]
    csr.indices = csr.indices[mask]
    csr.indptr[1:] = np.cumsum(nnz_per_row)

# 3-point binomial filter, see (Marchand and Marmet 1983) sec. VI


def binomial_3(arr):
    x1 = arr[0]
    for i in range(len(arr)-1):
        arr[i] = 0.5 * (arr[i] + arr[i+1])
    for i in range(1, len(arr)-1):
        arr[i] = 0.5 * (arr[i-1] + arr[i])
    arr[0] = x1



def stabilize_chunk(desiredShot, aspectRatio, noDataFrames, imageSize, fps, crop_factor, apparent_motion, external_boundaries, screen_pos, lambda1=0.002, lambda2=0.0001, zoomSmooth=1.5, lambda3=0.005):
    """From a time sequence of unstabilized frame boxes, compute a stabilized frame.

    All parameters are normalized with respect to frame size and time, so that simultaneaously doubling the imageSize and the desiredShot does not change the solution, and neither does using twice as many frames and doubling the fps.

    The main differences with the paper are:
    - only D, L11 and L13 terms are implemented
    - zoomSmooth was added
    - the shots are optimized over chunks of shot_s*2 = 10s, and the five first seconds are kept. This makes the problem a lot more tractable.

    If a frame in desiredShot goes outside of the original image, it is cropped.

    Reference: Gandhi Vineet, Ronfard Remi, Gleicher Michael
    Multi-Clip Video Editing from a Single Viewpoint
    European Conference on Visual Media Production (CVMP) 2014
    http://imagine.inrialpes.fr/people/vgandhi/GRG_CVMP_2014.pdf

    Keyword arguments:
    desiredShot -- a n x 4 numpy array containing on each line the box as [xmin, ymin, xmax, ymax]
    lambda1 -- see eq. (10) in paper
    lambda2 -- see eq. (10) in paper
    zoomSmooth -- a factor applied on the terms that deal with frame size in the regularization term: raise if the stabilized frame zooms in and out too much
    aspectRatio -- the desired output aspect ration (e.g. 16/9.)
    noDataFrames -- the list of frames that have no desiredShot information - only regularization is used to stabilize these frames
    imageSize -- [xmin, ymin, xmax, ymax] for the original image (typically [0,0,1920,1080] for HD)
    fps -- number of frames per seconds in the video - used for normalization
    """

    #print "noDataFrames:", noDataFrames
    # print(noDataFrames, desiredShot)
    # set to
    desiredShot[noDataFrames, :] = 0.

    imageHeight = float(imageSize[1])
    imageWidth = float(imageSize[0])

    len_w = imageWidth/2
    len_h = imageHeight/2
    if imageHeight* aspectRatio < imageWidth:
        len_w = round((imageHeight*aspectRatio)/2)
    elif imageWidth / aspectRatio < imageHeight:
        len_h = round((imageWidth / aspectRatio)/2)



    # crop the desiredShot to the image window
    # we keep a 1-pixel margin to be sure that constraints can be satisfied
    margin = 1
    low_x1_flags = desiredShot[:, 0] < (0. + margin)
    desiredShot[low_x1_flags, 0] = 0. + margin
    low_x2_flags = desiredShot[:, 2] < (0. + margin)
    desiredShot[low_x2_flags, 2] = 0. + margin
    high_x1_flags = desiredShot[:, 0] > (imageWidth - margin)
    desiredShot[high_x1_flags, 0] = imageWidth - margin
    high_x2_flags = desiredShot[:, 2] > (imageWidth - margin)
    desiredShot[high_x2_flags, 2] = imageWidth - margin
    low_y1_flags = desiredShot[:, 1] < (0. + margin)
    desiredShot[low_y1_flags, 1] = 0. + margin
    low_y2_flags = desiredShot[:, 3] < (0. + margin)
    desiredShot[low_y2_flags, 3] = 0. + margin
    high_y1_flags = desiredShot[:, 1] > (imageHeight - margin)
    desiredShot[high_y1_flags, 1] = imageHeight - margin
    high_y2_flags = desiredShot[:, 3] > (imageHeight - margin)
    desiredShot[high_y2_flags, 3] = imageHeight - margin

    # Make sure that a crop of the given aspectRatio can be contained in imageSize and can contain the desiredShot.
    # This may be an issue eg. when doing a 16/9 or a 4/3 movie from 2K.
    # else, we must cut the desiredshot on both sides.
    for k in range(desiredShot.shape[0]):
        if (desiredShot[k, 2] - desiredShot[k, 0]) > (imageHeight * aspectRatio - margin):
            xcut = (desiredShot[k, 2] - desiredShot[k, 0]) - \
                (imageHeight * aspectRatio - margin)
            desiredShot[k, 2] -= xcut / 2
            desiredShot[k, 0] += xcut / 2
        if (desiredShot[k, 3] - desiredShot[k, 1]) > (imageWidth / aspectRatio - margin):
            ycut = (desiredShot[k, 3] - desiredShot[k, 1]) - \
                (imageWidth / aspectRatio - margin)
            desiredShot[k, 3] -= ycut / 2
            desiredShot[k, 1] += ycut / 2

    # print("desiredShot:", desiredShot)
    # print("noDataFrames:", noDataFrames)

    x_center = (desiredShot[:, 0] + desiredShot[:, 2]) / 2.
    y_center = (desiredShot[:, 1] + desiredShot[:, 3]) / 2.
    # elementwise maximum of each array
    half_height_opt = np.maximum((desiredShot[:, 2] - desiredShot[:, 0]) /
                                 aspectRatio, ((desiredShot[:, 3] - desiredShot[:, 1]))) / 2

    # smooth x_center y_center and half_height_opt using a binomial filter (Marchand and Marmet 1983)
    # eg [1 2 1]/4 or [1 4 6 4 1]/16 (obtained by applying it twice)
    # TODO: ignore noDataFrames when smoothing!
    x_center_residual = x_center
    # binomial_3(x_center_residual)
    # binomial_3(x_center_residual)
    y_center_residual = y_center
    # binomial_3(y_center_residual)
    # binomial_3(y_center_residual)
    half_height_opt_residual = half_height_opt
    # binomial_3(half_height_opt_residual)
    # binomial_3(half_height_opt_residual)

    half_width = (desiredShot[:, 2] - desiredShot[:, 0]) / 2.
    zero_flags = half_width[:] < 0
    half_width[zero_flags] = 0.
    half_height = (desiredShot[:, 3] - desiredShot[:, 1]) / 2.
    zero_flags = half_height[:] < 0
    half_height[zero_flags] = 0.

    # now trick the constraints so that there are no inner inclusion constraints at noDataFrames
    x_center[noDataFrames] = imageWidth / 2.
    half_width[noDataFrames] = -imageWidth / 2.  # negative on purpose
    y_center[noDataFrames] = imageHeight / 2.
    half_height[noDataFrames] = -imageHeight / 2.  # negative on purpose
    half_height_opt[noDataFrames] = imageHeight / 2.

    # print(half_height[noDataFrames], noDataFrames, imageHeight)
    # print(np.isnan(half_height))

    # for i in range(len(desiredShot)):
    #     if (y_center[i] - half_height[i]) < 0 or (y_center[i] + half_height[i]) > imageHeight:
    #         print('indice ',i)

    external_boundaries[noDataFrames] = [0, 0, 0, 0, 0, 0]
    l_tl = []
    for t in external_boundaries[:, 4]:
        if t == 1:
            l_tl.append(0.)
        else:
            l_tl.append(1.)
    tl_inv = np.array(l_tl)
    l_tr = []
    for t in external_boundaries[:, 5]:
        if t == 1:
            l_tr.append(0.)
        else:
            l_tr.append(1.)
    tr_inv = np.array(l_tr)

    tl_inv[noDataFrames] = 0
    tr_inv[noDataFrames] = 0

    assert ((x_center - half_width) >=
            0).all() and ((x_center + half_width) <= imageWidth).all()
    assert ((y_center - half_height) >=
            0).all() and ((y_center + half_height) <= imageHeight).all()

    n = x_center.size
    #print "n:", n

    # We split the problem into chunks of fixed duration.
    # We compute a subsolution for the current chunk and the next chunk, and ensure continuity for the
    # variation (1st derivative) and jerk (3rd derivative) terms.
    # Then we only keep the solution for the current chunk and advance.

    # compute the opposite of noDataFrames
    # normalize with image height
    weightsAll = np.ones(n) / imageHeight
    weightsAll[noDataFrames] = 0.  # do not use residuals on the optimal frame where there's no data
    #print "weightsAll:", weightsAll
    #print "half_height_opt:", half_height_opt

    optimised_xcenter = np.zeros(n)
    optimised_ycenter = np.zeros(n)
    optimised_height = np.zeros(n)

    chunk_s = 5  # size of a chunk in seconds
    chunk_n = int(chunk_s * fps)  # number of samples in a chunk
    full_chunk_n = chunk_n * 2  # number of samples in a subproblem
    # starting index for the chunk (also used to check if it is the first chunk)
    chunk_start = 0

    while chunk_start < n:
        chunk_end = min(n, chunk_start + chunk_n)
        chunk_size = chunk_end - chunk_start
        full_chunk_end = min(n, chunk_start + full_chunk_n)
        full_chunk_size = full_chunk_end - chunk_start
        # print("chunk:", chunk_start, chunk_end, full_chunk_end)

        x = cvx.Variable(full_chunk_size)
        y = cvx.Variable(full_chunk_size)
        # half height (see sec. 4 in the paper)
        h = cvx.Variable(full_chunk_size)

        weights = weightsAll[chunk_start:full_chunk_end]
        x_center_chunk = x_center[chunk_start:full_chunk_end]
        y_center_chunk = y_center[chunk_start:full_chunk_end]
        half_height_chunk = half_height[chunk_start:full_chunk_end]
        half_width_chunk = half_width[chunk_start:full_chunk_end]
        x_center_residual_chunk = x_center[chunk_start:full_chunk_end]
        y_center_residual_chunk = y_center[chunk_start:full_chunk_end]
        half_height_opt_residual_chunk = half_height_opt_residual[chunk_start:full_chunk_end]

        #Vector screen pos
        h_vector = screen_pos[chunk_start:full_chunk_end]

        #M1 term see paper 4.5
        c_x_factor = crop_factor[:, chunk_start:full_chunk_end-1, 0]
        c_y_factor = crop_factor[:, chunk_start:full_chunk_end-1, 1]
        c_h_factor = crop_factor[:, chunk_start:full_chunk_end-1, 2]

        #M2 term see paper 4.5
        b_x_factor = apparent_motion[:, chunk_start:full_chunk_end-1, 0]
        b_y_factor = apparent_motion[:, chunk_start:full_chunk_end-1, 1]
        b_h_factor = apparent_motion[:, chunk_start:full_chunk_end-1, 2]

        #E term [xl, xl1, xr, xr1, tl, tr]
        tl = external_boundaries[chunk_start:full_chunk_end, 4]
        tr = external_boundaries[chunk_start:full_chunk_end, 5]
        inv_tl = tl_inv[chunk_start:full_chunk_end]
        inv_tr = tr_inv[chunk_start:full_chunk_end]
        xl = external_boundaries[chunk_start:full_chunk_end, 0]
        xl1 = external_boundaries[chunk_start:full_chunk_end, 1]
        xr = external_boundaries[chunk_start:full_chunk_end, 2]
        xr1 = external_boundaries[chunk_start:full_chunk_end, 3]


        #assert ((x_center_chunk - half_width_chunk) >= 0).all() and ((x_center_chunk + half_width_chunk) <= imageWidth).all()
        #assert ((y_center_chunk - half_height_chunk) >= 0).all() and ((y_center_chunk + half_height_chunk) <= imageHeight).all()

        # for f in [97, 98, 99, 100]:
        #    print f, weights[f], x_center[f], y_center[f], half_height_opt[f]
        expr = cvx.sum_squares(weights*(x_center_residual_chunk + (0.17*aspectRatio*half_height_opt_residual_chunk*h_vector) - x)) + cvx.sum_squares(weights*(
            y_center_residual_chunk - y)) + cvx.sum_squares(weights*(half_height_opt_residual_chunk - h))
        expr /= n  # normalize by the number of images, get a cost per image
        # end of version 1
        # version 2:
        #dataFrames = np.nonzero(weights)
        # expr = cvx.sum_squares(x_center[dataFrames] - x[dataFrames]) + \
        #       cvx.sum_squares(y_center[dataFrames] - y[dataFrames]) + \
        #       cvx.sum_squares(half_height_opt[dataFrames] - h[dataFrames]) / (zoomSmooth*zoomSmooth)
        # expr /= (imageHeight*imageHeight)*n # normalize by the number of images, get a cost per image
        # end of version 2

        if lambda1 != 0.:
            lambda1Factor = lambda1 * fps / imageHeight
            # print("lambda 1 ",lambda1Factor)
            if n > 1:
                expr += lambda1Factor * \
                    (cvx.tv(x) + cvx.tv(y) + cvx.tv(h) * zoomSmooth)

            # if not the first chunk, add continuity with previous samples
            if chunk_start >= 1:
                expr += lambda1Factor * (cvx.abs(x[0] - optimised_xcenter[chunk_start - 1]) +
                                         cvx.abs(y[0] - optimised_ycenter[chunk_start - 1]) +
                                         cvx.abs(h[0] - optimised_height[chunk_start - 1]) * zoomSmooth)

        if lambda2 != 0.:
            lambda2Factor = lambda2 * fps * fps * fps / imageHeight
            # print("lambda 2 ",lambda2Factor)

            if n > 2:
                expr += lambda2Factor * (cvx.norm(x[3:] - 3*x[2:full_chunk_size-1] + 3*x[1:full_chunk_size-2] - x[0:full_chunk_size-3], 1) +
                                         cvx.norm(y[3:] - 3*y[2:full_chunk_size-1] + 3*y[1:full_chunk_size-2] - y[0:full_chunk_size-3], 1) +
                                         cvx.norm(h[3:] - 3*h[2:full_chunk_size-1] + 3*h[1:full_chunk_size-2] - h[0:full_chunk_size-3], 1) * zoomSmooth)
            # if not the first chunk, add continuity with previous samples
            if chunk_start >= 3 and chunk_size >= 3:
                expr += lambda2Factor * ((cvx.abs(x[0] - 3 * optimised_xcenter[chunk_start - 1] + 3 * optimised_xcenter[chunk_start - 2] - optimised_xcenter[chunk_start - 3]) +
                                          cvx.abs(x[1] - 3 * x[0] + 3 * optimised_xcenter[chunk_start - 1] - optimised_xcenter[chunk_start - 2]) +
                                          cvx.abs(x[2] - 3 * x[1] + 3 * x[0] - optimised_xcenter[chunk_start - 1])) +
                                         (cvx.abs(y[0] - 3 * optimised_ycenter[chunk_start - 1] + 3 * optimised_ycenter[chunk_start - 2] - optimised_ycenter[chunk_start - 3]) +
                                          cvx.abs(y[1] - 3 * y[0] + 3 * optimised_ycenter[chunk_start - 1] - optimised_ycenter[chunk_start - 2]) +
                                          cvx.abs(y[2] - 3 * y[1] + 3 * y[0] - optimised_ycenter[chunk_start - 1])) +
                                         (cvx.abs(h[0] - 3 * optimised_height[chunk_start - 1] + 3 * optimised_height[chunk_start - 2] - optimised_height[chunk_start - 3]) +
                                          cvx.abs(h[1] - 3 * h[0] + 3 * optimised_height[chunk_start - 1] - optimised_height[chunk_start - 2]) +
                                          cvx.abs(h[2] - 3 * h[1] + 3 * h[0] - optimised_height[chunk_start - 1])) * zoomSmooth)

        if lambda3 != 0.:
            lambda3Factor = lambda3 * fps / imageHeight
            lambda2Factor = lambda2 * fps * fps * fps / imageHeight
            lambdaM = 5
            if n > 1:
                m1_term = 0
                for c_x, c_y, c_h in zip(c_x_factor, c_y_factor, c_h_factor):
                    m1_term +=  lambdaM * (cvx.norm(c_x*(x[1:]-x[0:full_chunk_size-1]), 1) +
                                             cvx.norm(c_y*(y[1:]-y[0:full_chunk_size-1]), 1) +
                                             cvx.norm(c_h*(h[1:]-h[0:full_chunk_size-1]), 1) * zoomSmooth)
            if chunk_start >= 1:
                for c in crop_factor:
                    c_x = c[chunk_start-1, 0]
                    c_y = c[chunk_start-1, 1]
                    c_h = c[chunk_start-1, 2]
                    m1_term +=  lambdaM * (cvx.norm(c_x*(x[0]-optimised_xcenter[chunk_start-1]), 1) +
                                             cvx.norm(c_y*(y[0]-optimised_ycenter[chunk_start-1]), 1) +
                                             cvx.norm(c_h*(h[0]-optimised_height[chunk_start-1]), 1) * zoomSmooth)
            if n > 1:
                m2_term = 0
                for b_x, b_y, b_h_g in zip(b_x_factor, b_y_factor, b_h_factor):
                    b_h = gaussian_filter(b_h_g,sigma=5)
                    # print(b_x, b_x.dtype)
                    m2_term +=  lambdaM * (cvx.neg((b_x-(x[1:]-x[0:full_chunk_size-1]))*b_x) +
                                            cvx.neg((b_y-(y[1:]-y[0:full_chunk_size-1]))*b_y) +
                                            cvx.neg((b_h-(h[1:]-h[0:full_chunk_size-1]))*b_h) * zoomSmooth)
            if chunk_start >=1 :
                for b in apparent_motion:
                    b_x = b[chunk_start-1, 0]
                    b_y = b[chunk_start-1, 0]
                    b_h = b[chunk_start-1, 0]
                    m2_term +=  lambdaM * (cvx.neg((b_x-(x[0]-optimised_xcenter[chunk_start-1]))*b_x) +
                                            cvx.neg((b_y-(y[0]-optimised_ycenter[chunk_start-1]))*b_y) +
                                            cvx.neg((b_h-(h[0]-optimised_height[chunk_start-1]))*b_h) * zoomSmooth)
            # expr += m1_term + m2_term

            # if n > 1:
            #     # E out
            #     expr += lambda3Factor * ((inv_tl * cvx.pos(xl1 - x + aspectRatio * h)) +
            #                             (inv_tr * cvx.pos(x + aspectRatio * h - xr1)) )
            #
            #     # E in
            #     expr += lambda3Factor * ((tl * cvx.pos(x - aspectRatio * h - xl)) +
            #                             (tr * cvx.pos(xr - x - aspectRatio * h)) )

        obj = cvx.Minimize(expr)

        #print expr
        # print("H=%d, W=%d lambda1=%f lambda2=%f zoomSmooth=%f fps=%f imageHeight=%f" % (
        #     imageHeight, imageWidth, lambda1, lambda2, zoomSmooth, fps, imageHeight))
        # note that the following constraints are tricked (see above) at noDataFrames, using negative values for half_width and half_height
        constraints = [h >= 0,
                       (x - aspectRatio * h) >= 0,
                       (x - aspectRatio * h) <= (x_center_chunk - half_width_chunk),
                       (x + aspectRatio * h) >= (x_center_chunk + half_width_chunk),
                       (x + aspectRatio * h) <= imageWidth,
                       aspectRatio * h <= len_w,
                       (y - h) >= 0,
                       (y - h) <= (y_center_chunk - half_height_chunk),
                       (y + h) >= (y_center_chunk + half_height_chunk),
                       (y + h) <= imageHeight,
                       h <= len_h]

        prob = cvx.Problem(obj, constraints)
        tryagain = True
        tryreason = ""
        if tryagain or prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
            tryagain = False
            try:
                # ECOS, the default solver, is much better at solving our problems, especially at handling frames where the actor is not visible
                # all tolerances are multiplied by 10
                result = prob.solve(solver=cvx.ECOS, verbose=False, abstol = 1e-6, reltol = 1e-5, abstol_inacc = 5e-4, reltol_inacc = 5e-4, feastol_inacc = 1e-3)
            except cvx.SolverError as e:
                tryagain = True
                tryreason = str(e)

        if tryagain or prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
            tryagain = False
            try:
                result = prob.solve(solver=cvx.SCS, verbose=False, max_iters = 2500, eps = 1e-2)
            except cvx.SolverError as e:
                tryagain = True
                tryreason = str(e)

        if tryagain or prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
            tryagain = False
            try:
                result = prob.solve(solver=cvx.CVXOPT, verbose=False, abstol = 1e-6, reltol = 1e-5, feastol = 1e-6)
            except cvx.SolverError as e:
                tryagain = True
                tryreason = str(e)

        if tryagain or prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
            tryagain = False
            try:
                result = prob.solve(
                    solver=cvx.CVXOPT, kktsolver=cvx.ROBUST_KKTSOLVER, verbose=False, abstol = 1e-6, reltol = 1e-5, feastol = 1e-6)
            except cvx.SolverError as e:
                tryagain = True
                tryreason = str(e)

        if tryagain:
            raise cvx.solverError(tryreason)
        if prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
            raise cvx.SolverError('Problem is infeasible or unbounded')

        #raise ValueError('Yeah!')
        # print("result=", result, "\n")
        if full_chunk_end >= n:
            # last chunk - get the full chunk
            optimised_xcenter[chunk_start:full_chunk_end] = x.value.reshape(
                full_chunk_size)
            optimised_ycenter[chunk_start:full_chunk_end] = y.value.reshape(
                full_chunk_size)
            optimised_height[chunk_start:full_chunk_end] = h.value.reshape(
                full_chunk_size)
            chunk_start = full_chunk_end
        else:
            # only get the chunk and advance
            optimised_xcenter[chunk_start:chunk_end] = x.value[:chunk_size].reshape(
                chunk_size)
            optimised_ycenter[chunk_start:chunk_end] = y.value[:chunk_size].reshape(
                chunk_size)
            optimised_height[chunk_start:chunk_end] = h.value[:chunk_size].reshape(
                chunk_size)
            chunk_start = chunk_end
    return np.vstack([optimised_xcenter - aspectRatio * optimised_height, optimised_ycenter - optimised_height, optimised_xcenter + aspectRatio * optimised_height, optimised_ycenter + optimised_height]).transpose()



def stabilize(desiredShot, aspectRatio, noDataFrames, imageSize, fps, lambda1=0.002, lambda2=0.0001, zoomSmooth=1):
    """From a time sequence of unstabilized frame boxes, compute a stabilized frame.

    All parameters are normalized with respect to frame size and time, so that simultaneaously doubling the imageSize and the desiredShot does not change the solution, and neither does using twice as many frames and doubling the fps.

    The main differences with the paper are:
    - only D, L11 and L13 terms are implemented
    - zoomSmooth was added

    If a frame in desiredShot goes outside of the original image, it is cropped.

    Reference: Gandhi Vineet, Ronfard Remi, Gleicher Michael
    Multi-Clip Video Editing from a Single Viewpoint
    European Conference on Visual Media Production (CVMP) 2014
    http://imagine.inrialpes.fr/people/vgandhi/GRG_CVMP_2014.pdf

    Keyword arguments:
    desiredShot -- a n x 4 numpy array containing on each line the box as [xmin, ymin, xmax, ymax]
    lambda1 -- see eq. (10) in paper
    lambda2 -- see eq. (10) in paper
    zoomSmooth -- a factor applied on the terms that deal with frame size in the regularization term: raise if the stabilized frame zooms in and out too much
    aspectRatio -- the desired output aspect ration (e.g. 16/9.)
    noDataFrames -- the list of frames that have no desiredShot information - only regularization is used to stabilize these frames
    imageSize -- [xmin, ymin, xmax, ymax] for the original image (typically [0,0,1920,1080] for HD)
    fps -- number of frames per seconds in the video - used for normalization
    """

    # print "noDataFrames:", noDataFrames

    # set to
    desiredShot[noDataFrames, :] = 0.

    imageHeight = float(imageSize[1])
    imageWidth = float(imageSize[0])

    # crop the desiredShot to the image window
    # we keep a 1-pixel margin to be sure that constraints can be satisfied
    margin = 1
    low_x1_flags = desiredShot[:, 0] < (0. + margin)
    desiredShot[low_x1_flags, 0] = 0. + margin
    low_x2_flags = desiredShot[:, 2] < (0. + margin)
    desiredShot[low_x2_flags, 2] = 0. + margin
    high_x1_flags = desiredShot[:, 0] > (imageWidth - margin)
    desiredShot[high_x1_flags, 0] = imageWidth - margin
    high_x2_flags = desiredShot[:, 2] > (imageWidth - margin)
    desiredShot[high_x2_flags, 2] = imageWidth - margin
    low_y1_flags = desiredShot[:, 1] < (0. + margin)
    desiredShot[low_y1_flags, 1] = 0. + margin
    low_y2_flags = desiredShot[:, 3] < (0. + margin)
    desiredShot[low_y2_flags, 3] = 0. + margin
    high_y1_flags = desiredShot[:, 1] > (imageHeight - margin)
    desiredShot[high_y1_flags, 1] = imageHeight - margin
    high_y2_flags = desiredShot[:, 3] > (imageHeight - margin)
    desiredShot[high_y2_flags, 3] = imageHeight - margin

    # Make sure that a crop of the given aspectRatio can be contained in imageSize and can contain the desiredShot.
    # This may be an issue eg. when doing a 16/9 or a 4/3 movie from 2K.
    # else, we must cut the desiredshot on both sides.
    for k in range(desiredShot.shape[0]):
        if (desiredShot[k, 2] - desiredShot[k, 0]) > (imageHeight * aspectRatio - margin):
            xcut = (desiredShot[k, 2] - desiredShot[k, 0]) - \
                    (imageHeight * aspectRatio - margin)
            desiredShot[k, 2] -= xcut / 2
            desiredShot[k, 0] += xcut / 2
        if (desiredShot[k, 3] - desiredShot[k, 1]) > (imageWidth / aspectRatio - margin):
            ycut = (desiredShot[k, 3] - desiredShot[k, 1]) - \
                    (imageWidth / aspectRatio - margin)
            desiredShot[k, 3] -= ycut / 2
            desiredShot[k, 1] += ycut / 2

    x_center = (desiredShot[:, 0] + desiredShot[:, 2]) / 2.
    y_center = (desiredShot[:, 1] + desiredShot[:, 3]) / 2.
    # elementwise maximum of each array
    half_height_opt = np.maximum((desiredShot[:, 2] - desiredShot[:, 0]) /
                                 aspectRatio, ((desiredShot[:, 3] - desiredShot[:, 1]))) / 2

    # smooth x_center y_center and half_height_opt using a binomial filter (Marchand and Marmet 1983)
    # eg [1 2 1]/4 or [1 4 6 4 1]/16 (obtained by applying it twice)
    # TODO: ignore noDataFrames when smoothing!
    x_center_residual = x_center
    # binomial_3(x_center_residual)
    # binomial_3(x_center_residual)
    y_center_residual = y_center
    # binomial_3(y_center_residual)
    # binomial_3(y_center_residual)
    half_height_opt_residual = half_height_opt
    # binomial_3(half_height_opt_residual)
    # binomial_3(half_height_opt_residual)

    # we subtract 0.001 pixel to be sure that constraints can be satisfied
    half_width = (desiredShot[:, 2] - desiredShot[:, 0]) / 2. - 0.001
    zero_flags = half_width[:] < 0
    half_width[zero_flags] = 0.
    half_height = (desiredShot[:, 3] - desiredShot[:, 1]) / 2. - 0.001
    zero_flags = half_height[:] < 0
    half_height[zero_flags] = 0.

    # now trick the constraints so that there are no inner inclusion constraints at noDataFrames
    x_center[noDataFrames] = imageWidth / 2.
    half_width[noDataFrames] = -imageWidth / 2.  # negative on purpose
    y_center[noDataFrames] = imageHeight / 2.
    half_height[noDataFrames] = -imageHeight / 2.  # negative on purpose
    half_height_opt[noDataFrames] = imageHeight / 2.

    assert ((x_center - half_width) >=
            0).all() and ((x_center + half_width) <= imageWidth).all()
    assert ((y_center - half_height) >=
            0).all() and ((y_center + half_height) <= imageHeight).all()

    n = x_center.size
    print ("n:", n)

    e = np.ones(shape=(n))

    x = cvx.Variable(n)
    y = cvx.Variable(n)
    h = cvx.Variable(n)  # half height (see sec. 4 in the paper)

    # compute the opposite of noDataFrames
    weights = np.ones(n)
    weights[noDataFrames] = 0.  # do not use residuals on the optimal frame where there's no data

    # for f in [97, 98, 99, 100]:
    #    print f, weights[f], x_center[f], y_center[f], half_height_opt[f]

    # normalize with image height
    # version 1:
    weights /= imageHeight
    expr = cvx.sum_squares(weights*(x_center_residual - x)) + cvx.sum_squares(weights*(
        y_center_residual - y)) + cvx.sum_squares((weights/zoomSmooth)*(half_height_opt_residual - h))
    expr /= n  # normalize by the number of images, get a cost per image
    # end of version 1
    # version 2:
    # dataFrames = np.nonzero(weights)
    # expr = cvx.sum_squares(x_center[dataFrames] - x[dataFrames]) + \
    #       cvx.sum_squares(y_center[dataFrames] - y[dataFrames]) + \
    #       cvx.sum_squares(half_height_opt[dataFrames] - h[dataFrames]) / (zoomSmooth*zoomSmooth)
    # expr /= (imageHeight*imageHeight)*n # normalize by the number of images, get a cost per image
    # end of version 2

    if lambda1 != 0.:
        lambda1Factor = lambda1 * fps / imageHeight
        # expr += lambda1Factor * (cvx.norm(D1 * x, 1) + cvx.norm(D1 * y, 1) + cvx.norm(D1 * h, 1) * zoomSmooth)
        if n > 1:
            expr += lambda1Factor * \
                (cvx.tv(x) + cvx.tv(y) + cvx.tv(h) * zoomSmooth)
    if lambda2 != 0.:
        lambda2Factor = lambda2 * fps * fps * fps / imageHeight
        # expr += lambda2Factor * (cvx.norm(D3 * x, 1) + cvx.norm(D3 * y, 1) + cvx.norm(D3 * h, 1) * zoomSmooth)
        if n > 2:
            expr += lambda2Factor * (cvx.norm(x[3:] - 3*x[2:n-1] + 3*x[1:n-2] - x[0:n-3], 1) +
                                     cvx.norm(y[3:] - 3*y[2:n-1] + 3*y[1:n-2] - y[0:n-3], 1) +
                                     cvx.norm(h[3:] - 3*h[2:n-1] + 3*h[1:n-2] - h[0:n-3], 1) * zoomSmooth)
    obj = cvx.Minimize(expr)

    # print expr
    print ("H=%d, W=%d lambda1=%f lambda2=%f zoomSmooth=%f fps=%f imageHeight=%f" % (
        imageHeight, imageWidth, lambda1, lambda2, zoomSmooth, fps, imageHeight))
    # note that the following constraints are tricked (see above) at noDataFrames, using negative values for half_width and half_height
    constraints = [h >= 0,
                   (x - aspectRatio * h) >= 0,
                   (x - aspectRatio * h) <= (x_center - half_width),
                   (x + aspectRatio * h) >= (x_center + half_width),
                   (x + aspectRatio * h) <= imageWidth,
                   (y - h) >= 0,
                   (y - h) <= (y_center - half_height),
                   (y + h) >= (y_center + half_height),
                   (y + h) <= imageHeight]

    prob = cvx.Problem(obj, constraints)
    tryagain = True
    tryreason = ""
    if tryagain or prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
        tryagain = False
        try:
            # ECOS, the default solver, is much better at solving our problems, especially at handling frames where the actor is not visible
            result = prob.solve(solver=cvx.ECOS, verbose=True)
        except cvx.SolverError as e:
            tryagain = True
            tryreason = str(e)

    if tryagain or prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
        tryagain = False
        try:
            result = prob.solve(solver=cvx.SCS, verbose=True)
        except cvx.SolverError as e:
            tryagain = True
            tryreason = str(e)

    if tryagain or prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
        tryagain = False
        try:
            result = prob.solve(solver=cvx.CVXOPT, verbose=True)
        except cvx.SolverError as e:
            tryagain = True
            tryreason = str(e)

    if tryagain or prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
        tryagain = False
        try:
            result = prob.solve(solver=cvx.CVXOPT, kktsolver=cvx.ROBUST_KKTSOLVER, verbose=True)
        except cvx.SolverError as e:
            tryagain = True
            tryreason = str(e)

    if tryagain:
        raise cvx.solverError(tryreason)
    if prob.status == cvx.INFEASIBLE or prob.status == cvx.UNBOUNDED:
        raise cvx.SolverError('Problem is infeasible or unbounded')

    print ("result=", result, "\n")
    optimised_xcenter = x.value #.reshape(n, 1)
    optimised_ycenter = y.value #.reshape(n, 1)
    optimised_height = h.value #.reshape(n, 1)

    return np.hstack([optimised_xcenter - aspectRatio * optimised_height, optimised_ycenter - optimised_height, optimised_xcenter + aspectRatio * optimised_height, optimised_ycenter + optimised_height])


# Stabilize the shot data frame
def stabilize_shot(data_shots, mask, aspect_ratio, video_width, video_height, lambda1=0.002, lambda2=0.0001):
    # print(aspect_ratio, video_width, video_height)

    optimised_xcenter = []
    optimised_ycenter = []
    optimised_height = []

    all_half_width = aspect_ratio * data_shots[:,2]
    data_shots[mask,0] = video_width / 2.
    all_half_width[mask] = -video_width / 2.  # negative on purpose
    data_shots[mask,1] = video_height / 2.
    data_shots[mask,2] = -video_height / 2.  # negative on purpose

    l = len(data_shots)
    k = 0
    s = 100
    lim = int(np.floor(l/s)*s)
    for i in range(l) :
        n = min(s,l)
        if i == lim+1 or i %( (k+1)* s ) == 0:
            start = k*n
            if i == lim+1:
                n = min(l-lim,s)
            end = start + n
            x = cvx.Variable(n)
            y = cvx.Variable(n)
            h = cvx.Variable(n)

            x_center = data_shots[start:end,0]
            y_center = data_shots[start:end,1]
            half_height = data_shots[start:end,2]
            half_width = all_half_width[start:end]

            print(n, k, l, i, lim, start, end)

            #D term
            expr = (cvx.sum_squares(x_center - x) + cvx.sum_squares(y_center- y) + cvx.sum_squares(half_height - h))/2

            # # L11 term
            expr += lambda1 * (cvx.tv(x) + cvx.tv(y) + cvx.tv(h))
            #
            # # L13 term
            for t in range(n-3):
                expr += lambda1 * (cvx.abs(x[t+3] - 3 * x[t+2] + 3 * x[t+1] - x[t]) + cvx.abs(y[t+3] - 3 * y[t+2] + 3 * y[t+1] - y[t]) \
                        + cvx.abs(h[t+3] - 3 * h[t+2] + 3 * h[t+1] - h[t]))

            obj = cvx.Minimize(expr)

            constraints = [h >= 0,
                           (x - aspect_ratio * h) >= 0,
                           (x - aspect_ratio * h) <= (x_center - half_width),
                           (x + aspect_ratio * h) >= (x_center + half_width),
                           (x + aspect_ratio * h) <= video_width,
                           (y - h) >= 0,
                           (y - h) <= (y_center - half_height),
                           (y + h) >= (y_center + half_height),
                           (y + h) <= video_height]

            prob = cvx.Problem(obj, constraints)
            prob.solve()

            optimised_xcenter = optimised_xcenter + x.value.tolist()
            optimised_ycenter = optimised_ycenter + y.value.tolist()
            optimised_height = optimised_height + h.value.tolist()
            k+=1
        if n == l:
            break
    data_shots[:,0] = optimised_xcenter
    data_shots[:,1] = optimised_ycenter
    data_shots[:,2] = optimised_height
    data_shots[mask] = [0,0,0]

    return data_shots
