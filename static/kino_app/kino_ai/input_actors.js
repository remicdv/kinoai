// Constructor initializes all variables
function Input_Actor(track, tempX=300, tempY=0)  {

  // Is the button on or off?
  // Button always starts as off
  this.input = createInput();

  this.input.position(tempX, tempY);

  this.track = track;

  this.setPosition = function(tX, tY) {
    this.input.position(tX, tY);
  }

  this.setTrack = function(track) {
    this.track = track;
  }

  // Draw the rectangle
  this.display = function() {
    this.input.show();
  }

  this.newName = function(new_name) {
    // if(new_name) {
      this.track.setActorName(new_name);
    //   return true;
    // }
    // return false;
  }
}
