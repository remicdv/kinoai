// Constructor initializes all variables
function CadrageEditor()  {

  this.is_shot_creation = false;
  this.is_show_shots = false;
  this.is_shot_creation = false;
  this.is_intersect = false;
  this.is_stage_position = true;
  this.is_gaze_direction = true;
  this.is_split_screen = false;
  this.shot_type='BCU';
  this.ratio_type = 1;
  this.add_shot = [];

  this.shot_creation = createCheckbox('Create rush', false);
  this.shot_creation.side = false;
  this.shot_creation.mouseOver(processToolTip('Open the creation interface'));
  this.shot_creation.mouseOut(processToolTip(''));
  html_elements.push(this.shot_creation);
  this.shot_creation.position(windowWidth/2 + 10, 10);
  this.shot_creation.size(150,20);
  this.shot_creation.changed(updateShotCreate);

  this.show_shots = createCheckbox('Show rushes', false);
  this.show_shots.side = false;
  this.show_shots.mouseOver(processToolTip('Show all the rushes already created'));
  this.show_shots.mouseOut(processToolTip(''));
  html_elements.push(this.show_shots);
  this.show_shots.position(windowWidth/2 + 300, 10);
  this.show_shots.size(150,20);
  this.show_shots.changed(updateShowShots);

  this.save_shot = createButton('Create');
  this.save_shot.side = false;
  this.save_shot.mouseOver(processToolTip('Launch the stabilization process of the rush'));
  this.save_shot.mouseOut(processToolTip(''));
  html_elements.push(this.save_shot);
  this.save_shot.position(windowWidth/2 + 200, 40);
  this.save_shot.mousePressed(saveShot);

  this.shot_selector = createSelect();
  this.shot_selector.side = false;
  this.shot_selector.mouseOver(processToolTip('Select the rush size'));
  this.shot_selector.mouseOut(processToolTip(''));
  html_elements.push(this.shot_selector);
  this.shot_selector.position(windowWidth/2 + 10, 40);
  this.shot_selector.option('BCU');
  this.shot_selector.option('CU');
  this.shot_selector.option('MCU');
  this.shot_selector.option('MS');
  this.shot_selector.option('MLS');
  this.shot_selector.option('FS');
  this.shot_selector.changed(selectShotType);

  this.ratio_selector = createSelect();
  this.ratio_selector.side = false;
  this.ratio_selector.mouseOver(processToolTip('Select the rush aspect ratio'));
  this.ratio_selector.mouseOut(processToolTip(''));
  html_elements.push(this.ratio_selector);
  this.ratio_selector.position(windowWidth/2 + 120, 40);
  this.ratio_selector.option("original");
  this.ratio_selector.option("half width");
  this.ratio_selector.option("twice width");
  this.ratio_selector.option("4:3");
  this.ratio_selector.option("16:9");
  this.ratio_selector.option("4k - 2k");
  this.ratio_selector.changed(selectRatio);

  this.intersect = createCheckbox('Intersect', false);
  this.intersect.side = false;
  this.intersect.mouseOver(processToolTip('Test intersection with not included actors'));
  this.intersect.mouseOut(processToolTip(''));
  html_elements.push(this.intersect);
  this.intersect.position(windowWidth/2 + 5, 70);
  this.intersect.changed(updateShotIntersect);

  this.stage_position = createCheckbox('Stage position', true);
  this.stage_position.side = false;
  this.stage_position.mouseOver(processToolTip('Keep the stage position'));
  this.stage_position.mouseOut(processToolTip(''));
  html_elements.push(this.stage_position);
  this.stage_position.position(windowWidth/2 + 140, 70);
  this.stage_position.changed(updateShotStagePosition);

  this.gaze_direction = createCheckbox('Gaze direction', true);
  this.gaze_direction.side = false;
  this.gaze_direction.mouseOver(processToolTip('Use the gaze direction'));
  this.gaze_direction.mouseOut(processToolTip(''));
  html_elements.push(this.gaze_direction);
  this.gaze_direction.position(windowWidth/2 + 315, 70);
  this.gaze_direction.changed(updateShotGazeDirection);

  this.split_screen = createCheckbox('Create split screen rushes', false);
  this.split_screen.mouseOver(processToolTip('Create the rushes'));
  this.split_screen.mouseOut(processToolTip(''));
  html_elements.push(this.split_screen);
  this.split_screen.size(150,30);
  this.split_screen.changed(updateCreateSplitScreen);

  this.create_button = createButton('Create all rushes');
  this.create_button.side = false;
  this.create_button.mouseOver(processToolTip('Create all the rushes to export in splitscreen'));
  this.create_button.mouseOut(processToolTip(''));
  html_elements.push(this.create_button);
  this.create_button.mousePressed(createAllSplit);

  this.save_shot.hide();
  this.ratio_selector.hide();
  this.intersect.hide();
  this.stage_position.hide();
  this.gaze_direction.hide();
  this.shot_selector.hide();


  this.mousePressed = function(mx, my) {
    for(let act of preparation_editor.actors_timeline) {
      act.click(mouseX, mouseY);
    }
  };

  this.drop = function(mx, my) {

  }

  this.drag = function(mx, my) {

  }

  this.keyPressed = function(keyCode) {

  }

  this.mouseWheel = function(event) {

  }

  this.updateAndShow = function() {
    resetTabs();
    is_cadrage_editor = true;
    clickTab(cadrage_editor_button);
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

  this.resizeElt = function() {
    this.shot_creation.original_x = mid_width + 10;
    this.show_shots.original_x = mid_width + 160;
    this.shot_selector.original_x = mid_width + 10;
    this.shot_selector.original_y = 50;
    this.ratio_selector.original_x = mid_width + 80;
    this.ratio_selector.original_y = 50;
    this.save_shot.original_x = mid_width + 220;
    this.save_shot.original_y = 50;
    this.intersect.original_x = mid_width + 10;
    this.intersect.original_y = 80;
    this.stage_position.original_x = mid_width + 140;
    this.stage_position.original_y = 80;
    this.gaze_direction.original_x = mid_width + 315;
    this.gaze_direction.original_y = 80;
    montage_editor.all_types.original_x = mid_width + 100;
    montage_editor.all_types.original_y = 50;
    montage_editor.show_context.original_x = mid_width + 230;
    montage_editor.show_context.original_y = 50;
    export_editor.div_actors_split.original_x= mid_width+100;
    export_editor.div_actors_split.original_y= 46;
    export_editor.div_actors_split.size(((windowWidth - 160)-mid_width)-110);
    this.create_button.original_x = mid_width+10;
    this.create_button.original_y = 100;
  }

  this.hideElts = function() {
    this.shot_creation.checked(false);
    this.is_shot_creation = false;
    this.updateShotCreate();
    this.shot_creation.hide();
    this.save_shot.hide();
    this.ratio_selector.hide();
    this.intersect.hide();
    this.stage_position.hide();
    this.gaze_direction.hide();
    this.shot_selector.hide();
    this.create_button.hide();
    this.split_screen.checked(false);
    this.is_split_screen = false;
    this.split_screen.hide();
    export_editor.div_actors_split.hide();
    this.show_shots.hide();
    this.show_shots.checked(false);
    this.is_show_shots = false;
    this.updateShowShots();
  }

  this.showElts = function() {
    this.shot_creation.show();
    this.show_shots.show();
    this.split_screen.show();
    this.shot_creation.checked(true);
    this.is_shot_creation = true;
    this.updateShotCreate();
  }

  this.hideCreationElt = function () {
    this.shot_selector.hide();
    this.save_shot.hide();
    this.ratio_selector.hide();
    this.intersect.hide();
    this.stage_position.hide();
    this.gaze_direction.hide();
  }

  this.showCreationElt = function() {
    selectRatio();
    this.shot_selector.show();
    this.save_shot.show();
    this.ratio_selector.show();
    this.intersect.show();
    this.stage_position.show();
    this.gaze_direction.show();
  }


  function updateShotCreate() {
    cadrage_editor.is_shot_creation = this.checked();
    cadrage_editor.updateShotCreate();
  }

  this.updateShotCreate = function() {
    if(!this.is_shot_creation) {
      if(select('#div_creation'))
        $('#div_creation').remove();
      this.hideCreationElt();
      for(let a of preparation_editor.actors_timeline) {
        a.elem.remove();
        a.elem = createElement('h3', a.actor_name);
        a.elem.elt.contentEditable = 'true';
        a.elem.id('editor');
        preparation_editor.div_actors_timeline.child(a.elem);
      }
    } else {
      this.show_shots.checked(false);
      this.is_show_shots = false;
      this.updateShowShots();
      this.showCreationElt();
      let div_creation = createDiv();
      div_creation.id('div_creation');
      div_creation.position(mid_width,this.shot_creation.y+100);
      // div_creation.style('display','table');
      div_creation.size(((windowWidth - 160)-mid_width)-10);
      for(let a of preparation_editor.actors_timeline) {
        a.on = false;
        a.elem.style('float','left');
        a.elem.style('margin','0 5');
        div_creation.child(a.elem);
      }
    }
  }

  // Get the specification and launch the stabilization of the shot created by the user
  function saveShot() {

    var shot = new Shot();

    for(let act of preparation_editor.actors_timeline) {
      if(act.on) {
        shot.actors_involved.push(act);
      }
    }

    // console.log(aspect_ratio/ratio_type);
    shot.aspect_ratio = cadrage_editor.ratio_type;
    shot.start_frame = 0;
    shot.end_frame = Math.round(frame_rate*video.duration());

    shot.is_intersect = cadrage_editor.is_intersect;
    shot.is_stage_position = cadrage_editor.is_stage_position;
    shot.is_gaze_direction = cadrage_editor.is_gaze_direction;
    shot.type = cadrage_editor.shot_type;
    if(shot.actors_involved.length==0) {
      shot.is_intersect = false;
      shot.is_stage_position = false;
      shot.is_gaze_direction = false;
      shot.type = 'WS';
    }

    let b = false;
    for(let s of montage_editor.shots) {
      if(s.equalTo(shot, false)) {
        b = true;
        break;
      }
    }

    if(!b) {
      shot.calcBboxes(aspect_ratio);

      montage_editor.shots.push(shot);

      if(shot.actors_involved.length>=1) {
        cadrage_editor.add_shot.push(shot);
        shot.in_stabilize = true;
      }
      montage_editor.shots.sort(sortShotsByName);
      montage_editor.shots.sort(sortShotsByType);

      cadrage_editor.shot_creation.checked(false);
      cadrage_editor.is_shot_creation = false;
      cadrage_editor.updateShotCreate();

      cadrage_editor.is_show_shots = true;
      cadrage_editor.show_shots.checked(true);
      cadrage_editor.updateShowShots();

      for(let a of preparation_editor.actors_timeline) {
        a.elem.remove();
        a.elem = createElement('h3', a.actor_name);
        a.elem.elt.contentEditable = 'true';
        a.elem.id('editor');
        preparation_editor.div_actors_timeline.child(a.elem);
      }
    } else {
      alert('already created');
    }
  }

  function updateCreateSplitScreen() {
    cadrage_editor.is_split_screen = this.checked();
    if(this.checked()) {
      cadrage_editor.shot_creation.checked(false);
      cadrage_editor.is_shot_creation = false;
      cadrage_editor.updateShotCreate();
      cadrage_editor.show_shots.checked(false);
      cadrage_editor.is_show_shots = false;
      cadrage_editor.updateShowShots();
      cadrage_editor.shot_creation.hide();
      cadrage_editor.show_shots.hide();

      export_editor.div_actors_split.show();
      export_editor.updateActorsDiv();
      cadrage_editor.create_button.show();
      cadrage_editor.shot_selector.show();
      montage_editor.all_types.hide();
      montage_editor.show_context.hide();
    } else {
      export_editor.export_split_button.hide();
      export_editor.div_actors_split.hide();
      cadrage_editor.create_button.hide();
      cadrage_editor.shot_selector.hide();

      cadrage_editor.shot_creation.show();
      cadrage_editor.shot_creation.checked(true);
      cadrage_editor.is_shot_creation = true;
      cadrage_editor.updateShotCreate();
      cadrage_editor.show_shots.show();
    }
  }

  function createAllSplit() {
    let act_inv = [];
    for(let a of preparation_editor.actors_timeline) {
      if(a.split) {
        act_inv.push(a);
      }
    }
    // console.log(cadrage_editor.shot_selector.value(), act_inv);
    cadrage_editor.createAllShotsPerSizeAndPos(cadrage_editor.shot_selector.value(), act_inv);
  }

  function updateShotIntersect() {
    cadrage_editor.is_intersect = this.checked();
  }

  function updateShowShots() {
    cadrage_editor.is_show_shots = this.checked();
    if(cadrage_editor.is_show_shots) {
      cadrage_editor.shot_creation.checked(false);
      cadrage_editor.is_shot_creation = false;
      cadrage_editor.updateShotCreate();
    }
    cadrage_editor.updateShowShots();
  }

  this.updateShowShots = function() {
    if(this.is_show_shots) {
      montage_editor.all_types.show();
      montage_editor.show_context.show();
      this.shot_selector.show();
    } else {
      montage_editor.all_types.hide();
      montage_editor.show_context.hide();
      this.shot_selector.hide();
    }
  }

  function updateShotStagePosition() {
    cadrage_editor.is_stage_position = this.checked();
  }

  function updateShotGazeDirection() {
    cadrage_editor.is_gaze_direction = this.checked();
  }

  function selectShotType() {
    cadrage_editor.shot_type = cadrage_editor.shot_selector.value();
    if(is_montage_editor || cadrage_editor.is_show_shots) {
      montage_editor.all_types.checked(false);
      montage_editor.is_all_types = false;
    }
  }

  function selectRatio() {
    cadrage_editor.ratio_type = cadrage_editor.getAspectRatioFromSelect(cadrage_editor.ratio_selector.value());
  }

  // Create all needed shots and assign them on the timeline based on the rough cut file specification
  this.exploitRoughCut = function() {
    shots_timeline.shots = [];
    var frames_no_info = [];
    this.createAllActorsFullShot();
    let len = rough_json.length;
    if(!len){len = Object.getOwnPropertyNames(rough_json).length;}
    for(let i=0; i<len; i++) {
      let r = rough_json[i];
      if(r.ActInvolved.length<1) {
        for(let a of preparation_editor.actors_timeline) {
          r.ActInvolved.push(a.actor_name);
        }
        r.Type = 'FS';
      } else {
        let test_name = [];
        for(let i=0; i<r.ActInvolved.length; i++) {
          if(test_name.includes(r.ActInvolved[i])) {
            r.ActInvolved.splice(i,1);
          } else {
            test_name.push(r.ActInvolved[i]);
          }
        }
      }
      if(!montage_editor.testShot(r)) {
        let s = new Shot();
        for(let a of r.ActInvolved) {
          s.actors_involved.push(preparation_editor.getAct(a));
        }
        // console.log(s.actors_involved.length);
        s.type = r.Type;

        s.start_frame = 0;
        s.end_frame = Math.round(frame_rate*video.duration());

        s.aspect_ratio = aspect_ratio;

        s.calcBboxes(aspect_ratio);

        montage_editor.shots.push(s);
        // shots_timeline.addShotJson(s);
        this.add_shot.push(s);

        s.in_stabilize = true;

      } else {
        let ind = montage_editor.getShot(montage_editor.shots, r.Type, r.ActInvolved);
        if(this.add_shot.length < 1){
          let indexes = [];
          for(let i=0; i<r.EndFrame-r.StartFrame; i++) {
            let num = r.StartFrame + i;
            // if(shots[ind]){
            //   let bbox = shots[ind].getCurrStabShot(num);
            //   if(dist(bbox[0],bbox[1],bbox[2],bbox[3])<50){
            //     indexes.push(num);
            //   }
            // }

            let acts = preparation_editor.getActOnStage(num);
            var b = true;
            for(let name of r.ActInvolved) {
              if(acts.includes(name)) {
                b = false;
                break;
              }
            }
            if(b) {
              indexes.push(num);
            }
          }
          let nb=1;
          for(let i=0; i < indexes.length; i++) {
            if(i>=1 && indexes[i-1] != indexes[i]-1) {
              nb++;
            }
          }
          if(indexes.length>1) {
            if(indexes.length==r.EndFrame - r.StartFrame) {
              console.log('oui');
              if(nb==1) {
                console.log(r.StartFrame, r.EndFrame);
                frames_no_info.push(indexes);
              }
            }else if(nb == 1 && indexes.length>frame_rate) {
              if(indexes[indexes.length-1] == r.EndFrame-1) {
                console.log('end');
                r.EndFrame = indexes[0];
              }
              if(indexes[0] == r.StartFrame) {
                console.log('start');
                r.StartFrame = indexes[0];
              }
            }
            // console.log(nb);
            // console.log(indexes);
            // console.log(r.ActInvolved);
            // console.log(r.Type);
          }
          if(indexes.length!=r.EndFrame - r.StartFrame) {
            let s_stab = {};//new Shot();
            s_stab.actors_involved = montage_editor.shots[ind].actors_involved;
            // s_stab.bboxes = shots[ind].bboxes;
            s_stab.type = montage_editor.shots[ind].type;
            s_stab.start_frame = r.StartFrame;
            s_stab.end_frame = r.EndFrame;
            s_stab.aspect_ratio = montage_editor.shots[ind].aspect_ratio;
            // console.log(s_stab.start_frame, s_stab.end_frame);
            shots_timeline.addShotJson(s_stab);
          }
        }
      }
    }
    if(this.add_shot.length < 1){
      console.log(frames_no_info);
        // console.log(shots_timeline.shots);
      shots_timeline.fillRough(frames_no_info);
    }
    montage_editor.shots.sort(sortShotsByName);
    montage_editor.shots.sort(sortShotsByType);
  }

  // Create important rushes
  this.createAllShots = function() {
    this.is_intersect = true;
    this.intersect.checked(true);
    this.is_gaze_direction = false;
    this.gaze_direction.checked(false);
    this.is_stage_position = false;
    this.stage_position.checked(false);
    for(let s_t of ['BCU', 'CU', 'MCU', 'MS', 'MLS', 'FS']) {
      for(let act of preparation_editor.actors_timeline) {
        for(let act of preparation_editor.actors_timeline) {
          act.on = false;
        }
        let shot = new Shot();
        act.on = true;
        shot.actors_involved.push(act);
        shot.type = s_t;
        shot.aspect_ratio = aspect_ratio;
        shot.is_intersect = true;
        shot.is_stage_position = false;
        shot.is_gaze_direction = false;
        let b = false;
        for(let s of montage_editor.shots) {
          if(s.equalTo(shot, false)) {
            b = true;
            break;
          }
        }
        if(!b) {
          shot.start_frame = 0;
          shot.end_frame = Math.round(frame_rate*video.duration());
          shot.calcBboxes(aspect_ratio);
          montage_editor.shots.push(shot);
          if(shot.actors_involved.length>=1) {
            this.add_shot.push(shot);
            shot.in_stabilize = true;
          }
        }
      }
    }
    montage_editor.shots.sort(sortShotsByName);
    montage_editor.shots.sort(sortShotsByType);
  }

  this.getActInvolved = function(bbox, f_n) {
    if(!f_n) {
      f_n = frame_num;
    }
    let tab = [];
    if(bbox) {
      for(let a of preparation_editor.actors_timeline) {
        let center_act = a.getCenterAct(f_n);
        if(center_act.x > bbox[0] && center_act.x < bbox[2] && center_act.y > bbox[1] && center_act.y < bbox[3]) {
          tab.push(a);
        }
      }
    }
    return tab;
  }

  // Create available rushes by position and size
  this.createAllShotsPerSizeAndPos = function(size, act_inv=undefined) {
    if(!act_inv) {
      act_inv = preparation_editor.actors_timeline;
    }
    this.is_intersect = false;
    this.intersect.checked(false);
    this.is_gaze_direction = false;
    this.gaze_direction.checked(false);
    this.is_stage_position = false;
    this.stage_position.checked(false);

    let tab_result = [];
    for(let k=0; k<act_inv.length;k++) {
      tab_result.push([act_inv[k]]);
      let nb = 1;
      while(nb <= act_inv.length) {
        for(let i=k+1; i<act_inv.length;i++) {
          if(i+nb<=act_inv.length) {
            let t = [];
            t.push(act_inv[k])
            for(let j=i; j<i+nb; j++) {
              if(j != k)
                t.push(act_inv[j]);
            }
            tab_result.push(t);
          }
        }
        nb++;
      }
    }

    for(let act_tab of tab_result) {
      for(let act of preparation_editor.actors_timeline) {
        act.on = false;
      }
      let a_s = 1*act_tab.length;
      let shot = new Shot();
      for(let a of act_tab) {
        a.on = true;
        shot.actors_involved.push(a);
      }
      shot.type = size;
      shot.aspect_ratio = a_s;
      shot.is_intersect = false;
      shot.is_stage_position = false;
      shot.is_gaze_direction = false;
      let b = false;
      for(let s of montage_editor.shots) {
        if(s.equalTo(shot, false)) {
          b = true;
          break;
        }
      }
      if(!b) {
        shot.start_frame = 0;
        shot.end_frame = Math.round(frame_rate*video.duration());
        shot.calcBboxes(a_s);
        montage_editor.shots.push(shot);
        if(shot.actors_involved.length>=1) {
          this.add_shot.push(shot);
          shot.in_stabilize = true;
        }
      }
    }

    montage_editor.shots.sort(sortShotsByName);
    montage_editor.shots.sort(sortShotsByType);
  }

  // Create a full shots with every actors included
  this.createAllActorsFullShot = function() {
    let r = {};
    r.Type = 'FS';
    let tab = [];
    for(let a of actors_timeline) {
      tab.push(a.actor_name);
    }
    r.ActInvolved = tab;
    if(!montage_editor.testShot(r)) {
      let s = new Shot();
      for(let a of r.ActInvolved) {
        s.actors_involved.push(preparation_editor.getAct(a));
      }
      s.type = r.Type;

      s.start_frame = 0;
      s.end_frame = Math.round(frame_rate*video.duration());

      s.aspect_ratio = aspect_ratio;
      console.log(s);

      s.calcBboxes(aspect_ratio);

      montage_editor.shots.push(s);
      this.add_shot.push(s);

      s.in_stabilize = true;

      montage_editor.shots.sort(sortShotsByName);
      montage_editor.shots.sort(sortShotsByType);
    }

  }
  //Get the selected aspect ratio
  this.getAspectRatioFromSelect = function(sel) {
    let a_s = aspect_ratio;
    switch (sel){
      case 'original':
        a_s = aspect_ratio;
        break;
      case 'half width':
        a_s = aspect_ratio/2;
        break;
      case 'twice width':
        a_s = aspect_ratio*2;
        break;
      case '16:9':
        a_s = 16/9;
        break;
      case '4:3':
        a_s = 4/3;
        break;
      case '4k - 2k':
        a_s = 2048/1080;
        break;
      default:
        a_s = aspect_ratio;
        break;
    }
    return a_s;
  }

  // Show the creation shot interface
  this.drawCreationShot = function() {
    let top_shot = this.intersect.position().y + 60 - can.elt.offsetTop;
    let keypoints = frames_data[frame_num];
    let w = windowWidth-180-mid_width;
    let h = Math.floor(w/this.ratio_type);
    let arr = getBBoxShot(this.shot_type, this.ratio_type);
    push();
    if(x_off<0){x_off=0;}
    if(y_off<0){y_off=0;}
    translate(x_off,y_off);
    scale(vid_h/Number(original_height));
    stroke('skyblue');
    noFill();
    rect(arr[0], arr[1], arr[2]-arr[0], arr[3]-arr[1]);
    noStroke();
    fill(255);
    text(this.shot_type, arr[0]+5, arr[1]+10);
    pop();
    var bbox = [];
    for(var j=0; j<arr.length; j++) {
      bbox.push((arr[j]*scale_ratio));
    }
    if(img_hd) {
      let ratio = img_hd.width / video.elt.videoWidth;
      image(img_hd, (viewer_width+10), top_shot, w, h, bbox[0]*ratio, bbox[1]*ratio, bbox[2]*ratio - bbox[0]*ratio, bbox[3]*ratio - bbox[1]*ratio);
    } else {
      image(image_frame, (viewer_width+10), top_shot, w, h, bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
    }
    push();
    fill(255);
    text('Curr '+round_prec(video.time(),2),viewer_width+10, top_shot+10);
    pop();
  }

  this.display = function() {
    if(this.is_shot_creation) {
      this.drawCreationShot();
    }else if(this.is_show_shots) {
      montage_editor.drawShots();
    }
    if(this.is_split_screen) {
      push();
      fill(0);
      textSize(20);
      text('Size : ',mid_width+10,30);
      text('Select actors : ',mid_width+105,30);
      pop();
    }
    push();
    if(x_off<0){x_off=0;}
    if(y_off<0){y_off=0;}
    translate(x_off,y_off);
    scale(vid_h/Number(original_height));
    // console.log(x_off,y_off,viewer_width/Number(original_width));
    preparation_editor.displayTrackBBox();
    preparation_editor.drawTracklets();
    if(is_shots_frame_layout) {
      montage_editor.drawShotsLayout();
    }
    pop();
  }
}
