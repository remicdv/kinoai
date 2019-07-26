#!/usr/bin/env python

import json
import getopt
import sys
import numpy as np

# The threshgold on rectangle intersection over union to create a new tracklet
# This should be tuned so that if the current object is not detected at the current frame,
# it does not "jump" to a neighbor detection
# A value of 0. means no threshold.
rectIoUThreshold = 0.3

# Num pixels to increase on each side of the bounding box of the poses
# to perform the distance computation between 2 bbox
paddingPx = 20


def computePointsBbox(points):
    x_max = np.nanmax(points[0:len(points):3]).tolist()
    y_max = np.nanmax(points[1:len(points):3]).tolist()
    x_min = np.nanmin(points[0:len(points):3]).tolist()
    y_min = np.nanmin(points[1:len(points):3]).tolist()
    bbox = [x_min, y_min, x_max, y_max]
    # Cast to int the bounding box
    bbox = [int(j) for j in bbox]
    return np.array(bbox)

# only compute the Bbox for the
# only consider nose, eyes, ears, neck and shoulders for the centroid
# called "UbC" for upper-body-critical in:
# Solbach, Markus D., and John K. Tsotsos.
# "Vision-Based Fallen Person Detection for the Elderly."
# ACVR 2017


def computePointsBboxUbC(points):
    POSE_BODY_25_BODY_PARTS_Nose = 0
    POSE_BODY_25_BODY_PARTS_Neck = 1
    POSE_BODY_25_BODY_PARTS_RShoulder = 2
    POSE_BODY_25_BODY_PARTS_RElbow = 3
    POSE_BODY_25_BODY_PARTS_RWrist = 4
    POSE_BODY_25_BODY_PARTS_LShoulder = 5
    POSE_BODY_25_BODY_PARTS_LElbow = 6
    POSE_BODY_25_BODY_PARTS_LWrist = 7
    POSE_BODY_25_BODY_PARTS_MidHip = 8
    POSE_BODY_25_BODY_PARTS_RHip = 9
    POSE_BODY_25_BODY_PARTS_RKnee = 10
    POSE_BODY_25_BODY_PARTS_RAnkle = 11
    POSE_BODY_25_BODY_PARTS_LHip = 12
    POSE_BODY_25_BODY_PARTS_LKnee = 13
    POSE_BODY_25_BODY_PARTS_LAnkle = 14
    POSE_BODY_25_BODY_PARTS_REye = 15
    POSE_BODY_25_BODY_PARTS_LEye = 16
    POSE_BODY_25_BODY_PARTS_REar = 17
    POSE_BODY_25_BODY_PARTS_LEar = 18
    POSE_BODY_25_BODY_PARTS_LBigToe = 19
    POSE_BODY_25_BODY_PARTS_LSmallToe = 20
    POSE_BODY_25_BODY_PARTS_LHeel = 21
    POSE_BODY_25_BODY_PARTS_RBigToe = 22
    POSE_BODY_25_BODY_PARTS_RSmallToe = 23
    POSE_BODY_25_BODY_PARTS_RHeel = 24
    POSE_BODY_25_BODY_PARTS_Background = 25

    x = []
    y = []
    for i in [POSE_BODY_25_BODY_PARTS_Nose, POSE_BODY_25_BODY_PARTS_Neck, POSE_BODY_25_BODY_PARTS_RShoulder, POSE_BODY_25_BODY_PARTS_LShoulder, POSE_BODY_25_BODY_PARTS_REye, POSE_BODY_25_BODY_PARTS_LEye, POSE_BODY_25_BODY_PARTS_REar, POSE_BODY_25_BODY_PARTS_LEar]:
        x.append(points[i * 3 + 0])
        y.append(points[i * 3 + 1])
    if all(n for n in np.isnan(x)):
        # print "all items are nan"
        return [0, 0, -1, -1]  # empty Bbox (not even containing one point)

    x_max = np.nanmax(x)
    y_max = np.nanmax(y)
    x_min = np.nanmin(x)
    y_min = np.nanmin(y)

    bbox = [x_min, y_min, x_max, y_max]
    # Cast to int the bounding box
    bbox = [int(j) for j in bbox]
    return np.array(bbox)


