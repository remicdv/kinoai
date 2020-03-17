from django.shortcuts import get_object_or_404, render, redirect
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.views import generic
from django.urls import reverse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import make_password, check_password, is_password_usable
from django.contrib.auth.models import Permission, User
from django.views.decorators.csrf import csrf_exempt
from .models import FolderPath, Detections, Project
from django.core.files.storage import FileSystemStorage
from django.views.decorators.cache import never_cache
from django.utils.dateparse import parse_date

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
                    if name_in != 'mpd' and name_in != 'images':
                        ret = True
            if (name != 'mpd' and name != 'images') and not ret:
                d = dir_path.split('/kino_app/data/')
                list.append(d[1])
                obj, created = FolderPath.objects.get_or_create(
                    path=d[1],
                    abs_path=dir_path,
                    owner = user
                )
    return list

def extractImagesAndDelete(list, len_old):
    # print(list)
    if len(list) != len_old:
        img_folder_path = os.path.join(settings.MEDIA_ROOT, "kino_app/index_images/")
        for p in FolderPath.objects.all():
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
        if not os.path.isdir(os.path.join(settings.MEDIA_ROOT, 'kino_app')):
            os.mkdir(os.path.join(settings.MEDIA_ROOT, 'kino_app'))
            os.mkdir(os.path.join(settings.MEDIA_ROOT, 'kino_app/data'))
            
        projects_name = os.listdir(os.path.join(settings.MEDIA_ROOT, 'kino_app/data'))

        old = len(FolderPath.objects.all())
        list = []
        projects = []
        data_project = Project.objects.all().order_by('title')
        for project_obj in data_project:
            print(project_obj.title.replace(" ", "_"))
            name = project_obj.title.replace(" ", "_")
            path = os.path.join(settings.MEDIA_ROOT, 'kino_app/data/'+name)
            if not os.path.isdir(path):
                project_obj.delete()
            else:
                project = {}
                project["Name"] = name
                project["ZeroElem"] = "true"
                for type in ['data','notes','partition']:
                    if len(os.listdir(os.path.join(settings.MEDIA_ROOT, 'kino_app/'+type+'/'+name))) != 0 :
                        project["ZeroElem"] = "false"
                        break
                project["Company"] = project_obj.company
                project["Date"] = project_obj.date
                if project_obj.password == None or project_obj.password == "":
                    project["Password"] = False
                else:
                    project["Password"] = True
                project["List"] = os.listdir(path)
                list += list_files(path, None)
                project["List"].sort()
                projects.append(project)
        # print(len(list),old)
        extractImagesAndDelete(list, old)
        if request.user is None or request.user.is_authenticated == False:
            print(settings.LOGIN_URL)
            return HttpResponseRedirect(settings.LOGIN_URL)
        else:
            return render(request, 'kino_app/index.html', {'data_projects':data_project, 'projects':projects,'take_list':FolderPath.objects.order_by('path')})

@csrf_exempt
def set_previous(request):
    name = request.POST.get('name','')
    request.session['previous_name'] = name
    request.session['active_project'] = ''
    return HttpResponse('')

def launch_preprocess(name, username):
    utility = settings.MEDIA_ROOT+'utility'
    shutil.move(settings.MEDIA_ROOT+name,utility)
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
        title = request.POST['title']
        myfile = request.FILES['fileToUpload']
        print(request.FILES, '\n', myfile)
        info = str(request.FILES).split('[')[1].split('(')[1].split('/')[0]
        if info == 'video':
            fs = FileSystemStorage()
            filename = fs.save(myfile.name, myfile)
            old = filename
            filename = filename.replace(" ", "_")
            os.rename(settings.MEDIA_ROOT+old,settings.MEDIA_ROOT+filename)
            uploaded_file_url = fs.url(filename)
            if launch_preprocess(filename, title.replace(" ", "_")):
                print('finished')
                return redirect('kino_app:index')
            else:
                print('already')
                return render(request, 'kino_app/upload.html', {'msg':'Already added','title':title})
        else:
            print('not video')
            return render(request, 'kino_app/upload.html', {'msg':'Not a video','title':title})
    else:
        if request.method == 'POST':
            title = request.POST['title']
            return render(request, 'kino_app/upload.html', {'title':title})
        return render(request, 'kino_app/upload.html')

