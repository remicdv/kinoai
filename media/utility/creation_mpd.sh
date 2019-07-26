ffmpeg -i original1080.mp4 -vn -acodec copy output-audio.mp4

ffmpeg -y -i original1080.mp4 -an -c:v libx264 -x264opts 'keyint=24:min-keyint=24:no-scenecut' -b:v 1500k -maxrate 1500k -bufsize 1000k -vf "scale=-1:540" outputfile540.mp4
ffmpeg -y -i original1080.mp4 -an -c:v libx264 -x264opts 'keyint=24:min-keyint=24:no-scenecut' -b:v 2400k -maxrate 4800k -bufsize 2000k -vf "scale=-1:1080" outputfile1080.mp4

MP4Box -dash 2100 -rap -frag-rap -profile simple -out mpd/original_dash outputfile1080.mp4 outputfile540.mp4 output-audio.mp4
