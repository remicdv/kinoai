// Constructor initializes all variables
function Player(tempX, tempY, tempW, tempH, tempDur, tempRate, tempXCursor = 0)  {
  // Button location and size
  this.x  = tempX;
  this.y  = tempY;
  this.w  = tempW;
  this.h  = tempH;
  this.frame_rate = tempRate;

  this.on = false;

  this.x_cursor = tempXCursor;

  this.duration = tempDur;

  this.time = 0;

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      var unit = this.w/this.duration;
      this.time= (mx-this.x)/unit;
      this.on = true;
    }
  };

  this.drag = function(mx, my) {
    var t = undefined;
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      var unit = this.w/this.duration;
      t = (mx-this.x)/unit;
    }
    return t;
  }

  this.setPosition = function(tx, ty) {
    this.x = tx;
    this.y = ty;
  }

  this.setTimer = function(t) {
    this.time = t;
  }

  this.setXCursor = function(tx) {
    this.x_cursor = tx;
  }


  this.drawCursor = function() {
    push();
    fill(12,156,37);
    ellipse(this.x_cursor,this.y+(this.h/2),15);
    fill(0);
    ellipse(this.x_cursor,this.y+(this.h/2),7);
    pop();
  }

  this.drawSub = function() {
    let text_tracks = video.elt.textTracks;
    let cpt = 0;
    for(let t of text_tracks) {
      if(t.mode == "showing") {
        cpt++;
      }
    }
    let i = 0;
    for(let t of text_tracks) {
      if(t.mode == "showing") {
        let final_text = "";
        for(let c of t.cues) {
          if(video.time() >= c.startTime && video.time() <= c.endTime) {
            final_text += (c.text+"\n");
          }
        }
        push();
        fill(255);
        textSize(25);
        textAlign(CENTER);
        let region_width = this.w/cpt;
        let off_h = 24 * (Math.ceil(textWidth(final_text)/ (this.w/2))+(final_text.split(/\r\n|\r|\n/).length-1));
        text(final_text, this.x + region_width*i, this.y-off_h, region_width, off_h);
        pop();
        i++;
      }
    }
  }

  // Draw the rectangle
  this.display = function() {
    this.drawSub();
    push();
    stroke(120);
    strokeWeight(this.h);
    strokeCap(ROUND);
    line(this.x, this.y+(this.h/2), this.x+this.w, this.y+(this.h/2));
    stroke(50,50,123);
    line(this.x, this.y+(this.h/2), this.x_cursor, this.y+(this.h/2));
    pop();
    this.drawCursor();
  }
}