def preprocess(request):
    print(request)
    return render(request, 'kino_app/process.html')

@csrf_exempt
def check_project(request):
    if request.method == 'POST':
        title = request.POST['title']
        password = request.POST['password']
        proj = get_object_or_404(Project, title=title)
        if check_password(password, proj.password):
            request.session['active_project'] = title.replace(" ", "_")
        else:
            request.session['active_project'] = 'wrong password'
        return redirect('kino_app:index')

def modif_path(old, new):
    list_word = old.split('/')
    list_word[0] = new
    return '/'.join(list_word)

def modif_abs_path(old, new):
    first_list = old.split('data/')
    second_list = first_list[1].split('/')
    second_list[0] = new
    first_list[1] = '/'.join(second_list)
    return 'data/'.join(first_list)

@csrf_exempt
def edit_project(request):
    if request.method == 'POST':
        title = request.POST['title'].replace("_", " ")
        title_replace = title.replace(' ','_')
        old_title = request.POST['old_title']
        old_replace = old_title.replace("_", " ")
        company = request.POST['company']
        date = request.POST['date']
        print(title, date, company)
        proj = get_object_or_404(Project, title=old_replace)
        proj.title = title
        for root, dirs, files in os.walk(os.path.join(settings.MEDIA_ROOT, 'kino_app/data/')):
            for d in dirs:
                if d == old_title:
                    os.rename(os.path.join(settings.MEDIA_ROOT, 'kino_app/data/'+d), os.path.join(settings.MEDIA_ROOT, 'kino_app/data/'+title_replace))
                    break
            break
        for root, dirs, files in os.walk(os.path.join(settings.MEDIA_ROOT, 'kino_app/index_images/')):
            for d in dirs:
                if d == old_title:
                    os.rename(os.path.join(settings.MEDIA_ROOT, 'kino_app/index_images/'+d), os.path.join(settings.MEDIA_ROOT, 'kino_app/index_images/'+title_replace))
                    break
            break
        folders = FolderPath.objects.filter(path__icontains=old_title)
        for f in folders:
            new_path = modif_path(f.path, title_replace)
            new_abs_path = modif_abs_path(f.abs_path, title_replace)
            f.path = new_path
            f.abs_path = new_abs_path
            f.save()
        proj.company = company
        proj.date = parse_date(date)
        proj.save()
        request.session['active_project'] = old_title.replace(" ", "_")
        print(proj)
    return redirect('kino_app:index')

@csrf_exempt
def remove_project(request):
    if request.method == 'POST':
        title = request.POST['title']
        for type in ['data', 'partition', 'notes']:
            path = os.path.join(settings.MEDIA_ROOT, 'kino_app/'+type+'/'+title)
            if os.path.isdir(path):
                if not os.listdir(path):
                    shutil.rmtree(path)
    return HttpResponse(json.dumps({'success':title}), content_type='application/json')


