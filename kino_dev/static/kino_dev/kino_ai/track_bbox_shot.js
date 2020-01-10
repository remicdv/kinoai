// Constructor initializes all variables
function TrackBboxShot(a)  {

  this.on = false;

  this.act = a;

  this.first_frame;
  this.last_frame;

  this.first_bbox;
  this.last_bbox;

  this.bboxes = [];

  this.x  = 0;
  this.y  = 0;
  this.w = 0;
  this.h = 0;

  this.click = function(mx, my) {
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      this.on = !this.on;
    }
    if(frame_num>this.first_frame && frame_num < this.last_frame) {
      let b = this.bboxes[frame_num- this.first_frame];
      if(mx>b.x && b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h) {
        this.on = !this.on;
      }
    }
  };

  this.setFirst = function() {
    this.first_frame;
    this.first_bbox;
  }

  this.setLast = function() {
    this.last_frame;
    this.last_bbox;
  }

  this.setAct = function(a) {
    this.act = a;
  }

  this.setSize = function (tx, ty, tw, th) {
    this.x  = tx;
    this.y  = ty;
    this.w = tw;
    this.h = th;

  }

  this.interpolate = function() {
    //magic interpolation
    let len = this.last_frame - this.first_frame;
    for(let i=0; i<len; i++) {
      let x = lerp(this.first_bbox.x, this.last_bbox.x, i/len);
      let y = lerp(this.first_bbox.y, this.last_bbox.y, i/len);
      let w = lerp(this.first_bbox.w, this.last_bbox.w, i/len);
      let h = lerp(this.first_bbox.h, this.last_bbox.h, i/len);
      let b = new BboxShot(x,y,w,h);
      let c_x = lerp(this.first_bbox.center_x, this.last_bbox.center_x, i/len);
      let c_y = lerp(this.first_bbox.center_y, this.last_bbox.center_y, i/len);
      b.setCenter(c_x, c_y);
      this.bboxes.push(b);
    }
  }

  // Draw the rectangle
  this.display = function() {
    var unit = this.act.w/annotation_timeline.total_frame;
    let off_x = annotation_timeline.first*unit;
    var start = this.act.x + Math.round((this.first_frame-1)*unit)-off_x;
    var w = Math.round((this.bboxes.length-1)*unit);
    this.setSize(start, this.act.y, w, this.act.h/2);
    if(this.bboxes.length > 0) {
     //display curr frame
     if(frame_num>this.first_frame && frame_num < this.last_frame) {
       this.bboxes[frame_num- this.first_frame].display(this.act);
     }
    }
    else if(!this.last_bbox && this.first_bbox) {
      this.first_bbox.display();
    } else if(this.last_bbox && this.first_bbox) {
      this.last_bbox.display();
      this.first_bbox.display();
    }
  }

  this.displayTime = function() {
    if(this.bboxes.length > 0) {
      if(this.x+this.w>player.x && this.x<player.x+player.w) {
        push();
        if(!this.on)
          fill('rgb(200,150,120)');
        else
          fill('rgb(250,110,80)');
        let x = Math.max(player.x,this.x);
        let temp_w = this.w - (x-this.x);
        let w = Math.min(x+temp_w,player.x+player.w)-x;
        rect(x, this.y, w, this.h);
        pop();
      }
    }
  }
}
