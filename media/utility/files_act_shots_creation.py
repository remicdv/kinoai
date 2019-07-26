import os

for root, dirs, files in os.walk('.'):
    if dirs and dirs[0] == 'mpd':
        for name in dirs:
            ret = False
            dir_path = os.path.abspath(os.path.join(root, name))
            d = dir_path.split('/mpd')
            actor_file = open(d[0]+"/actors_timeline.json","w+")
            actor_file.write('[]')
            actor_file.close()

            shots_file = open(d[0]+"/shots.json","w+")
            shots_file.write('[]')
            shots_file.close()


            files = [f for f in os.listdir(d[0]+'/') if os.path.isfile(d[0]+'/'+f)]
            for f in files:
                if f == 'detections540_nan.json':
                    os.rename(d[0]+'/'+f, d[0]+'/'+'detections.json')
                if f == 'tracklets540.json':
                    os.rename(d[0]+'/'+f, d[0]+'/'+'tracklets.json')
            print(d[0])