def create_project(request):
    if request.method == 'POST':
        title = request.POST['title']
        date = parse_date(request.POST['date'])
        company = request.POST['company']
        password = request.POST['password']
        if len(Project.objects.filter(title=title))==0:
            if password == '':
                obj, created = Project.objects.get_or_create(
                    title=title,
                    company=company,
                    date = date
                )
            else:
                obj, created = Project.objects.get_or_create(
                    title=title,
                    company=company,
                    date = date,
                    password = make_password(password)
                )
            name = title.replace(" ", "_")
            for type in ['data', 'partition', 'notes']:
                path = os.path.join(settings.MEDIA_ROOT, 'kino_app/'+type+'/'+name)
                if not os.path.isdir(path):
                    os.mkdir(path)
            print(obj, created)
    return redirect('kino_app:index')

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
        title = split_title[0]+'/'+split_title[1]
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

    if not os.path.isfile(dir.abs_path+'/'+str(request.user.username)+'_note.json'):
        file = open(dir.abs_path+'/'+str(request.user.username)+'_note.json',"w")
        file.write("[]")
        file.close()

    if not os.path.isfile(dir.abs_path+'/'+str(request.user.username)+'_timelines.json'):
        with open(dir.abs_path+'/shots.json') as f:
            data = json.load(f)
        shots_timeline = []
        for s in data:
            if s['Timeline']==1:
                shots_timeline.append(s)
        file = open(dir.abs_path+'/'+str(request.user.username)+'_timelines.json',"w")
        file.write(json.dumps(shots_timeline))
        file.close()

    data_note = []
    data_timelines = []
    request.session['previous_name'] = title
    for root, subdirs, files in os.walk(dir.abs_path):
        for file in files:
            if '_note.json' in file:
                print(file.split('_')[0], file.split('_')[1])
                note_obj = {}
                note_obj['User'] = file.split('_')[0]
                tab = []
                with open(dir.abs_path+'/'+file) as f:
                    tab = json.load(f)
                for t in tab:
                    t['Text'] = t['Text'].replace('\"','\\"').replace('\n','\\n')
                note_obj['Note'] = tab
                data_note.append(note_obj)
            if '_timelines.json' in file:
                data_timelines.append(file.split('_')[0])
    if request.user is None or request.user.is_authenticated == False:
        print(settings.LOGIN_URL)
        return HttpResponseRedirect(settings.LOGIN_URL)
    return render(request, 'kino_app/video_editing.html', {'id':id, 'title':split_title[1], 'part':part, 'path':dir.path, 'abs_path':dir.abs_path, 'width':width, 'height':height, 'frame_rate':round(frame_rate), 'next_id':next, 'prev_id':prev, 'owner':dir.owner,
     'data_note':json.dumps(data_note), 'username':request.user.username, 'data_timelines':json.dumps(data_timelines)})
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

    if not os.path.isfile(full_list[0].abs_path+'/'+str(request.user.username)+'_note.txt'):
        file = open(full_list[0].abs_path+'/'+str(request.user.username)+'_note.txt',"w")
        file.write("[]")
        file.close()

    full_note = []
    for root, dirs, files in os.walk(full_list[0].abs_path):
        for file in files:
            if "_note.txt" in file:
                obj = {}
                with open(full_list[0].abs_path+'/'+file) as json_file:
                    obj['Notes'] = json.load(json_file)
                obj['Creator'] = file.split('_')[0]
                full_note.append(obj)

    full_script = []
    full_json_shots = []
    for p in full_list:
        if os.path.isfile(p.abs_path+'/subtitle.vtt'):
            full_script.append(p.abs_path+'/subtitle.vtt')
        else:
            return HttpResponseRedirect('/kino_app')
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

    full_folders = []
    for p in full_list:
        full_folders.append(p.abs_path+'/images/')

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
        full_crop[i]['path'] = full_list[i].path
        full_full[i]['id'] = full_list[i].id
        full_full[i]['path'] = full_list[i].path

    return render(request, 'kino_app/video_book.html', {'username':request.user.username ,'crop':full_crop, 'full':full_full, 'tab':full_tab, 'path':full_list, 'json_shots':json.dumps(full_data), 'json_notes':json.dumps(full_note).replace('\"','\\"'), 'username':request.user.username})

@csrf_exempt
def save_note_video(request):
    id = request.POST.get('id','')
    dir = get_object_or_404(FolderPath, pk=id)
    full_vid = dir.path.split('/')[1]
    full_list = FolderPath.objects.filter(path__icontains=full_vid).order_by('path')
    json_sub = json.loads(request.POST.get('data_sub',''))
    json_notes = json.loads(request.POST.get('note_tab',''))
    print(full_list[0].abs_path)

    with open(full_list[0].abs_path+'/'+str(request.user.username)+'_note.txt', 'w') as fp:
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

@csrf_exempt
def download_notes(request):
    notes = json.loads(request.POST.get('notes',''))
    media = os.listdir('media')
    for item in media:
        if item.endswith(".txt"):
            os.remove(os.path.join('media/', item))
    response = []
    for note in notes:
        file = open("media/"+note['Title']+".txt","w")
        file.write(note['Title']+'\n')
        for content in note['Content']:
            file.write(content['Start']+' - '+content['End']+' : '+content['Text']+'\n')
        file.close()
        response.append({'src':'/media/'+note['Title']+'.txt','title':note['Title'],'extention':'.txt'})
    return HttpResponse(json.dumps(response))

