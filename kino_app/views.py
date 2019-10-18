from django.shortcuts import get_object_or_404, render, redirect
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.views import generic
from django.urls import reverse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import Permission, User
from django.views.decorators.csrf import csrf_exempt
from .models import FolderPath, Detections
from django.core.files.storage import FileSystemStorage
from django.views.decorators.cache import never_cache

import os
import json
import cvxpy as cvx
import numpy as np
import scipy as sp
import scipy.sparse
from . import StabilizeOptimizer as stab
from moviepy.editor import VideoFileClip, ImageSequenceClip
import subprocess
import shutil
import math, random
import time
import cv2
#  command ffmpeg for extract screeshot at 32.375 sec ffmpeg -ss 32.375 -i original_hevc.mov -frames:v 1 out1.jpg

class LoginView(generic.View):
    template_name='kino_app/login.html'
    def post(self, request):
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(username=username, password=password)

        if user is not None:
            if user.is_active and user.is_authenticated == True:
                login(request, user)
                return HttpResponseRedirect('/kino_app')
            else:
                return render(request, "kino_app/login.html", {'msg':"Inactive user"})
        else:
            return render(request, "kino_app/login.html", {'msg':"Username or password invalid"})

        return render(request, "kino_app/login.html")
    def get(self, request):
        return render(request, "kino_app/login.html")

def logout_view(request):
    print(request.user)
    logout(request)
    return HttpResponseRedirect(settings.LOGIN_URL)


def signin_view(request):
    if request.method == "POST":
        email = request.POST['email']
        username = request.POST['username']
        password = request.POST['password']
        left = int(request.POST['left_part'])
        right = int(request.POST['right_part'])
        answer = int(request.POST['answer'])
        print(left, right, answer, (left+answer), (left+answer)==right)
        if not (left+answer)==right:
            return render(request, "kino_app/sign_in.html", {'msg':'Check your math !', 'left_part':random.randint(1,10), 'right_part':random.randint(1,20)})
        if username:
            user_set = User.objects.filter(username=username)
            if len(user_set) == 0:
                user = User.objects.create_user(username=username, email=email, password=password)
                print(user)
                return HttpResponseRedirect(settings.LOGIN_URL)
            else :
                return render(request, "kino_app/sign_in.html", {'msg':'Username already used', 'left_part':random.randint(1,10), 'right_part':random.randint(1,20)})

    return render(request, "kino_app/sign_in.html", {'left_part':random.randint(1,10), 'right_part':random.randint(1,20)})


def list_files(startpath, user):
    list = []
    for root, dirs, files in os.walk(startpath):
        for name in dirs:
            ret = False
            dir_path = os.path.abspath(os.path.join(root, name))
            for r, dirs_in, files_in in os.walk(dir_path):
                for name_in in dirs_in:
                    if name_in != 'mpd':
                        ret = True
            if name != 'mpd' and not ret:
                d = dir_path.split('/kino_app/data/')
                list.append(d[1])
                obj, created = FolderPath.objects.get_or_create(
                    path=d[1],
                    abs_path=dir_path,
                    owner = user
                )
    return list

def extractImagesAndDelete(list, len_old, the_owner):
    if len(list) != len_old:
        img_folder_path = os.path.join(settings.MEDIA_ROOT, "kino_app/index_images/")
        for p in FolderPath.objects.filter(owner=the_owner):
            if p.path not in list:
                print('delete ', p)
                Detections.objects.filter(path=p).delete()
                p.delete()
            else :
                obj = Detections.objects.filter(path=p)
                if len(obj) == 0:
                    with open(os.path.join(settings.MEDIA_ROOT, 'kino_app/data/', p.path)+'/detections.json') as f:
                        data = json.load(f)
                    obj, created = Detections.objects.get_or_create(
                        path=p,
                        json_data=json.dumps(data),
                    )
                    folder_path = img_folder_path+p.path
                    if not os.path.isdir(folder_path) :
                        video_path = p.abs_path+'/original540.mp4'
                        result = float(subprocess.check_output('ffprobe -i {0} -show_entries format=duration -v quiet -of csv="p=0"'.format(video_path), shell=True ,stderr=subprocess.STDOUT))
                        unit = (result-1)/10
                        timecodes = []
                        for i in range(10):
                            timecodes.append(unit*i)
                        os.makedirs(folder_path)
                        i=0
                        for time in timecodes:
                            img_path = folder_path+'/poster'+str(i)+'.jpg'
                            i+=1
                            subprocess.check_call("ffmpeg -nostdin -y -v quiet -ss {0} -i {1} -frames:v 1 {2}".format(time, video_path, img_path), shell=True)

