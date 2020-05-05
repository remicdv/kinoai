#!/usr/bin/env python

# Written by Alexandre Gauthier-Foichat

#import yaml
import json
import random
import copy
import math
import getopt
import os
import sys
import numpy as np
import cv2
import fileseq
from collections import OrderedDict

# Read a sequence of json files (1 for each frame) produced by open-pose
# and gather them into a single detection file for the AutoCAM node
# jsonSequencePattern: a sequence pattern of the json detections, e.g "/home/user/detections/img_#.json"
# imageSequencePattern: a sequence pattern of the images, e.g "/home/user/images/img_#.jpg"


def readOPPJsonSequence(jsonSequencePattern, imageSequencePattern, inputVideoFilename):
    print("Reading json sequence:", imageSequencePattern)
    sequenceObj = fileseq.findSequenceOnDisk(jsonSequencePattern)
    print("Sequence frame-range: [", str(sequenceObj.start()), ", ", str(sequenceObj.end()), "]")

    cap = None
    imageSeqObj = None

    # extract image height from the first frame in the sequence
    if len(inputVideoFilename) > 0:
        cap = cv2.VideoCapture(inputVideoFilename)
        numFrames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        if numFrames != (sequenceObj.end() - sequenceObj.start() + 1):
            raise ValueError('Video has %s frames but detections contain %s frames' % (
                numFrames, (sequenceObj.end() - sequenceObj.start() + 1)))
        cap.set(cv2.CAP_PROP_POS_FRAMES, sequenceObj.start())
        status, img = cap.read()
    else:
        imageSeqObj = fileseq.findSequenceOnDisk(imageSequencePattern)
        imageFilename = imageSeqObj.frame(sequenceObj.start())
        # 1 means Color image to cv2.imread, 0 is grayscale, -1 is unchanged.
        img = cv2.imread(imageFilename, 1)

    height, width, channels = img.shape

    confidence = 0.15
    framesData = {}
    for frameNum in range(sequenceObj.start(), sequenceObj.end() + 1):
        frameJsonFile = sequenceObj.frame(frameNum)

        with open(frameJsonFile) as jsonStream:
            try:
                jsonContent = json.load(jsonStream)
            except:
                print("Cannot open file: ", frameJsonFile)
                sys.exit(1)
            if frameNum % 100 == 0:
                print("Reading", frameJsonFile)
            frameData = []
            for person in jsonContent['people']:
                keyPoints = np.array(person['pose_keypoints_2d'])
                undetectedPoints = keyPoints == 0
                keyPoints[undetectedPoints] = np.nan

                detection = {}
                detection['KeyPoints'] = keyPoints.tolist()
                frameData.append(detection)
            # In Natron, videos begin at frame 1, not 0
            framesData[str(frameNum+1)] = frameData
    ret = {}
    framesDataOrdered = OrderedDict(
        sorted(framesData.items(), key=lambda x: int(x[0])))
    ret['Frames'] = framesDataOrdered
    return ret

def readFolderKeypoints(folder_path):
    confidence = 0.15
    framesData = {}
    # for frameNum in range(sequenceObj.start(), sequenceObj.end() + 1):
    for root, dirs, files in os.walk(folder_path):
        frameNum=0
        for frameJsonFile in files:
            with open(os.path.join(root,frameJsonFile)) as jsonStream:
                try:
                    jsonContent = json.load(jsonStream)
                except:
                    print("Cannot open file: ", frameJsonFile)
                    sys.exit(1)
                if frameNum % 100 == 0:
                    print("Reading", frameJsonFile)
                frameData = []
                for person in jsonContent['people']:
                    keyPoints = np.array(person['pose_keypoints_2d'])
                    undetectedPoints = keyPoints == 0
                    keyPoints[undetectedPoints] = np.nan
                    list = []
                    for p in keyPoints:
                        if np.isnan(p):
                            p = "null"
                        list.append(p)
                    detection = {}
                    detection['KeyPoints'] = list
                    frameData.append(detection)
                # In Natron, videos begin at frame 1, not 0
                framesData[str(frameNum+1)] = frameData
                frameNum+=1
    ret = {}
    framesDataOrdered = OrderedDict(
        sorted(framesData.items(), key=lambda x: int(x[0])))
    ret['Frames'] = framesDataOrdered
    return ret

def main(argv):
    # Parse options
    jsonSequencePattern = ''
    outputfile = ''
    imageSequencePattern = ''
    inputVideoFilename = ''
    try:
        opts, args = getopt.getopt(
            argv, "i:v:o:s:", ["image_sequence=", "json_sequence=", "output=", "video="])
        for opt, value in opts:
            if opt == "-o":
                outputfile = value
            elif opt == "-i":
                jsonSequencePattern = value
            elif opt == "-s":
                imageSequencePattern = value
            elif opt == "-v":
                inputVideoFilename = value

    except getopt.GetoptError:
        print('oppJson2Detections.py -i <jsonSequencePattern> -s <imageSequencePattern> -v <videoFile> -o <detectionFile>')
        sys.exit(1)

    sequenceData = readOPPJsonSequence(
        jsonSequencePattern, imageSequencePattern, inputVideoFilename)
    # sequenceData = readFolderKeypoints(jsonSequencePattern)
    print('Writing', outputfile, '...')
    with open(outputfile, 'w') as fp:
        # fp.write('// # Detections\n')
        json.dump(sequenceData, fp, indent=2)


if __name__ == "__main__":
    main(sys.argv[1:])