@csrf_exempt
def save_notes(request):
    notes = json.loads(request.POST.get('notes',''))
    project = request.POST.get('project','')
    print(request.user.username)
    dir = os.path.join(settings.MEDIA_ROOT, 'kino_app/notes/'+str(project))
    if not os.path.isdir(dir):
        os.mkdir(dir)
    with open(dir+'/'+str(request.user.username)+'_notes.json', 'w') as fp:
        json.dump(notes, fp, indent=2)

    # media = os.listdir('media')
    # for item in media:
    #     if item.endswith(".txt"):
    #         os.remove(os.path.join('media/', item))
    # response = []
    # for note in notes:
    #     file = open("media/"+note['Title']+".txt","w")
    #     file.write(note['Title']+'\n')
    #     for content in note['Content']:
    #         file.write(content['Start']+' - '+content['End']+' : '+content['Text']+'\n')
    #     file.close()
    #     response.append({'src':'/media/'+note['Title']+'.txt','title':note['Title'],'extention':'.txt'})
    return HttpResponse('')

@csrf_exempt
def download_subs(request):
    notes = json.loads(request.POST.get('notes',''))
    media = os.listdir('media')
    for item in media:
        if item.endswith(".vtt"):
            os.remove(os.path.join('media/', item))
    response = []
    for note in notes:
        file = open("media/"+note['Title']+".vtt","w")
        file.write('WEBVTT\n\n')
        for content in note['Content']:
            file.write(content['Start']+'.000 --> '+content['End']+'.000\n'+content['Text']+'\n\n')
        response.append({'src':'/media/'+note['Title']+'.vtt','title':note['Title'],'extention':'.vtt'})
        file.close()
    return HttpResponse(json.dumps(response))

def corpus_search(request, project):

    if not os.path.isdir(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project))):
        os.mkdir(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project)))

    if not os.path.isfile(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project)+"/actors.json")):
        file = open(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project)+"/actors.json"),'w')
        file.write('[]')
        file.close()

    with open(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project)+"/actors.json")) as json_file:
        actors = json.load(json_file)

    if not os.path.isfile(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project)+"/partition_text.json")):
        file = open(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project)+"/partition_text.json"),'w')
        file.write('[]')
        file.close()

    with open(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project)+"/partition_text.json")) as json_file:
        partitions = json.load(json_file)
        for p in partitions:
            if p['html']:
                p['html'] = p['html'].replace('\n','')
    corpus = []
    for root, dirs, files in os.walk(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project))):
        for file in files:
            if ".txt" in file:
                obj = {}
                text = ""
                with open(os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+str(project)+"/"+file),'r') as json_file:
                    text = json_file.readlines()
                obj['Content'] = "".join(text).replace('\"','\\"').replace('\n','\\n').replace('\t','\\t')
                obj['Title'] = file.split('.')[0].replace('_',' ').replace('\"','\\"').replace('\n','\\n')
                corpus.append(obj)
        break
    return render(request, 'kino_app/corpus_search.html', {'data':json.dumps(corpus), 'partitions':json.dumps(partitions), 'actors':json.dumps(actors), 'project':str(project)})

@csrf_exempt
def add_text(request):
    text = json.loads(request.POST.get('new_text',''))
    project = str(request.POST.get('project',''))
    dir = os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+project+'/')
    title = text['Title'].replace('\n',' ').replace('\t',' ')
    if not os.path.isfile(dir+text['Title']+'.txt'):
        file = open(dir+title+'.txt',"w")
        file.write(text['Content'])
        file.close()
    return HttpResponse('')

@csrf_exempt
def remove_text(request):
    removed_text = json.loads(request.POST.get('removed_text',''))
    project = str(request.POST.get('project',''))
    dir = os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+project+'/')
    for title in removed_text:
        os.remove(dir+title+'.txt')
    return HttpResponse('')

@csrf_exempt
def save_partition_text(request):
    partition = json.loads(request.POST.get('partition',''))
    project = str(request.POST.get('project',''))
    dir = os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+project+'/')
    with open(dir+"partition_text.json", 'w') as fp:
        json.dump(partition, fp, indent=2)
    return HttpResponse('')

@csrf_exempt
def add_actor_corpus(request):
    actors = json.loads(request.POST.get('actors',''))
    project = str(request.POST.get('project',''))
    print(actors)
    dir = os.path.join(settings.MEDIA_ROOT, "kino_app/partition/"+project+"/")
    with open(dir+"actors.json", 'w') as fp:
        json.dump(actors, fp, indent=2)
    return HttpResponse('')

