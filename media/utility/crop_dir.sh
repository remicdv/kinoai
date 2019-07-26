#! /bin/bash

# running command : $1 = video input, $2 = folder for extraction, $3 = video output mp4
mkdir $2
mkdir $2/output
ffmpeg -i $1 $2/image%04d.jpg -hide_banner
cd $2
for fich in `ls . `
do
  if [ -f $fich ]
  then
    crop_val=$(( ( RANDOM % 100 )  + 1 ))
    if [[ $(( $crop_val % 2 )) == 1 ]]; then
      crop=$(($crop_val+1))
    else
      crop=$crop_val
    fi
    ../crop_image.py $fich $crop $crop $crop $crop
  fi
done
cd 'output'
ffmpeg -framerate 24 -i image%04d.jpg $3
mv $3 ../..
cd ../..
trash $2
