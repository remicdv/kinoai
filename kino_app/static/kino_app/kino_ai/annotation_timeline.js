// Constructor initializes all variables
function AnnotationTimeline(tempX=0, tempY=0, tempW=0, tempH=0)  {
  this.x  = tempX;
  this.y  = tempY;
  this.w  = tempW;
  this.h  = tempH;
  this.on = false;

  this.scale = 1;

  this.total_frame = total_frame;

  this.move = true;

  this.actors_annotation = [];

  this.div_wrap = createDiv();
  this.div_wrap.style('overflow','auto');
  this.div_wrap.id('div_wrap');

  // this.input_act = createInput('');

  this.act_select = createSelect();
  this.act_select.option('Playing');
  this.act_select.option('Move');
  this.act_select.option('Speaking');
  this.act_select.option('Offstage');
  this.curr_action = {};
  this.curr_action.name = 'Playing';

  this.add_act_button = createButton('Add');
  this.add_act_button.mousePressed(addAction);

  this.nav_bar = {};
  //action creator editor

  //actor addition

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if(mx > this.curr_action.x && mx < this.curr_action.x + this.curr_action.w && my > this.curr_action.y && my < this.curr_action.y + this.curr_action.h) {
      this.curr_action.drag = true;
    }
    for(let a of this.actors_annotation) {
      a.click(mx, my);
    }
  };

  this.drop = function(mx, my) {
    for(let a of this.actors_annotation) {
      a.drop(mx, my, this.curr_action);
    }
    this.curr_action.drag = false;
  }

  this.drag = function(mx, my) {
    if(this.curr_action.drag) {
      this.curr_action.x  = mx;
      this.curr_action.y  = my;
    }
    for(let a of this.actors_annotation) {
      a.drag(mx,my);
    }
  }

  this.dragNavBar = function(mx, my) {
    if (mx > this.nav_bar.x && mx < this.nav_bar.x + this.nav_bar.w && my > this.nav_bar.y && my < this.nav_bar.y + this.nav_bar.h) {
      let unit = player.w / (this.last-this.first)*frame_rate;
      let time = (mx-player.x)/unit + (this.first/frame_rate);
      video.time(time);
    }
  }

  this.keyPressed = function(keyCode) {
    for(let a of this.actors_annotation) {
      a.keyPressed(keyCode);
    }
  }

  this.mouseWheel = function(event) {
    if(keyCode===122) {
      if(event.delta<0) {
        if(this.scale - 0.01 > 0) {
          this.scale -= 0.01;
          for(let a of this.actors_annotation) {
            for(let act of a.actions) {
              if(this.curr_action.name == act.name)
                act.on = false;
            }
          }
        }
      } else {
        if(this.scale + 0.01 <= 1) {
          this.scale += 0.01;
          for(let a of this.actors_annotation) {
            for(let act of a.actions) {
              if(this.curr_action.name == act.name)
                act.on = false;
            }
          }
        }
      }
    }
  }

  function addAction() {
    for(let a of annotation_timeline.actors_annotation) {
      if(a.on) {
        a.addAction(annotation_timeline.curr_action);
      }
    }
  }

  this.setWrap = function() {
    this.div_wrap.position(0,viewer_height+can.elt.offsetTop+40);
    this.div_wrap.size(mid_width, windowHeight-this.div_wrap.y-5);
  }

  this.setActSelect = function() {
    this.act_select.position(0, viewer_height+can.elt.offsetTop);
    this.act_select.changed(this.selectAction);

    this.add_act_button.position(140, viewer_height+can.elt.offsetTop);
    this.add_act_button.size(37);

    // this.input_act.position(mid_width/3*2, viewer_height+can.elt.offsetTop);
  }

  this.selectAction = function() {
    annotation_timeline.curr_action.name = this.value();
  }

  this.setCurrActionPosition = function(tX, tY, tW, tH) {
    this.curr_action.x  = tX;
    this.curr_action.y  = tY;
    this.curr_action.w  = tW;
    this.curr_action.h  = tH;
  }

  this.setPosition = function(tX, tY, tW, tH) {
    this.x  = tX;
    this.y  = tY;
    this.w  = tW;
    this.h  = tH;
  }

  this.setActorName = function(name) {
    this.actor_name = name;
    for(let t of this.tracks) {
      t.actor_name = name;
    }
  }

  this.drawCursor = function() {
    this.nav_bar.x = player.x;
    this.nav_bar.y = viewer_height+45;
    this.nav_bar.w = player.w;
    this.nav_bar.h = 5;
    push();
    stroke(255);
    strokeWeight(this.nav_bar.h );
    line(this.nav_bar.x, this.nav_bar.y, this.nav_bar.x+this.nav_bar.w, this.nav_bar.y);
    let unit = player.w / this.total_frame;
    this.nav_bar.cursor = player.x+(frame_num-this.first)*unit;
    noStroke();
    text(this.getTimeFrame(this.first), player.x, viewer_height+37);
    text(this.getTimeFrame(this.last), player.x+player.w-35, viewer_height+37);
    fill(0);
    ellipse(this.nav_bar.cursor,this.nav_bar.y,this.nav_bar.h*2);
    pop();
  }

  this.getTimeFrame = function(frame) {
    let mil = round_prec(((frame/frame_rate)%1)*100,0);
    let s = Math.floor((frame/frame_rate)%60);
    let m = Math.floor((frame/frame_rate/60));
    return ''+m+':'+s+':'+mil;
  }

  this.updateFirstLast = function() {
    this.total_frame = Math.round(total_frame*this.scale);
    let first=1;
    let last=total_frame;
    if(this.total_frame != total_frame) {
      first = Math.max(frame_num-this.total_frame/2,1);
      if(first == 1) {
        last = first + this.total_frame;
      } else {
        last = Math.min(frame_num+this.total_frame/2,total_frame);
        if(last == total_frame) {
          first = last - this.total_frame;
        }
      }
    }
    if((this.total_frame != this.last-this.first || (frame_num<this.first||frame_num>this.last)) || !this.first) {
      this.first = Math.round(first);
      this.last = Math.round(last);
    }
  }

  // Draw the rectangle
  this.display = function() {
    this.updateFirstLast();
    switch (this.curr_action.name){
      case 'Playing':
        this.curr_action.color = 'blue';
        break;
      case 'Move':
        this.curr_action.color = 'green';
        break;
      case 'Speaking':
        this.curr_action.color = 'yellow';
        break;
      case 'Offstage':
        this.curr_action.color = 'red';
        break;
      default:
        this.curr_action.color = 'white';
        break;
    }
    if(!this.curr_action.drag) {
      this.setCurrActionPosition(105,viewer_height+10, 25, 7);
    }
    push();

    this.drawCursor();
    fill(this.curr_action.color);
    rect(this.curr_action.x,this.curr_action.y, this.curr_action.w, this.curr_action.h);
    pop();
    for(let a of this.actors_annotation) {
      a.display(this.curr_action);
    }
  }
}