def noting_app(request, project):
    dir = os.path.join(settings.MEDIA_ROOT, "kino_app/notes/"+str(project))

    if not os.path.isdir(dir):
        os.mkdir(dir)

    if not os.path.isfile(dir+'/'+str(request.user.username)+'_notes.json'):
        file = open(dir+'/'+str(request.user.username)+'_notes.json','w')
        file.write('[]')
        file.close()

    user_data = []
    for root, subdirs, files in os.walk(dir):
        for file in files:
            obj = {}
            obj["user"] = file.split('_')[0]
            print(root+'/'+file)
            if os.path.isfile(root+'/'+file):
                with open(root+'/'+file) as json_file:
                    obj["data"] = json.load(json_file)
                    for note in obj["data"]:
                        for text in note["Content"]:
                            text["Text"] = text["Text"].replace('\"','\\"').replace('\n','\\n').replace('\t','\\t')
            user_data.append(obj)

    return render(request, 'kino_app/noting.html', {'username':str(request.user.username), 'project':str(project), 'user_notes':json.dumps(user_data)})

@csrf_exempt
def set_library_false(request):
    request.session['active_library'] = "false"
    return HttpResponse('')

def upload_video_library(request):
    if request.method == 'POST' and request.FILES:
        project = request.POST['project']
        myfile = request.FILES['fileToUpload']
        info = str(request.FILES).split('[')[1].split('(')[1].split('/')[0]
        print(info)
        if info == 'video':
            fs = FileSystemStorage()
            filename = fs.save(myfile.name, myfile)
            dir = os.path.join(settings.MEDIA_ROOT, "kino_app/videos_library/"+str(project)+"/videos")
            if os.path.isfile(os.path.join(dir, filename)):
                i=1;
                while(os.path.isfile(os.path.join(dir, filename.split('.')[0]+'('+str(i)+').'+filename.split('.')[1]))):
                  i+=1
                os.rename(os.path.join(settings.MEDIA_ROOT,filename), os.path.join(settings.MEDIA_ROOT,filename.split('.')[0]+'('+str(i)+').'+filename.split('.')[1]))
                filename = filename.split('.')[0]+'('+str(i)+').'+filename.split('.')[1]
            shutil.move(os.path.join(settings.MEDIA_ROOT, filename),dir)
            os.chmod(dir+'/'+filename,0o644)
            request.session['active_library'] = "true"
            return redirect('kino_app:videos_library_app',project=project)
        if info == 'audio':
            fs = FileSystemStorage()
            filename = fs.save(myfile.name, myfile)
            dir = os.path.join(settings.MEDIA_ROOT, "kino_app/videos_library/"+str(project)+"/audios")
            if os.path.isfile(os.path.join(dir, filename)):
                i=1;
                while os.path.isfile(os.path.join(dir, filename.split('.')[0]+'('+str(i)+').'+filename.split('.')[1])):
                  i+=1
                os.rename(os.path.join(settings.MEDIA_ROOT,filename), os.path.join(settings.MEDIA_ROOT,filename.split('.')[0]+'('+str(i)+').'+filename.split('.')[1]))
                filename = filename.split('.')[0]+'('+str(i)+').'+filename.split('.')[1]
            shutil.move(os.path.join(settings.MEDIA_ROOT, filename),dir)
            os.chmod(dir+'/'+filename,0o644)
            request.session['active_library'] = "true"
            return redirect('kino_app:videos_library_app',project=project)
    return redirect('kino_app:videos_library_app',project=project)

@csrf_exempt
def remove_video_library(request):
    project = str(request.POST['project'])
    dir = os.path.join(settings.MEDIA_ROOT, str(request.POST['path'])[1:])
    print(dir)
    if os.path.isfile(dir):
        os.remove(dir)
        request.session['active_library'] = "true"
    return redirect('kino_app:videos_library_app',project=project)

def check_password_library(request):
    print(request)
    if request.method == 'POST':
        password = request.POST['password']
        project = request.POST['project']
        if password == 'sourisrat':
            request.session['active_library'] = "true"
        else:
            request.session['active_library'] = "false"
        return redirect('kino_app:videos_library_app',project=project)

