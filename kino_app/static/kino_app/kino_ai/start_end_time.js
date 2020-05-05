// Constructor initializes all variables
function ShotsTimeline(tempX, tempY, tempW, tempH, tempDur, tempRate, tempStart = 0)  {
  // Button location and size
  this.x  = tempX;
  this.y  = tempY;
  this.w  = tempW;
  this.h  = tempH;
  this.frame_rate = tempRate;

  this.on = false;

  this.duration = tempDur;

  this.time = 0;

  this.shots = [];

  this.scenes = [];

  this.start_frame = 0;

  this.end_frame = total_frame;

  this.drop_shot;

  this.draggin = false;

  this.new_timeline_input = createInput();
  this.new_timeline_input.side = false;
  html_elements.push(this.new_timeline_input);
  this.new_timeline_input.changed(createNewTimeline);

  this.select_timeline = createSelect();
  this.select_timeline.side = false;
  html_elements.push(this.select_timeline);
  this.select_timeline.changed(selectAuthorTimeline);

  this.name_elem = createElement('h3');
  this.name_elem.elt.contentEditable = true;
  this.name_elem.side = false;
  html_elements.push(this.name_elem);
  this.name_elem.style('margin',0);
  this.name_elem.style('font-size',20);
  this.name_elem.style('text-decoration','underline');

  this.remove_button = {'x':0,'y':0,'rad':10};

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    for(var i=0; i<this.shots.length; i++) {
      this.shots[i].on = false;
    }
    this.draggin = false;
    if(mx>this.remove_button.x && mx<this.remove_button.x+this.remove_button.rad && this.remove_button.y<my && my<this.remove_button.y+this.remove_button.rad) {
      if(confirm('Are you sure you want to delete the '+this.name_elem.elt.innerText+' timeline ?')) {
        this.removeTimeline();
      }
      return undefined;
    }
    if(keyIsPressed) {
      this.clickTimeButton(mx,my);
    }
    if (!montage_editor.is_split && mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      for(var i=0; i<this.shots.length; i++) {
        if(mx > this.shots[i].start && mx < this.shots[i].end) {
          this.shots[i].on = true;
        }
      }
      this.on = !this.on;
      return this.on
    } else {
      return undefined;
    }
  };

  this.clickTimeButton = function(mx,my) {
    if(mx > this.start_time_button.x && mx < this.start_time_button.x + this.start_time_button.w && my > this.start_time_button.y && my < this.start_time_button.y + this.start_time_button.h) {
      if(frame_num<this.end_frame) {
        this.start_frame = frame_num;
        for(let o of this.list_data) {
          if(o.On) {
            o.start_frame = frame_num;
            break;
          }
        }
      }
    }
    if(mx > this.end_time_button.x && mx < this.end_time_button.x + this.end_time_button.w && my > this.end_time_button.y && my < this.end_time_button.y + this.end_time_button.h) {
      if(frame_num>this.start_frame) {
        this.end_frame = frame_num;
        for(let o of this.list_data) {
          if(o.On) {
            o.end_frame = frame_num;
            break;
          }
        }
      }
    }
  }

  this.resetButton = function(mx,my) {
    if(mx > this.start_time_button.x && mx < this.start_time_button.x + this.start_time_button.w && my > this.start_time_button.y && my < this.start_time_button.y + this.start_time_button.h) {
      this.start_frame = 0;
      for(let o of this.list_data) {
        if(o.On) {
          o.start_frame = 0;
          break;
        }
      }
    }
    if(mx > this.end_time_button.x && mx < this.end_time_button.x + this.end_time_button.w && my > this.end_time_button.y && my < this.end_time_button.y + this.end_time_button.h) {
      this.end_frame = total_frame;
      for(let o of this.list_data) {
        if(o.On) {
          o.end_frame = total_frame;
          break;
        }
      }
    }
  }

  this.drag = function(mx, my) {
    if (!montage_editor.is_split && mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      let b = true;
      for(let s of montage_editor.shots) {
        if(s.drag) {
          b =false;
          break;
        }
      }
      if(b || (keyIsPressed && keyCode == 16)) {
        let unit = this.w/(player.total_frame/frame_rate);
        this.time=(player.first/frame_rate)+(mx-this.x)/unit;
        video.time(this.time);
      }
      this.draggin = true;
    } else {
      return undefined;
    }
  }

  this.drop = function(mx, my) {
    document.body.style.cursor = "default";
    this.draggin = false;
    let s;
    let ext_s;
    for(let i=0; i<montage_editor.shots.length; i++) {
      if(montage_editor.shots[i].on) {
        s = montage_editor.shots[i];
      }
    }
    for(let shot of this.shots) {
      if(shot.on) {
        ext_s = shot;
      }
    }
    if (!montage_editor.is_split && s && mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      if(!this.shots[0]) {
        this.time = this.start_frame/frame_rate;
        this.addShot(s);
        return 0;
      } else {
        var unit = this.w/this.duration;
        // this.time= Math.max((player.first/frame_rate),this.start_frame/frame_rate) + (mx-Math.max(this.start_frame*(this.w/total_frame)+this.x,this.x))/unit;
        this.time= (player.first/frame_rate) + (mx-this.x)/unit;
        this.addShot(s);
        return this.time;
      }
    } else if (!montage_editor.is_split && ext_s && mx > 0 && mx < mid_width && my > this.y && my < this.y + this.h && (mx < ext_s.start || mx > ext_s.end)) {
      // Extend ext shot
      var unit = this.w/this.duration;
      if(mx < this.x) {
        mx = this.x;
      }
      if(mx > this.x + this.w) {
        mx = this.x + this.w;
      }
      this.time= (player.first/frame_rate) + (mx-this.x)/unit;
      this.extendShot(ext_s, mx);
      return this.time;
    } else {
      return undefined;
    }
  }

  this.hideElts = function() {
    this.select_timeline.hide();
    this.new_timeline_input.hide();
    this.name_elem.hide();
  }

  this.showElts = function() {
    this.start_time_button = {'x':5,'y':this.y-10,'w':this.x-5,'h':this.h/2};
    this.end_time_button = {'x':5,'y':this.y+this.h-10,'w':this.x-5,'h':this.h/2};
    this.select_timeline.show();
    this.new_timeline_input.show();
    this.name_elem.show();
    this.updateTimeline();
  }

  this.updateTimeline = function() {
    if(this.select_timeline.child().length==0) {
      for(let o of this.list_data) {
        this.select_timeline.option(o.Name);
      }
    }
    let obj = this.list_data[0];
    for(let o of this.list_data) {
      if(o.On) {
        obj = o;
        break;
      }
    }
    obj.On = true;
    this.shots = obj.Data;
    this.select_timeline.elt.value = obj.Name;
    this.name_elem.elt.innerText = obj.Name;
    if(!obj.start_frame) {
      obj.start_frame=0;
    }
    if(!obj.end_frame) {
      obj.end_frame=total_frame;
    }
    this.start_frame = obj.start_frame;
    this.end_frame = obj.end_frame;
  }

  this.resizeElt = function() {
    this.start_time_button = {'x':5,'y':this.y-10,'w':this.x-5,'h':this.h/2};
    this.end_time_button = {'x':5,'y':this.y+this.h-10,'w':this.x-5,'h':this.h/2};
    this.select_timeline.original_x = mid_width-175;
    this.select_timeline.original_y = viewer_height;
    this.select_timeline.size(150);
    this.new_timeline_input.original_x = 130;
    this.new_timeline_input.original_y = viewer_height;
    this.name_elem.original_x = int(mid_width/2);
    this.name_elem.original_y = viewer_height;
  }

  function createNewTimeline() {
    if(shots_timeline.checkName(shots_timeline.new_timeline_input.value())) {
      for(let data of shots_timeline.list_data) {
        data.On = false;
      }
      shots_timeline.list_data.push({'Name':shots_timeline.new_timeline_input.value(),'Data':[],'On':true,'start_frame':0,'end_frame':total_frame});
      shots_timeline.select_timeline.option(shots_timeline.new_timeline_input.value());
      shots_timeline.select_timeline.elt.value = shots_timeline.new_timeline_input.value();
      shots_timeline.shots = [];
      shots_timeline.name_elem.elt.innerText = shots_timeline.new_timeline_input.value();
      shots_timeline.new_timeline_input.value('');
      shots_timeline.start_frame = 0;
      shots_timeline.end_frame = total_frame;
    } else {
      alert('Name already used');
    }
  }

  function selectAuthorTimeline() {
    for(let data of shots_timeline.list_data) {
      data.On = false;
      if(data.Name == this.elt.value) {
        data.On = true;
      }
    }
    shots_timeline.setTabShots();
    shots_timeline.name_elem.elt.innerText = this.elt.value;
    export_editor.name_video.elt.innerText = this.elt.value;
    export_editor.export_name = this.elt.value;
  }

  this.setTabShots = function() {
    this.shots = [];
    for(let data of this.list_data) {
      if(data.On) {
        this.shots = data.Data;
        this.start_frame = data.start_frame;
        this.end_frame = data.end_frame;
        break;
      }
    }
  }

  this.changeName = function(new_name) {
    for(let data of shots_timeline.list_data) {
      if(data.On && this.checkName(new_name)) {
        for(let o of this.select_timeline.child()) {
          if(o.innerText == this.select_timeline.elt.value) {
            o.innerText = new_name;
            o.value = new_name;
            break;
          }
        }
        data.Name = new_name;
      }
    }
  }

  this.checkName = function(new_name) {
    let ret = true;
    for(let o of this.list_data) {
      if(o.Name == new_name) {
        ret = false;
        break;
      }
    }
    return ret;
  }

  this.removeTimeline = function() {
    for(let i=0;i < this.list_data.length;i++) {
      let o = this.list_data[i];
      if(o.On) {
        o.On = false;
        for(let c of this.select_timeline.child()) {
          if(c.innerText == o.Name) {
            c.remove();
            break;
          }
        }
        for(let obj of this.list_data) {
          if(obj.Name == this.select_timeline.elt.value) {
            obj.On = true;
          }
        }
        this.setTabShots();
        this.name_elem.elt.innerText = this.select_timeline.elt.value;
        this.list_data.splice(i,1);
        if(this.list_data.length==0) {
          this.createDefault('Default');
        }
        break;
      }
    }
  }

  this.createDefault = function(name) {
    this.list_data.push({'Name':name,'Data':[],'On':true,'start_frame':0,'end_frame':total_frame});
    this.select_timeline.option(name);
    this.select_timeline.elt.value = name;
    this.shots = [];
    this.name_elem.elt.innerText = name;
  }

  this.addShotOnCursor = function(shot) {
    let unit = this.w/this.duration;
    this.time= (player.first/frame_rate) + (player.nav_bar.cursor-this.x)/unit;
    this.addShot(shot);
  }

  this.replaceShot = function(shot) {
    let x_pos= player.nav_bar.cursor;
    let new_shot;
    for(let s of this.shots) {
      if(s.start < x_pos && x_pos<s.end) {
        new_shot = s;
      }
    }
    if(new_shot) {
      new_shot.type = shot.type;
      new_shot.actors_involved = shot.actors_involved;
      new_shot.aspect_ratio = shot.aspect_ratio;
      new_shot.is_intersect = shot.is_intersect;
      new_shot.is_stage_position = shot.is_stage_position;
      new_shot.is_gaze_direction = shot.is_gaze_direction;
    }
  }

  this.addShot = function(shot) {
    var s = {};//new Shot();
    s.type = shot.type;
    s.actors_involved = shot.actors_involved;
    s.aspect_ratio = shot.aspect_ratio;
    s.is_intersect = shot.is_intersect;
    s.is_stage_position = shot.is_stage_position;
    s.is_gaze_direction = shot.is_gaze_direction;
    var unit = this.w/this.duration;
    s.start = this.x+this.time*unit;
    s.start_frame = Math.max(this.start_frame,Math.round(frame_rate*this.time));

    this.shots.push(s);
    this.shots.sort(compare_start);
    var next = this.getNext(s);
    var i = 0;
    if(next) {
      i = next -1;
      s.end_frame = next.start_frame -1;
      s.end = next.start -1;
      // next.bboxes = this.getBBoxes(next, next.bboxes);
    } else {
      s.end_frame = Math.min(player.last,this.end_frame);//Math.round(frame_rate*this.duration);
      s.end = this.x+this.w;
    }
    var prec = this.getPrec(s);
    if(prec) {
      i = prec+1;
      if(prec.end_frame>= s.start_frame) {
        prec.end_frame = s.start_frame -1;
        prec.end = s.start -1;
        // prec.bboxes = this.getBBoxes(prec, prec.bboxes, prec.start_frame);
      }
    }
    // s.bboxes = this.getBBoxes(s, shot.bboxes);
    this.drop_shot = s;
    for(let obj of this.list_data) {
      if(obj.On) {
        obj.Data = this.shots;
      }
    }
  }

  this.saveShotsTimeline = function() {
    new_json_shots = [];
    for(let obj of this.list_data) {
      let new_obj = {};
      new_obj.Name = obj.Name;
      new_obj.Data = [];
      new_obj.On = obj.On;
      new_obj.start_frame = obj.start_frame;
      new_obj.end_frame = obj.end_frame;
      for(let s of obj.Data) {
        var shot = {};
        shot.Type = s.type;
        shot.StartFrame = s.start_frame;
        shot.EndFrame = s.end_frame;
        shot.Timeline = 1;
        // shot.BBoxes = s.bboxes;
        let tab = [];
        for(let a of s.actors_involved) {
          tab.push(a.actor_name);
        }
        shot.ActInvolved = tab;
        shot.AspectRatio = s.aspect_ratio;
        shot.GazeDir = s.is_gaze_direction;
        shot.Intersect = s.is_intersect;
        shot.StagePos = s.is_stage_position;
        new_obj.Data.push(shot);
      }
      new_json_shots.push(new_obj);
    }

    $.post({
      url: "save_timeline",
      async: true,
      data: {'abs_path': abs_path, 'timeline':JSON.stringify(new_json_shots)},
      dataType: 'json',
      success: function (data) {
        // console.log(data);
      }
    });
  }

  this.extendShot = function(shot, mx) {
    let unit = this.w/this.duration;
    if(mx < shot.start) {
      // Left
      let tab = [];
      for(let i=0; i<this.shots.length; i++) {
        if (this.shots[i].start > mx && this.shots[i].end <= shot.start) {
          tab.push(i);
        }
      }
      for(var i = tab.length -1; i >= 0; i--) {
        this.shots.splice(tab[i],1);
      }
      let prec = this.getPrec(shot);
      shot.start = this.x+this.time*unit;
      shot.start_frame = Math.round(frame_rate*this.time);
      if(prec && mx < prec.end) {
        prec.end_frame = shot.start_frame-1;
        prec.end = shot.start -1;
      }
    } else {
      // Right
      let tab = [];
      for(let i=0; i<this.shots.length; i++) {
        if (this.shots[i].end < mx && this.shots[i].start >= shot.end) {
          tab.push(i);
        }
      }
      for(var i = tab.length -1; i >= 0; i--) {
        this.shots.splice(tab[i],1);
      }
      let next = this.getNext(shot);
      shot.end = this.x+this.time*unit;
      shot.end_frame = Math.round(frame_rate*this.time);
      if(next && mx > next.start) {
        next.start_frame = shot.end_frame+1;
        next.start = shot.end +1;
      }
    }
  }

  this.testShot = function(sh) {
    let b = false;
    for(let s of this.shots) {
      if(s.type == sh.type && s.aspect_ratio === sh.aspect_ratio) {
        var b1 = true;
        for(let i=0; i<sh.actors_involved.length; i++) {
          if(!s.actors_involved.includes(sh.actors_involved[i])) {
            // console.log(sh.actors_involved[i]);
            b1 = false;
            break;
          }
        }
        if(b1) {
          if(s.first_frame == sh.first_frame && s.end_frame == sh.end_frame) {
            b = true;
          }
        }
      }
    }
    return b;
  }

  this.addShotJson = function(shot, b=false) {
    if(!this.testShot(shot)) {
      var unit = this.w/this.duration;
      var t = shot.start_frame/frame_rate;
      shot.start = this.x+t*unit;
      t = shot.end_frame/frame_rate;
      shot.end = this.x+t*unit;
      // console.log(shot);
      // if(!b) {
      //   shot.bboxes = this.getBBoxes(shot, shot.bboxes);
      // }
      // console.log(shot);
      this.shots.push(shot);
      this.shots.sort(compare_start);
    }
  }

  this.updatePos = function() {
    this.w = player.w;
    for(let s of this.shots) {
      var unit = this.w/this.duration;
      var t = s.start_frame/frame_rate;
      s.start = this.x+t*unit;
      t = s.end_frame/frame_rate;
      s.end = this.x+t*unit;
    }
  }

  this.fillRough = function(frames_no_info) {
    var shot;
    var unit = this.w/this.duration;
    let t = 'FS';
    let act_inv = [];
    for(let a of actors_timeline) {
      act_inv.push(a.actor_name);
    }
    let ind = montage_editor.getShot(montage_editor.shots, t, act_inv);
    if(ind) {
      shot = montage_editor.shots[ind];
    }
    if(shot) {
      var off=0;
      for(let i=0; i<total_frame; i++){
        if(i>off){
          var n_s = {};//new Shot();
          n_s.actors_involved = shot.actors_involved;
          n_s.type = shot.type;
          n_s.aspect_ratio = shot.aspect_ratio;
          var s = this.getCurrShot(i);
          if(!s) {
            var prec = this.getPrecInd(i);
            var next = this.getNextInd(i);
            if(prec && next){
              n_s.start_frame = prec.end_frame+1;
              n_s.end_frame = next.start_frame-1;
              n_s.start = prec.end +1;
              n_s.end = next.start-1;
            } else if(prec && !next) {
              n_s.start_frame = prec.end_frame+1;
              n_s.end_frame = Math.round(frame_rate*this.duration);
              n_s.start = prec.end +1;
              n_s.end = this.x+this.w;
            } else if(!prec && next) {
              n_s.start_frame = 0;
              n_s.end_frame = next.start_frame-1;
              n_s.start = this.x;
              n_s.end = next.start-1;
            } else if(!prec && !next) {
              n_s.start_frame = 0;
              n_s.end_frame = Math.round(frame_rate*this.duration);
              n_s.start = this.x;
              n_s.end = this.x+this.w;
            }
            var b = false;
            for(let tab of frames_no_info) {
              if(tab) {
                if((tab[0] == n_s.start_frame && tab[tab.length-1] == n_s.end_frame) ||
                (tab[0]+1 == n_s.start_frame && tab[tab.length-1] == n_s.end_frame)) {
                  console.log(tab[0], n_s.start_frame, tab[tab.length-1], n_s.end_frame);

                  b = true;
                  off = n_s.end_frame+1;
                  break;
                }
                if(tab[0] == n_s.start_frame && tab[tab.length-1] < n_s.end_frame) {
                  n_s.start_frame = tab[tab.length-1];
                  n_s.start = unit*n_s.start_frame;
                }
                if(tab[0] > n_s.start_frame && tab[tab.length-1] == n_s.end_frame) {
                  n_s.end_frame = tab[0];
                  n_s.end = unit*n_s.end_frame;
                }
                if(n_s.start_frame < tab[0] && tab[tab.length-1] < n_s.end_frame) {
                  console.log(tab[0], n_s.start_frame, tab[tab.length-1], n_s.end_frame);
                  var new_n_s = {};//new Shot();
                  new_n_s.actors_involved = n_s.actors_involved;
                  new_n_s.end_frame = tab[0];
                  new_n_s.end = unit*new_n_s.end_frame;
                  new_n_s.start_frame = n_s.start_frame;
                  new_n_s.start = n_s.start;
                  // new_n_s.bboxes = this.getBBoxes(new_n_s, shot.bboxes);
                  if(!this.testShot(new_n_s)) {
                    console.log('new',new_n_s);
                    this.shots.push(new_n_s);
                    this.shots.sort(compare_start);
                  }

                  n_s.start_frame = tab[tab.length-1];
                  n_s.start = unit*n_s.start_frame;
                  break;
                }
              }
            }
            if(!b) {
              // n_s.bboxes = this.getBBoxes(n_s, shot.bboxes);
              if(!this.testShot(n_s)) {
                console.log('old',n_s);
                this.shots.push(n_s);
                this.shots.sort(compare_start);
              }
            }
            off = n_s.end_frame+1;
          }
        } else {
          if(i>off)
            off = 0;
        }
      }
    }
  }

  this.getNext = function(s) {
    var ret;
    for(var i=0; i<this.shots.length; i++) {
      if(this.shots[i].start_frame == s.start_frame) {
        if(this.shots[i+1]) {
          ret = this.shots[i+1];
          break;
        }
      }
    }
    return ret;
  }

  this.getPrec = function(s) {
    var ret;
    for(var i=0; i<this.shots.length; i++) {
      if(this.shots[i].start_frame == s.start_frame) {
        if(this.shots[i-1]) {
          ret = this.shots[i-1];
          break;
        }
      }
    }
    return ret;
  }

  this.getNextInd = function(ind) {
    var ret;
    var dist = Number.MAX_VALUE;
    for(var i=0; i<this.shots.length; i++) {
      if(abs(this.shots[i].start_frame - ind)<dist && this.shots[i].start_frame > ind) {
        ret = this.shots[i];
        dist = abs(this.shots[i].start_frame - ind);
      }
    }
    return ret;
  }

  this.getPrecInd = function(ind) {
    var ret;
    var dist = Number.MAX_VALUE;
    for(var i=0; i<this.shots.length; i++) {
      if(abs(this.shots[i].end_frame - ind)<dist && this.shots[i].end_frame < ind) {
        ret = this.shots[i];
        dist = abs(this.shots[i].end_frame - ind);
      }
    }
    return ret;
  }

  this.getCurrStabShot = function(frame_num) {
    var ret;
    var bb;
    for(var i=0; i<this.shots.length; i++) {
      if(frame_num <= this.shots[i].end_frame && frame_num >= this.shots[i].start_frame) {
        let f_f = this.shots[i].start_frame;
        // bb = this.shots[i].getCurrStabShot(frame_num - f_f);
        let s = montage_editor.getShotAspect(this.shots[i].type, this.shots[i].actors_involved, this.shots[i].aspect_ratio, this.shots[i].is_intersect, this.shots[i].is_stage_position, this.shots[i].is_gaze_direction);
        if(s) {
          bb = s.getCurrStabShot(frame_num);
          if(bb && bb[0] != "null") {
            ret = [bb[0]*scale_ratio, bb[1]*scale_ratio, bb[2]*scale_ratio, bb[3]*scale_ratio];
            // let hor_len = bb[2] * aspect_ratio;
            // ret = [(bb[0]-hor_len)*scale_ratio, (bb[1]-bb[2])*scale_ratio, (bb[0]+hor_len)*scale_ratio, (bb[1]+bb[2])*scale_ratio];
          }
          break;
        }
      }
    }
    return ret;
  }

  this.getCurrStabShotNoScale = function(frame_num) {
    var ret;
    var bb;
    for(var i=0; i<this.shots.length; i++) {
      if(frame_num <= this.shots[i].end_frame && frame_num >= this.shots[i].start_frame) {
        let f_f = this.shots[i].start_frame;
        // bb = this.shots[i].getCurrStabShot(frame_num - f_f);
        bb = montage_editor.getShotAspect(this.shots[i].type, this.shots[i].actors_involved, this.shots[i].aspect_ratio,this.shots[i].is_intersect, this.shots[i].is_stage_position, this.shots[i].is_gaze_direction).getCurrStabShot(frame_num);
        if(bb && bb[0] != "null") {
          ret = bb;
        }
        break;
      }
    }
    return ret;
  }

  this.getCurrShot = function(frame_num) {
    var ret;
    for(var i=0; i<this.shots.length; i++) {
      if(frame_num <= this.shots[i].end_frame && frame_num >= this.shots[i].start_frame) {
        ret = this.shots[i];
        break;
      }
    }
    return ret;
  }

  this.setPosition = function(tx, ty) {
    this.x = tx;
    this.y = ty;
  }

  function compare_start(a,b) {
    if (a.start_frame < b.start_frame)
      return -1;
    if (a.start_frame > b.start_frame)
      return 1;
    return 0;
  }
  this.setTimer = function(t) {
    this.time = t;
  }

  this.setXCursor = function(tx) {
    this.x_cursor = tx;
  }

  this.removeShot = function() {
    for(var i=0; i<this.shots.length; i++) {
      if(this.shots[i].on) {
        this.shots.splice(i,1);
      }
    }
  }

  this.removeSpecificShot = function(shot, tab_shots = this.shots) {
    let ind = [];
    for (let j=0; j<tab_shots.length; j++) {
      let s = tab_shots[j];
      if(s.type == shot.type) {
        let b1 = true;
        let actors_involved = [];
        for(let a of shot.actors_involved ) {
          actors_involved.push(a.actor_name);
        }
        for(let a of s.actors_involved) {
          if(!actors_involved.includes(a.actor_name)) {
            b1 = false;
            break;
          }
        }
        if(b1 && s.actors_involved.length == actors_involved.length) {
          ind.push(j);
        }
      }
    }
    for (let i = ind.length -1; i >= 0; i--) {
      tab_shots.splice(ind[i],1);
    }
  }

  this.getBBoxes = function(shot, tab, off=0) {
    var ret = [];
    let s_f = shot.start_frame - off;
    let e_f = shot.end_frame - off;
    for(let i=0; i<tab.length;i++) {
      if(i>=s_f && i<=e_f) {
        ret.push(tab[i]);
      }
    }
    return ret;
  }

  this.compressBBoxes = function() {
    var ret = [];
    for(let i=this.start_frame; i< this.end_frame;i++) {
      let bb = this.getCurrStabShotNoScale(i);
      if(bb) {
        ret.push(bb);
      } else {
        ret.push([0,0,Number(original_width), Number(original_height)]);
      }
    }
    return ret;
  }

  this.getAspectRatio = function() {
    let curr_a_s = aspect_ratio;
    for(let s of this.shots) {
      if(!curr_a_s) {
        curr_a_s = s.aspect_ratio;
      } else if(curr_a_s != s.aspect_ratio) {
        curr_a_s = aspect_ratio;
        break;
      }
    }
    // console.log(curr_a_s);
    return curr_a_s;
  }

  this.extractKeyFrames = function() {
    let ret = [];
    for(let t of video.elt.textTracks) {
      if(t.mode = "showing") {
        for(let c of t.cues) {
          let key_frame = {};
          key_frame.Time = parseInt(c.startTime);
          let f_n = (c.startTime+1)*frame_rate;
          let b = this.getCurrStabShotNoScale(f_n);
          if(b) {
            key_frame.BBox = this.getCurrStabShotNoScale(f_n);
          } else {
            key_frame.BBox = [0,0,Number(original_width), Number(original_height)];
          }
          ret.push(key_frame);
        }
      }
    }
    // console.log(ret);
    return ret;
  }

  this.updateShotPos = function() {
    for(let s of this.shots) {
      let unit = this.w/player.total_frame;
      let off_x = player.first*unit;
      let start = this.x + Math.round((s.start_frame-1)*unit) - off_x;
      let end = start + Math.round((s.end_frame-s.start_frame-1)*unit);
      s.start = start;
      s.end = end;
    }
  }

  this.displayPSL = function() {
    for(var i=0; i<this.shots.length; i++) {
      if(this.shots[i].start < player.x_cursor && this.shots[i].end > player.x_cursor) {
        fill(255);
        let s = montage_editor.getShotAspect(this.shots[i].type, this.shots[i].actors_involved, this.shots[i].aspect_ratio, this.shots[i].is_intersect, this.shots[i].is_stage_position, this.shots[i].is_gaze_direction);
        let type = s.getUpdatedSizeShot(s.getCurrStabShot(frame_num)[3]);
        if(!type) {
          type = s.type;
        }
        text(type, 15 ,60);
        let j=0;
        let string_psl_act = 'On '
        for(let act_name of s.getUpdateActInvolved()) {
          if(j!=0)
            string_psl_act += 'With '
          string_psl_act += act_name/*+' ['+preparation_editor.getAct(act_name).getProfile()+', '+s.getPlacement(preparation_editor.getAct(act_name))*/+'\n';
          // text(act_name, 15 ,45+j*15);
          j++;
        }
        text(string_psl_act, 15, 75);
        // text('Width '+Math.round(s.getCurrStabShot(frame_num)[2]-s.getCurrStabShot(frame_num)[0]),100,30);
        // text('X '+Math.round((s.getCurrStabShot(frame_num)[2]+s.getCurrStabShot(frame_num)[0])/2),100,45);
        // text('Y '+Math.round((s.getCurrStabShot(frame_num)[3]+s.getCurrStabShot(frame_num)[1])/2),100,60);
        // text('Hor '+s.getPanMove().horizontal,200,75);
        // text('Vert '+s.getPanMove().vertical,200,90);
        // text('Zoom '+s.getPanMove().zoom,200,105);

        // let pan_m = s.getPanMove();
        // let string_pan = 'Pan ';
        // if(pan_m.horizontal>1) {
        //   string_pan += 'rigth and ';
        // } else if(pan_m.horizontal<-1) {
        //   string_pan += 'left and ';
        // }
        // if(pan_m.vertical>1) {
        //   string_pan += 'down and ';
        // } else if(pan_m.vertical<-1) {
        //   string_pan += 'up and ';
        // }
        // if(pan_m.zoom>1) {
        //   string_pan += 'out\n';
        // } else if(pan_m.zoom<-1) {
        //   string_pan += 'in\n';
        // }
        // text(string_pan, 230, 45);
      }
    }
  }

  this.displayInfo = function() {
    push();
    fill(0);
    textSize(17);
    text('Create scene : ',5,viewer_height+15);
    text('Select a scene : ',mid_width-320,viewer_height+15);
    pop();

    push();
    fill(0);
    textSize(17);
    text('Start ',5,this.y-10);
    text(player.getTimeFrame(this.start_frame),5,this.y+10);
    text(player.getTimeFrame(this.end_frame),5,this.y+this.h-10);
    text('End ',5,this.y+this.h+10);
    pop();

    push();
    fill(0);
    this.remove_button.x = mid_width-17;
    this.remove_button.y = viewer_height+5;
    fill(255);
    rect(this.remove_button.x-this.remove_button.rad/2,this.remove_button.y-this.remove_button.rad/2,this.remove_button.rad*2,this.remove_button.rad*2);
    stroke("#AA0000");
    strokeWeight(3);
    line(this.remove_button.x,this.remove_button.y,this.remove_button.x+this.remove_button.rad,this.remove_button.y+this.remove_button.rad);
    line(this.remove_button.x+this.remove_button.rad,this.remove_button.y,this.remove_button.x,this.remove_button.y+this.remove_button.rad);
    pop();
  }

  // Draw the rectangle
  this.display = function() {

    let bool_curs = false;
    this.duration = (player.total_frame/frame_rate);
    let unit = this.w/player.total_frame;
    let start_frame_x = Math.max((this.start_frame-player.first)*unit,0);
    let end_frame_x = Math.min((this.end_frame-player.first)*unit,this.w);
    this.updateShotPos();
    push();
    noStroke();
    fill(120);
    rect(this.x,this.y,this.w,this.h);
    pop();

    for(var i=0; i<this.shots.length; i++) {
      if(this.shots[i].start_frame<Math.min(player.last,this.end_frame) && this.shots[i].end_frame>Math.max(player.first,this.start_frame)) {
        let x_start = Math.max(this.shots[i].start, start_frame_x+this.x);
        let x_end = Math.min(this.shots[i].end, end_frame_x+this.x);
        if(this.shots[i].on) {
          push();
          noStroke();
          fill(46,92,156);
          if(this.draggin && player.nav_bar.cursor >x_end) {
            x_end=player.nav_bar.cursor;
            document.body.style.cursor = "e-resize";
            bool_curs = true;
          } else if(this.draggin && player.nav_bar.cursor <x_start) {
            x_start=player.nav_bar.cursor;
            document.body.style.cursor = "w-resize";
            bool_curs = true;
          }
          rect(x_start,this.y,x_end-x_start,this.h);

          pop();
        }
        if(this.shots[i]) {
          if(!bool_curs) {
            if((abs(mouseX-x_start)<5 || abs(mouseX-x_end)<5) && (mouseY>this.y && mouseY<this.y+this.h)) {
              document.body.style.cursor = "col-resize";
              bool_curs = true;
            }
          }
          push();
          strokeWeight(2);
          stroke(255);
          line(x_start, this.y+this.h/2, x_end-10, this.y+this.h/2);
          line(x_end, this.y, x_end, this.y+this.h);
          line(x_end, this.y, x_end-10, this.y);
          line(x_end, this.y+this.h, x_end-10, this.y+this.h);
          // if(this.shots[i].img_start) {
          //   var bbox = this.shots[i].bboxes[x_start_frame];
          //   var h = this.h/3;
          //   if(bbox) {
          //     image(this.shots[i].img_start,x_start,this.y,h*aspect_ratio, h, bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
          //   } else {
          //     image(this.shots[i].img_start,x_start,this.y,h*aspect_ratio, h);
          //   }
          // }
          fill(255);
          noStroke();
          let intersect = "";
          if(this.shots[i].is_intersect) {
            intersect = " I";
          }
          let gaze = "";
          if(this.shots[i].is_gaze_direction) {
            gaze = " G";
          }
          let stage_pos = "";
          if(this.shots[i].is_stage_position) {
            stage_pos = " S";
          }
          text(this.shots[i].type+intersect+gaze+stage_pos, x_start, this.y+10);
          for(var j=0; j<this.shots[i].actors_involved.length; j++) {
            text(this.shots[i].actors_involved[j].actor_name, x_start, this.y+25+j*15);
          }
          pop();
          }
        }
    }

    push();

    push()
    fill(80);
    rect(this.x,this.y,start_frame_x,this.h);
    rect(this.x+end_frame_x,this.y,((this.x+this.w)-end_frame_x)-this.x,this.h);
    pop();

    strokeWeight(1);
    for(var i=0; i<this.w; i++) {
      var x = this.x + i;
      if(x<player.nav_bar.cursor) {
        stroke(50,50,123);
      } else {
        stroke(255);
      }
      var y = this.y+this.h;
      if(i%10==0)
        line(x, y, x, y-15);
      else {
        line(x, y, x, y-2);
      }
    }
    stroke(0);
    strokeWeight(2);
    fill(0);
    line(player.nav_bar.cursor,this.y,player.nav_bar.cursor,this.y+this.h);
    triangle(player.nav_bar.cursor-4, this.y-4, player.nav_bar.cursor+4, this.y-4, player.nav_bar.cursor, this.y);
    pop();

    if(is_montage_editor) {
      this.displayPSL();
      // for(var i=0; i<this.shots.length; i++) {
      //   if(this.shots[i].start < player.x_cursor && this.shots[i].end > player.x_cursor) {
      //     fill(255);
      //     let s = getShotAspect(this.shots[i].type, this.shots[i].actors_involved, this.shots[i].aspect_ratio);
      //     let type = s.getUpdatedSizeShot(s.getCurrStabShot(frame_num)[3]);
      //     if(!type) {
      //       type = s.type;
      //     }
      //     text(type, 15 ,30);
      //     let j=0;
      //     for(let act_name of s.getUpdateActInvolved()) {
      //       text(act_name, 15 ,45+j*15);
      //       j++;
      //     }
      //     text('Width '+Math.round(s.getCurrStabShot(frame_num)[2]-s.getCurrStabShot(frame_num)[0]),100,30);
      //     text('X '+Math.round((s.getCurrStabShot(frame_num)[2]+s.getCurrStabShot(frame_num)[0])/2),100,45);
      //     text('Y '+Math.round((s.getCurrStabShot(frame_num)[3]+s.getCurrStabShot(frame_num)[1])/2),100,60);
      //     text('Hor '+s.getPanMove().horizontal,100,75);
      //     text('Vert '+s.getPanMove().vertical,100,90);
      //     text('Zoom '+s.getPanMove().zoom,100,105);
      //
      //   }
      // }
      this.displayInfo();
    }

    if(!bool_curs) {
      document.body.style.cursor = "default";
    }
  }
}
