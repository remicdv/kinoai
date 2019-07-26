#!/bin/bash

# Written by Alexandre Gauthier-Foichat

# Script used to launch the openpose detector on either a video or image sequence and output detections
# to a file format specific to Natron's AutoCAM node.

# Make sure LD_LIBRARY_PATH contains cuda libs and caffe
# Looks like this on my Ubuntu installation:
# LD_LIBRARY_PATH=/usr/lib:/usr/local/lib:/usr/local/cuda/lib64:/home/user/openpose/3rdparty/caffe/distribute/lib:/home/user/.local/lib

# Options:
# KINOAI_DIR: Location of the scripts in Engine/AutoCAM
# IMAGES_PATTERN: When detecting on an image sequence, this is the pattern of the sequence, e.g: /home/user/sequence#.jpg
# INPUT_VIDEO: When detecting from a video, this is the filename of the video file, e.g: /home/user/video.mp4
# Either one of IMAGES_PATTERN or INPUT_VIDEO must be set
#
# ACTORS_MODEL: Path to the file containing the actors model to apply to the detections.
# If empty, no probabilities will be associated to detections.
# ACTORS_LIST: Path to the file containing the actors list corresponding to the ACTORS_MODEL file
#
# OPP_BINARY: Path to the openpose.bin binary
# MODEL_FOLDER: Path to the models (for open-pose) in the open-pose distribution
#
# DISPLAY_ON: If 1, display the detections in a window while detecting, otherwise no display (default)
# DETECTION_FILE: Path to the detection file to write in output in the format expected by Natron's AutoCAM node.
# If set, this flag requires an image sequence in input because open-pose outputs 1 json file per frame.
# If not set, no detection file will be written.
#
# TRACKLETS_FILE: If set, tracklets will also be generated for the sequence based on the detections.
# This is useful to help the user create the model tracks from within Natron. If not set, they will not be
# generated

# Since we then later on in the pipeline need to re-open the image corresponding to the detection,
# it is best if this is an image instead of a video frame so we do not hit
# video stream issues with different decoders/encoders:
# Natron and OpenCV both use ffmpeg for videos but their implementation vary
# and may give different frame counts, etc...


set -e # Exit immediately if a command exits with a non-zero status
set -u # Treat unset variables as an error when substituting.
set -x # Print commands and their arguments as they are executed.


CWD=`pwd`


imagespattern="${IMAGES_PATTERN:-}"
videofilename="${INPUT_VIDEO:-}"
openposemodel="${MODEL_FOLDER:-}"
detectionfile="${DETECTION_FILE:-}"
modelfile="${ACTORS_MODEL:-}"
actorsfile="${ACTORS_LIST:-}"
tracklets="${TRACKLETS_FILE:-}"
displayflags=""
if [ "${DISPLAY_ON:-}" != "1" ]; then
    displayflags="--display 0 --render_pose 0"
fi

# Openpose expects the model folder to end with a /
if [ ! -z "$openposemodel" ]; then
    lastchar=$(echo "${openposemodel: -1}")
    if [ "$lastchar" != '/' ]; then
        openposemodel="${openposemodel}/"
    fi
fi

if [ -z "$imagespattern" ] && [ ! -f "$videofilename" ]; then
    echo "Please indicate image sequence pattern, e.g: IMAGES_PATTERN=\"/home/user/sequence#.jpg\", or a valid video file to read, e.g: INPUT_VIDEO=\"/home/user/video.mp4\""
    exit 1
fi

if [ ! -z "$videofilename" ] && [ ! -z "$imagespattern" ]; then
    echo "Indicate either a image sequence or video in input"
fi

inputstreamflag=""
imagesdir=""
if [ ! -z "$videofilename" ]; then
    inputstreamflag="--video $videofilename"
    echo "Launching detector on video file $videofilename"
elif [ ! -z "$imagespattern" ]; then
    imagesdir="${imagespattern%/*}"
    inputstreamflag="--image_dir $imagesdir"
    echo "Launching detector on image sequences in $imagesdir"
fi


TMP_JSON_PATH="$CWD/tmpJsonDetections"
if [ -d "$TMP_JSON_PATH" ]; then
    rm -rf "$TMP_JSON_PATH"
fi
mkdir -p "$TMP_JSON_PATH"

# Launch open-pose
"$OPP_BINARY" --logging_level=4  $inputstreamflag $displayflags --write_json "$TMP_JSON_PATH" --model_folder="$openposemodel"

python -c "import os;[os.rename('$TMP_JSON_PATH' + '/' + f, '$TMP_JSON_PATH' + '/' + f.replace('_keypoints', '')) for f in os.listdir('$TMP_JSON_PATH') if not f.startswith('.')]"

# Convert tmp json files to the detection file format with our python scripts
if [ ! -z "$detectionfile" ]; then
    if [ -f "$detectionfile" ]; then
        echo "$detectionfile already exists, removing it"
        rm "$detectionfile"
    fi

    if [ ! -z "$imagespattern" ]; then
        inputstreamarg="-s $imagespattern"
    elif [ ! -z "$videofilename" ]; then
        inputstreamarg="-v $videofilename"
    fi


    if [ ! -z "$videofilename" ]; then

        videoFileBaseName="${videofilename##*/}"
        videoFileBaseName="${videoFileBaseName%.*}_"

        # Extract basename and padding
        firstfile=`ls $TMP_JSON_PATH/ | head -n1`
        firstfileBaseName="${firstfile##*/}"
        # Remove extension
        firstfileBaseName="${firstfile%.*}"
        # Count padding in the output json file to add padding to the pattern
        paddingDigits=${firstfileBaseName#$videoFileBaseName}
        lenPadding=${#paddingDigits}
        for ((i = 0; i < $lenPadding; ++i)); do
            videoFileBaseName="${videoFileBaseName}@"
        done
        jsonSequencePattern="$TMP_JSON_PATH/${videoFileBaseName}.json"
    elif [ ! -z "$imagespattern" ]; then
        patternBaseName="${imagespattern##*/}"
        patternBaseName="${patternBaseName%.*}"
        jsonSequencePattern="$TMP_JSON_PATH/${patternBaseName}.json"
    fi

    # Convert the open-pose detections to a single detections file expected by AutoCAM
    python genDetections.py $inputstreamarg -i "$jsonSequencePattern" -o "$detectionfile"

    if [ ! -z "$tracklets" ]; then
        # Gen tracklets
        python generateTracklets.py -i "$detectionfile" -o "$tracklets"
        echo "detect good place"
    fi
    if [ ! -z "$modelfile" ]; then
        # Apply the learnt model to the detections to extract actors probabilities
        tmpoutputfile="$TMP_JSON_PATH/detectionsWithProba.yaml"
        python applyModelToDetections.py -m "$modelfile" -a "$actorsfile" $inputstreamarg -i "$detectionfile" -o "$tmpoutputfile"
        cp "$tmpoutputfile" "$detectionfile"
        rm "$tmpoutputfile"
    fi
fi

rm -rf "$TMP_JSON_PATH" || true
