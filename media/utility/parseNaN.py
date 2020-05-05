#!/usr/bin/env python

import numpy as np
import sys
import json
import getopt

def parseNAN(inputDetections):
    # Iterate over detections in frame
    for frame_index in range(len(inputDetections['Frames'])):
        keypoints = inputDetections['Frames'][str(frame_index+1)]
        for keypointIndex in range(len(keypoints)):
            for pointIndex in range(len(keypoints[keypointIndex]['KeyPoints'])):
                if np.isnan(keypoints[keypointIndex]['KeyPoints'][pointIndex]):
                    keypoints[keypointIndex]['KeyPoints'][pointIndex] = 'null'
                # if keypoints[keypointIndex]['KeyPoints'][pointIndex] == "null":
                #     keypoints[keypointIndex]['KeyPoints'][pointIndex] = np.nan

    return inputDetections


def main(argv):
    # Parse options
    detectionFilename = ''
    output = ''
    try:
        opts, args = getopt.getopt(argv, "i:o:", ["detections=", "output="])
        print(opts)
        for opt, value in opts:
            if opt == "-i":
                detectionFilename = value
            elif opt == "-o":
                output = value

    except getopt.GetoptError:
        print('parse_nan.py -i <detectionFile>')
        sys.exit(1)

    inputDetections = ''
    print('Loading', detectionFilename, '...')
    with open(detectionFilename, 'r') as stream:
        try:
           # Skip header
            inputDetections = json.load(stream)
        except Exception as exc:
            print(exc)
            sys.exit(1)
    dataset = parseNAN(inputDetections)

    with open(output, 'w') as fp:
        json.dump(dataset, fp, indent=2)


if __name__ == "__main__":
    main(sys.argv[1:])