class IndexView(generic.ListView):

    template_name = 'kino_app/index.html'
    context_object_name = 'take_list'
    start = time.time()

    @never_cache
    def get(self, request):
        print(self.request.META.get('HTTP_REFERER'))
        path = os.path.join(settings.MEDIA_ROOT, 'kino_app/data/shots')
        old = len(FolderPath.objects.filter(owner=None))
        list = list_files(path, None)
        list_dir_name = os.listdir(path)
        list_dir_name.sort()
        print(len(list),old)
        extractImagesAndDelete(list, old, None)
        user_folder = os.path.join(settings.MEDIA_ROOT, 'kino_app/data/'+request.user.username)
        if not os.path.isdir(user_folder) :
            os.makedirs(user_folder)
        old_user = len(FolderPath.objects.filter(owner=request.user))
        list_user = list_files(user_folder, request.user)
        list_dir_name_user = os.listdir(user_folder)
        extractImagesAndDelete(list_user, old_user, request.user)
        if request.user is None or request.user.is_authenticated == False:
            print(settings.LOGIN_URL)
            return HttpResponseRedirect(settings.LOGIN_URL)
        else:
            return render(request, 'kino_app/index.html', {'take_list':FolderPath.objects.filter(owner=None).order_by('path'), 'names':list_dir_name, 'user_take_list':FolderPath.objects.filter(owner=request.user).order_by('path'), 'user_names':list_dir_name_user})

@csrf_exempt
def set_previous(request):
    name = request.POST.get('name','')
    request.session['previous_name'] = name
    return HttpResponseRedirect('')

def launch_preprocess(name, username):
    utility = settings.MEDIA_ROOT+'/utility'
    shutil.move(settings.MEDIA_ROOT+'/'+name,utility)
    info = str(subprocess.check_output('ffprobe -i "{0}" -show_entries stream=width,height -v quiet -of csv="p=0"'.format(utility+'/'+name), shell=True ,stderr=subprocess.STDOUT))
    info_list = info.split("'")[1].split('/')[0].split(',')
    duration = float(subprocess.check_output('ffprobe -i "{0}" -show_entries format=duration -v quiet -of csv="p=0"'.format(utility+'/'+name), shell=True ,stderr=subprocess.STDOUT))
    print(duration)
    width = int(info_list[0])
    height = int(info_list[1].split("\\")[0])
    # duration = float(info_list[2].split("\\")[0])
    print(width, height, duration)
    sec = math.floor(duration%60)
    min = math.floor((duration/60)%60)
    hour = math.floor((duration/60)/60)
    print('Real exec time ',hour,':',min,':',sec, ':', int((duration%1)*100), ' in seconds ', duration)
    dir = name.split('.')[0]
    path = os.path.join(settings.MEDIA_ROOT, 'kino_app/data/'+username)
    if not os.path.isdir(path+'/'+dir):
        with open(utility+'/configAutoCAM.sh', 'w') as fp:
            string_config = 'takes=("{0};{1}")\n parts=('.format(name, dir)
            nb_part = 1
            for h in range(hour+1):
                if h != hour:
                    for m in range(5):
                        string_config += '"{0};{1};part{n_p:02d};{h:02d}:{m:02d}:00;00:10:00"\n'.format(name, dir,n_p=nb_part,h=h,m=m*10)
                        nb_part += 1
                    string_config += '"{0};{1};part{n_p:02d};{h:02d}:50:00;00:10:00"\n'.format(name, dir,n_p=nb_part,h=h)
                    nb_part += 1
                else:
                    if min == 0:
                        string_config += '"{0};{1};part01;00:00:00;00:10:00"\n'.format(name, dir)
                    for m in range(math.ceil(min/10)):
                        string_config += '"{0};{1};part{n_p:02d};{h:02d}:{m:02d}:00;00:10:00"\n'.format(name, dir,n_p=nb_part,h=h,m=m*10)
                        nb_part += 1
            string_config += ')'
            fp.write('{0}'.format(string_config))
        subprocess.check_call(["./preprocessAutoCAM.sh"], cwd=utility)
        os.remove(utility+'/shots/'+dir+'/'+name)
        shutil.move(utility+'/shots/'+dir,path)
        return True
    else:
        os.remove(utility+'/'+name)
        return False

def upload_view(request):
    if request.user is None or request.user.is_authenticated == False:
        print(settings.LOGIN_URL)
        return HttpResponseRedirect(settings.LOGIN_URL)
    if request.method == 'POST' and request.FILES:
        myfile = request.FILES['fileToUpload']
        print(request.FILES, '\n', myfile)
        info = str(request.FILES).split('[')[1].split('(')[1].split('/')[0]
        if info == 'video':
            fs = FileSystemStorage()
            filename = fs.save(myfile.name, myfile)
            old = filename
            filename = filename.replace(" ", "_")
            os.rename(settings.MEDIA_ROOT+'/'+old,settings.MEDIA_ROOT+'/'+filename)
            uploaded_file_url = fs.url(filename)
            if launch_preprocess(filename, request.user.username):
                print('finished')
                return redirect('kino_app:index')
            else:
                print('already')
                return render(request, 'kino_app/upload.html', {'msg':'Already added'})
        else:
            print('not video')
            return render(request, 'kino_app/upload.html', {'msg':'Not a video'})
    else:
        return render(request, 'kino_app/upload.html')

