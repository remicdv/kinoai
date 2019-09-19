// Constructor initializes all variables
function EraseButton(ind, tempX=0, tempY=0, tempRad = 5)  {

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
    if(this.y > div_actors_timeline.elt.offsetTop-can.elt.offsetTop) {
      push();
      stroke('red');
      strokeWeight(3);
      let x1=this.x-this.rad;
      let y1=this.y-this.rad;
      let x2=this.x+this.rad;
      let y2=this.y+this.rad;
      line(x1,y1,x2,y2);
      line(x1,y2,x2,y1);
      pop();
    }
  }

}
