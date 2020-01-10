// Constructor initializes all variables
function StateButton(tempX, tempY, tempW, tempH, t, c)  {
  // Button location and size
  this.x  = tempX;
  this.y  = tempY;
  this.w = tempW;
  this.h = tempH;

  this.prev_x = tempX;
  this.prev_y = tempY;
  // Is the button on or off?
  // Button always starts as off
  this.on = false;

  this.type = t;

  this.color = c;

  this.in_drag = false;

  this.first_frame;
  this.last_frame;

  this.drag = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if (mx > this.x && mx < this.x + this.w*2 && my > this.y && my < this.y + this.h*2) {
      this.in_drag = true;
      this.x = mx;
      this.y = my;
    }
    if(this.in_drag) {
      this.x = mx;
      this.y = my;
    }
  };

  this.drop = function() {
    this.in_drag = false;
    this.x = this.prev_x;
    this.y = this.prev_y;
  }

  this.setPosition = function(tx, ty) {
    this.x = tx;
    this.y = ty;
  }

  this.setColor = function(c) {
    this.color = c;
  }

  this.setType = function(t) {
    this.type = t;
  }

  // Draw the rectangle
  this.display = function() {
    if(this.in_drag) {
      push();
      fill(this.color);
      rect(mouseX,mouseY,this.w,this.h);
      pop();
    } else {
      push();
      fill(this.color);
      text(this.type,this.x,this.y);
      rect(this.x,this.y+5,this.w,this.h);
      pop();
    }
  }
}
