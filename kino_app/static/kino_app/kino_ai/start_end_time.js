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

  this.drop_shot;

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if (!is_split && !is_note_book && mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      for(var i=0; i<this.shots.length; i++) {
        this.shots[i].on = false;
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

  this.drag = function(mx, my) {
    if (!is_split && !is_note_book && mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      // if(this.on) {
      //   this.start = mx;
      // } else{
      //   this.end = mx;
      // }
      // var unit = this.w/this.duration;
      // this.time= (mx-this.x)/unit;
      let unit = this.w/(annotation_timeline.total_frame/frame_rate);
      this.time=(annotation_timeline.first/frame_rate)+(mx-this.x)/unit;
      return this.time;
    } else {
      return undefined;
    }
  }

  this.drop = function(mx, my) {
    let s;
    let ext_s;
    for(let i=0; i<shots.length; i++) {
      if(shots[i].on) {
        s = shots[i];
      }
    }
    for(let shot of this.shots) {
      if(shot.on) {
        ext_s = shot;
      }
    }
    if (!is_split && !is_note_book && s && mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      if(!this.shots[0]) {
        this.time = 0;
        this.addShot(s);
        return 0;
      } else {
        var unit = this.w/this.duration;
        this.time= (annotation_timeline.first/frame_rate) + (mx-this.x)/unit;
        this.addShot(s);
        return this.time;
      }
    } else if (!is_split && ext_s && mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h && (mx < ext_s.start || mx > ext_s.end)) {
      // Extend ext shot
      var unit = this.w/this.duration;
      this.time= (annotation_timeline.first/frame_rate) + (mx-this.x)/unit;
      this.extendShot(ext_s, mx);
      return this.time;
    } else {
      return undefined;
    }
  }

  this.addShot = function(shot) {
    var s = {};//new Shot();
    s.type = shot.type;
    s.actors_involved = shot.actors_involved;
    s.aspect_ratio = shot.aspect_ratio;
    var unit = this.w/this.duration;
    s.start = this.x+this.time*unit;
    s.start_frame = Math.round(frame_rate*this.time);

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
      s.end_frame = annotation_timeline.last;//Math.round(frame_rate*this.duration);
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
    let ind = getShot(shots, t, act_inv);
    if(ind) {
      shot = shots[ind];
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
        bb = getShotAspect(this.shots[i].type, this.shots[i].actors_involved, this.shots[i].aspect_ratio).getCurrStabShot(frame_num);
        if(bb && bb[0] != "null") {
          ret = [bb[0]*scale_ratio, bb[1]*scale_ratio, bb[2]*scale_ratio, bb[3]*scale_ratio];
          // let hor_len = bb[2] * aspect_ratio;
          // ret = [(bb[0]-hor_len)*scale_ratio, (bb[1]-bb[2])*scale_ratio, (bb[0]+hor_len)*scale_ratio, (bb[1]+bb[2])*scale_ratio];
        }
        break;
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
        bb = getShotAspect(this.shots[i].type, this.shots[i].actors_involved, this.shots[i].aspect_ratio).getCurrStabShot(frame_num);
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
    for(let i=0; i< total_frame;i++) {
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
    let curr_a_s;
    for(let s of this.shots) {
      if(!curr_a_s) {
        curr_a_s = s.aspect_ratio;
      } else if(curr_a_s != s.aspect_ratio) {
        curr_a_s = aspect_ratio;
        break;
      }
    }
    console.log(curr_a_s);
    return curr_a_s;
  }

  this.extractKeyFrames = function() {
    let ret = [];
    for(let t of video.elt.textTracks) {
      if(t.mode = "showing") {
        for(let c of t.cues) {
          let key_frame = {};
          key_frame.Time = c.startTime;
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
      let unit = this.w/annotation_timeline.total_frame;
      let off_x = annotation_timeline.first*unit;
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
        let s = getShotAspect(this.shots[i].type, this.shots[i].actors_involved, this.shots[i].aspect_ratio);
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
          string_psl_act += act_name/*+' ['+getAct(act_name).getProfile()+', '+s.getPlacement(getAct(act_name))*/+'\n';
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

  // Draw the rectangle
  this.display = function() {
    this.duration = (annotation_timeline.total_frame/frame_rate);
    annotation_timeline.updateFirstLast();
    annotation_timeline.drawCursor();
    this.updateShotPos();
    push();
    noStroke();
    fill(120);
    rect(this.x,this.y,this.w,this.h);
    pop();

    for(var i=0; i<this.shots.length; i++) {
      if(this.shots[i].start_frame<annotation_timeline.last && this.shots[i].end_frame>annotation_timeline.first) {
        let x_start = Math.max(this.shots[i].start, this.x);
        let x_end = Math.min(this.shots[i].end, this.x+this.w);
        if(this.shots[i].on) {
          push();
          noStroke();
          fill(120,230,216);
          rect(x_start,this.y,x_end-x_start,this.h);
          pop();
        }
        if(this.shots[i]) {
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
            text(this.shots[i].type, x_start, this.y+10);
            for(var j=0; j<this.shots[i].actors_involved.length; j++) {
              text(this.shots[i].actors_involved[j].actor_name, x_start, this.y+25+j*15);
            }
            pop();
          }
        }
    }

    push();
    if(crop_button.on) {
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
    }
    strokeWeight(1);
    for(var i=0; i<this.w; i++) {
      var x = this.x + i;
      if(x<player.x_cursor) {
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
    pop();

  }
}
