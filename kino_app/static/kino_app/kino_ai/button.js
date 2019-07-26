// Constructor initializes all variables
function Button(tempX, tempY, tempRad)  {
  // Button location and size
  this.x  = tempX;
  this.y  = tempY;
  this.rad = tempRad;
  this.color = [255,255,255];
  // Is the button on or off?
  // Button always starts as off
  this.on = false;
  this.timer = 0;

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if (mx > this.x - this.rad && mx < this.x + this.rad && my > this.y - this.rad && my < this.y + this.rad) {
      this.setOnOff(!this.on);
    }
  };

  this.setOnOff = function(b) {
    this.on = b;
    if(this.on) {
      this.color = [0,0,0];
    } else {
      this.color = [255,255,255];
    }
  }

  this.setPosition = function(tx, ty) {
    this.x = tx;
    this.y = ty;
  }

  this.setTimer = function(t) {
    this.timer = t;
  }

  this.setRad = function(trad) {
    this.rad = trad;
  }

  // Draw the circle
  this.display = function() {
    push();
    fill(this.color[0],this.color[1],this.color[2]);
    ellipse(this.x,this.y,this.rad);
    pop();
  }
}
