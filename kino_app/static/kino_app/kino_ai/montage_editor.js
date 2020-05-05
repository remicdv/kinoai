// Constructor initializes all variables
function MontageEditor()  {

  this.shots = [];

  this.all_types = createCheckbox('All types', true);
  this.all_types.side = false;
  this.all_types.mouseOver(processToolTip('Display all types'));
  this.all_types.mouseOut(processToolTip(''));
  html_elements.push(this.all_types);
  this.all_types.position(windowWidth/2 + 140, 40);
  this.all_types.changed(updateAllShotSelect);

  this.show_context = createCheckbox('Show context', true);
  this.show_context.side = false;
  this.show_context.mouseOver(processToolTip('Display the stage'));
  this.show_context.mouseOut(processToolTip(''));
  html_elements.push(this.show_context);
  this.show_context.position(windowWidth/2 + 320, 40);
  this.show_context.changed(updateShowContextSelect);

  this.split_screen = createCheckbox('Split Screen', false);
  this.split_screen.mouseOver(processToolTip('Show the selected shots below the viewer'));
  this.split_screen.mouseOut(processToolTip(''));
  html_elements.push(this.split_screen);
  this.split_screen.size(150,30);
  this.split_screen.changed(updateSplitScreen);

  this.is_all_types = true;
  this.is_show_context = true;
  this.is_split = false;

  this.all_types.hide();
  this.show_context.hide();

  this.mousePressed = function(mx, my) {
    if(crop_button.on && (mx > mid_width || my > viewer_height)) {
      show_shot = undefined;
    }
    for(let s of this.shots) {
      if(!montage_editor.is_split) {
        s.on = false;
      }
      s.click(mouseX, mouseY);
    }
    keyCode = undefined;
    let b = shots_timeline.click(mouseX, mouseY);
  };

  this.doubleClicked = function(mx,my) {
    shots_timeline.resetButton(mx,my);
  }

  this.drop = function(mx, my) {
    let b = shots_timeline.drop(mouseX, mouseY);
    if(b!=undefined) {
      video.time(b);
      shots_timeline.released = true;
      img_hd = undefined;
    }
    for(let s of this.shots) {
      s.drag = false;
    }
  }

  this.drag = function(mx, my) {
    for(let s of this.shots) {
      s.draggin(mouseX, mouseY);
    }
    shots_timeline.drag(mouseX,mouseY);
  }

  this.keyPressed = function(keyCode) {
    if(keyCode===46) {
      if(!this.is_split) {
        this.removeShot();
        shots_timeline.removeShot();
      }
    }
  }

  this.mouseWheel = function(event) {

  }

  this.updateAndShow = function() {
    resetTabs();
    is_montage_editor = true;
    clickTab(montage_editor_button);
    act_input.hide();
    this.showElts();
    // Side el
    check_render_pose.show();
    check_render_shot_trace.show();
    submit.show();
    reset_pos.show();
    hide_show_header_button.show();
    updateSideElems();
    up_rough = true;
  }

  this.hideElts = function() {
    crop_button.setOnOff(false);
    shots_timeline.hideElts();
    this.is_split = false;
    this.split_screen.checked(false);
    this.split_screen.hide();
    cadrage_editor.shot_selector.hide();
    this.all_types.hide();
    this.show_context.hide();
  }

  this.showElts = function() {
    shots_timeline.showElts();
    this.split_screen.show();
    cadrage_editor.shot_selector.show();
    this.all_types.show();
    this.show_context.show();
  }

  this.resizeElt = function() {
    this.all_types.original_x = mid_width + 100;
    this.all_types.original_y = 10;
    this.show_context.original_x = mid_width + 230;
    this.show_context.original_y = 10;
    cadrage_editor.shot_selector.original_x = mid_width + 10;
    cadrage_editor.shot_selector.original_y = 10;
    crop_button.setPosition(400,viewer_height+5);
    shots_timeline.y = viewer_height+70;
    shots_timeline.resizeElt();
  }

  this.loadMontageEditorData = function() {
    for (var i=0; i<Object.getOwnPropertyNames(data_shots).length; i++) {
      if(data_shots[i].Timeline == 0) {
        let s = new Shot();
        s.type = data_shots[i].Type;
        s.start_frame = data_shots[i].StartFrame;
        s.end_frame = data_shots[i].EndFrame;
        s.bboxes = data_shots[i].BBoxes;
        s.setActInvoled(data_shots[i].ActInvolved);
        s.aspect_ratio = data_shots[i].AspectRatio;
        if(data_shots[i].GazeDir==undefined) {
          data_shots[i].GazeDir = true;
        }
        s.is_gaze_direction = data_shots[i].GazeDir;
        if(data_shots[i].Intersect==undefined) {
          data_shots[i].Intersect = true;
        }
        s.is_intersect = data_shots[i].Intersect;
        if(data_shots[i].StagePos==undefined) {
          data_shots[i].StagePos = false;
        }
        s.is_stage_position = data_shots[i].StagePos;
        this.shots.push(s);
      }
    }

    shots_timeline.list_data = [];
    for(let obj of Object.values(json_user_timeline)) {
      let tab_shots = [];
      for(let data_shots of obj.Data) {
        let s = {};
        s.type = data_shots.Type;
        s.start_frame = data_shots.StartFrame;
        s.end_frame = data_shots.EndFrame;
        s.aspect_ratio = data_shots.AspectRatio;
        if(data_shots.GazeDir ==undefined) {
          data_shots.GazeDir = true;
        }
        s.is_gaze_direction = data_shots.GazeDir;
        if(data_shots.Intersect ==undefined) {
          data_shots.Intersect = true;
        }
        s.is_intersect = data_shots.Intersect;
        if(data_shots.StagePos ==undefined) {
          data_shots.StagePos = false;
        }
        s.is_stage_position = data_shots.StagePos;
        let tab = [];
        for(let n of data_shots.ActInvolved) {
          tab.push(preparation_editor.getAct(n));
        }
        s.actors_involved = tab;
        tab_shots.push(s);
        if(obj.On) {
          shots_timeline.addShotJson(s, true);
        }
      }
      obj.Data = tab_shots;
      shots_timeline.list_data.push(obj);
    }
    if(shots_timeline.list_data.length==0) {
      shots_timeline.list_data.push({'Name':'Default','Data':[],'On':true});
    }
    this.shots.sort(sortShotsByName);
    this.shots.sort(sortShotsByType);
  }

  this.getShotsData = function() {
    let new_json_shots = [];

    for(let s of this.shots) {
      var shot = {};
      shot.Type = s.type;
      shot.StartFrame = s.start_frame;
      shot.EndFrame = s.end_frame;
      shot.Timeline = 0;
      shot.BBoxes = s.bboxes;
      shot.ActInvolved = s.getActNameInvolved();
      shot.AspectRatio = s.aspect_ratio;
      shot.GazeDir = s.is_gaze_direction;
      shot.Intersect = s.is_intersect;
      shot.StagePos = s.is_stage_position;
      new_json_shots.push(shot);
    }

    return new_json_shots;
  }

  function updateAllShotSelect() {
    montage_editor.is_all_types = this.checked();
  }

  function updateShowContextSelect() {
    montage_editor.is_show_context = this.checked();
  }

  function updateSplitScreen() {
    montage_editor.is_split = this.checked();
    if(montage_editor.is_split) {
      shots_timeline.hideElts();
      montage_editor.all_types.hide();
      montage_editor.show_context.hide();
    } else {
      shots_timeline.showElts();
      montage_editor.all_types.show();
      montage_editor.show_context.show();
    }
  }

  this.createContextShot = function() {
    let shot = new Shot();
    shot.aspect_ratio = aspect_ratio;
    shot.start_frame = 0;
    shot.end_frame = Math.round(frame_rate*video.duration());
    shot.is_intersect = false;
    shot.is_stage_position = false;
    shot.is_gaze_direction = false;
    shot.type = 'WS';
    let b = false;
    for(let i=this.shots.length-1; i>=0; i--) {
      let s=this.shots[i];
      if(s.equalTo(shot, false)) {
        this.shots.splice(i,1);
      }
    }
    if(!b) {
      shot.calcBboxes(aspect_ratio);
      this.shots.push(shot);
    }
  }

  // Active the shots choosen by the user for the notebook
  this.getShotsFromActs = function() {
    let acts = [];
    for(let a of preparation_editor.actors_timeline) {
      if(a.on) {
        acts.push(a.actor_name);
      }
    }
    // if(all_on_stage) {
    // }
    let printed_shots = [];
    for(let s of this.shots) {
      let b = false;
      for(let a of s.actors_involved) {
        if(acts.includes(a.actor_name)) {
          b = true;
          break;
        }
      }
      if(b && s.actors_involved.length == 1 && s.aspect_ratio == aspect_ratio && s.is_intersect == true) {
        s.on = true;
        printed_shots.push(s);
      } else {
        s.on = false;
        s.bbox_show = [];
      }
    }

    printed_shots.sort(sortShotsByActPosition);
    printed_shots.sort(sortShotsByType);
    return printed_shots;
  }

  this.isAlreadyAct = function(shots, act_inv) {
    let ret = false;
    for(let s of shots) {
      for(let name of s.getActNameInvolved()) {
        if(act_inv.includes(name)) {
          ret = true;
          break;
        }
      }
    }
    return ret;
  }

  this.getShotOnlyOne = function(name) {
    let ret;
    for(let s of this.shots) {
      if(s.actors_involved.length == 1) {
        if(s.actors_involved[0].actor_name == name) {
          ret = s;
          break;
        }
      }
    }
    return ret;
  }

  this.recursShot = function(s, ind_act, size, act_inv) {
    if(s.splitActInvolved().length == s.actors_involved.length) {
      return s.actors_involved;
    } else {
      if(ind_act+1<act_inv.length) {
        let new_acts = [];
        for(let a of s.actors_involved) {
          new_acts.push(a);
        }
        new_acts.push(act_inv[ind_act+1]);
        let new_s = this.getShotAspect(size, new_acts, new_acts.length, false, false, false);
        if(new_s) {
          return this.recursShot(new_s, ind_act+1, size, act_inv);
        } else {
          return s.actors_involved;
        }
      } else {
        return s.actors_involved;
      }
    }
  }

  this.getAvailableRushesPerFrameAndSize = function(size='MS', f_num=undefined, act_inv=undefined) {
    if(!act_inv) {
      act_inv = preparation_editor.actors_timeline;
    }
    if(f_num) {
      f_num = frame_num;
    }
    for(let s of this.shots) {
      s.on = false;
      s.bbox_show = [];
    }
    let printed_shots = [];
    act_inv.sort(sortByActPosition);
    let tab_actors_sort = [];
    let i=0;
    while(i<act_inv.length) {
      let shot = this.getShotAspect(size, [act_inv[i]], 1, false, false, false);
      if(shot) {
        let new_acts = this.recursShot(shot, i, size, act_inv);
        tab_actors_sort.push(new_acts);
        i+= new_acts.length;
      } else {
        i++;
      }
    }
    for(let acts_inv of tab_actors_sort) {
      printed_shots.push(this.getShotAspect(size, acts_inv, acts_inv.length, false, false, false));
    }
    printed_shots.sort(sortShotsByPosition);
    return printed_shots;
  }

  // Get the index of a specific shot (type and actors involved)
  this.getShot = function(tab, type, actors_involved) {
    let ret = undefined;
    for(let i=0; i< tab.length; i++) {
      let s = tab[i];
      if(s.type == type) {
        let b1 = true;
        for(let a of s.actors_involved) {
          if(!actors_involved.includes(a.actor_name)) {
            b1 = false;
            break;
          }
        }
        if(b1 && s.actors_involved.length == actors_involved.length) {
          ret = i;
          break;
        }
      }
    }
    return ret;
  }

  // Get shot
  this.getShotAspect = function(type, actors_involved, aspect_ratio, intersect, stage_pos, gaze_dir) {
    let ret = undefined;
    let acts = [];
    for(let a of actors_involved) {
      acts.push(a.actor_name);
    }
    for(let s of this.shots) {
      if(s.type == type && s.aspect_ratio == aspect_ratio && intersect == s.is_intersect && stage_pos == s.is_stage_position && gaze_dir == s.is_gaze_direction) {
        let b1 = true;
        for(let a of s.actors_involved) {
          if(!acts.includes(a.actor_name)) {
            b1 = false;
            break;
          }
        }
        if(b1 && s.actors_involved.length == acts.length) {
          ret = s;
          break;
        }
      }
    }
    return ret;
  }

  // Get a list of all the shots where at least one of actor involved is present on stage
  this.getShotsOnStage = function() {
    let ret = [];
    for(let s of this.shots) {
      let is_on=false;
      for(let a of s.actors_involved) {
        if(preparation_editor.getActOnStage(frame_num).includes(a.actor_name)) {
          is_on = true;
          break;
        }
      }
      if(is_on) {
        ret.push(s);
      }
    }
    return ret;
  }

  // Return true if the shot already exist
  this.testShot = function(r) {
    let b = false;
    for(let s of this.shots) {
      if(s.type == r.Type) {
        let b1 = true;
        for(let a of s.actors_involved) {
          if(!r.ActInvolved.includes(a.actor_name)) {
            b1 = false;
            break;
          }
        }
        if(b1 && s.actors_involved.length == r.ActInvolved.length) {
          b = true;
          break;
        }
      }
    }
    var tab = [];
    for(let a of preparation_editor.actors_timeline) {
      tab.push(a.actor_name);
    }
    for(let i=0; i<r.ActInvolved.length; i++) {
      if(!tab.includes(r.ActInvolved[i])) {
        console.log(r.ActInvolved[i]);
        b = false;
      }
    }
    return b;
  }

  // Remove the selected shot
  this.removeShot = function() {
    for(var i=0; i<this.shots.length; i++) {
      if(this.shots[i].on) {
        shots_timeline.removeSpecificShot(this.shots[i]);
        for(let tab of shots_timeline.list_data) {
          shots_timeline.removeSpecificShot(this.shots[i],tab.Data);
        }
        this.shots.splice(i,1);
      }
    }
  }

  // Draw a grid with a preview for all the shots
  this.drawShots = function() {

    let top_shot = cadrage_editor.shot_selector.original_y+65;
    let context_height = int(((windowWidth - 160)-mid_width-20)/2);
    if(this.is_show_context) {
      top_shot += context_height+10;
    }

    let k=0;
    let off_x = 0;
    let off_y = 0;
    push();
    fill('red');
    textSize(15);
    text('Shots created :', viewer_width+10, cadrage_editor.shot_selector.original_y+45);
    pop();

    let front_shot;
    let front_bbox;

    for(let s of this.shots) {
      if(!s.aspect_ratio){
        s.aspect_ratio = aspect_ratio;
      }
      let arr = s.getCurrStabShot(frame_num);
      if(arr && s.type != 'WS' && (s.type == cadrage_editor.shot_type || this.is_all_types)) {
        let bbox = [];
        for(let j=0; j<arr.length; j++) {
          bbox.push(arr[j]*scale_ratio);
        }
        w = Math.round(((windowWidth - 160)-mid_width-40)/3);
        h = Math.floor(w/aspect_ratio);
        let n_w=w;let n_h=h;
        if(!s.drag) {
          if(h*s.aspect_ratio>w){
            n_h = w/s.aspect_ratio;
          }else{ n_w = h*s.aspect_ratio;}
          if(k%3==2) {
            off_x = 2;
            s.setPosition((viewer_width+10)+(off_x*w)+(off_x*10), top_shot + (off_y*h)+ (off_y*10), n_w, n_h);
            off_y++;
          } else if(k%3==1) {
            off_x = 1;
            s.setPosition((viewer_width+10)+(off_x*w)+(off_x*10), top_shot + (off_y*h)+ (off_y*10), n_w, n_h);
          }else {
            off_x=0;
            s.setPosition(viewer_width+10+(off_x*w), top_shot + (off_y*h) + (off_y*10), n_w, n_h);
          }
          k++;
        }
        if(mouseX > s.x && mouseX<s.x+s.w && mouseY > s.y && mouseY < s.y+s.h) {
          s.w = 300;
          s.h = Math.floor(s.w/s.aspect_ratio);
          front_shot = s;
          front_bbox =bbox;
        } else {
          s.display();
          if(img_hd) {
            let ratio = img_hd.width / video.elt.videoWidth;
            image(img_hd, s.x, s.y, s.w, s.h, bbox[0]*ratio, bbox[1]*ratio, bbox[2]*ratio - bbox[0]*ratio, bbox[3]*ratio - bbox[1]*ratio);
          } else {
            if(s.w!=0 && s.h!=0) {
              image(image_frame, s.x, s.y, s.w, s.h, bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
            }
          }
          s.displayText();
        }
      } else if (this.is_show_context && s.type == 'WS') {
        s.setPosition((viewer_width+10), top_shot-(context_height+10), context_height*aspect_ratio, context_height);
        s.display();
        if(img_hd) {
          image(img_hd, s.x, s.y, s.w, s.h);
        } else {
          image(image_frame, s.x, s.y, s.w, s.h);
        }
        s.displayText();
      }
    }
    if(front_shot) {
      let s = front_shot;
      let bbox = front_bbox;
      s.display();
      if(img_hd) {
        let ratio = img_hd.width / video.elt.videoWidth;
        image(img_hd, s.x, s.y, s.w, s.h, bbox[0]*ratio, bbox[1]*ratio, bbox[2]*ratio - bbox[0]*ratio, bbox[3]*ratio - bbox[1]*ratio);
      } else {
        image(image_frame, s.x, s.y, s.w, s.h, bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
      }
      s.displayText();
    }
  }


  // Draw a colored rectangle on the player based on the shots specification (only when the actors involved in the shots are on stage)
  this.drawShotsLayout = function() {
    let shots_on_stage = this.getShotsOnStage();
    for(let s of shots_on_stage) {
      if(true) {
        let bbox = s.getCurrStabShot(frame_num);
        if(bbox) {
          let type = s.getUpdatedSizeShot(s.getCurrStabShot(frame_num)[3]);
          if(!type) {
            type = s.type;
          }
          push();
          strokeWeight(1);
          switch(s.type){
            case 'CU':
              stroke('green');
              break;
            case 'MCU':
              stroke('orange');
              break;
            case 'MS':
              stroke('red');
              break;
            case 'MLS':
              stroke('purple');
              break;
            case 'FS':
              stroke('blue');
              break;
            default:
              stroke('white');
              break;
          }
          noFill();
          rect(bbox[0], bbox[1], bbox[2]-bbox[0], bbox[3]-bbox[1]);
          noStroke();
          fill(255);
          // text(s.type, bbox[0]+5, bbox[1]+10);
          // text(s.type, bbox[2]-20, bbox[1]+10);
          pop();
        }
      }
    }
  }


  function sortSplit(a,b) {
    if (a.bbox[0] < b.bbox[0])
      return -1;
    if (a.bbox[0] > b.bbox[0])
      return 1;
    return 0;
  }

  // Show the selected shot preview below the player
  this.splitScreen = function(printed_shots=undefined) {
    let split_shot = [];
    if(!printed_shots) {
      for(let s of this.shots) {
        if(s.on) {
          split_shot.push(s);
        }
      }
    } else {
      if(printed_shots) {
        split_shot = printed_shots;
      }
    }
    let bboxes = [];
    for(let s of split_shot) {
      let b = s.getCurrStabShot(frame_num);
      if(b) {
        let bb = {};
        bb.bbox = b;
        bb.shot = s;
        bboxes.push(bb);
      }
    }

    let max_by_raw=2;
    if(annotation_editor.is_note_book) {
      max_by_raw=0;
      for(let a of preparation_editor.actors_timeline) {
        if(a.on) {
          max_by_raw++;
        }
      }
    }
    if(this.is_split) {
      max_by_raw = split_shot.length;
    }
    let nb_raw = Math.ceil(bboxes.length/max_by_raw);
    if(nb_raw!=0 && offset_split>(nb_raw-1)*max_by_raw) {
      offset_split = (nb_raw-1)*max_by_raw;
    } else if(nb_raw==0) {
      offset_split = 0;
    }
    if(Math.ceil(offset_split/nb_raw)>0) {
      bboxes.splice(0,Math.ceil(offset_split/nb_raw)*max_by_raw);
    }
    let j=0;
    let y_vid=0;
    let x_vid=0;
    let max_h = 0;
    let curr_raw = 1;
    let total_height = 0;
    let total_width = 0;

    if(this.is_split) {
      total_height = Math.min(height-viewer_height,mid_width/preparation_editor.actors_timeline.length);
      total_width = total_height*preparation_editor.actors_timeline.length;
      let off_x = (mid_width-total_width)/2;
      let off_w=0;
      for(let b of bboxes) {
        b.shot.bbox_show = [off_x+off_w,viewer_height,total_height*b.shot.aspect_ratio,total_height];
        off_w += total_height*b.shot.aspect_ratio;
      }
    } else {
      for(let b of bboxes) {
        let bb = b.bbox;
        let a_s = aspect_ratio;
        if(b.shot && b.shot.aspect_ratio) {
          a_s = b.shot.aspect_ratio;
        }
        let w=0;
        if(nb_raw==1) {
          w = viewer_width/bboxes.length;
        } else {
          if(j<(max_by_raw*curr_raw)){
            w = viewer_width/max_by_raw;
          } else {
            if(curr_raw==nb_raw) {
              w = viewer_height/(bboxes.length-(max_by_raw*curr_raw));
            } else {
              w = viewer_width/max_by_raw;
            }
            y_vid = max_h*curr_raw;
            max_h = 0;
            x_vid=0;
            curr_raw++;
          }
        }
        x_vid = (j%max_by_raw) * w;
        if(w/a_s>viewer_height) {
          w = viewer_height*a_s;
        }
        if(w/a_s>max_h) {
          max_h = w/a_s;
        }
        total_height += max_h;
        total_width += w;
        b.shot.bbox_show = [x_vid,viewer_height+y_vid,w,w/a_s];
        j++;
      }
    }

    let sc = 1;
    let off_height = 0;
    let off_width = 0;
    if(max_by_raw!=0 && (height-viewer_height)<(total_height/max_by_raw)) {
      sc = (height-viewer_height)/(total_height/max_by_raw);
      off_height = viewer_height-bboxes[0].shot.bbox_show[1]*sc;
      off_width = (mid_width-(total_width/3)*sc)/2;
    }
    for(let b of bboxes) {
      b.shot.bbox_show = b.shot.bbox_show.map(x => x*sc);
      b.shot.bbox_show[1] = b.shot.bbox_show[1]+off_height;
      // b.shot.bbox_show[0] = b.shot.bbox_show[0]+off_width;
      let bb = b.bbox;
      let a_s = aspect_ratio;
      if(b.shot && b.shot.aspect_ratio) {
        a_s = b.shot.aspect_ratio;
      }
      if (bb) {
        // let acts = b.shot.getUpdateActInvolved();
        bbox = [bb[0]*scale_ratio, bb[1]*scale_ratio, bb[2]*scale_ratio, bb[3]*scale_ratio];
        if(bbox) {
          if(img_hd) {
            let ratio = img_hd.width / video.elt.videoWidth;
            bbox = [bbox[0]*ratio, bbox[1]*ratio, bbox[2]*ratio, bbox[3]*ratio];
            image(img_hd, b.shot.bbox_show[0],b.shot.bbox_show[1],b.shot.bbox_show[2],b.shot.bbox_show[3], bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
          } else {
            image(image_frame, b.shot.bbox_show[0],b.shot.bbox_show[1],b.shot.bbox_show[2],b.shot.bbox_show[3],bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
          }
          push();
          fill(255);
          // let type = b.shot.getUpdatedSizeShot(b.shot.getCurrStabShot(frame_num)[3]);
          // if(!type) {
          //   type = b.shot.type;
          // }
          text(b.shot.type/*+round_prec(a_s,2)*/, b.shot.bbox_show[0],b.shot.bbox_show[1]+10);
          for(var i=0; i<b.shot.actors_involved.length; i++) {
            text(b.shot.actors_involved[i].actor_name, b.shot.bbox_show[0],b.shot.bbox_show[1]+20+i*10);
          }
          pop();
        }
      }
    }
  }

  this.display = function() {
    push();
    if(x_off<0){x_off=0;}
    if(y_off<0){y_off=0;}
    translate(x_off,y_off);
    scale(vid_h/Number(original_height));
    // console.log(x_off,y_off,viewer_width/Number(original_width));
    preparation_editor.displayTrackBBox();
    preparation_editor.drawTracklets();
    if(is_shots_frame_layout) {
      this.drawShotsLayout();
    }
    pop();
    if(this.is_split) {
      push();
      fill(150);
      rect(0,viewer_height,mid_width,windowHeight-viewer_height);
      pop();
      // this.splitScreen(this.getAvailableRushesPerFrameAndSize(cadrage_editor.shot_selector.value()));
      this.splitScreen();
      push();
      fill(255);
      stroke(255);
      textSize(25);
      let i=0;
      for(let a of preparation_editor.actors_timeline) {
        text(a.actor_name,20,viewer_height-300+i*30);
        i++;
      }
      pop();
      // this.splitScreen();
    } else {
      shots_timeline.display();
      crop_button.display();
      this.drawShots();
    }

  }
}