def preprocess(request):
    print(request)
    return render(request, 'kino_app/process.html')

# Create your views here.
def video_editing(request, id):

    dir = get_object_or_404(FolderPath, pk=id)
    print(dir.owner)
    video_path = dir.abs_path+'/original540.mp4'
    # print(os.path.join(settings.BASE_DIR, 'kino_app/static/kino_app/data/', dir.path)+'/detections.json')
    info = str(subprocess.check_output('ffprobe -i {0} -show_entries stream=width,height,r_frame_rate -v quiet -of csv="p=0"'.format(video_path), shell=True ,stderr=subprocess.STDOUT))
    info_list = info.split("'")[1].split('\\')[0].split(',')
    width = info_list[0]
    height = info_list[1]
    frame_rate = int(info_list[2].split('/')[0])/int(info_list[2].split('/')[1])
    print(width, height, frame_rate)
    start = time.time()
    # detec_obj = Detections.objects.get(path=dir)
    # # print(os.sys.getsizeof(detec_obj.json_data))
    # detec = detec_obj.json_data
    print(time.time()-start)
    split_title = dir.path.split('/')
    part = ''
    if len(split_title) >1:
        title = split_title[1]
        if len(split_title) >2:
            part = split_title[2]
    else:
        title = split_title[0]
    new_path=''
    for i in range(len(split_title)-1):
        new_path+=split_title[i]+'/'
    prev=''
    next =''
    if len(part)>1 and part.split('t')[1].isdigit():
        check_next = FolderPath.objects.filter(path=new_path+'part{:02d}'.format(int(part.split('t')[1])+1)).count()
        check_prev = FolderPath.objects.filter(path=new_path+'part{:02d}'.format(int(part.split('t')[1])-1)).count()

        if check_next>0:
            next = FolderPath.objects.get(path=new_path+'part{:02d}'.format(int(part.split('t')[1])+1)).id
        if check_prev>0:
            prev = FolderPath.objects.get(path=new_path+'part{:02d}'.format(int(part.split('t')[1])-1)).id

    data_note = []
    request.session['previous_name'] = title
    if os.path.isfile(dir.abs_path+'/'+str(request.user.username)+'_note.json'):
        with open(dir.abs_path+'/'+str(request.user.username)+'_note.json') as f:
            data_note = json.load(f)
    if request.user is None or request.user.is_authenticated == False:
        print(settings.LOGIN_URL)
        return HttpResponseRedirect(settings.LOGIN_URL)
    return render(request, 'kino_app/video_editing.html', {'id':id, 'title':title, 'part':part, 'path':dir.path, 'abs_path':dir.abs_path, 'width':width, 'height':height, 'frame_rate':round(frame_rate), 'next_id':next, 'prev_id':prev, 'owner':dir.owner,
     'data_note':json.dumps(data_note).replace('\"','\\"')})
    # return render(request, 'kino_app/index.html', {'image' : data_path})

def get_shot_from_spec(shots, type, actors_involved, aspect_ratio):
    ret = None
    acts = []
    for a in actors_involved:
        acts.append(a)
    for s in shots:
        if s['Type'] == type and s['AspectRatio'] == aspect_ratio:
            b1 = True
            for a in s['ActInvolved']:
                if a not in acts:
                  b1 = False
                  break
            if b1 and len(s['ActInvolved']) == len(acts):
                ret = s
                break
    return ret

def get_bbox_from_shot(shots_timeline, frame_num, shots):
    ret = None
    for s in shots_timeline:
        if frame_num <= s['EndFrame'] and frame_num >= s['StartFrame']:
            original_shot = get_shot_from_spec(shots, s['Type'], s['ActInvolved'], s['AspectRatio'])
            if original_shot:
                bb = original_shot['BBoxes'][frame_num]
                if bb and bb[0] != 'null':
                    ret = bb
            break
    return ret;