def videos_library_app(request, project):
    if not os.path.isdir(os.path.join(settings.MEDIA_ROOT, "kino_app/videos_library")):
        os.mkdir(os.path.join(settings.MEDIA_ROOT, "kino_app/videos_library"))
    dir = os.path.join(settings.MEDIA_ROOT, "kino_app/videos_library/"+str(project))
    if not os.path.isdir(dir):
        os.mkdir(dir)
    if not os.path.isdir(dir+'/audios'):
        os.mkdir(dir+'/audios')
    if not os.path.isdir(dir+'/videos'):
        os.mkdir(dir+'/videos')
    videos = []
    audios = []
    for root, subdirs, f in os.walk(dir):
        for sub in subdirs:
            print(sub)
            if sub == "audios":
                for r, s, files in os.walk(root+'/'+sub):
                    for file in files:
                        print(file)
                        obj = {}
                        obj['Name'] = file.split('.')[0]
                        obj['src'] = "/media/kino_app/videos_library/"+str(project)+'/audios/'+file
                        audios.append(obj)
            if sub == "videos":
                for r, s, files in os.walk(root+'/'+sub):
                    for file in files:
                        print(file)
                        obj = {}
                        obj['Name'] = file.split('.')[0]
                        obj['src'] = "/media/kino_app/videos_library/"+str(project)+'/videos/'+file
                        videos.append(obj)

    return render(request, 'kino_app/videos_library.html', {'username':str(request.user.username), 'project':str(project), 'videos':videos, 'audios':audios})

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
def save_partitions(request):
    abs_path = request.POST.get('abs_path','')
    vtt_partitions = json.loads(request.POST.get('partitions',''))
    json_partitions = json.loads(request.POST.get('partitions_json',''))
    save_vtt(vtt_partitions, abs_path+'/subtitle.vtt')
    with open(abs_path+'/partitions_objects.json', 'w') as fp:
        json.dump(json_partitions, fp, indent=2)
    return HttpResponse('')

def get_queryset_from_name(test_name):
    list_path = FolderPath.objects.filter(path__icontains=test_name)
    remove_path = []
    for folder in list_path:
        name = folder.path.split('/')[1]
        if name != test_name:
            remove_path.append(folder.path)
    for p in remove_path:
        list_path = list_path.exclude(path=p)

    return list_path

@csrf_exempt
def modified_path(request):
    path_modified = json.loads(request.POST.get('path_modified',''))
    print(path_modified)
    for path in path_modified:
        old = path['old']
        new = path['new'].replace(" ", "_")
        list_path = get_queryset_from_name(old)
        test_new_name = get_queryset_from_name(new)
        if len(test_new_name) == 0:
            path_index_images = list_path[0].abs_path.replace('data','index_images').split('/part')[0]
            new_path_index = path_index_images.replace(old,new)
            path_data_folder = list_path[0].abs_path.split('/part')[0]
            new_path_data = path_data_folder.replace(old,new)
            os.rename(path_index_images, new_path_index)
            os.rename(path_data_folder, new_path_data)
            for folder in list_path:
                folder.abs_path = folder.abs_path.replace(old,new)
                folder.path = folder.path.replace(old,new)
                folder.save()
        else:
            print('already')
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

@csrf_exempt
def save_timeline(request):
    abs_path = request.POST.get('abs_path','')
    data_timelines = json.loads(request.POST.get('timeline',''))
    json_shots_path = abs_path+'/'+request.user.username+'_timelines.json'
    print(data_timelines)
    with open(json_shots_path, 'w') as fp:
        json.dump(data_timelines, fp, indent=2)

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
            with open(settings.MEDIA_ROOT+filename) as f:
                data = json.load(f)
            print(json.dumps(data))
            return_data = json.dumps(data)
            os.remove(settings.MEDIA_ROOT+filename)
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
    folder=dir.abs_path+'/images/'
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
    w = int(round((bbox[2] - bbox[0])/2)*2)
    h = int(round((bbox[3] - bbox[1])/2)*2)
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
        w = int(round((bbox[2] - bbox[0])/2)*2)
        h = int(round((bbox[3] - bbox[1])/2)*2)
        # print(w/h, crop.size[0]/crop.size[1], image.dtype)
        if math.isclose((bbox[2] - bbox[0])/(bbox[3] - bbox[1]), crop.size[0]/crop.size[1], rel_tol=1e-2):
            return cv2.resize(image[y:y+h, x:x+w],(crop.size[0],crop.size[1]),interpolation=cv2.INTER_LANCZOS4)
    else:
        return image

