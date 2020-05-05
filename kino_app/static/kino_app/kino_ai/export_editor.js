// Constructor initializes all variables
function ExportEditor()  {

  this.check_split_screen = createCheckbox('Export split screen', false);
  this.check_split_screen.side = true;
  this.check_split_screen.mouseOver(processToolTip('Active Multi Screen Export'));
  this.check_split_screen.mouseOut(processToolTip(''));
  html_elements.push(this.check_split_screen);
  this.check_split_screen.position(windowWidth/2 + 140, 40);
  this.check_split_screen.changed(updateMultiExport);

  this.name_video = createElement('h3');;
  this.name_video.side = false;
  html_elements.push(this.name_video);
  this.name_video.elt.contentEditable = true;
  this.name_video.style('margin',0);
  this.name_video.style('font-size',20);

  this.video_export_selected = createVideo();
  this.video_export_selected.side = false;
  html_elements.push(this.video_export_selected);

  this.div_export_video = createDiv();
  this.div_export_video.side = false;
  html_elements.push(this.div_export_video);

  this.div_actors_split = createDiv();
  this.div_actors_split.side = false;
  html_elements.push(this.div_actors_split);

  // this.resolution_selector = createSelect();
  // this.resolution_selector.side = false;
  // this.resolution_selector.mouseOver(processToolTip('Select the shot size'));
  // this.resolution_selector.mouseOut(processToolTip(''));
  // html_elements.push(this.resolution_selector);
  // this.resolution_selector.position(windowWidth/2 + 10, 40);
  // this.resolution_selector.option('360p');
  // this.resolution_selector.option('540p');
  // this.resolution_selector.option('1080p');
  // this.resolution_selector.option('4k');
  // this.resolution_selector.changed(selectResolution);

  this.export_split_button = createButton('Export split');
  this.export_split_button.side = false;
  this.export_split_button.mouseOver(processToolTip('Export splitscreen video'));
  html_elements.push(this.export_split_button);
  this.export_split_button.mousePressed(launchExportSplit);

  this.reframe_button = createButton('Process Reframing');
  this.reframe_button.side = false;
  this.reframe_button.mouseOver(processToolTip('Reframe your video according to the timeline'));
  this.reframe_button.mouseOut(processToolTip(''));
  html_elements.push(this.reframe_button);
  this.reframe_button.mousePressed(reframeRequest);

  this.is_split_export = false;
  this.resolution = 360;
  this.video_name = abs_path;
  this.progress_value;

  this.mousePressed = function(mx, my) {

  };

  this.drop = function(mx, my) {

  }

  this.drag = function(mx, my) {

  }

  this.keyPressed = function(keyCode) {

  }

  this.mouseWheel = function(event) {

  }

  this.updateAndShow = function(checked) {
    resetTabs();
    is_export_editor = true;
    clickTab(export_editor_button);
    this.showElts();
    act_input.hide();
    // Side el
    submit.show();
    reset_pos.show();
    hide_show_header_button.show();
    updateSideElems();
    up_rough = true;
  }

  this.hideElts = function() {
    this.check_split_screen.checked(false);
    this.is_split_export = false;
    this.check_split_screen.hide();
    this.export_split_button.hide();
    // this.resolution_selector.hide();
    this.name_video.hide();
    this.reframe_button.hide();
    this.video_export_selected.hide();
    this.div_export_video.hide();
    this.div_actors_split.hide();
    cadrage_editor.shot_selector.hide();
    shots_timeline.select_timeline.hide();
  }

  this.showElts = function() {
    for(let o of shots_timeline.list_data) {
      if(o.On) {
        this.name_video.elt.innerText = o.Name;
      }
    }
    this.div_export_video.show();
    // this.div_export_video.style('display','table');
    this.updateExportVideo();
    this.reframe_button.show();
    this.check_split_screen.show();
    // this.resolution_selector.show();
    this.name_video.show();
    shots_timeline.select_timeline.show();
  }

  this.updateExportVideo = function() {
    while(this.div_export_video.elt.firstChild){this.div_export_video.elt.firstChild.remove();}
    for(let p of data_path_video_export) {
      let name = createElement('h3',p.split('/')[p.split('/').length-1]);
      name.style('float','left');
      name.style('border','2px solid grey');
      name.style('margin','5');
      name.style('padding','0 5');
      name.elt.onclick = function() { selectVideo(name); }
      name.src_video = p;
      this.div_export_video.child(name);
    }
  }

  this.updateActorsDiv = function() {
    while(this.div_actors_split.elt.firstChild){this.div_actors_split.elt.firstChild.remove();}
    // this.div_actors_split.style('border','1px solid black');
    for(let p of preparation_editor.actors_timeline) {
      let name = createElement('h3',p.actor_name);
      name.style('float','left');
      name.style('border','2px solid grey');
      name.style('margin','5');
      name.style('padding','0 5');
      name.elt.onclick = function() { selectActor(name,p); }
      name.src_video = p;
      this.div_actors_split.child(name);
    }
  }

  this.resizeElt = function() {
    cadrage_editor.shot_selector.original_x = mid_width + 10;
    cadrage_editor.shot_selector.original_y = 170;
    this.div_export_video.original_x= mid_width+10;
    this.div_export_video.original_y= 170;
    this.div_export_video.size(((windowWidth - 160)-mid_width)-10);
    this.div_actors_split.original_x= mid_width+100;
    this.div_actors_split.original_y= 166;
    this.div_actors_split.size(((windowWidth - 160)-mid_width)-110);
    this.video_export_selected.original_x = mid_width+10;
    this.video_export_selected.original_y = this.div_export_video.original_y+this.div_export_video.height;
    this.video_export_selected.size(windowWidth-190-mid_width,height-200-this.video_export_selected.original_y);
    this.check_split_screen.original_x = mid_width + 10;
    this.check_split_screen.original_y = 10;
    // this.resolution_selector.original_x = mid_width + 120;
    // this.resolution_selector.original_y = 50;
    this.name_video.original_x = mid_width + 60;
    this.name_video.original_y = 12;
    this.reframe_button.original_x = mid_width+10;
    this.reframe_button.original_y = height-100;
    this.export_split_button.original_x = mid_width+10;
    this.export_split_button.original_y = 210;
    shots_timeline.y = viewer_height+70;
    shots_timeline.select_timeline.original_x = mid_width-175;
    shots_timeline.select_timeline.original_y = viewer_height;
    shots_timeline.select_timeline.size(150);
  }

  function updateMultiExport() {
    export_editor.is_split_export = this.checked();
    if(this.checked()) {
      export_editor.div_export_video.hide();
      export_editor.video_export_selected.hide();
      export_editor.export_split_button.show();
      export_editor.div_actors_split.show();
      export_editor.updateActorsDiv();
      cadrage_editor.shot_selector.show();
    } else {
      export_editor.div_export_video.show();
      export_editor.updateExportVideo();
      export_editor.export_split_button.hide();
      export_editor.div_actors_split.hide();
      cadrage_editor.shot_selector.hide();
    }
  }

  function selectResolution() {
    // export_editor.resolution = export_editor.resolution_selector.value();
  }

  function selectVideo(elem) {
    while(export_editor.video_export_selected.elt.firstChild){export_editor.video_export_selected.elt.firstChild.remove();}
    export_editor.video_export_selected.src = elem.src_video;
    export_editor.video_export_selected.elt.currentTime =0;
    export_editor.video_export_selected.elt.load();
    export_editor.video_export_selected.showControls();
    export_editor.video_export_selected.show();
  }

  function selectActor(elem, act) {
    if(elem.elt.style.color != 'rgb(46, 92, 156)') {
      elem.style('color','#2E5C9C');
      act.split = true;
    } else {
      elem.style('color','black');
      act.split = false;
    }
  }

  // Download the reframed video when the process is finished
  function callbackReframe(data) {
    // var a = createA(data['src'], 'link');
    // a.elt.download = "reframe_video.mp4";
    // a.id('click');
    // a.hide();
    // // console.log(a);
    // document.getElementById('click').click();
    // a.remove();
    let p = data['src'];
    data_path_video_export.push(p);
    export_editor.div_export_video.show();
    export_editor.updateExportVideo();
    export_editor.export_split_button.hide();
    export_editor.div_actors_split.hide();
    cadrage_editor.shot_selector.hide();
    export_editor.check_split_screen.checked(false);
    export_editor.is_split_export = false;
    alert('Your video is ready you can download it');

  }

  // Launch the reframing of the video based on the timeline information
  function reframeRequest() {
    // console.log(shots_timeline.compressBBoxes(),export_editor.name_video.elt.innerText);
    $.post({
      url: "reframeMov",
      data: {'abs_path': abs_path, 'bboxes':JSON.stringify(shots_timeline.compressBBoxes()), 't_start':shots_timeline.start_frame/frame_rate, 'name_export':export_editor.name_video.elt.innerText,
      't_end':shots_timeline.end_frame/frame_rate, 'is_split':false, 'width':Number(original_width), 'aspect_ratio':shots_timeline.getAspectRatio()},
      dataType: 'json',
      success: function (data) {
        console.log(data);
        return callbackReframe(data);
      }
    });
    const intervalLength = 2000;
    const interval = setInterval(() => {
      $.post({
        url: "check_progress_bar",
        data: {},
        dataType: 'json',
        success: function (data) {
          export_editor.progress_value = int(data['progress']);
          if(export_editor.progress_value>=100) {
            clearInterval(interval);
            export_editor.progress_value=undefined;
          }
          // return callbackReframe(data);
        }
      });
    }, intervalLength);
  }

  function sortSplitTab(a,b) {
    if (a[0] < b[0])
      return -1;
    if (a[0] > b[0])
      return 1;
    return 0;
  }

  function launchExportSplit() {
    let act_inv = [];
    for(let a of preparation_editor.actors_timeline) {
      if(a.split) {
        act_inv.push(a);
      }
    }
    let type = cadrage_editor.shot_selector.value();
    let a_s = aspect_ratio;
    // console.log(act_inv, type, a_s, export_editor.name_video.elt.innerText);
    export_editor.exportSplitScreenBBoxes(act_inv, type, a_s);
  }

  this.exportSplitScreenBBoxes = function(actors_involved, type, a_s, intersect=true, stage_pos=false, gaze_dir=false) {
    var ret = [];
    var final_a_s = a_s;
    for(let i=shots_timeline.start_frame;i<shots_timeline.end_frame;i++) {
      let tab_frame = [];
      for(let act of actors_involved) {
        let tab_act = [];
        tab_act.push(act);
        let bb = montage_editor.getShotAspect(type, tab_act, a_s, intersect, stage_pos, gaze_dir).getCurrStabShot(i);
        if(bb && bb[0] != "null") {
          tab_frame.push(bb);
        } else {
          tab_frame.push([0,0,Number(original_width), Number(original_height)]);
        }
      }
      ret.push(tab_frame.sort(sortSplitTab));
    }
    // console.log(ret);
    $.post({
      url: "reframeMov",
      data: {'abs_path': abs_path, 'bboxes':JSON.stringify(ret), 'is_split':true, 't_start':shots_timeline.start_frame/frame_rate,
      'name_export':export_editor.name_video.elt.innerText, 't_end':shots_timeline.end_frame/frame_rate, 'is_split':true,
      'width':Number(original_width), 'aspect_ratio':final_a_s, 'name_export':export_editor.name_video.elt.innerText},
      dataType: 'json',
      success: function (data) {
        console.log(data);
        return callbackReframe(data);
      }
    });
    const intervalLength = 2000;
    const interval = setInterval(() => {
      $.post({
        url: "check_progress_bar",
        data: {},
        dataType: 'json',
        success: function (data) {
          export_editor.progress_value = int(data['progress']);
          if(export_editor.progress_value>=100) {
            clearInterval(interval);
            export_editor.progress_value=undefined;
          }
          // return callbackReframe(data);
        }
      });
    }, intervalLength);
  }


  this.saveExport = function() {

  }

  this.timeToString = function(time) {
    let min = toTwoDigit(Math.floor(time/60).toString());
    let sec = toTwoDigit(Math.floor(time%60).toString());
    let mil = toTwoDigit(round_prec((time%1)*100,0).toString());
    return min +':'+sec+'.'+mil;
  }

  this.display = function() {

    push();
    fill(0);
    textSize(20);
    text('Title : ',mid_width+10,30);
    // text('Resolution : ',mid_width+10,70);
    text('Start : '+this.timeToString(shots_timeline.start_frame/frame_rate),mid_width+10,70);
    text('End : '+this.timeToString(shots_timeline.end_frame/frame_rate),mid_width+160,70);
    text('Duration : '+this.timeToString((shots_timeline.end_frame/frame_rate)-(shots_timeline.start_frame/frame_rate)),mid_width+10,110);
    if(this.progress_value!=undefined) {
      text('Progression',mid_width+10,height-180);
      fill('#2E5C9C');
      rect(mid_width+10,height-150,(windowWidth-170)-(mid_width+10),15);
      fill("#28A1A8");
      rect(mid_width+10,height-150,((windowWidth-170)-(mid_width+10))*(this.progress_value/100),15);
      fill(255);
      textSize(15);
      text(this.progress_value+"%",mid_width+10,height-138);
    }
    pop();
    shots_timeline.display();
    if(this.is_split_export) {
      push();
      fill(0);
      textSize(20);
      text('Size : ',mid_width+10,150);
      text('Select actors : ',mid_width+105,150);
      pop();
    } else {
      push();
      fill(0);
      textSize(20);
      if(data_path_video_export.length>0)
        text('Videos exported',mid_width+10,150);
      pop();
    }

  }
}
