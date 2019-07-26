// Constructor initializes all variables
function EraseButton(ind, tempX=0, tempY=0, tempRad = 10)  {

  // Is the button on or off?
  // Button always starts as off

  this.x = tempX;
  this.y = tempY;

  this.rad = tempRad;

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if (mx > this.x - this.rad && mx < this.x + this.rad && my > this.y - this.rad && my < this.y + this.rad) {
      this.on = !this.on;
    }
  };

  this.setPosition = function(tX, tY) {
    this.x = tX;
    this.y = tY;
  }

  this.setRad = function(ra) {
    this.rad = ra;
  }
  // Draw the rectangle
  this.display = function() {
    push();
    fill('red');
    ellipse(this.x,this.y,this.rad);
    pop();
  }

}