def crop_split(image, bbox, size):
    x = int(bbox[0])
    y = int(bbox[1])
    w = int(math.ceil((bbox[2] - bbox[0])/2)*2)
    h = int(math.ceil((bbox[3] - bbox[1])/2)*2)
    # print(w/h, crop.size[0]/crop.size[1], image.dtype)
    if math.isclose((bbox[2] - bbox[0])/(bbox[3] - bbox[1]), size[0]/size[1], rel_tol=1e-2):
        return cv2.resize(image[y:y+h, x:x+w],(size[0],size[1]),interpolation=cv2.INTER_LANCZOS4)
    else:
        print((bbox[2] - bbox[0]), (bbox[3] - bbox[1]), (bbox[2] - bbox[0])/(bbox[3] - bbox[1]))
        blank_image = np.zeros((size[1],size[0],3), dtype='uint8')
        if w<h:
            height = int(size[1])
            width = int(height*(w/h))
            if width > int(size[0]):
                width=int(size[0])
            img = cv2.resize(image[y:y+h, x:x+w],(width,height),interpolation=cv2.INTER_LANCZOS4)
            x_off = int(abs(size[0]-width)/2)

            if x_off+width > int(size[0]):
                x_off=0
            blank_image[0:height, x_off:x_off+width] = img

        else:
            width = int(size[0])
            height = int(width/(w/h))
            if height > int(size[1]):
                height=int(size[1])
            img = cv2.resize(image[y:y+h, x:x+w],(width,height),interpolation=cv2.INTER_LANCZOS4)
            y_off = int(abs(size[1]-height)/2)
            if y_off+height > int(size[1]):
                y_off=0
            blank_image[y_off:y_off+height, 0:width]= img
        return blank_image

def split_screen(image):
    if split_screen.counter < len(split_screen.bboxes) :
        bbox = split_screen.bboxes[split_screen.counter]
    else:
        bbox = split_screen.bboxes[len(split_screen.bboxes)-1]
    new_image = crop_split(image, bbox[0], split_screen.size)
    i=0
    for bb in bbox:
        if i>0:
            new_image = np.hstack((new_image,crop_split(image, bb, split_screen.size)))
        i+=1
        # print(crop_split(image, bb, split_screen.size))
    split_screen.counter += 1
    if new_image.size !=0:
        return new_image
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
    is_split_screen = request.POST.get('is_split','')!="false"
    bbox = np.array(json.loads(bbox_string))

    videoname = abs_path+'/original_hevc.mov'#'/media/kinoai/AUTOCAM1/La_Fabrique_Episode_3'+'/19janvier/pres.mov'#

    hevc_w = int(subprocess.check_output('ffprobe -i {0} -show_entries stream=width -v quiet -of csv="p=0"'.format(videoname), shell=True ,stderr=subprocess.STDOUT))
    factor = int(hevc_w / width)
    print(hevc_w, factor, aspect_ratio)
    print(request.user.username)
    scale_factor = 4
    if not is_split_screen:
        bbox[:,] *= factor
        res = bbox[:,2] - bbox[:,0]
        max = int(sum(res)/len(res))
        if max > 0:
            scale_factor = 4
        if max > 1024:
            scale_factor = 2
        if max > 2048:
            scale_factor = 1
        crop.bboxes = bbox
        crop.counter = 0
        print(max, scale_factor)
    else:
        bbox[:][:,] *= factor
        split_screen.bboxes = bbox
        split_screen.counter = 0

    print(len(bbox))
    out_vid = abs_path+'/'+request.user.username+'_output_video.mp4'
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
    if not is_split_screen:
        crop.size = clip.size
        new_clip = clip.fl_image( crop )
        new_clip.write_videofile(out_vid, threads=16, preset='ultrafast')
    else:
        split_screen.size = clip.size
        clip.size = [clip.size[0]*len(bbox[0]),clip.size[1]]
        print(clip.size)
        new_clip = clip.fl_image( split_screen )
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