def video_book(request, id):
    dir = get_object_or_404(FolderPath, pk=id)
    full_vid = dir.path.split('/')[1]
    full_list = FolderPath.objects.filter(path__icontains=full_vid).order_by('path')

    ind = []
    for p in full_list:
        if p.path.split('/')[1] != full_vid:
            full_list = full_list.exclude(path=p.path)

    full_note = []
    if os.path.isfile(full_list[0].abs_path+'/note.txt'):
        with open(full_list[0].abs_path+'/note.txt') as json_file:
            full_note = json.load(json_file)

    print(full_note)
    full_script = []
    full_json_shots = []
    for p in full_list:
        if os.path.isfile(p.abs_path+'/subtitle.vtt'):
            full_script.append(p.abs_path+'/subtitle.vtt')
        full_json_shots.append(p.abs_path+'/shots.json')

    full_tab = []
    cpt=0
    for s in full_script:
        tab = parser_vtt(s)
        for t in tab:
            t['id'] = int(t['start']+cpt*600)
            start = '{min:02d}'.format(min=cpt*10+(math.floor(int(t['start'])/60)%60))+':'+'{sec:02d}'.format(sec=math.floor(int(t['start'])%60))
            end = '{min:02d}'.format(min=cpt*10+(math.floor(int(t['end'])/60)%60))+':'+'{sec:02d}'.format(sec=math.floor(int(t['end'])%60))
            t['start'] = start
            t['end'] = end
        cpt+=1
        full_tab.append(tab)

    full_data = []
    for j in full_json_shots:
        with open(j) as f:
            data = json.load(f)
        end_frame = 0
        for s in data:
            if s['Timeline']==0:
                end_frame = s['EndFrame']
                break
        shots_timeline = []
        shots = []
        for s in data:
            if s['Timeline']==1:
                shots_timeline.append(s)
            else:
                shots.append(s)

        bbox_crop = []
        for f in range(end_frame):
            bbox = get_bbox_from_shot(shots_timeline, f, shots)
            if bbox:
                bbox_crop.append(bbox)
            else:
                bbox_crop.append('null')
        full_data.append(bbox_crop)

    images_folder = os.path.join(settings.MEDIA_ROOT, "kino_app")+'/images/'+str(id)
    full_folders = []
    for p in full_list:
        full_folders.append(os.path.join(settings.MEDIA_ROOT, "kino_app")+'/images/'+str(p.id))

    full_crop = []
    full_full = []
    for images_folder in full_folders:
        crop = []
        full = []
        for root, dirs, files in os.walk(images_folder):
            for f in files:
                if len(f.split('_crop')) > 1:
                    crop.append(f)
                else:
                    full.append(f)
        crop.sort(key=lambda f: int(''.join(filter(str.isdigit, f))))
        full.sort(key=lambda f: int(''.join(filter(str.isdigit, f))))
        crop_dict = {'tab':crop,'id':1}
        full_crop.append(crop_dict)
        full_dict = {'tab':full,'id':1}
        full_full.append(full_dict)

    for i in range(len(full_list)):
        full_crop[i]['id'] = full_list[i].id
        full_full[i]['id'] = full_list[i].id

    return render(request, 'kino_app/video_book.html', {'crop':full_crop, 'full':full_full, 'tab':full_tab, 'path':full_list, 'json_shots':json.dumps(full_data), 'json_notes':json.dumps(full_note).replace('\"','\\"')})

@csrf_exempt
def save_note_video(request):
    id = request.POST.get('id','')
    dir = get_object_or_404(FolderPath, pk=id)
    full_vid = dir.path.split('/')[1]
    full_list = FolderPath.objects.filter(path__icontains=full_vid).order_by('path')
    json_sub = json.loads(request.POST.get('data_sub',''))
    json_notes = json.loads(request.POST.get('note_tab',''))
    print(full_list[0].abs_path)

    with open(full_list[0].abs_path+'/note.txt', 'w') as fp:
        json.dump(json_notes, fp, indent=2)

    full_script = []
    for p in full_list:
        if os.path.isfile(p.abs_path+'/subtitle.vtt'):
            full_script.append(p.abs_path+'/subtitle.vtt')

    cpt=0
    for s in full_script:
        tab = parser_vtt(s)
        i=0
        for t in tab:
            print(str(json_sub[cpt][i]['text']))
            t['text'] = str(json_sub[cpt][i]['text'])
            i+=1
        cpt+=1
        save_vtt(tab,s)
    return HttpResponse('')

def noting_app(request):
    return render(request, 'kino_app/noting.html')

@csrf_exempt
def get_data_detec(request):
    abs_path = request.POST.get('abs_path','')
    dir = get_object_or_404(FolderPath, abs_path=abs_path)
    detec_obj = Detections.objects.get(path=dir)
    detec = detec_obj.json_data

    if(request.method == 'POST'):
        print('post data detec')
        return HttpResponse(json.dumps({'data_detec':detec}), content_type='application/json')
    return HttpResponse('')

@csrf_exempt
def save_note(request):
    abs_path = request.POST.get('abs_path','')
    json_notes = json.loads(request.POST.get('notes',''))
    print(json_notes)
    with open(abs_path+'/'+str(request.user.username)+'_note.json', 'w') as fp:
        json.dump(json_notes, fp, indent=2)
    return HttpResponse('')

