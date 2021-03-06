#!/bin/bash -e

CONFIG=configAutoCAM.sh
if [ ! -f "$CONFIG" ]; then
    echo "Error: no config file $CONFIG"
    echo "Please create file $CONFIG in the video directory, containing for example:"
    cat <<EOF
takes=(
    "video_name.mov;take01"
    )
parts=(
    "video_name.mov;take01;part01;00:00:00;00:10:00"
    "video_name.mov;take01;part02;00:10:00;00:10:00"
)
EOF
fi

. "$CONFIG"

if [[ ! "$(declare -p takes)" =~ "declare -a" ]]; then
    echo "Error: array 'takes' is not defined in $CONFIG"
    exit
fi
if [[ ! "$(declare -p parts)" =~ "declare -a" ]]; then
    echo "Error: array 'parts' is not defined in $CONFIG (it can be an empty array)"
    exit
fi

shots="shots"
if [ ! -d "$shots" ]; then
  mkdir "$shots"
fi
# generate previews if necessary
for take in "${takes[@]}"; do
    a=(${take//;/ })
    video_file="${a[0]}"
    take_dir="$shots/${a[1]}"
    if [ ! -d "$take_dir" ]; then
	mkdir "$take_dir"
    fi
    if [ ! -f "$take_dir/$video_file" ]; then
	if [ -f "$video_file" ]; then
	    mv "$video_file" "$take_dir/$video_file"
	else
	    echo "Error: $video_file is missing"
	    exit
	fi
    fi
    preview="${take_dir}/${a[1]}.mp4"
  #   if [ ! -f "$preview" ]; then
	# echo "Info: Generating preview $preview"
	# time ffmpeg -nostdin -i "$take_dir/$video_file" -c:v libx264 -preset veryfast -c:a aac -strict -2 -b:a 128k -s 1024x540 -sws_flags area "$preview" &> "${preview}.log"
  #   else
	# echo "Info: $preview already exists"
  #   fi
done

# create parts and process
for part in "${parts[@]}"; do
    a=(${part//;/ })
    video_file="${a[0]}"
    take_dir="$shots/${a[1]}"
    part_dir="${a[2]}"
    start="${a[3]}"
    duration="${a[4]}"
    if [ ! -d "$take_dir" ]; then
	echo "Error: $take_dir is missing"
    fi
    if [ ! -f "$take_dir/$video_file" ]; then
	echo "Error: $take_dir/$video_file is missing"
    fi
    if [ ! -d "$take_dir/$part_dir" ]; then
	mkdir "$take_dir/$part_dir"
    fi
    if [ ! -d "$take_dir/$part_dir/mpd" ]; then
  mkdir "$take_dir/$part_dir/mpd"
    fi
    # generate proxy in prores SQ
    if [ ! -f "$take_dir/$part_dir/original_hevc.mov" ]; then
	echo "Info: generating proxy $take_dir/$part_dir/original.mov"
	time ffmpeg -nostdin -ss "$start" -i "$take_dir/$video_file" -c copy -t "$duration" "$take_dir/$part_dir/original_hevc.mov" &> "$take_dir/$part_dir/original_hevc.mov.log"
	# time ffmpeg -nostdin -ss "$start" -i "$take_dir/$video_file" -c:v libx265 -preset veryfast -crf 28 -t "$duration" -c:a aac -strict -2 -b:a 128k "$take_dir/$part_dir/original_hevc.mov" &> "$take_dir/$part_dir/original_hevc.mov.log"
	# time ffmpeg -nostdin -ss "$start" -i "$take_dir/$video_file" -c:v prores_ks -profile:v 2 -vendor ap10 -pix_fmt yuv422p10le -s 2048x1080 -t "$duration" -sws_flags area -acodec copy "$take_dir/$part_dir/original1080.mov" &> "$take_dir/$part_dir/original1080.mov.log"
	# time ffmpeg -nostdin -ss "$start" -i "$take_dir/$video_file" -c:v prores_ks -profile:v 2 -vendor ap10 -pix_fmt yuv422p10le -s 1024x540 -t "$duration" -sws_flags area -acodec copy "$take_dir/$part_dir/original.mov" &> "$take_dir/$part_dir/original.mov.log"
    else
	echo "Info: proxy $take_dir/$part_dir/original.mov already exists"
    fi
    if [ ! -f "$take_dir/$part_dir/original_hevc.mov" ]; then
	echo "Error creating $take_dir/$part_dir/original_hevc.mov"
	exit
    fi

    #extract audio
  time ffmpeg -y -i "$take_dir/$part_dir/original_hevc.mov" -v 0 -vn -acodec copy "$take_dir/$part_dir/output-audio.mp4" || true

    # generate proxy in H.264
    # for res in 1080 ""; do
    if [ -f "$take_dir/$part_dir/original_hevc.mov" ]; then
	  #   if [ ! -f "$take_dir/$part_dir/original${res}.mp4" ]; then
		# echo "Info: generating light proxy $take_dir/$part_dir/original${res}.mp4"
		# time ffmpeg -nostdin -i "$take_dir/$part_dir/original_hevc.mov" -c:v libx264 -preset veryfast -c:a aac -strict -2 -b:a 128k "$take_dir/$part_dir/original${res}.mp4" &> "$take_dir/$part_dir/original${res}.mp4.log"
	  #   else
		# echo "Info: light proxy $take_dir/$part_dir/original${res}.mp4 already exists"
	  #   fi
	  #   if [ ! -f "$take_dir/$part_dir/original${res}.mp4" ]; then
		# echo "Error creating $take_dir/$part_dir/original${res}.mp4"
		# exit
	  #   fi

  # time ffmpeg -y -i "$take_dir/$part_dir/original_hevc.mov" -an -c:v libx264 -pix_fmt yuv420p -vf "scale=-1:540" "$take_dir/$part_dir/original540.mp4" &> "$take_dir/$part_dir/original540.mp4.log"
  # time ffmpeg -y -i "$take_dir/$part_dir/original_hevc.mov" -an -c:v libx264 -pix_fmt yuv420p -vf "scale=-1:1080" "$take_dir/$part_dir/original1080.mp4" &> "$take_dir/$part_dir/original1080.mp4.log"
  time ffmpeg -y -i "$take_dir/$part_dir/original_hevc.mov" -an -c:v libx264 -g 24 -keyint_min 24 -vf "scale=-1:540" "$take_dir/$part_dir/original540.mp4" &> "$take_dir/$part_dir/original540.mp4.log"
  time ffmpeg -y -i "$take_dir/$part_dir/original_hevc.mov" -an -c:v libx264 -g 24 -keyint_min 24 -vf "scale=-1:1080" "$take_dir/$part_dir/original1080.mp4" &> "$take_dir/$part_dir/original1080.mp4.log"

    fi

    # done
    #create mpd manifest
    if [ -f "$take_dir/$part_dir/output-audio.mp4" ]; then
  time MP4Box -dash 2100 -rap -frag-rap -profile simple -out "$take_dir/$part_dir/mpd/original_dash" "$take_dir/$part_dir/original1080.mp4#video" "$take_dir/$part_dir/original540.mp4#video" "$take_dir/$part_dir/output-audio.mp4#audio" &> "$take_dir/$part_dir/mpd.log"
    else
  time MP4Box -dash 2100 -rap -frag-rap -profile simple -out "$take_dir/$part_dir/mpd/original_dash" "$take_dir/$part_dir/original1080.mp4#video" "$take_dir/$part_dir/original540.mp4#video" &> "$take_dir/$part_dir/mpd.log"
    fi

    if [ ! -f "$take_dir/$part_dir/detections.json" ]; then
	echo "Info: launching openpose on $take_dir/$part_dir/original540.mp4"
	for res in 540; do
	    time TMP_JSON_PATH="$take_dir/$part_dir/tmpJsonDetections" INPUT_VIDEO="$take_dir/$part_dir/original${res}.mp4" DETECTION_FILE="$take_dir/$part_dir/detections${res}.json" ./launchDetector.sh &> "$take_dir/$part_dir/detections${res}.json.log"
	    if [ ! -f "$take_dir/$part_dir/detections${res}.json" ]; then
		echo "Error creating $take_dir/$part_dir/detections${res}.json"
		exit
	    fi
	done
    else
	echo "Info: detections $take_dir/$part_dir/detections.json already exists"
    fi
    # generate tracklets
    if [ ! -f "$take_dir/$part_dir/tracklets.json" ]; then
	echo "Info: generating tracklets $take_dir/$part_dir/tracklets.json"
	for res in 540; do
	    time ./generateTracklets.py -i "$take_dir/$part_dir/detections${res}.json" -o "$take_dir/$part_dir/tracklets${res}.json" &> "$take_dir/$part_dir/tracklets${res}.json.log"
	    if [ ! -f "$take_dir/$part_dir/tracklets${res}.json" ]; then
		echo "Error creating $take_dir/$part_dir/tracklets.json"
		exit
	    fi
	done
    else
	echo "Info: detections $take_dir/$part_dir/tracklets.json already exists"
    fi
    # parse na for js
    if [ ! -f "$take_dir/$part_dir/detections_nan.json" ]; then
  for res in 540; do
      time ./parseNaN.py -i "$take_dir/$part_dir/detections${res}.json" -o "$take_dir/$part_dir/detections${res}_nan.json" &> "$take_dir/$part_dir/parse_nan${res}.json.log"
      time python files_act_shots_creation.py
      if [ ! -f "$take_dir/$part_dir/detections.json" ]; then
    echo "Error creating $take_dir/$part_dir/detections.json"
    exit
      fi
  done
    else
  echo "Info: detections $take_dir/$part_dir/detections_nan.json already exists"
    fi

done

exit
