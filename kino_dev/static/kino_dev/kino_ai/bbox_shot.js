// Constructor initializes all variables
function BboxShot(tempX, tempY, tempW, tempH)  {
  // Button location and size
  this.x  = tempX;
  this.y  = tempY;
  this.w = tempW;
  this.h = tempH;
  // Is the button on or off?
  // Button always starts as off
  this.on = false;

  this.center_x;
  this.center_y;

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      this.on = !this.on;
    }
  };

  this.setPosition = function(tx, ty) {
    this.x = tx;
    this.y = ty;
  }

  this.setDimension = function(tempW, tempH) {
    this.w = tempW;
    this.h = tempH;
  }

  this.setCenter = function(tx, ty) {
    this.center_x = tx;
    this.center_y = ty;
  }

  // Draw the rectangle
  this.display = function(act=undefined) {
    push();
    fill(255);
    if(act){
     text(act.actor_name, this.x, this.y-10);
    }
    noFill();
    strokeWeight(3);
    stroke('green');
    rect(this.x,this.y,this.w,this.h);
    stroke('blue');
    ellipse(this.center_x, this.center_y, 3);
    pop();
  }
}
