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
    if(frame_num>=this.first_frame && frame_num <= this.first_frame + this.detections.length) {

      if(x_off<0){x_off=0;}
      if(y_off<0){y_off=0;}
      mx = mx-x_off;
      my = my-y_off;
      mx /=(vid_h/Number(original_height));
      my /=(vid_h/Number(original_height));
      if(mx > this.bbox[0] && mx < this.bbox[2] && my > this.bbox[1] && my < this.bbox[3]) {
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
    var start = tx + Math.round((this.first_frame-1)*unit);
    var end = start + Math.round((this.detections.length-1)*unit);
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
    rect(this.x,this.y,this.w,this.h);
    pop();
  }
}