@csrf_exempt
def submit(request):
    abs_path = request.POST.get('abs_path','')
    json_detec_path = abs_path+'/detections.json'
    json_timeline_path = abs_path+'/actors_timeline.json'
    json_annot_timeline_path = abs_path+'/annotation_timeline.json'
    json_tracklets_path = abs_path+'/tracklets.json'
    json_shots_path = abs_path+'/shots.json'
    print(json_detec_path)
    data_detec = request.POST.get('detec','')
    if data_detec != 'null':
        dir = get_object_or_404(FolderPath, abs_path=abs_path)
        detec_obj = Detections.objects.get(path=dir)
        detec_obj.json_data = data_detec
        detec_obj.save()
    else:
        print('no detec')

    if os.path.isfile(abs_path+'/subtitle_new.vtt'):
        if os.path.isfile(abs_path+'/subtitle.vtt'):
            os.remove(abs_path+'/subtitle.vtt')
        os.rename(abs_path+'/subtitle_new.vtt',abs_path+'/subtitle.vtt')

    data_annot = request.POST.get('annotation','')
    parse_annot = json.loads(data_annot)
    with open(json_annot_timeline_path, 'w') as fp:
        json.dump(parse_annot, fp, indent=2)

    data_timelines = request.POST.get('timeline','')
    parse_timelines = json.loads(data_timelines)
    with open(json_timeline_path, 'w') as fp:
        json.dump(parse_timelines, fp, indent=2)

    data_tracks = request.POST.get('track','')
    parse_tracks = json.loads(data_tracks)
    with open(json_tracklets_path, 'w') as fp:
        json.dump(parse_tracks, fp, indent=2)

    data_shots = request.POST.get('shots','')
    parse_shots = json.loads(data_shots)
    with open(json_shots_path, 'w') as fp:
        json.dump(parse_shots, fp, indent=2)

    if(request.method == 'POST'):
        print('post submit')
        return HttpResponse(json.dumps({'succes':'geat!!'}), content_type='application/json')
    return HttpResponse('')

def parser_vtt(file):
    f = open(file, "r")
    total = len(open(file, "r").readlines())
    tab = []
    start = 0
    end = 0
    text = ""
    cpt=0
    for line in f:
        if len(line.split('-->')) > 1:
            start = (float(line.split('-->')[0].split(":")[0])*60) + (float(line.split('-->')[0].split(":")[1]))
            end = (float(line.split('-->')[1].split(":")[0])*60) + (float(line.split('-->')[1].split(":")[1]))
            # print(line, start, end)
        elif (start != 0 or end != 0):
            if line.split('\n')[0] == "":
                dict = {"start": start, "end": end, "text": text}
                tab.append(dict)
                text = ""
                end = 0
                start = 0
            else:
                text += line.split('\n')[0]+"\n"
        cpt+=1
        if cpt == total and text != '' and (start != 0 or end != 0):
            dict = {"start": start, "end": end, "text": text}
            tab.append(dict)
    return tab

def to_vtt(total_sec):
    min = math.floor(total_sec/60)
    sec = total_sec%60
    return str(min)+':'+str(sec)

def save_vtt(tab, file):
    # f = open(file, "w")
    with open(file, 'w') as fp:
        string_config = 'WEBVTT\n\n'
        for t in tab:
            string_config += to_vtt(t['start'])+'-->'+to_vtt(t['end'])+'\n'
            for part in t['text'].split('\n'):
                if part != '':
                    string_config += part+'\n'
            string_config += ''+'\n'
        fp.write('{0}'.format(string_config))

def upload_rough_cut(request):
    print(request)
    # print(request.FILES, request.POST)
    if request.method == 'POST' and request.FILES:
        myfile = request.FILES['fileToUpload']
        abs_path = request.POST.get('abs_path','')
        print(request.FILES, '\n', myfile, abs_path)
        info = str(request.FILES).split('[')[1].split('(')[1].split('/')[1].split(')')[0]
        print(info)
        if info == 'json':
            print('json')
            fs = FileSystemStorage()
            filename = fs.save(myfile.name, myfile)
            with open(settings.MEDIA_ROOT+'/'+filename) as f:
                data = json.load(f)
            print(json.dumps(data))
            return_data = json.dumps(data)
            os.remove(settings.MEDIA_ROOT+'/'+filename)
            print('filename',filename)
            return HttpResponse(json.dumps({'type':'json', 'msg':'Great', 'data':return_data}), content_type='application/json')
        elif info == "vtt" or info == "octet-stream":
            print('vtt')
            fs = FileSystemStorage(location=abs_path)
            if os.path.isfile(abs_path+'/subtitle_new.vtt'):
                os.remove(abs_path+'/subtitle_new.vtt')
            filename = fs.save('subtitle_new.vtt', myfile)
            src = abs_path+'/'+filename
            print('filename',filename)
            sub = parser_vtt(src)
            # os.remove(settings.MEDIA_ROOT+'/'+filename)
            return HttpResponse(json.dumps({'type':'vtt', 'msg':'Great', 'sub':sub}), content_type='application/json')
        else:
            print('not json')
            return HttpResponse(json.dumps({'msg':'Not Json'}), content_type='application/json')