def padRect(r, numPix):
    return [r[0] - numPix, r[1] - numPix, r[2] + numPix, r[3] + numPix]


# Use intersection over union as a measure of distance closeness (this is NOT a distance)
# see also https://www.pyimagesearch.com/2016/11/07/intersection-over-union-iou-for-object-detection/
def rectIoU(boxA, boxB, padding=0):
    if boxA[0] > boxA[2] or boxB[0] > boxB[2] or boxA[1] > boxA[3] or boxB[1] > boxB[3]:
        # one of the rectangles is empty (does not even contain a point)
        return 0

    if padding != 0:
        boxA = padRect(boxA, padding)
        boxB = padRect(boxB, padding)

    assert boxA[0] <= boxA[2]
    assert boxB[0] <= boxB[2]
    assert boxA[1] <= boxA[3]
    assert boxB[1] <= boxB[3]
    # determine the (x, y)-coordinates of the intersection rectangle
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    if xB <= xA or yB <= yA:
        # no intersection
        return 0

    # compute the area of intersection rectangle
    interArea = (xB - xA) * (yB - yA)

    # compute the area of both the prediction and ground-truth
    # rectangles
    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

    unionArea = float(boxAArea + boxBArea - interArea)
    if unionArea <= 0.:
        return 0

    # compute the intersection over union by taking the intersection
    # area and dividing it by the sum of prediction + ground-truth
    # areas - the interesection area
    iou = interArea / unionArea

    # print "IoU(", boxA, boxB, ")=", iou, "boxAArea=", boxAArea, "boxBArea=", boxBArea, "interArea=", interArea
    # return the intersection over union value
    return iou


