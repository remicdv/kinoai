// Constructor initializes all variables
function DragButton(tempX, tempY, tempW, tempH, t)  {
  // Button location and size
  this.x  = tempX;
  this.y  = tempY;
  this.w = tempW;
  this.h = tempH;
  // Is the button on or off?
  // Button always starts as off
  this.on = false;

  this.track = t;

  this.click = function(mx, my, i) {
    // Check to see if a point is inside the rectangle
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      this.on = !this.on;
      this.track.drag = true;
    }
  };

  this.setPosition = function(tx, ty) {
    this.x = tx;
    this.y = ty;
  }

  this.setRad = function(trad) {
    this.rad = trad;
  }

  this.setTrack = function(t) {
    this.track = t;
  }

  // Draw the rectangle
  this.display = function() {
    fill(255);
    ellipse(this.x,this.y,this.rad);
  }
}