@csrf_exempt
def load_sub(request):
    abs_path = request.POST.get('abs_path','')
    src = abs_path+'/subtitle.vtt'
    sub = parser_vtt(src)
    # print(sub)
    if(request.method == 'POST'):
        print('ret')
        return HttpResponse(json.dumps({'type':'vtt', 'msg':'Great', 'sub':sub}), content_type='application/json')
    return HttpResponse('')

@csrf_exempt
def stabilize(request):
    start = time.time()
    data_shots = request.POST.get('shot','')
    data_mask = request.POST.get('mask','')
    aspect_ratio = request.POST.get('aspect_ratio','')
    video_width = request.POST.get('video_width','')
    video_height = request.POST.get('video_height','')
    actors_involved = json.loads(request.POST.get('actors_involved',''))
    crop_factor = np.array(json.loads(request.POST.get('crop_factor','')), dtype = np.float32)
    apparent_motion = np.array(json.loads(request.POST.get('apparent_motion','')), dtype = np.float32)
    external_boundaries = np.array(json.loads(request.POST.get('external_bound','')), dtype = np.float32)
    screen_pos = np.array(json.loads(request.POST.get('screen_pos','')), dtype = np.float32)
    type = request.POST.get('type','')
    shots_frame = json.loads(data_shots)
    mask = json.loads(data_mask)
    imageSize = [int(video_width), int(video_height)]
    print(imageSize)
    # shots_frame = stabilize_shot(np.array(shots_frame, dtype = np.float32), mask, np.float32(aspect_ratio), int(video_width), int(video_height))
    shots_frame = stab.stabilize_chunk(np.array(shots_frame, dtype = np.float32), np.float32(aspect_ratio), mask, imageSize, 24, crop_factor, apparent_motion, external_boundaries, screen_pos)
    print(type, actors_involved)
    # print(crop_factor[0][:, 1])
    end = time.time()
    print ('Exec time ',end-start)
    return HttpResponse(json.dumps({'bboxes':shots_frame.tolist(), 'type':type, 'actors_involved':actors_involved}), content_type='application/json')

@csrf_exempt
def fullhd(request):
    start = time.time()
    img_time = float(request.POST.get('time',''))
    abs_path = request.POST.get('abs_path','')
    print(abs_path)
    num = math.floor(img_time)
    data_path = os.path.join(settings.MEDIA_ROOT, "kino_app/image/")
    shutil.rmtree(data_path)
    os.makedirs(data_path)
    img_path = data_path+str(num)+'.jpg'
    filename = abs_path+'/original_hevc.mov'
    print(img_path)
    subprocess.check_call("ffmpeg -nostdin -y -v quiet -ss {0} -i {1} -q:v 2 -frames:v 1 {2}".format(img_time, filename, img_path), shell=True)
    data_path = "/media/kino_app/image/"+str(num)+".jpg"
    end = time.time()
    sec = (end-start)%60
    print('Real exec time ',math.floor((end-start)/60),':',math.floor(sec), ':', int((sec%1)*100), ' in seconds ', end-start)
    return HttpResponse(json.dumps({'src':data_path}), content_type='application/json')

@csrf_exempt
def processKeyFrames(request):
    abs_path = request.POST.get('abs_path','')
    dir = get_object_or_404(FolderPath, abs_path=abs_path)
    key_frames = json.loads(request.POST.get('KeyFrames',''))
    # print(key_frames)
    filename = abs_path+'/original_hevc.mov'
    folder=os.path.join(settings.MEDIA_ROOT,  "kino_app")+'/images/'+str(dir.id)+'/'
    if os.path.isdir(folder):
        shutil.rmtree(folder)
        os.makedirs(folder)
    else:
        os.makedirs(folder)
    for k in key_frames:
        print(k['Time'])
        img_out_e = folder+str(k['Time'])+".jpg"
        img_out_r = folder+str(k['Time'])+"_crop.jpg"
        bbox = [int(k['BBox'][0])*4, int(k['BBox'][1])*4, int(k['BBox'][2])*4, int(k['BBox'][3])*4]
        print(bbox)
        w = math.ceil((bbox[2] - bbox[0])/2)*2
        h = math.ceil((bbox[3] - bbox[1])/2)*2
        x = bbox[0]
        y = bbox[1]
        print(x,y,w,h)
        img_inter = folder+"inter.png"
        subprocess.check_call("ffmpeg -nostdin -y -v quiet -ss {0} -i {1} -q:v 2 -frames:v 1 {2}".format(float(k['Time']), filename, img_inter), shell=True)
        subprocess.check_call("convert -quality 50 {0} {1}".format(img_inter, img_out_e), shell=True)
        os.remove(img_inter)
        subprocess.check_call("convert {0} -crop {1}x{2}+{3}+{4} +repage {5}".format(img_out_e, w, h, x, y, img_out_r), shell=True)
    return HttpResponse('')

