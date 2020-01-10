// Constructor initializes all variables
function Track(tempX=0, tempY=0, tempW=0, tempH=0)  {
  // Button location and size
  this.x  = tempX;
  this.y  = tempY;
  this.w  = tempW;
  this.h  = tempH;
  // Is the button on or off?
  // Button always starts as off
  this.on = false;

  this.drag = false;

  this.added = false;

  this.old = false;

  this.first_frame = 1;

  this.actor_name = "";

  this.bbox = [0,0,0,0];

  this.detections = [];

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if(!is_split && !is_note_book) {
      if(frame_num>=this.first_frame && frame_num <= this.first_frame + this.detections.length) {

        if(x_off<0){x_off=0;}
        if(y_off<0){y_off=0;}
        let vid_mx = mx-x_off;
        let vid_my = my-y_off;
        vid_mx /=(vid_h/Number(original_height));
        vid_my /=(vid_h/Number(original_height));
        if(vid_mx > this.bbox[0] && vid_mx < this.bbox[2] && vid_my > this.bbox[1] && vid_my < this.bbox[3]) {
          if(!this.old) {
            this.on = !this.on;
            if(!this.added) {
              this.drag = true;
            }
          }
        }
      }
      if ( (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) ) {
        if(!this.old) {
          this.on = !this.on;
          if(!this.added) {
            this.drag = true;
          }
        }
      }
    }
    return this.on;
  };

  this.setPosition = function(tX, tY, tW, tH) {
    if(tX==0 && tY==0 && tW==0 && tH==0)
      this.bbox = [0,0,0,0];
    this.x  = tX;
    this.y  = tY;
    this.w  = tW;
    this.h  = tH;
  }

  this.updatePos = function(unit, tx, ty) {
    let off_x = annotation_timeline.first*unit;
    let start = tx + Math.round((this.first_frame-1)*unit) - off_x;
    let end = start + Math.round((this.detections.length-1)*unit);
    this.setPosition(start, ty, end-start, 7);
  }

  this.setXY = function(tX, tY) {
    this.x  = tX;
    this.y  = tY;
  }

  this.setBBox = function(tbbox) {
    this.bbox = tbbox;
  }

  this.setFirstFrame = function(i) {
    this.first_frame = i;
  }

  this.setActorName = function(name) {
    this.actor_name = name;
  }

  // Draw the rectangle
  this.display = function() {
    if(this.x+this.w>player.x && this.x<player.x+player.w) {
      push();
      rectMode(CORNER);
      stroke(0);
      strokeWeight(0);
      // The color changes based on the state of the button
      if (this.on) {
        fill(170,56,35);
      } else if(this.drag) {
        fill(32,56,142);
      } else {
        fill(255);
      }
      let x = Math.max(player.x,this.x);
      let temp_w = this.w - (x-this.x);
      let w = Math.min(x+temp_w,player.x+player.w)-x;
      rect(x,this.y,w,this.h);
      pop();
    }
  }
}