def genTracklets(detectionsFileContent):

    # list of clusters, each cluster has list of [frame number, detection index, IoU with the previous frame] that are spatially close from
    # one frame to another
    clustersInOrder = []

    # A map of all cluster links at each frame. There is exactly one cluster per detection, and they are in the same order as detections.
    linksForEachFrame = {}

    frames = detectionsFileContent['Frames']
    sortedFrames = sorted(map(int, frames))

    # Iterate over frames
    for frameNum in sortedFrames:
        firstFrame = (frameNum == sortedFrames[0])
        linksInFrame = []
        frameNumStr = str(frameNum)
        detections = frames[frameNumStr]
        # print "A", str(linksForEachFrame), frameNum,  str(linksInFrame)

        # Iterate over detections in frame
        for detectionIndex in range(len(detections)):
            #print "Frame", frameNum, "detection", detectionIndex, "..."

            points = detections[detectionIndex]['KeyPoints']
            bbox = computePointsBbox(points)
            bboxUbC = computePointsBboxUbC(points)

            previousFrameDetections = []
            if not firstFrame:
                previousFrameDetections = frames[str(frameNum - 1)]

            # There is exactly one cluster per detection, and they are in the same order as detections.
            assert firstFrame or len(previousFrameDetections) == len(
                linksForEachFrame[frameNum - 1])

            if len(previousFrameDetections) == 0:
                # first frame or no detection at previous frame,
                # all detections are different clusters: make a new one
                clusterIndex = len(clustersInOrder)
                clustersInOrder.append([[frameNum, detectionIndex, 1.]])
                assert clustersInOrder[-1][-1][0] == frameNum
                linksInFrame.append(clusterIndex)
                assert len(linksInFrame) == detectionIndex + 1
                # print "B", str(linksForEachFrame), frameNum,  str(linksInFrame)
                # linksForEachFrame[frameNum] = linksInFrame # done below
                # print "Frame", frameNum, "making new cluster", clusterIndex, "with detection =", bbox, "(no previous detection)"

                # no previous frame or no previous detection, so continue to next detection
                continue

            # Iterate over all previous frames
            # Compute distance of all previous detections to this detection's bounding box

            bestIoU = 0.
            bestIoUIndex = -1
            bestIoUUbC = 0.
            bestIoUUbCIndex = -1

            # first, try to match only the head and shoulders part
            for i in range(len(previousFrameDetections)):
                prevbboxUbC = computePointsBboxUbC(
                    previousFrameDetections[i]['KeyPoints'])
                iou = rectIoU(prevbboxUbC, bboxUbC, paddingPx)
                # print "iou", prevbbox, bbox, "=", iou
                if (iou >= bestIoUUbC):
                    bestIoUUbC = iou
                    bestIoUUbCIndex = i
                # [1] Uncomment the following to compute IoU using the full BboX (see also [2] below)
                """
                # Also compute the IoU for the full bbox (but this proved to be less efficient)
                prevbbox = computePointsBbox(
                    previousFrameDetections[i]['KeyPoints'])
                iou = rectIoU(prevbbox, bbox, paddingPx)
                # print "iou", prevbbox, bbox, "=", iou
                if (iou >= bestIoU):
                    bestIoU = iou
                    bestIoUIndex = i
                """

            # if bestIoUUbCIndex != bestIoUIndex:
            #    print "Best previous detection UbC:", bestIoUUbCIndex, "iou=", bestIoUUbC, "Full:", bestIoUIndex, "iou=", bestIoU

            # [2] Comment the following to compute IoU using the full BboX (see also [1] above)
            bestIoU = bestIoUUbC
            bestIoUIndex = bestIoUUbCIndex

            # at this stage, there are detections in the previous frame, so there
            # should be clusters at the previous frame
            assert (frameNum - 1) in linksForEachFrame
            # if there are no clusters in previous frame:
            if (frameNum - 1) not in linksForEachFrame:
                # Make new cluster
                clusterIndex = len(clustersInOrder)
                assert clusterIndex == detectionIndex
                clustersInOrder.append([[frameNum, detectionIndex, 1.]])
                assert clustersInOrder[closestClusterIndex][-1][0] == frameNum
                linksInFrame.append(clusterIndex)
                assert len(linksInFrame) == detectionIndex + 1
                # print "C", str(linksForEachFrame), frameNum,  str(linksInFrame)
                # linksForEachFrame[frameNum] = linksInFrame # done below
                # print "Frame", frameNum, "making new cluster", clusterIndex, "with detection =", bbox

                continue

            closestClusterIndex = linksForEachFrame[frameNum - 1][bestIoUIndex]
            # print "clusters:", clustersInOrder
            # print "D", str(linksForEachFrame), frameNum,  str(linksInFrame)

            # maybe we already put a detection from the current frame in this closest cluster...
            if clustersInOrder[closestClusterIndex][-1][0] == frameNum:
                # There are two possibilities:
                # - this detection has a better IoU than the one already in the cluster
                #   in this case we should remove that detection from the cluster,
                #   insert this one in place, and create a new cluster
                # - this detection has a worse IoU than the one already in the cluster
                #   in this case we create a new cluster
                # In any case, we create a new cluster

                if bestIoU > clustersInOrder[closestClusterIndex][-1][2]:
                    # update existing cluster
                    oldDetectionIndex = clustersInOrder[closestClusterIndex][-1][1]
                    clustersInOrder[closestClusterIndex][-1][1] = detectionIndex
                    clustersInOrder[closestClusterIndex][-1][2] = bestIoU
                    linksInFrame.append(closestClusterIndex)
                    assert len(linksInFrame) == detectionIndex + 1
                    # create new cluster
                    newClusterIndex = len(clustersInOrder)
                    clustersInOrder.append([[frameNum, oldDetectionIndex, 1.]])
                    # update the link for the old detection
                    linksInFrame[oldDetectionIndex] = newClusterIndex
                else:
                    # Make new cluster
                    newClusterIndex = len(clustersInOrder)
                    clustersInOrder.append([[frameNum, detectionIndex, 1.]])
                    assert clustersInOrder[newClusterIndex][-1][0] == frameNum
                    # print "Frame", frameNum, "making new cluster", newClusterIndex, "with detection =", bbox, "(best IoU = ", bestIoU, "<= ", rectIoUThreshold, ")"
                    linksInFrame.append(newClusterIndex)
                    assert len(linksInFrame) == detectionIndex + 1

                # print "G", str(linksForEachFrame), frameNum,  str(linksInFrame)

                # next detection
                continue

            # print "cluster ", closestClusterIndex, ":", clustersInOrder[closestClusterIndex][-1][0], "==", (frameNum - 1)
            assert clustersInOrder[closestClusterIndex][-1][0] == (
                frameNum - 1)
            # A distance of 1. means IoU = 0, i.e. there is no overlap => create a new cluster
            if bestIoU <= 0:
                # Make new cluster
                newClusterIndex = len(clustersInOrder)
                clustersInOrder.append([[frameNum, detectionIndex, 1.]])
                assert clustersInOrder[newClusterIndex][-1][0] == frameNum
                # print "Frame", frameNum, "making new cluster", newClusterIndex, "with detection =", bbox, "(best IoU = ", bestIoU, "<= ", rectIoUThreshold, ")"
                linksInFrame.append(newClusterIndex)
                assert len(linksInFrame) == detectionIndex + 1

            else:
                # Use the same cluster than at previous frame
                # print "Frame", frameNum, "detection", detectionIndex, "bbox=", bbox, "found previous detection", closestClusterIndex, "size=", len(clustersInOrder[clusterIndex]), "with starting box=", computePointsBbox(frames[str(clustersInOrder[clusterIndex][0][0])][clustersInOrder[clusterIndex][0][1]]['KeyPoints'])
                clustersInOrder[closestClusterIndex].append(
                    [frameNum, detectionIndex, bestIoU])
                assert clustersInOrder[closestClusterIndex][-1][0] == frameNum
                linksInFrame.append(closestClusterIndex)
                assert len(linksInFrame) == detectionIndex + 1

            # print "E", str(linksForEachFrame), frameNum,  str(linksInFrame)

        # There is exactly one cluster per detection, and they are in the same order as detections.
        assert len(linksInFrame) == len(detections)
        linksForEachFrame[frameNum] = linksInFrame
        # print "F", str(linksForEachFrame), frameNum,  str(linksInFrame)

    sorted_clusters = sorted(range(len(clustersInOrder)), key=lambda k: len(
        clustersInOrder[k]), reverse=True)

    tracklets = []
    for i in sorted_clusters:

        # Ignore clusters with less than 20 frames.
        if len(clustersInOrder[i]) < 20:
            print("Ignoring too short tracklet at frame", clustersInOrder[i][0][0])

            continue

        # List of detection indices across each frame of the tracklet
        trackletIndices = []
        for detection in clustersInOrder[i]:
            trackletIndices.append(detection[1])

        tracklet = {}
        # Frame number of the first detection in the cluster
        tracklet['FirstFrame'] = clustersInOrder[i][0][0]
        tracklet['Detections'] = trackletIndices

        tracklets.append(tracklet)

    return tracklets


def main(argv):
    # Parse options
    detectionFilename = ''
    trackletsFilename = ''
    imageSequencePattern = ''
    print('tracklet good place')
    try:
        opts, args = getopt.getopt(argv, "i:o:", ["detections=", "tracklets="])
        for opt, value in opts:
            if opt == "-o":
                trackletsFilename = value
            elif opt == "-i":
                detectionFilename = value

    except getopt.GetoptError:
        print('generateTracklets.py -i <detectionFile> -o <trackletsFile>')
        sys.exit(1)

    inputDetections = ''
    print('Loading', detectionFilename, '...')
    with open(detectionFilename, 'r') as stream:
        try:
           # Skip header
            # stream.readline()
            inputDetections = json.load(stream)
        except Exception as exc:
            print(exc)
            sys.exit(1)

    tracklets = genTracklets(inputDetections)
    with open(trackletsFilename, 'w') as fp:
        # fp.write('// # Tracklets\n')
        json.dump(tracklets, fp, indent=2)


if __name__ == "__main__":
    main(sys.argv[1:])