@csrf_exempt
def reframe(request):
    start = time.time()
    bbox_string = request.POST.get('bboxes','')
    abs_path = request.POST.get('abs_path','')
    bbox = np.array(json.loads(bbox_string))
    bbox[:,] *= 4
    print(len(bbox))

    folder_path = os.path.join(settings.MEDIA_ROOT, 'kino_app/data/out')
    crop_path = folder_path + "/out"
    if os.path.isdir(folder_path) :
        shutil.rmtree(folder_path)
    os.makedirs(folder_path)
    os.makedirs(crop_path)
    videoname = abs_path+'/original_hevc.mov'

    subprocess.check_call("ffmpeg -i {0} -q:v 0 {1}/%04d.jpg -hide_banner".format(videoname, folder_path), shell=True)

    reframe_vid = abs_path+'/reframe.mov'
    audio_vid = abs_path+'/output-audio.mp4'
    out_vid = abs_path+'/output-video.mov'

    j = 0
    for path, dirs, files in os.walk(folder_path):
        files.sort()
        i = 0
        # print(j, path, dirs, files)
        if j==0:
            for filename in files:
                img_path = folder_path + '/' + filename
                img_out = crop_path + '/' + filename
                w = math.ceil((bbox[i][2] - bbox[i][0])/2)*2
                h = math.ceil((bbox[i][3] - bbox[i][1])/2)*2
                x = bbox[i][0]
                y = bbox[i][1]
                subprocess.check_call("convert {0} -crop {1}x{2}+{3}+{4} +repage {5}".format(img_path, w, h, x, y, img_out), shell=True)
                i+=1
                print(i)
        j+=1

    subprocess.check_call("ffmpeg -y -framerate 24 -i {0}/%04d.jpg -q:v 0 {1}".format(crop_path, reframe_vid), shell=True)

    subprocess.check_call("ffmpeg -y -i {0} -i {1} -c copy {2}".format(reframe_vid, audio_vid, out_vid), shell=True)

    shutil.rmtree(folder_path)

    end = time.time()

    print("Real execution time is ", end-start)

    if os.path.isfile(out_vid):
        response = HttpResponse(json.dumps({'src':'/media/kino_app/data/output-video.mov'}))
        return response
    else:
        print('no file')
        return HttpResponse('')

def cropCv(image, bbox, size, i):
    print(i)
    x = int(bbox[0])
    y = int(bbox[1])
    w = int(math.ceil((bbox[2] - bbox[0])/2)*2)
    h = int(math.ceil((bbox[3] - bbox[1])/2)*2)
    return cv2.resize(image[y:y+h, x:x+w],(size[0],size[1]),interpolation=cv2.INTER_LANCZOS4)

def crop(image):
    if crop.counter < len(crop.bboxes) :
        bbox = crop.bboxes[crop.counter]
        crop.counter += 1
        x = int(bbox[0])
        y = int(bbox[1])
        w = int(math.ceil((bbox[2] - bbox[0])/2)*2)
        h = int(math.ceil((bbox[3] - bbox[1])/2)*2)
        # print(w/h, crop.size[0]/crop.size[1], image.dtype)
        if math.isclose((bbox[2] - bbox[0])/(bbox[3] - bbox[1]), crop.size[0]/crop.size[1], rel_tol=1e-2):
            return cv2.resize(image[y:y+h, x:x+w],(crop.size[0],crop.size[1]),interpolation=cv2.INTER_LANCZOS4)
        else:
            print((bbox[2] - bbox[0]), (bbox[3] - bbox[1]), (bbox[2] - bbox[0])/(bbox[3] - bbox[1]))
            blank_image = np.zeros((crop.size[1],crop.size[0],3), dtype='uint8')
            if w<h:
                height = int(crop.size[1])
                width = int(height*(w/h))
                if width > int(crop.size[0]):
                    width=int(crop.size[0])
                img = cv2.resize(image[y:y+h, x:x+w],(width,height),interpolation=cv2.INTER_LANCZOS4)
                x_off = int(abs(crop.size[0]-width)/2)

                if x_off+width > int(crop.size[0]):
                    x_off=0
                blank_image[0:height, x_off:x_off+width] = img

            else:
                width = int(crop.size[0])
                height = int(width/(w/h))
                if height > int(crop.size[1]):
                    height=int(crop.size[1])
                img = cv2.resize(image[y:y+h, x:x+w],(width,height),interpolation=cv2.INTER_LANCZOS4)
                y_off = int(abs(crop.size[1]-height)/2)
                if y_off+height > int(crop.size[1]):
                    y_off=0
                blank_image[y_off:y_off+height, 0:width]= img
            return blank_image
    elif crop.counter >= len(crop.bboxes):
        bbox = crop.bboxes[len(crop.bboxes)-1]
        crop.counter += 1
        x = int(bbox[0])
        y = int(bbox[1])
        w = int(math.ceil((bbox[2] - bbox[0])/2)*2)
        h = int(math.ceil((bbox[3] - bbox[1])/2)*2)
        # print(w/h, crop.size[0]/crop.size[1], image.dtype)
        if math.isclose((bbox[2] - bbox[0])/(bbox[3] - bbox[1]), crop.size[0]/crop.size[1], rel_tol=1e-2):
            return cv2.resize(image[y:y+h, x:x+w],(crop.size[0],crop.size[1]),interpolation=cv2.INTER_LANCZOS4)
    else:
        return image

