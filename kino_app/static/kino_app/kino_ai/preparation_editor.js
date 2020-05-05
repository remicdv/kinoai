// Constructor initializes all variables
function PreparationEditor()  {

  // tous actor timeline
  // state hidden + offstage
  // show track check + tableau tracklets

  this.table_scroll;
  this.table_tracks;

  this.annotation_timeline = new AnnotationTimeline();

  this.actors_timeline = [];
  this.erase_button = [];
  this.tracklets_line = [];
  this.go_track = [];

  this.div_actors_timeline = createDiv();
  this.div_actors_timeline.style('overflow','auto');
  this.div_actors_timeline.id('div_wrap_actor');

  this.show_tracks = createCheckbox('Show tracks', false);
  this.show_tracks.side = false;
  this.show_tracks.mouseOver(processToolTip('Show all the tracklets'));
  this.show_tracks.mouseOut(processToolTip(''));
  html_elements.push(this.show_tracks);
  this.show_tracks.position(mid_width + 10, 10);
  this.show_tracks.size(150,20);
  this.show_tracks.changed(updateShowTracks);

  this.create_bbox = createButton('Create bbox');
  this.create_bbox.mouseOver(processToolTip('Create a personalize bounding box for a selected actor'));
  this.create_bbox.mouseOut(processToolTip(''));
  html_elements.push(this.create_bbox);
  this.create_bbox.mousePressed(createBBox);

  this.draw_track = createCheckbox('Draw track', false);
  this.draw_track.mouseOver(processToolTip('Show the selected track path'));
  this.draw_track.mouseOut(processToolTip(''));
  html_elements.push(this.draw_track);
  this.draw_track.size(150,30);
  this.draw_track.changed(updateDrawTrack);

  this.get_actors_on_stage = createButton('Actors On Stage');
  this.get_actors_on_stage.mouseOver(processToolTip('Download JSON with actors on stage for each frame'));
  this.get_actors_on_stage.mouseOut(processToolTip(''));
  html_elements.push(this.get_actors_on_stage);
  this.get_actors_on_stage.mousePressed(getListOnStage);

  this.get_meta_data = createButton('Meta Data');
  this.get_meta_data.mouseOver(processToolTip('Download JSON with meta data informations for each frame'));
  this.get_meta_data.mouseOut(processToolTip(''));
  html_elements.push(this.get_meta_data);
  this.get_meta_data.mousePressed(getFrameMetaData);

  this.annotation_edit = createCheckbox('Annotation Timeline', false);
  this.annotation_edit.mouseOver(processToolTip('Annotation edition tool'));
  this.annotation_edit.mouseOut(processToolTip(''));
  html_elements.push(this.annotation_edit);
  this.annotation_edit.size(150,30);
  this.annotation_edit.changed(updateAnnotationEdit);

  // sanitize = createButton('Sanitize');
  // sanitize.mouseOver(processToolTip('Clean the timeline'));
  // sanitize.mouseOut(processToolTip(''));
  // html_elements.push(sanitize);
  // sanitize.mousePressed(sanitizeFramesData);

  this.is_show_tracks = false;
  this.is_draw_track = false;
  this.is_annotation = false;

  this.offstage_state = new StateButton(330,viewer_height+15,40,5,'Offstage','red');

  this.mousePressed = function(mx, my) {
    if(this.is_annotation) {
      this.annotation_timeline.click(mouseX, mouseY);
    } else {
      if(this.is_show_tracks && this.table_scroll) {
        for(let g of this.go_track) {
          g.on = false;
          g.click(mouseX, mouseY);
          if(g.on){
            retime = true;
          }
        }
      }

      if (mouseX<width && mouseY < height && !bbox_creation) {
        for(let act of this.actors_timeline) {
          act.click(mouseX, mouseY);
        }
        if(mouseButton === CENTER) {
          for(let act of this.actors_timeline) {
            act.removeState(mouseX, mouseY);
            var b = act.removeTrack(mouseX, mouseY);
          }
        }
        for (var i = 0; i < this.erase_button.length; i++) {
          this.erase_button[i].on = false;
          this.erase_button[i].click(mouseX, mouseY);
          if(this.erase_button[i].on && this.erase_button[i]) {
            for(var j=0; j<this.tracklets_line.length; j++) {
              if(this.tracklets_line[j].actor_name == this.actors_timeline[i].actor_name && this.table_tracks) {
                this.table_tracks.elt.rows[j+1].cells[0].innerHTML = 'unknown';
              }
            }
            let ind;
            for(let j=0;j<this.annotation_timeline.actors_annotation.length; j++) {
              if(this.annotation_timeline.actors_annotation[j].actor_name == this.actors_timeline[i].actor_name) {
                ind = j;
              }
            }
            this.actors_timeline[i].removeAll();
            this.actors_timeline[i].elem.remove();
            this.annotation_timeline.actors_annotation[ind].elem.remove();
            this.annotation_timeline.actors_annotation.splice(ind,1);
            this.actors_timeline.splice(i, 1);
            this.erase_button.splice(i, 1);
            remove_timeline = true;
          }
        }
        var clic = false;
        var prev = undefined;
        for (let i=0; i<this.tracklets_line.length; i++) {
          if(this.tracklets_line[i].on) {
            prev = i;
          }
          this.tracklets_line[i].on = false;
          if(!clic)
            clic = this.tracklets_line[i].click(mouseX, mouseY);
        }
        if(!clic) {
          if(prev || prev==0) {
            this.tracklets_line[prev].on = true;
          }
        }
      }
      // Creation of a custom bbox for a specific actor
      if (bbox_creation && mouseX<viewer_width && mouseY < viewer_height){
        if(x_off<0){x_off=0;}
        if(y_off<0){y_off=0;}
        let mx = mouseX-x_off;
        let my = mouseY-y_off;
        mx /=(vid_h/Number(original_height));
        my /=(vid_h/Number(original_height));
        let bbox;
        let save = false;
        if(curr_creation && curr_creation.first_bbox && !curr_creation.last_bbox) {
          bbox = curr_creation.first_bbox;
        } else if(curr_creation && curr_creation.last_bbox) {
          bbox = curr_creation.last_bbox;
          save = true;
        }
        if(bbox && bbox.x == 0 && bbox.y == 0) {
          bbox.setPosition(Math.round(mx), Math.round(my));
          console.log('x, y');
        } else if (bbox && bbox.w == 0 && bbox.h == 0){
          bbox.setDimension(Math.round(mx) - bbox.x, Math.round(my) - bbox.y);
          console.log('w, h');
        } else if (bbox && !bbox.center_x && !bbox.center_y) {
          bbox.setCenter(Math.round(mx), Math.round(my));
          console.log('center');
        } else {
          bbox_creation = false;
          if(save){
            curr_creation.interpolate();
            if(curr_creation.act) {
              let t = new TrackBboxShot(curr_creation.act);
              t = curr_creation;
              curr_creation.act.track_bbox_shot.push(t);
            }
            curr_creation = undefined;
          }
        }
      }
    }

  };

  this.drop = function(mx, my) {
    if(this.is_annotation) {
      this.annotation_timeline.drop(mouseX, mouseY);
    } else {
      let state;
      let num_state;
      if(this.offstage_state.in_drag) {
        state = this.offstage_state;
        num_state = 1;
      }
      if(state) {
        for(let act of this.actors_timeline) {
          act.dropState(mouseX, mouseY, state, num_state);
        }
      }
      this.offstage_state.drop();
      var ind = 0;
      var is_obj = false;
      for(let i=0; i<this.tracklets_line.length; i++) {
        if(this.tracklets_line[i].drag) {
          is_obj = true;
          ind = i;
        }
        this.tracklets_line[i].drag = false;
      }
      for(let act of this.actors_timeline) {
        if(is_obj) {
          let detec = this.tracklets_line[ind].detections;
          if(mouseButton != CENTER && act.dropTrack(mouseX, mouseY, this.tracklets_line[ind], detec, total_frame) && this.table_tracks) {
            this.table_tracks.elt.rows[ind+1].cells[0].innerHTML = act.actor_name;
          }
        }
        let t = act.drop(mouseX, mouseY, player.total_frame);
        if(t) {
          this.tracklets_line.push(t);
        }
      }
    }

  }

  this.drag = function(mx, my) {
    if(this.is_annotation) {
      this.annotation_timeline.drag(mouseX, mouseY);
    } else {
      for(let act of this.actors_timeline) {
        if(act.dragExtTrack(mouseX, mouseY) && act.t_dragged) {
          let unit = act.w/player.total_frame;
          video.time((player.first+(mouseX-act.x)/unit)/frame_rate);
          img_hd = undefined;
        }
      }
      for(let t of this.tracklets_line) {
        if(t.drag) {
          b = true;
          break;
        }
      }
      this.offstage_state.drag(mouseX, mouseY);
    }
  }

  this.keyPressed = function(keyCode) {
    if(this.is_annotation) {
      this.annotation_timeline.keyPressed(keyCode);
    } else {
      if(keyCode===46) {
        this.removeTracklet();
      }
      if (!keyDown && keyCode == 17) {
        keyDown = 17;
      } else if(keyDown == 17 && keyCode == 90) {
        for(let act of this.actors_timeline) {
          var t = act.undoExtend();
          if(t) {
            t.on = true;
            this.removeTracklet();
          }
        }
        keyDown = undefined;
      }

      if(keyCode===83) {
        this.splitTracklet();
      }

      if(keyCode===69) {
        for(let act of this.actors_timeline) {
          for(var i=0; i< act.tracks.length; i++) {
            if(act.tracks[i].on) {
              act.tracks[i].actor_name = 'unknown';
              act.tracks[i].added = false;
              act.tracks.splice(i, 1);
              break;
            }
          }
        }
      }

      if(keyCode == 85) {
        for(let act of actors_timeline) {
          var t = act.undoExtend(Math.floor(video.duration()*frame_rate));
          if(t) {
            t.on = true;
            this.removeTracklet();
          }
        }
      }
    }
  }

  this.mouseWheel = function(event) {
    this.annotation_timeline.mouseWheel(event);
  }

  this.update = function(checked) {

  }


  // select the preparation editor
  this.updateAndShow = function() {
    resetTabs();
    is_preparation_editor = true;
    clickTab(preparation_editor_button);
    this.showElts();
    act_input.show();
    // Side el
    check_render_pose.show();
    submit.show();
    reset_pos.show();
    hide_show_header_button.show();
    updateSideElems();
    up_rough = true;
  }

  this.hideElts = function() {
    this.show_tracks.hide();
    this.is_show_tracks = false;
    this.show_tracks.checked(false);
    if(this.table_scroll) {
      this.table_scroll.remove();
      this.table_scroll = undefined;
    }
    this.draw_track.hide();
    this.is_draw_track = false;
    this.draw_track.checked(false);
    this.annotation_timeline.update(false);
    this.is_annotation = false;
    this.annotation_edit.checked(false);
    this.annotation_timeline.hideAllElt();
    this.create_bbox.hide();
    this.div_actors_timeline.hide();
    for(let t of this.tracklets_line) {
      t.on = false;
    }
    for(let a of this.actors_timeline) {
      a.on = false;
      for(let t of a.tracks) {
        t.on = false;
      }
    }
    this.annotation_edit.hide();
    this.get_meta_data.hide();
    this.get_actors_on_stage.hide();
  }

  this.showElts = function() {
    this.annotation_edit.show();
    this.show_tracks.show();
    this.draw_track.show();
    this.show_tracks.show();
    this.create_bbox.show();
    this.div_actors_timeline.show();
    this.get_meta_data.show();
    this.get_actors_on_stage.show();
  }

  this.loadActorTimelines = function() {
    if(data_timelines[0]) {
      const data_own_t = Object.getOwnPropertyNames(data_timelines);
      for(let i=0; i<data_own_t.length; i++) {
        var act = new ActorTimeline(frames_data);
        act.frames_data = frames_data;
        act.color = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
        act.actor_name = data_timelines[i].Name;
        var x = 100;
        var y = viewer_height+40+i*20+25;
        act.setPosition(x, y, player.w, 15);
        for(var j=0; j<data_timelines[i].Timeline.length; j++) {
          if(data_timelines[i].Timeline[j].Detections) {
            var t = new Track();
            t.setActorName(act.actor_name);
            t.setFirstFrame(data_timelines[i].Timeline[j].FirstFrame);
            t.detections = data_timelines[i].Timeline[j].Detections;
            this.tracklets_line.push(t);
            act.addTrack(t);
          }
          if(data_timelines[i].Timeline[j].BBoxes) {
            let t = new TrackBboxShot(act);
            t.first_frame = data_timelines[i].Timeline[j].FirstFrame;
            t.last_frame = data_timelines[i].Timeline[j].LastFrame;
            for(let b of data_timelines[i].Timeline[j].BBoxes) {
              let bb = new BboxShot(b[0],b[1],b[2],b[3]);
              bb.setCenter(b[4],b[5]);
              t.bboxes.push(bb);
            }
            act.track_bbox_shot.push(t);
          }
        }
        var elem = createElement('h3', act.actor_name);
        elem.elt.contentEditable = 'true';
        elem.id('editor');
        act.elem = elem;
        this.div_actors_timeline.child(act.elem);
        this.actors_timeline.push(act);
        this.sortActorTimelines();
        remove_timeline = true;
        this.erase_button.push(new EraseButton(i));
      }
    }
    let l_t;
    if(data_tracks.length) {
      l_t = data_tracks.length
    } else {
      const data_own = Object.getOwnPropertyNames(data_tracks);
      l_t = data_own.length;
    }
    for (var i = 0; i < l_t; i++) {
      tracks_data.push(data_tracks[i]);
    }

    for (var i = 0; i < tracks_data.length; i++) {
      var t = new Track();
      t.setActorName("unknown");
      t.setFirstFrame(tracks_data[i]['FirstFrame']);
      t.detections = tracks_data[i]['Detections'];
      this.tracklets_line.push(t);
    }

    if(data_annotation_timeline[0]) {
      const data_own_t = Object.getOwnPropertyNames(data_annotation_timeline);
      for(let i=0; i<data_own_t.length; i++) {
        let a = new ActorAnnotation(data_annotation_timeline[i].Name);
        for(let act of data_annotation_timeline[i].Actions) {
          let obj = {};
          obj.name = act.Name;
          obj.first_frame = act.FirstFrame;
          obj.end_frame = act.EndFrame;
          obj.color = act.Color;
          a.setAction(obj);
        }
        this.annotation_timeline.actors_annotation.push(a);
        this.annotation_timeline.erase_button.push(new EraseButton(this.annotation_timeline.actors_annotation.length-1));
        this.annotation_timeline.div_wrap.child(a.elem);
      }
    } else {
      for(let act of preparation_editor.actors_timeline) {
        let a = new ActorAnnotation(act.actor_name);
        this.annotation_timeline.actors_annotation.push(a);
        this.annotation_timeline.erase_button.push(new EraseButton(this.annotation_timeline.actors_annotation.length-1));
        this.annotation_timeline.div_wrap.child(a.elem);
      }
    }
  }

  this.getTimelinesData = function() {
    let json_act_name = [];

    for(let act of this.actors_timeline) {
      // json_act_name.id =
      var timeline = {};
      timeline.Name = act.actor_name;
      timelines = [];
      if(act.tracks.length>0){
        for(let t of act.tracks) {
          var track = {};
          track.Detections = t.detections;
          track.FirstFrame = t.first_frame;
          timelines.push(track);
        }
      }
      if(act.states.length>0){
        for(let st of act.states) {
          var state = {};
          state.State = st.Num;
          state.FirstFrame = st.FirstFrame;
          timelines.push(state);
        }
      }
      if(act.track_bbox_shot.length>0){
        for(let t of act.track_bbox_shot) {
          var t_bbox = {};
          t_bbox.FirstFrame = t.first_frame;
          t_bbox.LastFrame = t.last_frame;
          t_bbox.BBoxes = [];
          for(let b of t.bboxes){
            let val = [b.x, b.y, b.w, b.h, b.center_x, b.center_y];
            t_bbox.BBoxes.push(val);
          }
          timelines.push(t_bbox);
        }
      }
      timeline.Timeline = timelines;
      json_act_name.push(timeline);
    }
    return json_act_name;
  }


  this.getAnnotationData = function() {
    let annot_t = [];
    for(let a_t of this.annotation_timeline.actors_annotation) {
      let obj = {};
      obj.Name = a_t.actor_name;
      obj.Actions = [];
      for(let act of a_t.actions) {
        let o = {};
        o.Name = act.name;
        o.FirstFrame = act.first_frame;
        o.EndFrame = act.end_frame;
        o.Color = act.color;
        obj.Actions.push(o);
      }
      annot_t.push(obj);
    }
    return annot_t;
  }

  this.getTrackletsData = function() {
    let json_tracks = [];
    for(let t of this.tracklets_line) {
      if(!t.added && !t.old) {
        var track = {};
        track.Detections = t.detections;
        track.FirstFrame = t.first_frame;
        json_tracks.push(track);
      }
    }
    return json_tracks;
  }

  this.resizeElt = function() {
    this.show_tracks.original_x = mid_width + 10;
  }


  function updateAnnotationEdit() {
    preparation_editor.is_annotation = this.checked();
    preparation_editor.annotation_timeline.update(preparation_editor.is_annotation);
  }

  function updateShowTracks() {
    preparation_editor.is_show_tracks = this.checked();
  }

  function updateDrawTrack() {
    preparation_editor.is_draw_track = this.checked();
  }

  // Extract a Json file with the list of actors on stage at each frame
  function getListOnStage() {
    let ret = [];
    for(let i=1; i<total_frame+1; i++) {
      ret.push(preparation_editor.getActOnStage(i));
    }
    createStringDict(ret).saveJSON('actors_on_stage');
    // for(let act of actors_timeline) {
    //   // ret.push(act.extractMovement());
    //   let tab = [];
    //   let curr = [];
    //   for(let obj of act.extractMovement()) {
    //     if(obj.Mvt != 0) {
    //       curr.push(obj.Frame)
    //     } else {
    //       if(curr.length > 3) {
    //         tab.push(curr);
    //       }
    //       curr = [];
    //     }
    //   }
    //   ret.push(tab);
    // }
    // console.log(ret);
  }

  // Get the Object actor timeline from an actor name
  this.getAct = function(name) {
    let ret;
    for(let a of preparation_editor.actors_timeline) {
      if(a.actor_name == name) {
        ret = a;
        break;
      }
    }
    return ret;
  }

  // Get the names of the actors present on stage
  this.getActOnStage = function(fr_n) {
    let ret = [];
    for(let a of this.actors_timeline) {
      if(a.isOnstage(fr_n)) {
        ret.push(a.actor_name);
      }
    }
    return ret;
  }

  // Extract the meta data for each actors on stage at each frame
  function getFrameMetaData() {
    let ret = [];
    for(let i=1; i<total_frame+1; i++) {
      let tab_indexes = preparation_editor.getTrackletsIndexes(i, false, true);
      let keypoints = frames_data[i];
      let o = {};
      o.ActsOnStage = [];
      for( let obj of tab_indexes) {
        if(obj.act && keypoints[obj.ind]) {
          let meta_data = {};
          meta_data.ActName = obj.act.actor_name;
          let bbox = getBBox(keypoints[obj.ind]['KeyPoints']);
          meta_data.BoundingBox = {w:int(bbox[2]-bbox[0]),l:int(bbox[3]-bbox[1])};
          meta_data.Surface = meta_data.BoundingBox.w * meta_data.BoundingBox.l;
          meta_data.GazeVect = p5VectToJson(getGazevect(keypoints[obj.ind]['KeyPoints']));
          meta_data.VelocityVect = p5VectToJson(obj.act.getVelocityVect(i));
          meta_data.KeyPoints = keypoints[obj.ind]['KeyPoints'];
          o.ActsOnStage.push(meta_data);
        }
      }
      ret.push(o);
    }
    // console.log(ret);
    createStringDict(ret).saveJSON('frames_metadata');
  }

  // Sort the tracks table (short length ==> long length)
  function sortTable(_table=undefined) {
    var table, rows, switching, i, x, y, shouldSwitch;
    if(!_table) {
      table = preparation_editor.table_scroll.elt.firstElementChild;
    }
    switching = true;
    // Make a loop that will continue until no switching has been done:
    while (switching) {
      //start by saying: no switching is done:
      switching = false;
      rows = table.rows;
      // Loop through all table rows (except the first, which contains table headers):
      for (i = 1; i < (rows.length - 1); i++) {
        //start by saying there should be no switching:
        shouldSwitch = false;
        // Get the two elements you want to compare, one from current row and one from the next:
        x = rows[i].getElementsByTagName("TD")[2];
        y = rows[i + 1].getElementsByTagName("TD")[2];
        //check if the two rows should switch place:
        if (Number(x.innerHTML) > Number(y.innerHTML)) {
          //if so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      }
      if (shouldSwitch) {
        // If a switch has been marked, make the switch and mark that a switch has been done:
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
      }
    }
  }

  // Create a html table to navigate into the tracklets
  this.createTableTracks = function() {

    if(this.is_show_tracks && !this.table_scroll) {
      this.go_track = [];
      this.table_scroll = createElement('div');
      this.table_scroll.id('table-scroll');
      this.table_scroll.position(viewer_width + 20, can.elt.offsetTop+60);
      table_tracks = createElement('table');
      var head = createElement('thead');
      var row = createElement('tr');
      row.child(createElement('th','Actor'));
      row.child(createElement('th','First'));
      let le = createElement('th','Length');
      le.mouseClicked(sortTable);
      row.child(le);
      row.child(createElement('th','Go'));
      head.child(row);
      table_tracks.child(head);

      for (let t of this.tracklets_line) {
        var row = createElement('tr');
        row.child(createElement('td',t.actor_name));
        row.child(createElement('td',t.first_frame));
        row.child(createElement('td',t.detections.length));
        var g = createElement('td','Go');
        row.child(g);
        table_tracks.child(row);
        var x1 = this.table_scroll.position().x+g.position().x;
        var y1 = this.table_scroll.position().y+g.position().y;
        this.go_track.push(new GoButton(g.width, g.height, t, g));
      }
      this.table_scroll.child(table_tracks);
    } else {
      if(this.table_scroll && !this.is_show_tracks) {
        this.table_scroll.remove();
        this.table_scroll = undefined;
      }
    }

  }

  this.sortActorTimelines = function() {
    this.actors_timeline.sort(compare_name);
    while(this.div_actors_timeline.firstChild){this.div_actors_timeline.firstChild.remove();}
    for(let a of this.actors_timeline) {
      this.div_actors_timeline.child(a.elem);
    }
  }

  this.createActTimeline = function() {
    if(this.is_annotation) {
      this.createAnnotTimeline();
    } else {
      let actors = [];
      for(let act of this.actors_timeline) {
        actors.push(act.actor_name);
      }
      if(act_input.value() && !actors.includes(act_input.value())) {
        actors.push(act_input.value());
        let elem = createElement('h3', actors[actors.length-1]);
        elem.elt.contentEditable = 'true';
        elem.id('editor');
        let x = 100;
        let y = viewer_height+40+(actors.length-1-1)*20+25;
        let act = new ActorTimeline(x, y, player.w, 15, frames_data);
        act.elem = elem;
        this.div_actors_timeline.child(act.elem);
        act.actor_name = actors[actors.length-1];
        this.actors_timeline.push(act);
        this.sortActorTimelines();
        this.erase_button.push(new EraseButton(this.actors_timeline.length-1));
        this.createAnnotTimeline();
      }
    }
  }

  this.createAnnotTimeline = function() {
    let a = new ActorAnnotation(act_input.value());
    this.annotation_timeline.actors_annotation.push(a);
    this.annotation_timeline.div_wrap.child(a.elem);
    act_input.value('');
    this.annotation_timeline.erase_button.push(new EraseButton(this.annotation_timeline.actors_annotation.length-1));
    this.annotation_timeline.sortActorAnnotation();
  }


  // Remove the selected tracklet
  this.removeTracklet = function() {
    for(var i=0; i<this.tracklets_line.length; i++) {
      if(this.tracklets_line[i].on && !this.tracklets_line[i].added) {
        this.tracklets_line.splice(i,1);
        if(this.table_scroll) {
          this.table_scroll.remove();
          this.table_scroll = undefined;
        }
      }
    }
  }


  // split current tracklet at the current frame
  this.splitTracklet = function() {
    for(let t of this.tracklets_line) {
      if(t.on && !t.added) {
        var first = t.first_frame;
        var new_track = new Track();
        new_track.first_frame = frame_num;
        var detec = t.detections;
        var len = detec.length;
        detec = detec.slice(frame_num-first, len);
        t.detections = t.detections.slice(0,frame_num-first);
        t.drag = false;
        t.on = false;
        t.setPosition(0,0,0,0);
        new_track.detections = detec;
        new_track.actor_name = 'unknown';
        this.tracklets_line.push(new_track);
      }
    }
    for(let a of this.actors_timeline) {
      for(let t of a.tracks) {
        if(t.on) {
          var first = t.first_frame;
          var new_track = new Track();
          new_track.first_frame = frame_num;
          var detec = t.detections;
          var len = detec.length;
          detec = detec.slice(frame_num-first, len);
          t.detections = t.detections.slice(0,frame_num-first);
          t.drag = false;
          t.on = false;
          t.setPosition(0,0,0,0);
          new_track.detections = detec;
          a.addTrack(new_track);
          a.updateTrackPos(total_frame);
          this.tracklets_line.push(new_track);
        }
      }
      for(let t of a.track_bbox_shot) {
        if(t.on) {
          let new_track = new TrackBboxShot(a);
          new_track.first_frame = t.first_frame;
          new_track.last_frame = frame_num-1;
          new_track.bboxes = t.bboxes.slice(0,new_track.last_frame-t.first_frame);
          t.bboxes = t.bboxes.slice(frame_num-t.first_frame, t.bboxes.length);
          t.first_frame = frame_num;
          a.track_bbox_shot.push(new_track);
        }
      }
    }
  }

  // Get the indexes of the tracklets
  this.getTrackletsIndexes = function(fr_n=undefined,added=false,just_acts=false) {
    if(!fr_n) {
      fr_n =frame_num;
    }
    var keypoints = frames_data[fr_n];
    let tab = [];
    if(keypoints) {
      if(!just_acts) {
        for (let t of this.tracklets_line) {
          if((added || !t.added) && !t.old) {
            var detections_track = t.detections;
            var first_frame = t.first_frame;
            if(first_frame < fr_n) {
              if(detections_track.length > (fr_n-first_frame)) {
                if(detections_track[fr_n-first_frame] < keypoints.length) {
                  let obj = {};
                  obj.ind = detections_track[fr_n-first_frame];
                  obj.track = t;
                  tab.push(obj);
                }
              }
            }
          }
        }
      }
      for(let act of this.actors_timeline) {
        for(let t of act.tracks) {
          var detections_track = t.detections;
          var first_frame = t.first_frame;
          if(first_frame < fr_n) {
            if(detections_track.length > (fr_n-first_frame)) {
              if(detections_track[fr_n-first_frame] < keypoints.length) {
                let obj = {};
                obj.ind = detections_track[fr_n-first_frame];
                obj.track = t;
                obj.act = act;
                tab.push(obj);
              }
            }
          }
        }
      }
    }
    return tab;
  }


  // Draw the actors timeline
  this.displayTimeline = function() {
    for(var i=0; i < this.actors_timeline.length; i++) {
      let act = this.actors_timeline[i];
      act.elem.size(player.x);
      if(!cadrage_editor.is_shot_creation) {
        act.setPosition(player.x, act.elem.elt.offsetTop+act.elem.elt.parentNode.offsetTop-can.elt.offsetTop-$('#div_wrap_actor').scrollTop(),player.w,20);
      }
      act.updateTrackPos(player.total_frame);
      this.actors_timeline[i].display();
      this.erase_button[i].setPosition(mid_width+10, this.actors_timeline[i].y+(this.actors_timeline[i].h/2));
      this.erase_button[i].display();
    }
    remove_timeline = false;
  }


  // Draw the bounding box created by the user
  function createBBox() {
    if(!bbox_creation) {
      bbox_creation = true;
      let name;
      for(let a of preparation_editor.actors_timeline){
        if(a.on) {
          name = a;
        }
      }
      if(!name || preparation_editor.getActOnStage(frame_num).includes(name.actor_name)) {
        bbox_creation = false;
        curr_creation = undefined;
      }else if(!curr_creation) {
        curr_creation = new TrackBboxShot(name);
        curr_creation.first_bbox = new BboxShot(0,0,0,0);
        curr_creation.first_frame = frame_num;
      } else {
        curr_creation.last_bbox = new BboxShot(0,0,0,0);
        curr_creation.last_frame = frame_num;
      }
    } else {
      bbox_creation = false;
      curr_creation = undefined;
    }
  }

  this.displayCounter = function() {
    let cpt = 0;
    let l = 0;
    for(let t of this.tracklets_line) {
      if(t.actor_name!='unknown' && !t.old) {
        cpt++;
        l++;
      } else if(!t.old) {
        l++;
      }
    }
    push();
    fill(255);
    text(cpt+'/'+l,100,15);

    let min = toTwoDigit(Math.floor(video.time()/60).toString());
    let sec = toTwoDigit(Math.floor(video.time()%60).toString());
    let mil = toTwoDigit(round_prec((video.time()%1)*100,0).toString());
    // text(round_prec(scale_ratio), 200,15);
    text(frame_num, 150,15);
    text(Math.round(frameRate()), viewer_width-40,15);
    textSize(20);
    text(min +':'+sec+'.'+mil, 10,20);
    min = toTwoDigit(Math.floor(video.duration()/60).toString());
    sec = toTwoDigit(Math.floor(video.duration()%60).toString());
    mil = toTwoDigit(round_prec((video.duration()%1)*100,0).toString());
    text(min +':'+sec+'.'+mil, 10,45);
    stroke(255);
    line(10,25,90,25);
    pop();
  }

  // Draw a preview of the selected tracklet
  this.drawPreview = function() {
    let k=0;
    for(let t of this.tracklets_line) {
      if(t.on && !t.added && !t.old) {
        text('Preview '+k,10,viewer_height+37);
        t.updatePos(player.w/player.total_frame, player.x, viewer_height+30);
        t.display();
      }
      if(t.drag) {
        rect(mouseX, mouseY, 25, 7);
      }
      k++;
    }
  }

  // Draw the current frame open pose detections wich are in a tracklet
  this.drawTracklets = function() {
    let keypoints = frames_data[frame_num];
    let tab_indexes = this.getTrackletsIndexes();
    for( let obj of tab_indexes) {
      if(!render_pose && !is_montage_editor && !annotation_editor.is_note_book) {
        drawBBox(keypoints[obj.ind]['KeyPoints'], obj.track);
      } else if(render_pose) {
        if(!obj.act) {
          drawPose(keypoints[obj.ind]['KeyPoints']);
        } else {
          drawPose(keypoints[obj.ind]['KeyPoints'],obj.act);
        }
      }
    }
  }

  this.displayTrackBBox = function(){
    for(let a of this.actors_timeline) {
      for(let t of a.track_bbox_shot) {
        if(!montage_editor.is_split && !annotation_editor.is_note_book) {
          t.display();
        }
      }
    }
  }

  // Draw the actor movement on stage from the tracklet beginning  until the current frame
  this.drawTrackOn = function() {
    push();
    colorMode(HSB);
    let from = color(120, 100, 20);
    let to = color(120, 100, 80);
    for(let t of this.tracklets_line) {
      var detections_track = t.detections;
      if(t.on) {
        if(video.duration()) {
          var last_frames_track = t.first_frame+detections_track.length;
          if(frame_num>t.first_frame && frame_num < last_frames_track) {
            for(var j = t.first_frame; j < frame_num; j++) {
              var keypoints = frames_data[j];
              if(keypoints[detections_track[j-t.first_frame]]) {
                var center = getCenter(keypoints[detections_track[j-t.first_frame]]['KeyPoints']);
                push();
                let color = lerpColor(from, to, j/(frame_num-t.first_frame));
                fill(color);
                ellipse(center[0],center[1],3);
                pop();
              }
            }
          }
        }
      }
    }
    pop();
  }

  this.drawFramesData = function() {
    for(let keypoints of frames_data[frame_num]) {
      if(keypoints.KeyPoints)
        drawPose(keypoints.KeyPoints);
    }
  }

  this.display = function() {

    this.div_actors_timeline.position(0,viewer_height+can.elt.offsetTop+45);
    this.div_actors_timeline.size(mid_width, windowHeight-this.div_actors_timeline.y-5);

    this.offstage_state.y = viewer_height+13;
    push();
    if(x_off<0){x_off=0;}
    if(y_off<0){y_off=0;}
    translate(x_off,y_off);
    scale(vid_h/Number(original_height));
    // console.log(x_off,y_off,viewer_width/Number(original_width));
    this.displayTrackBBox();
    this.drawTracklets();
    if(this.is_draw_track) {
      this.drawTrackOn();
    }
    if(curr_creation && !this.is_annotation)
      curr_creation.display();
    pop();

    push();
    textSize(17);
    text('Actor name', 10, viewer_height+15);
    pop();

    if(this.is_annotation) {
      this.annotation_timeline.display();
    } else {
      this.displayTimeline();
      this.drawPreview();
      this.offstage_state.display();
    }

    this.createTableTracks();

  }
}
