// Constructor initializes all variables
function ActorTimeline(tempX=0, tempY=0, tempW=0, tempH=0, frames_data)  {
  // Button location and size
  this.x  = tempX;
  this.y  = tempY;
  this.w  = tempW;
  this.h  = tempH;
  // Is the button on or off?
  // Button always starts as off
  this.on = false;

  this.actor_name = "";

  this.tracks = [];

  this.t_dragged;

  this.rect_drag = [0,0,0,0];

  this.states = [];

  this.track_bbox_shot = [];

  this.elem;

  this.frames_data = frames_data;

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if(!is_shot_creation && !is_note_book) {
      if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
        this.on = !this.on;
        for(var i=0; i< this.tracks.length; i++) {
          this.tracks[i].on = false;
          if (mx > this.tracks[i].x && mx < this.tracks[i].x + this.tracks[i].w && my > this.tracks[i].y && my < this.tracks[i].y + this.tracks[i].h) {
            this.tracks[i].on = true;
            this.t_dragged = this.tracks[i];
          }
        }
        for(let t of this.track_bbox_shot) {
          t.on = false;
          if (mx > t.x && mx < t.x + t.w && my > t.y && my < t.y + t.h) {
            this.t_dragged = t;
          }
        }
      }
      if(mx > this.elem.x && mx < this.x && my > this.y && my < this.y + this.h) {
        this.on = !this.on;
      }
    } else {
      my += can.elt.offsetTop - $('#div_creation').position().top + $('#div_creation').scrollTop();
      mx -= $('#div_creation').position().left;
      if(mx > this.elem.elt.offsetLeft && mx < this.elem.elt.offsetLeft+this.elem.elt.offsetWidth && my > this.elem.elt.offsetTop && my < (this.elem.elt.offsetTop + this.elem.elt.offsetHeight)) {
        this.on = !this.on;
        if(this.on) {
          this.elem.style('color', 'rgb(46,92,156)');
        } else {
          this.elem.style('color', 'rgb(0,0,0)');
        }
      }
    }
    for(let t of this.track_bbox_shot) {
      t.click(mx, my);
    }

  };

  this.getBestKeypoints = function(t, off){
    var ret;
    var cpt=75;
    for(let i=0; i<12; i++) {
      var tab = this.frames_data[t.first_frame+off+i];
      if(tab[t.detections[off+i]]) {
        var keypoints = tab[t.detections[off+i]]['KeyPoints'];
        if(keypoints && cpt > keypoints.filter(v => v == 'null').length){
          cpt = keypoints.filter(v => v == 'null').length;
          ret = keypoints;
        }
      }
    }
    return ret;
  }

  this.drop = function(mx, my, total_frame) {
    var l_tracks = this.tracks.length;
    var ret =undefined;
    if(this.t_dragged && this.rect_drag != [0,0,0,0]) {
      if(this.rect_drag[0]<this.t_dragged.x || (this.t_dragged.left_x && this.rect_drag[0]<this.t_dragged.left_x) || mx < this.x || mx < this.t_dragged.x) {
        //left;
        if(this.t_dragged.left_x) {
          this.t_dragged.detections = this.t_dragged.left_detec;
          this.t_dragged.first_frame = this.t_dragged.left_first_frame;
          this.t_dragged.x = this.t_dragged.left_x;
        }
        if(!(mx > this.t_dragged.x && mx < this.t_dragged.x + this.t_dragged.w)) {
          if(!this.t_dragged.last_frame) {
            var keypoints = this.getBestKeypoints(this.t_dragged, 0);
            var length_ext = this.t_dragged.x-this.rect_drag[0];
            this.extends(0, keypoints, length_ext, total_frame);
          } else {
            this.extends(0, undefined, this.t_dragged.x-this.rect_drag[0], total_frame);
          }
        }
      } else {
        //right
        if(this.t_dragged.right_x) {
          this.t_dragged.detections = this.t_dragged.right_detec;
          this.t_dragged.w = this.t_dragged.right_w;
        }
        if(!(mx > this.t_dragged.x && mx < this.t_dragged.x + this.t_dragged.w)) {
          if(!this.t_dragged.last_frame) {
            var l = this.t_dragged.detections.length-1;
            var keypoints = this.getBestKeypoints(this.t_dragged, l-12);
            var length_ext = (this.rect_drag[0]+this.rect_drag[2])-(this.t_dragged.w+this.t_dragged.x);
            this.extends(1, keypoints, length_ext, total_frame);
          } else {
            this.extends(1, undefined, (this.rect_drag[0]+this.rect_drag[2])-(this.t_dragged.w+this.t_dragged.x), total_frame);
          }
        }
      }
    }
    this.t_dragged = undefined;
    this.rect_drag = [0,0,0,0];
    if(l_tracks>this.tracks.length) {
      ret = this.tracks[this.tracks.length-1];
    }
    return ret;
  }

  this.dropTrack = function(mx, my, t, detec, total_frame) {
    var ret = false;
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      this.tracks.sort(compare_first);
      this.removeState(mx, my);
        if(!this.isInTracks(t)) {
          this.addTrack(t);
          ret = true;
        }
    }
    return ret;
  }

  this.dropState = function(mx, my, state, num_state) {
    if ((mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) && !this.onTrack(mx)){
      this.tracks.sort(compare_first);
      this.removeState(mx, my);
      var new_state;
      let prec = this.getPrecX(mx);
      let next = this.getNextX(mx);
      let x;
      let w;
      let f_f;
      let e_f;
      if(!prec && !next) {
        x = this.x;
        w = this.w;
        f_f = 0;
        e_f = total_frame;
      } else if (prec && !next) {
        x = prec.x + prec.w;
        w = this.w - x;
        if(!prec.last_frame) {
          f_f = prec.first_frame + prec.detections.length + 1;
        } else {
          f_f = prec.last_frame + 1;
        }
        e_f = total_frame;
      } else if (!prec && next) {
        x = this.x;
        w = next.x - x;
        f_f = 0;
        e_f = next.first_frame-1;
      } else {
        x = prec.x + prec.w;
        w = next.x - x;
        if(!prec.last_frame) {
          f_f = prec.first_frame + prec.detections.length + 1;
        } else {
          f_f = prec.last_frame + 1;
        }
        e_f = next.first_frame-1;
      }
      new_state = {};
      new_state.first_frame = f_f;
      new_state.last_frame = e_f;
      new_state.Num = num_state;
      new_state.x = x;
      new_state.w = w;
      new_state.color = state.color;
      new_state.h = this.h/2;
      if(new_state) {
       this.states.push(new_state);
      }
    }
  }

  this.getPrec = function(f_f) {
    var ret = undefined;
    let last_frame_prec = 0;
    for(var i=0; i<this.tracks.length; i++) {
      if(f_f == this.tracks[i].first_frame) {
        if(this.tracks[i-1]) {
          ret = this.tracks[i-1];
          last_frame_prec = ret.first_frame+ret.detections.length;
        }
        break;
      }
    }
    if(!ret) {
      for(let t of this.tracks) {
        if(t.first_frame + t.detections.length < f_f) {
          ret = t;
          last_frame_prec = ret.first_frame;
        }
      }
    }
    for(var i=0; i<this.track_bbox_shot.length; i++) {
      let t = this.track_bbox_shot[i];
      if(last_frame_prec < t.first_frame && t.last_frame < f_f) {
        ret = t;
        last_frame_prec = t.last_frame;
      }
    }
    return ret;
  }

  this.getNext = function(f_f) {
    var ret = undefined;
    let first_frame_prec = total_frame;
    for(var i=0; i<this.tracks.length; i++) {
      if(f_f == this.tracks[i].first_frame) {
        if(this.tracks[i+1]) {
          ret = this.tracks[i+1];
          first_frame_prec = ret.first_frame;
        }
        break;
      }
    }
    if(!ret) {
      for(let t of this.tracks) {
        if(t.first_frame > f_f) {
          ret = t;
          first_frame_prec = ret.first_frame;
          break;
        }
      }
    }
    for(var i=0; i<this.track_bbox_shot.length; i++) {
      let t = this.track_bbox_shot[i];
      if(t.first_frame <first_frame_prec && t.first_frame > f_f) {
        ret = t;
        break;
      }
    }
    return ret;
  }

  this.getPrecX = function(mx) {
    var ret = undefined;
    let last_x = 0;
    for(var i=0; i<this.tracks.length; i++) {
      if(mx > last_x && this.tracks[i].x+this.tracks[i].w < mx) {
        ret = this.tracks[i];
        last_x = this.tracks[i].x+this.tracks[i].w;
      }
    }
    for(var i=0; i<this.track_bbox_shot.length; i++) {
      let t = this.track_bbox_shot[i];
      if(mx > last_x && t.x+t.w < mx) {
        ret = t;
        last_x = t.x+t.w;
      }
    }
    return ret;
  }

  this.getNextX = function(mx) {
    var ret = undefined;
    let last_x = this.x+this.w;
    for(var i=0; i<this.tracks.length; i++) {
      if(this.tracks[i].x > mx) {
        ret = this.tracks[i];
        last_x = this.tracks[i].x;
        break;
      }
    }
    for(var i=0; i<this.track_bbox_shot.length; i++) {
      let t = this.track_bbox_shot[i];
      if(t.x > mx && t.x < last_x) {
        ret = t;
        last_x = t.x;
        break;
      }
    }
    return ret;
  }

  this.dragExtTrack = function(mx, my) {
    if (mx >= this.x && mx <= this.x + this.w) {
      // if(keyIsPressed && keyCode == 122 && act_timeline_scale>1) {
      //   act_timeline_x_off = mouseX;
      // }
      if(this.t_dragged) {
        var t_prec = this.getPrec(this.t_dragged.first_frame);
        var t_next = this.getNext(this.t_dragged.first_frame);
        var t = this.t_dragged;
        if(mx < t.x || (this.t_dragged.left_x && mx < this.t_dragged.left_x) ) {
          if(t_prec && mx <= t_prec.x+t_prec.w) {
            mx = t_prec.x+t_prec.w;
          }
          this.rect_drag[0] = mx;
          this.rect_drag[1] = t.y;
          this.rect_drag[2] = t.x-mx;
          this.rect_drag[3] = this.h/2;
          // t.w += (t.x-mx);
          // t.x = mx;
        } else if(mx > t.x+t.w || (this.t_dragged.right_x && mx > this.t_dragged.right_x) ){
          if(t_next && mx >= t_next.x) {
            mx = t_next.x;
          }
          this.rect_drag[0] = t.x+t.w;
          this.rect_drag[1] = t.y;
          this.rect_drag[2] = mx-(t.x+t.w);
          this.rect_drag[3] = this.h/2;
          // t.w += mx-(t.x+t.w);
        } else {
          this.rect_drag = [0,0,0,0];
        }
      }
      return true;
    } else {
      return false;
    }
  }

  this.undoExtend = function() {
    var ret;
    for(var i=0; i<this.tracks.length; i++) {
      if(this.tracks[i].on && this.tracks[i].olds) {
        for(var j=0; j<this.tracks[i].olds.length; j++) {
          this.tracks[i].olds[j].old = false;
          this.addTrack(this.tracks[i].olds[j]);
        }
        ret = this.tracks[i];
        this.removeTracklet(this.tracks[i]);
      }
    }
    for(let t of this.track_bbox_shot) {
      if(t.on && t.olds) {
        for(let n_t of t.olds) {
          this.track_bbox_shot.push(n_t);
        }
        this.removeTracklet(t);
      }
    }
    return ret;
  }

  this.updateTrackPos = function(total_frame) {
    for(var i=0; i<this.tracks.length; i++) {
      let unit = this.w/total_frame;
      let off_x = annotation_timeline.first*unit;
      let start = this.x + Math.round((this.tracks[i].first_frame-1)*unit) - off_x;
      let end = start + Math.round((this.tracks[i].detections.length-1)*unit);
      this.tracks[i].setPosition(start, this.y, end-start, this.h/2);
    }
  }

  this.getTrackIndex = function(mx, my) {
    var ind = [];
    var offset = Number.MAX_VALUE;
    if ((mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) && !this.onTrack(mx)) {
      this.tracks.sort(compare_first);
      ind = [0,0];
      for(var i=0; i < this.tracks.length; i++) {
        if(abs(mx - this.tracks[i].x) < offset) {
          offset = abs(mx - this.tracks[i].x);
          ind[0] = 0;
          ind[1] = i;
        }
        if(abs(mx - (this.tracks[i].x + this.tracks[i].w)) < offset) {
          offset = abs(mx - (this.tracks[i].x + this.tracks[i].w));
          ind[0] = 1;
          ind[1] = i;
        }
      }
    }
    return ind;
  }

  this.getBBoxObj = function(keypoints) {
    let bb = getBBox(keypoints);
    let x = bb[0];
    let y = bb[1];
    let w = bb[2]-bb[0];
    let h = bb[3]-bb[1];
    let b = new BboxShot(x,y,w,h);
    let c_x = keypoints[1*3];
    if(c_x=='null') {
      c_x = (bb[0]+bb[2])/2;
    }
    let c_y = keypoints[1*3+1];
    if(c_y=='null') {
      c_y = (bb[1]+bb[3])/2;
    }
    b.setCenter(c_x,c_y);
    return b;
  }

  this.extends = function(side, keypoints, l, total_frame) {
    var unit = this.w/total_frame;
    if(side==0) {
      var t_prec = this.getPrec(this.t_dragged.first_frame);

      if(t_prec && this.t_dragged.x-l == t_prec.x+t_prec.w || t_prec && t_prec.x+t_prec.w >= this.t_dragged.x) {
        // Left interpolation
        if(!t_prec.last_frame && !this.t_dragged.last_frame) {
          this.interpolateLeftTrack(t_prec, keypoints, unit);
        }
        else {
          if(t_prec.last_frame && this.t_dragged.last_frame) {
            this.interpolateBBox(side, t_prec);
          } else if (!t_prec.last_frame && this.t_dragged.last_frame) {
            let bb = this.getBBoxObj(this.getBestKeypoints(t_prec, t_prec.detections.length-12));
            console.log(bb);
            this.interpolateBBox(side, t_prec, bb);
          }
        }
      } else {
        // Left extend
        var f_f = this.t_dragged.first_frame - Math.floor(l/unit);
        var le = this.t_dragged.first_frame - f_f;
        if(keypoints && !this.t_dragged.last_frame) {
          this.extendsTrackLeft(f_f, le, keypoints, unit);
        } else {
          this.extendBBox(side, le, this.t_dragged.bboxes[0]);
        }
      }
    } else {
      var t_next = this.getNext(this.t_dragged.first_frame);
      if(t_next && this.t_dragged.x+this.t_dragged.w+l == t_next.x) {
        // Right interpolation
        if(!t_next.last_frame && !this.t_dragged.last_frame) {
          this.interpolateRightTrack(t_next, keypoints, unit);
        } else {
          if(t_next.last_frame && this.t_dragged.last_frame) {
            this.interpolateBBox(side, t_next)
          } else if (!t_next.last_frame && this.t_dragged.last_frame) {
            let bb = this.getBBoxObj(this.getBestKeypoints(t_next, 0));
            this.interpolateBBox(side, t_next, bb);
          }
        }
      } else {
        // Right extend
        if(!this.t_dragged.last_frame) {
          var f_f = this.t_dragged.first_frame+this.t_dragged.detections.length;
        } else {
          var f_f = this.t_dragged.last_frame;
        }
        var le = abs(Math.floor(l/unit));
        if(keypoints && !this.t_dragged.last_frame) {
          this.extendsTrackRight(f_f, le, keypoints, unit);
        } else {
           this.extendBBox(side, le, this.t_dragged.bboxes[this.t_dragged.bboxes.length-1]);
        }
      }
    }
  }

  this.extendBBox = function(side, l, bbox) {
    if(side==0) {
      let f_f = this.t_dragged.first_frame - l;
      let tab = [];
      for(let i=0; i<l; i++) {
        tab.push(bbox);
      }
      let new_bboxes = concat(tab,this.t_dragged.bboxes);
      this.t_dragged.first_frame = f_f;
      this.t_dragged.bboxes = new_bboxes;
    } else {
      let l_f = this.t_dragged.last_frame + l;
      let tab = [];
      for(let i=0; i<l; i++) {
        tab.push(bbox);
      }
      let new_bboxes = concat(this.t_dragged.bboxes,tab);
      this.t_dragged.last_frame = l_f;
      this.t_dragged.bboxes = new_bboxes;
    }
  }

  this.interpolateBBox = function(side, t, bb=undefined) {
    if(side==0) {
      let bbox_left=bb;
      if(!bbox_left) {
        bbox_left = t.bboxes[t.bboxes.length-1];
      }
      let bbox_right = this.t_dragged.bboxes[0];
      let len;
      if(t.last_frame) {
        len = this.t_dragged.first_frame - t.last_frame;
      } else {
        len = this.t_dragged.first_frame - (t.first_frame+t.detections.length);
      }
      let tab = this.interpolate(bbox_left, bbox_right, len);
      let new_track = new TrackBboxShot(this);
      if(t.last_frame) {
        new_track.first_frame = t.first_frame;
      } else {
        new_track.first_frame = this.t_dragged.first_frame - len;
      }
      new_track.last_frame = this.t_dragged.last_frame;
      let new_bboxes = tab;
      if(!bb) {
        new_bboxes = concat(t.bboxes,tab);
      }
      new_bboxes = concat(new_bboxes,this.t_dragged.bboxes);
      new_track.bboxes = new_bboxes;
      new_track.olds = [];
      new_track.olds.push(this.t_dragged);
      if(!bb) {
        new_track.olds.push(t);
        this.removeTracklet(t);
      }
      this.removeTracklet(this.t_dragged);
      this.track_bbox_shot.push(new_track);
    } else {
      let bbox_left = this.t_dragged.bboxes[this.t_dragged.bboxes.length-1];
      let bbox_right = bb;
      if(!bbox_right) {
        bbox_right = t.bboxes[0];
      }
      let len = t.first_frame - this.t_dragged.last_frame;
      let tab = this.interpolate(bbox_left, bbox_right, len);
      let new_track = new TrackBboxShot(this);
      new_track.first_frame = this.t_dragged.first_frame;
      let new_bboxes = concat(this.t_dragged.bboxes,tab);
      if(!bb) {
        new_bboxes = concat(new_bboxes,t.bboxes);
      }
      new_track.bboxes = new_bboxes;
      if(t.last_frame) {
        new_track.last_frame = t.last_frame;
      } else {
        new_track.last_frame = new_track.first_frame + new_track.bboxes.length;
      }
      new_track.olds = [];
      new_track.olds.push(this.t_dragged);
      if(!bb) {
        new_track.olds.push(t);
        this.removeTracklet(t);
      }
      this.removeTracklet(this.t_dragged);
      this.track_bbox_shot.push(new_track);
    }
  }

  this.interpolate = function(bbox_left, bbox_right, len) {
    let ret = [];
    for(let i=0; i<len; i++) {
      let x = lerp(bbox_left.x, bbox_right.x, i/len);
      let y = lerp(bbox_left.y, bbox_right.y, i/len);
      let w = lerp(bbox_left.w, bbox_right.w, i/len);
      let h = lerp(bbox_left.h, bbox_right.h, i/len);
      let b = new BboxShot(x,y,w,h);
      let c_x = lerp(bbox_left.center_x, bbox_right.center_x, i/len);
      let c_y = lerp(bbox_left.center_y, bbox_right.center_y, i/len);
      b.setCenter(c_x, c_y);
      ret.push(b);
    }
    return ret;
  }

  function containsOldTrack(tab, t) {
    var ret = false;
    for(var i=0; i<tab.length; i++) {
      if(tab[i].x == t.x && tab[i].w == t.w) {
        ret = true;
        break;
      }
    }
    return ret;
  }

  this.interpolateLeftTrack = function(t, k_drag, unit) {
    var l = t.detections.length-1;
    var k_prec = this.getBestKeypoints(t, l-12);
    // console.log(k_prec, k_drag);
    var l_int = this.t_dragged.first_frame - (t.first_frame+l+1);
    var new_detections = [];
    for(var i=0; i<l_int; i++) {
      var ind = t.first_frame+t.detections.length + i;
      var obj = {};
      var keypoints = [];
      for(var j=0; j<k_prec.length; j++) {
        let val = lerp(k_prec[j], k_drag[j], i/l_int);
        if(isNaN(val)) {
          keypoints.push('null');
        } else {
          keypoints.push(val);
        }
      }
      obj.KeyPoints = keypoints;
      this.frames_data[ind].push(obj);
      new_detections.push(this.frames_data[ind].length-1);
    }
    new_detections = concat(t.detections, new_detections);
    new_detections = concat(new_detections, this.t_dragged.detections);
    var new_track = new Track();
    new_track.first_frame = t.first_frame;
    var old = [];
    this.t_dragged.setPosition(0,0,0,0);
    this.t_dragged.old = true;
    t.old = true;
    t.setPosition(0,0,0,0);
    old.push(this.t_dragged);
    old.push(t);
    new_track.olds = old;
    this.removeTracklet(this.t_dragged);
    this.removeTracklet(t);
    new_track.detections = new_detections;
    var start = this.x + Math.round((new_track.first_frame-1)*unit);
    var end = start + Math.round((new_track.detections.length-1)*unit);
    new_track.setPosition(start, this.y, end-start, this.h/2);
    this.addTrack(new_track);
    detec_modif = true;
  }

  this.interpolateRightTrack = function(t, k_drag, unit) {
    var k_next = this.getBestKeypoints(t, 0);
    var l_int = t.first_frame - (this.t_dragged.first_frame+this.t_dragged.detections.length);
    var new_detections = [];
    for(var i=0; i<l_int; i++) {
      var ind = this.t_dragged.first_frame+this.t_dragged.detections.length + i;
      var obj = {};
      var keypoints = [];
      for(var j=0; j<k_next.length; j++) {
        let val = lerp(k_drag[j], k_next[j], i/l_int);
        if(isNaN(val)) {
          keypoints.push('null');
        } else {
          keypoints.push(val);
        }
      }
      obj.KeyPoints = keypoints;
      this.frames_data[ind].push(obj);
      new_detections.push(this.frames_data[ind].length-1);
    }
    new_detections = concat(this.t_dragged.detections, new_detections);
    new_detections = concat(new_detections, t.detections);
    var new_track = new Track();
    new_track.first_frame = this.t_dragged.first_frame;
    var old = [];
    this.t_dragged.setPosition(0,0,0,0);
    t.setPosition(0,0,0,0);
    this.t_dragged.old = true;
    t.old = true;
    old.push(this.t_dragged);
    old.push(t);
    new_track.olds = old;
    this.removeTracklet(this.t_dragged);
    this.removeTracklet(t);
    new_track.detections = new_detections;
    var start = this.x + Math.round((new_track.first_frame-1)*unit);
    var end = start + Math.round((new_track.detections.length-1)*unit);
    new_track.setPosition(start, this.y, end-start, this.h/2);
    this.addTrack(new_track);
    detec_modif = true;
  }

  this.extendsTrackLeft = function(f_f, l, keypoints, unit) {
    this.t_dragged.left_detec = this.t_dragged.detections;
    this.t_dragged.left_first_frame = this.t_dragged.first_frame;
    this.t_dragged.left_x = this.t_dragged.x;

    var new_detections = [];
    for(var i=0; i<l; i++) {
      var ind = f_f+i;
      var obj = {};
      obj.KeyPoints = keypoints;
      this.frames_data[ind].push(obj);
      new_detections.push(this.frames_data[ind].length-1);
    }
    this.t_dragged.detections = concat(new_detections, this.t_dragged.detections);
    this.t_dragged.first_frame = f_f;
    var start = this.x + Math.round((this.t_dragged.first_frame-1)*unit);
    var end = start + Math.round((this.t_dragged.detections.length-1)*unit);
    this.t_dragged.setPosition(start, this.y, end-start, this.h/2);
    detec_modif = true;
  }

  this.extendsTrackRight = function(f_f, l, keypoints, unit) {
    this.t_dragged.right_detec = this.t_dragged.detections;
    this.t_dragged.right_first_frame = this.t_dragged.first_frame;
    this.t_dragged.right_x = this.t_dragged.x+this.t_dragged.w;
    this.t_dragged.right_w = this.t_dragged.w;

    var new_detections = [];
    for(var i=0; i<l; i++) {
      var ind = f_f+i;
      var obj = {};
      obj.KeyPoints = keypoints;
      // console.log(obj);
      this.frames_data[ind].push(obj);
      new_detections.push(this.frames_data[ind].length-1);
    }
    this.t_dragged.detections = concat(this.t_dragged.detections, new_detections);
    var start = this.x + Math.round((this.t_dragged.first_frame-1)*unit);
    var end = start + Math.round((this.t_dragged.detections.length-1)*unit);
    this.t_dragged.setPosition(start, this.y, end-start, this.h/2);
    detec_modif = true;
  }

  this.removeState = function(mx, my) {
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      if(this.states.length==1) {
        if(mx > this.states[0].x && mx < this.states[0].x + this.states[0].w) {
          this.states = [];
        }
      }
      for(var i=0; i < this.states.length; i++) {
        if(mx > this.states[i].x && mx < this.states[i].x + this.states[i].w) {
          this.states.splice(i, 1);
        }
      }
    }
  }

  this.setPosition = function(tX, tY, tW, tH) {
    this.x  = tX;
    this.y  = tY;
    this.w  = tW;
    this.h  = tH;
  }

  this.setActorName = function(name) {
    this.actor_name = name;
    for(let t of this.tracks) {
      t.actor_name = name;
    }
  }

  this.getKeyPoints = function(f_n) {
    let tab;
    for(let t of this.tracks) {
      if(t.first_frame <= f_n && f_n < t.first_frame + t.detections.length) {
        let ind = t.detections[f_n-t.first_frame];
        let keypoints;
        if(this.frames_data[f_n][ind]) {
          keypoints = this.frames_data[f_n][ind]['KeyPoints'];
        }
        if(keypoints) {
          tab = keypoints;
          break;
        }
      }
    }
    return tab;
  }

  this.getProfile = function(f_n = undefined) {
    if(!f_n) {
      f_n = frame_num;
    }
    let ret = '';
    let keypoints = this.getKeyPoints(f_n);
    if(keypoints && keypoints != 'null') {
      let g_v = getGazevect(keypoints);
      if(g_v.mag() < 2) {
        if(keypoints[15*3] && keypoints[16*3]) {
          if(keypoints[15*3]<keypoints[16*3]) {
            ret += 'front';
          } else {
            ret += 'back';
          }
        } else {
          ret += 'front/back';
        }
      } else if(g_v.x < 0) {
        ret += 'left';
      } else if(g_v.x > 0) {
        ret += 'right';
      }
    }
    if(this.getVelocityVect(f_n)) {
      ret += ' vel '+Math.round(this.getVelocityVect(f_n).mag());
    } else {
      ret += ' vel '+0;
    }

    return ret;
  }

  this.extractMovement = function() {
    let ret = [];
    for(let i=0; i< total_frame; i++) {
      let obj = {};
      obj.Frame = ''+i;
      if(this.getVelocityVect(i)) {
        obj.Mvt = ''+Math.round(this.getVelocityVect(i).mag());
      } else {
        obj.Mvt = ''+0;
      }
      ret.push(obj);
    }
    return ret;
  }

  this.getCenterAct = function(f_n) {
    let center = {};
    for(let t of this.tracks) {
      if(t.first_frame <= f_n && f_n < t.first_frame + t.detections.length) {
        let ind = t.detections[f_n-t.first_frame];
        let keypoints;
        if(this.frames_data[f_n] && this.frames_data[f_n][ind]) {
          keypoints = this.frames_data[f_n][ind]['KeyPoints'];
        }
        if(keypoints && keypoints[1*3] != "null") {
          center.x = keypoints[1*3];
          center.y = keypoints[1*3+1];
          break;
        }
      }
    }
    if(!center.x) {
      for(let t of this.track_bbox_shot) {
        if(t.first_frame <= f_n && f_n < t.last_frame) {
          center.x = t.bboxes[f_n-t.first_frame].center_x;
          center.y = t.bboxes[f_n-t.first_frame].center_y;
          break;
        }
      }
    }
    return center;
  }

  this.getActPosition = function(f_n = frame_num) {
    let c = this.getCenterAct(f_n);
    if(!c.x) {
      for(let i=0; i<Math.min(total_frame-f_n,frame_rate*5);i++) {
        c = this.getCenterAct(f_n+i);
        if(c.x) {
          break;
        }
      }
    }
    if(!c.x) {
      c = {x:parseInt(original_width),y:parseInt(original_height)};
    }
    return c;
  }

  this.getVelocityVect = function(fr_num) {
    let c_1t = this.getCenterAct(fr_num-1).x;
    let c_t = this.getCenterAct(fr_num).x;
    let c_t1 = this.getCenterAct(fr_num+1).x;
    let c_t2 = this.getCenterAct(fr_num+2).x;
    if(c_t && c_t1 && c_t2) {
      let prev = p5.Vector.mult(createVector(c_t-c_1t,0),2);
      let curr = p5.Vector.mult(createVector(c_t1-c_t,0),2);
      let next = p5.Vector.mult(createVector(c_t2-c_t1,0),2);
      if((curr.mag()>1&& next.mag()>1&& prev.mag()>1) && ((prev.x>0 && curr.x<0 && next.x>0) || (prev.x<0 && curr.x>0 && next.x<0))) {
        return createVector(0);
      }
      let ratio;
      if(curr.mag()>1&& prev.mag()>1) {
        if(curr.mag() >  prev.mag()) {
          ratio=curr.mag()/ prev.mag();
        } else {
          ratio = prev.mag()/curr.mag();
        }
        // if(ratio && ratio > 3) {
        //   console.log(ratio);
        // }
      }
      if(ratio && ratio <3)
        return curr;
      else if(!ratio)
        return curr;
    } else if(c_t && c_t1) {
      return p5.Vector.mult(createVector(c_t1-c_t,0),2);
    } else {
      return createVector(0);
    }
  }

  this.updateHeadSize = function() {
    let total=0;
    let cpt=0;
    let tabHead = [];
    let tabBody = [];
    for(let t of this.tracks) {
      let ind=t.first_frame;
      for(let d of t.detections) {
        if(this.frames_data[ind][d] && this.frames_data[ind][d] != "null") {
          let keypoints;
          if(this.frames_data[ind][d]) {
            keypoints = this.frames_data[ind][d]['KeyPoints'];
          }
          let xNose = keypoints[0*3];
          let yNose = keypoints[0*3+1];
          let xNeck = keypoints[1*3];
          let yNeck = keypoints[1*3+1];
          let xMid = keypoints[8*3];
          let yMid = keypoints[8*3+1];
          if(xNose && yNose && xNeck && yNeck && xMid && yMid){
            let sizeBody=int(dist(xNeck, yNeck, xMid, yMid));
            let sizeHead=int(dist(xNose, yNose, xNeck, yNeck));
            // total += size;
            // cpt++;
            tabBody.push(sizeBody);
            tabHead.push(sizeHead);
          }
        }
        ind++;
      }
    }
    // let mean = total/cpt;
    // cpt = 0;
    // total = 0;
    // for(let t of this.tracks) {
    //   let ind=t.first_frame;
    //   for(let d of t.detections) {
    //       let keypoints = this.frames_data[ind][d]['KeyPoints'];
    //       let size=int(dist(keypoints[3], keypoints[4], keypoints[3*8], keypoints[3*8+1]));
    //       if(size){
    //         total += pow((size-mean),2);
    //         cpt++;
    //       }
    //       ind++;
    //   }
    // }
    // let std_dev = sqrt(total/cpt);
  }

  this.addTrack = function(t) {
    t.added = true;
    t.on = false;
    t.actor_name = this.actor_name;
    this.tracks.push(t);
    this.tracks.sort(compare_first);
  }

  this.isInTracks = function(t) {
    var is_in = false;
    var detections_track_ref = t.detections;
    var first_ref = t.first_frame;
    var last_ref = first_ref + detections_track_ref.length - 1;
    for(var i=0; i< this.tracks.length; i++) {
      var detections_track = this.tracks[i].detections;
      var first = this.tracks[i].first_frame;
      var last = first + detections_track.length - 1;
      if((first_ref >= first && first_ref <= last) || (last_ref >= first && last_ref <= last)
        || (first_ref < first && last_ref > last)) {
          is_in = true;
          break;
      }
    }
    return is_in;
  }

  this.onTrack = function(mX) {
    var ret = false;
    for(var i=0; i< this.tracks.length; i++) {
      var start = this.tracks[i].x;
      var end = start + this.tracks[i].w;
      if(mX>start && mX < end) {
        ret = true;
        break;
      }
    }
    if(!ret) {
      for(var i=0; i< this.track_bbox_shot.length; i++) {
        var start = this.track_bbox_shot[i].x;
        var end = start + this.track_bbox_shot[i].w;
        if(mX>start && mX < end) {
          ret = true;
          break;
        }
      }
    }
    return ret;
  }

  this.removeTrack = function(mx, my) {
    var ret = false;
    for(var i=0; i< this.tracks.length; i++) {
      var t = this.tracks[i];
      if (mx > t.x && mx < t.x + t.w && my > t.y && my < t.y + t.h) {
        if(this.tracks[i].first_frame == t.first_frame) {
          t.actor_name = 'unknown';
          t.added = false;
          this.tracks.splice(i, 1);
          ret = true;
          break;
        }
      }
    }
    for(let i=0; i<this.track_bbox_shot.length; i++) {
      let t = this.track_bbox_shot[i];
      if (mx > t.x && mx < t.x + t.w && my > t.y && my < t.y + t.h) {
        this.track_bbox_shot.splice(i,1);
      }
    }
    return ret;
  }

  this.removeTracklet = function(t) {
    for(var i=0; i< this.tracks.length; i++) {
      if(this.tracks[i].x == t.x && this.tracks[i].w == t.w) {
        t.actor_name = 'unknown';
        t.added = false;
        this.tracks.splice(i, 1);
        break;
      }
    }
    for(var i=0; i< this.track_bbox_shot.length; i++) {
      if(this.track_bbox_shot[i].x == t.x && this.track_bbox_shot[i].w == t.w) {
        this.track_bbox_shot.splice(i, 1);
        break;
      }
    }
  }

  this.removeAll = function() {
    for(var i=0; i< this.tracks.length; i++) {
      this.tracks[i].actor_name = 'unknown';
      this.tracks[i].added = false;
    }
    this.tracks = [];
  }

  this.updateBBox = function() {
    for(var i=0; i< this.tracks.length; i++) {
      this.tracks[i].bbox = [0,0,0,0];
    }
  }

  this.isOnstage = function (f_n) {
    let ret = false;
    for(let t of this.tracks) {
      if(t.first_frame <= f_n && f_n <= t.first_frame + t.detections.length) {
        ret = true;
        break;
      }
    }
    if(!ret) {
      for(let t of this.track_bbox_shot) {
        if(t.first_frame <= f_n && f_n <= t.last_frame) {
          ret = true;
          break;
        }
      }
    }
    if(!ret) {
      for(let s of this.states) {
        if(s.Num == 0 && s.first_frame <= f_n && f_n <= s.last_frame) {
          ret = true;
          break;
        }
      }
    }
    return ret;
  }

  function compare_first(a,b) {
    if (a.first_frame < b.first_frame)
      return -1;
    if (a.first_frame > b.first_frame)
      return 1;
    return 0;
  }

  // Draw the rectangle
  this.display = function() {
    this.updateBBox();
    if(this.y > this.elem.elt.parentNode.offsetTop-can.elt.offsetTop) {
      // this.elem.position(this.x-90, can.elt.offsetTop+this.y-25);

      push();
      rectMode(CORNER);
      stroke(0);
      strokeWeight(0);
      // The color changes based on the state of the button
      if (this.on) {
        fill(46,92,156);
      } else {
        fill(102);
        this.elem.style('color', 'rgb(0,0,0)');
      }
      rect(this.x,this.y,this.w,this.h);
      for(var i=0; i<this.states.length; i++) {
        fill(this.states[i].color);
        rect(this.states[i].x, this.y, this.states[i].w, this.states[i].h);
      }
      pop();

      for(var i=0; i<this.tracks.length; i++) {
        this.tracks[i].display();
      }
      for(let t of this.track_bbox_shot) {
        t.displayTime();
      }
      push();
      fill('yellow');
      rect(this.rect_drag[0],this.rect_drag[1],this.rect_drag[2],this.rect_drag[3]);
      pop();

    }
  }
}
