// Constructor initializes all variables
function Player(tempX, tempY, tempW, tempH, tempDur, tempRate, tempXCursor = 0)  {
  // Button location and size
  this.x  = tempX;
  this.y  = tempY;
  this.w  = tempW;
  this.h  = tempH;
  this.frame_rate = tempRate;

  this.on = false;

  this.is_drag = false;

  this.x_cursor = tempXCursor;

  this.duration = tempDur;

  this.time = 0;

  this.scale = 1;

  this.nav_bar = {};

  this.total_frame = total_frame;

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      var unit = this.w/this.duration;
      this.time= (mx-this.x)/unit;
      this.on = true;
    }
  };

  this.drag = function(mx, my) {
    var t = undefined;
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      var unit = this.w/this.duration;
      t = (mx-this.x)/unit;
      this.is_drag = true;
    }
    let b = false;
    for(let t of preparation_editor.tracklets_line) {
      if(t.drag) {
        b = true;
        break;
      }
    }
    if(!b && t)
      video.time(t);

  }

  this.dragNavBar = function(mx, my) {
    if (!annotation_editor.is_note_book && !montage_editor.is_split && mx > this.nav_bar.x && mx < this.nav_bar.x + this.nav_bar.w && my > this.nav_bar.y && my < this.nav_bar.y + this.nav_bar.h) {
      let unit = this.w / (this.last-this.first)*frame_rate;
      let time = (mx-this.x)/unit + (this.first/frame_rate);
      let b = false;
      for(let t of preparation_editor.tracklets_line) {
        if(t.drag) {
          b = true;
          break;
        }
      }
      if(preparation_editor.annotation_timeline.curr_action.drag || preparation_editor.offstage_state.in_drag) {
        b = true;
      }
      if(!b)
        video.time(time);
    }
  }

  this.drop = function() {
    this.is_drag = false;
  }

  this.mouseWheel = function(event) {
    if(keyCode===122) {
      event.preventDefault();
      if(event.delta<0) {
        if(this.scale - 0.01 > 0) {
          this.scale -= 0.01;
        }
      } else {
        if(this.scale + 0.01 <= 1) {
          this.scale += 0.01;
        }
      }
    }

    if(this.start_time_button && this.end_time_button) {
      this.wheelTimeButton(mouseX, mouseY, event);
    }
  }

  this.wheelTimeButton = function(mx, my, event) {
    if (is_montage_editor && mx > this.start_time_button.x && mx < this.start_time_button.x + this.start_time_button.w && my > this.start_time_button.y && my < this.start_time_button.y + this.start_time_button.h) {
      //Drag start
      if(event.delta>0) {
        if(this.first - 12 > 0) {
          this.first -= 12;
        }
      } else {
        if(this.first + 12 <= this.last) {
          this.first += 12;
        }
      }
    }
    if (is_montage_editor && mx > this.end_time_button.x && mx < this.end_time_button.x + this.end_time_button.w && my > this.end_time_button.y && my < this.end_time_button.y + this.end_time_button.h) {
      // Drag end
      if(event.delta>0) {
        if(this.last - 12 > this.first) {
          this.last -= 12;
        }
      } else {
        if(this.last + 12 <= total_frame) {
          this.last += 12;
        }
      }
    }
    this.first_time = this.first/frame_rate;
    this.last_time = this.last/frame_rate;
  }

  this.setPosition = function(tx, ty) {
    this.x = tx;
    this.y = ty;
  }

  this.setTimer = function(t) {
    this.time = t;
  }

  this.setXCursor = function(tx) {
    this.x_cursor = tx;
  }

  this.updatePos = function(tempX, tempY, tempW, tempH) {
    this.x  = tempX;
    this.y  = tempY;
    this.w  = tempW;
    this.h  = tempH;
  }


  this.drawCursor = function() {
    this.updateFirstLast();
    push();
    fill(12,156,37);
    ellipse(this.x_cursor,this.y+(this.h/2),15);
    fill(0);
    ellipse(this.x_cursor,this.y+(this.h/2),7);
    pop();

    if(!(annotation_editor.is_note_book || montage_editor.is_split || is_cadrage_editor) && !fullscreen()) {
      this.nav_bar.x = this.x;
      this.nav_bar.y = viewer_height+55;
      this.nav_bar.w = this.w;
      this.nav_bar.h = 6;
      push();
      stroke(255);
      strokeWeight(this.nav_bar.h);
      line(this.nav_bar.x, this.nav_bar.y, this.nav_bar.x+this.nav_bar.w, this.nav_bar.y);
      let unit = player.w / this.total_frame;
      this.nav_bar.cursor = this.x+(frame_num-this.first)*unit;
      this.start_time_button = {'x':this.x,'y':viewer_height+30,'w':57,'h':15};
      this.end_time_button = {'x':this.x+this.w-57,'y':viewer_height+30,'w':57,'h':15};
      fill(255);
      rect(this.start_time_button.x, this.start_time_button.y, this.start_time_button.w, this.start_time_button.h, 3);
      rect(this.end_time_button.x, this.end_time_button.y, this.end_time_button.w, this.end_time_button.h, 3);
      noStroke();
      textSize(15);
      fill(0);
      text(this.getTimeFrame(this.first), this.start_time_button.x, this.start_time_button.y, this.start_time_button.w, this.start_time_button.h);
      text(this.getTimeFrame(this.last), this.end_time_button.x, this.end_time_button.y, this.end_time_button.w, this.end_time_button.h);
      fill(0);
      ellipse(this.nav_bar.cursor,this.nav_bar.y,this.nav_bar.h*2);
      pop();
    }
  }

  this.getTimeFrame = function(frame) {
    let mil = toTwoDigit(round_prec(((frame/frame_rate)%1)*100,0).toString());
    let s = toTwoDigit(Math.floor((frame/frame_rate)%60).toString());
    let m = toTwoDigit(Math.floor((frame/frame_rate/60)).toString());
    return ''+m+':'+s+'.'+mil;
  }



  this.updateFirstLast = function() {
    this.total_frame = Math.round(total_frame*this.scale);
    let first=0;
    let last=total_frame;
    if(this.total_frame != total_frame) {
      first = Math.max(frame_num-this.total_frame/2,0);
      if(first == 0) {
        last = first + this.total_frame;
      } else {
        last = Math.min(frame_num+this.total_frame/2,total_frame);
        if(last == total_frame) {
          first = last - this.total_frame;
        }
      }
    }
    if((this.total_frame != this.last-this.first || (frame_num<this.first||frame_num>this.last)) || !this.first) {
      this.first = Math.round(first);
      this.first_time = this.first/frame_rate;
      this.last = Math.round(last);
      this.last_time = this.last/frame_rate;
    }
  }

  this.drawSub = function() {
    let text_tracks = video.elt.textTracks;
    let cpt = 0;
    for(let t of text_tracks) {
      if(t.mode == "showing") {
        cpt++;
      }
    }
    let i = 0;
    for(let t of text_tracks) {
      if(t.mode == "showing") {
        let final_text = "";
        for(let c of t.cues) {
          if(video.time() >= c.startTime && video.time() < c.endTime) {
            final_text += (c.text);
          }
        }
        push();
        fill(255);
        textSize(25);
        textAlign(CENTER);
        let region_width = this.w/cpt;
        let off_h = 24 * (Math.ceil(textWidth(final_text)/ (this.w/2))+(final_text.split(/\r\n|\r|\n/).length-1));
        text(final_text, this.x + region_width*i, this.y-off_h, region_width, off_h);
        pop();
        i++;
      }
    }
  }

  // Draw the rectangle
  this.display = function() {
    this.drawSub();
    push();
    stroke(120);
    strokeWeight(this.h);
    strokeCap(ROUND);
    line(this.x, this.y+(this.h/2), this.x+this.w, this.y+(this.h/2));
    stroke(50,50,123);
    line(this.x, this.y+(this.h/2), this.x_cursor, this.y+(this.h/2));
    if(this.is_drag){
      let min = toTwoDigit(Math.floor(video.time()/60).toString());
      let sec = toTwoDigit(Math.floor(video.time()%60).toString());
      let mil = toTwoDigit(round_prec((video.time()%1)*100,0).toString());
      fill(255);
      textSize(15);
      noStroke();
      text(min+':'+sec+'.'+mil,this.x_cursor-30,this.y-15);
    }
    pop();
    this.drawCursor();
  }
}
