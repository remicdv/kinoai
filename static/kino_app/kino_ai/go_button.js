// Constructor initializes all variables
function GoButton(tempW, tempH, t, g)  {
  // Button location and size
  // this.x  = tempX;
  // this.y  = tempY;
  this.w = tempW;
  this.h = tempH;
  // Is the button on or off?
  // Button always starts as off
  this.on = false;

  this.track = t;

  this.time = 0;

  this.elem = g;

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    var x1 = table_scroll.position().x+this.elem.position().x;
    var y1 = table_scroll.position().y+this.elem.position().y - table_scroll.elt.scrollTop;
    my += can.elt.offsetTop;

    if (my > table_scroll.position().y && mx > x1 && mx < x1 + this.w && my > y1 && my < y1 + this.h) {
      this.on = !this.on;
      video.time((this.track.first_frame+1)/frame_rate);
      video.pause();
      playing = false;
      for(let t of tracklets_line) {
        t.on = false;
      }
      this.track.on = true;
      // console.log(this.track.first_frame);
      // console.log(table_scroll.elt.scrollTop);
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