@csrf_exempt
def reframeCv(request):
    start = time.time()
    bbox_string = request.POST.get('bboxes','')
    abs_path = request.POST.get('abs_path','')
    bbox = np.array(json.loads(bbox_string))
    bbox[:,] *= 4
    print(len(bbox))

    videoname = abs_path+'/original_hevc.mov'
    reframe_final = abs_path+'/reframe-audio.mp4'
    audio_vid = abs_path+'/output-audio.mp4'
    out_vid = abs_path+'/output-video.avi'
    cap = cv2.VideoCapture(videoname)

    frame_width = int(cap.get(3))
    frame_height = int(cap.get(4))
    print('START: ',time.time())
    out = cv2.VideoWriter(out_vid,cv2.VideoWriter_fourcc(*'MJPG'), 24, (frame_width,frame_height))

    while(cap.isOpened()):
        ret, frame = cap.read()
        num_fr = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
        i = num_fr-1
        if ret == True:
            print(i)
            i+=1
            out.write(crop(frame, bbox[i], [frame_width,frame_height]))
        else:
            break
    cap.release()
    out.release()

    subprocess.check_call("ffmpeg -y -i {0} -i {1} -c copy {2}".format(out_vid, audio_vid, reframe_final), shell=True)

    os.remove(out_vid)
    # os.remove(reframe_vid)

    end = time.time()

    sec = (end-start)%60
    print('Real exec time ',math.floor((end-start)/60),':',math.floor(sec), ':', int((sec%1)*100), ' in seconds ', end-start)

    if os.path.isfile(reframe_final):
        response = HttpResponse(json.dumps({'src':'/media/kino_app/data/reframe-audio.mp4'}))
        return response
    else:
        print('no file')
        return HttpResponse('')


@csrf_exempt
def reframeMov(request):
    start = time.time()
    bbox_string = request.POST.get('bboxes','')
    abs_path = request.POST.get('abs_path','')
    width = int(request.POST.get('width',''))
    aspect_ratio = float(request.POST.get('aspect_ratio',''))
    bbox = np.array(json.loads(bbox_string))
    videoname = abs_path+'/original_hevc.mov'#'/media/kinoai/AUTOCAM1/La_Fabrique_Episode_1'+'/10-20.mov'


    hevc_w = int(subprocess.check_output('ffprobe -i {0} -show_entries stream=width -v quiet -of csv="p=0"'.format(videoname), shell=True ,stderr=subprocess.STDOUT))
    factor = hevc_w / width
    print(hevc_w, factor, aspect_ratio)
    bbox[:,] *= factor

    res = bbox[:,2] - bbox[:,0]
    max = int(sum(res)/len(res))
    scale_factor = 1
    if max > 0:
        scale_factor = 4
    if max > 1024:
        scale_factor = 2
    if max > 2048:
        scale_factor = 1

    print(max, scale_factor)
    crop.bboxes = bbox
    crop.counter = 0
    print(len(bbox))

    out_vid = abs_path+'/output-video.mp4'
    print(videoname)
    clip = VideoFileClip(videoname)
    width = clip.size[0]
    height = clip.size[1]
    if aspect_ratio < clip.size[0]/clip.size[1]:
        height = clip.size[1]
        width = height*aspect_ratio
    elif aspect_ratio > clip.size[0]/clip.size[1]:
        width = clip.size[0]
        height = width*aspect_ratio
    clip.size = [int(width/scale_factor),int(height/scale_factor)]
    print(clip.size)
    crop.size = clip.size

    new_clip = clip.fl_image( crop )
    new_clip.write_videofile(out_vid, threads=16, preset='ultrafast')

    end = time.time()

    d = out_vid.split('/media/')
    resp = '/media/'+d[1]

    print(end-start)

    if os.path.isfile(out_vid):
        response = HttpResponse(json.dumps({'src':resp}))
        return response
    else:
        print('no file')
        return HttpResponse('')
