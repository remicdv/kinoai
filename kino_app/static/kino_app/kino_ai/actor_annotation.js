// Constructor initializes all variables
function ActorAnnotation(name='', tempX=0, tempY=0, tempW=0, tempH=0)  {
  this.x  = tempX;
  this.y  = tempY;
  this.w  = tempW;
  this.h  = tempH;
  this.on = false;

  this.actor_name = name;

  this.elem = setName(name);

  this.actions = [];

  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      this.on = true;
    } else {
      this.on = false;
    }

    for (let a of this.actions) {
      if(mx > a.x && mx < a.x + a.w && my > a.y && my < a.y + a.h) {
        a.on = true;
        a.drag_off = mx-a.x;
        a.drag_x = Math.max(this.x,Math.min(this.x+this.w,mx));
        if(mx < a.x+a.w/2) {
          a.side = 0;
        } else {
          a.side = 1;
        }
        if(keyCode===101) {
          a.ext = true;
        }
      } else {
        a.on = false;
      }
    }

  };

  this.drag = function(mx, my) {
    for (let a of this.actions) {
      if(a.on) {
        a.drag_x = Math.max(this.x,Math.min(this.x+this.w,mx));
      }
    }

  }

  this.drop = function(mx, my, curr_action) {
    let unit = this.w/annotation_timeline.total_frame;
    if (mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      if(curr_action.drag) {
        let drop_frame = Math.round(annotation_timeline.first+(mx-this.x)/unit);
        this.addAction(curr_action, drop_frame);
      }
    }
    for (let a of this.actions) {
      if(a.on) {
        if(a.drag_off != mx-a.x)
          video.time((annotation_timeline.first+(mx-this.x)/unit)/frame_rate);
        if(a.ext) {
          this.extendAction(a);
        } else {
          if(a.drag_off != mx-a.x)
            this.moveAction(a);
        }
      }
      if(a.drag_off != mx-a.x)
        a.on = false;
      a.ext = false;
      keyCode=0;
    }
    this.actions.sort(compare_x);
    this.updateAction(curr_action.name);
  }

  this.keyPressed = function(keyCode) {
    if(keyCode===83) {
      this.splitAction();
    }
    if(keyCode===46) {
      this.removeAction();
    }
  }

  function setName(name) {
    let t = createElement('h3', name);
    return t;
  }

  function compare_x(a,b) {
    if (a.x < b.x)
      return -1;
    if (a.x > b.x)
      return 1;
    return 0;
  }

  this.setPosition = function(tX, tY, tW, tH) {
    this.x  = tX;
    this.y  = tY;
    this.w  = tW;
    this.h  = tH;
  }

  this.setActorName = function(name) {
    this.actor_name = name;
  }

  this.extendAction = function(a) {
    let unit = this.w/annotation_timeline.total_frame;
    if(a.side == 0 && a.drag_x < a.x+a.w) {
      a.w = a.w+(a.x-a.drag_x);
      a.x = a.drag_x;
    } else if(a.side ==1 && a.drag_x > a.x) {
      a.w = a.drag_x - a.x;
    }
    a.first_frame = annotation_timeline.first+Math.round((a.x-this.x)/unit);
    a.end_frame = annotation_timeline.first+Math.round(((a.x+a.w)-this.x)/unit);
  }

  this.moveAction = function(a) {
    a.x = Math.max(Math.min(a.drag_x-a.drag_off,(this.x+this.w)-(a.w)),this.x);
    let unit = this.w/ annotation_timeline.total_frame;
    a.first_frame = annotation_timeline.first+Math.round((a.x-this.x)/unit);
    a.end_frame = annotation_timeline.first+Math.round(((a.x+a.w)-this.x)/unit);
  }

  this.splitAction = function() {
    for(let a of this.actions) {
      if(a.on) {
        if(frame_num > a.first_frame && frame_num <a.end_frame) {
          let new_a = {};
          new_a.x = a.x;
          new_a.first_frame = a.first_frame;
          new_a.end_frame = frame_num-1;
          let unit = this.w/total_frame;
          new_a.w = (this.x+(frame_num-1)*unit) - new_a.x;
          new_a.y = this.y;
          new_a.h = this.h;
          new_a.name = a.name;
          new_a.color = a.color;
          new_a.on =false;
          this.actions.push(new_a);
          a.first_frame = frame_num;
          a.x = this.x+frame_num*unit;
          a.w = (this.x+a.end_frame*unit) - a.x;
          a.on = false;
        }
      }
    }
  }

  this.removeAction = function() {
    for(let i=0; i<this.actions.length;i++) {
      if(this.actions[i].on) {
        this.actions.splice(i,1);
      }
    }
  }

  this.updateAction = function(name) {
    let ind = [];
    for(let i=0; i< this.actions.length-1;i++) {
      if(this.actions[i].name == name && annotation_timeline.first < this.actions[i].end_frame && annotation_timeline.last > this.actions[i].first_frame) {
        let j = i+1;
        let next;
        while(this.getNext(j, name) && this.actions[i].x+this.actions[i].w>this.actions[this.getNext(j, name)].x) {
          next = j;
          ind.push(next);
          j++;
        }
        if(next && this.actions[i].x+this.actions[i].w>this.actions[next].x) {
          this.actions[i].w = Math.max((this.actions[next].x+this.actions[next].w)-this.actions[i].x,this.actions[i].w);
          this.actions[i].end_frame = Math.max(this.actions[next].end_frame,this.actions[i].end_frame);
        }
      }
    }
    for(let i = ind.length-1; i >= 0; i--) {
      this.actions.splice(ind[i],1);
    }
  }

  this.getNext = function(ind, name) {
    let ret;
    for(let i=ind; i< this.actions.length;i++) {
      if(this.actions[i].name == name) {
        ret = i;
        break;
      }
    }
    return ret;
  }

  this.addAction = function(curr_action, drop_frame=undefined) {
    let fr = frame_num;
    if(drop_frame) {
      fr =drop_frame;
    }
    let b = true;
    for(let a of this.actions) {
      if(a.name == curr_action.name) {
        if(fr > a.first_frame && fr <a.end_frame) {
          b=false;
          break;
        }
      }
    }
    if(b) {
      let unit = this.w/annotation_timeline.total_frame;
      let act = {};
      if(fr-frame_rate>1) {
        act.x = this.x+(fr-frame_rate-annotation_timeline.first)*unit;
        act.first_frame = fr-frame_rate;
      } else {
        act.x = this.x;
        act.first_frame = 1;
      }
      if(fr+frame_rate<total_frame) {
        act.w = (2*frame_rate)*unit;
        act.end_frame = fr+frame_rate;
      } else {
        act.w = (this.x+this.w)-act.x;
        act.end_frame = total_frame;
      }
      act.y = this.y;
      act.h = this.h;
      act.name = curr_action.name;
      act.color = curr_action.color;
      act.on =false;
      this.actions.push(act);
    }
  }

  this.setAction = function(act) {
    this.setPosition(player.x, this.elem.elt.offsetTop+this.elem.elt.parentNode.offsetTop-can.elt.offsetTop-$('#div_wrap').scrollTop(),player.w,20);
    let unit = this.w/annotation_timeline.total_frame;
    act.x = this.x+act.first_frame*unit;
    act.w = (this.x+act.end_frame*unit)-act.x;
    act.y = this.y;
    act.h = this.h;
    act.on = false;
    this.actions.push(act);
  }

  this.updatePosZoom = function(a) {
    let unit = this.w / annotation_timeline.total_frame;
    let f = a.first_frame - annotation_timeline.first;
    let l = a.end_frame - annotation_timeline.first;
    a.x = this.x+Math.max(f*unit,0);
    a.w = Math.min(this.x+l*unit,this.x+this.w) - a.x;
  }

  // Draw the rectangle
  this.display = function(curr_action) {
    this.setPosition(player.x, this.elem.elt.offsetTop+this.elem.elt.parentNode.offsetTop-can.elt.offsetTop-$('#div_wrap').scrollTop(),player.w,20);
    if(this.y > this.elem.elt.parentNode.offsetTop-can.elt.offsetTop) {
      push();
      fill('grey');
      if(this.on) {
        fill(46,92,156);
      }
      rect(this.x, this.y, this.w, this.h);
      pop();
      for(let a of this.actions) {
        if(curr_action.name == a.name) {
          if(annotation_timeline.first < a.end_frame && annotation_timeline.last > a.first_frame) {
            this.updatePosZoom(a);
            push();
            a.y = this.y;
            if(a.on) {
              fill('white');
              let curr_x;
              let curr_w;
              let wi;
              if(a.ext) {
                if(a.side == 0 && a.drag_x < a.x+a.w) {
                  rect(a.drag_x, a.y, a.w+(a.x-a.drag_x), a.h);
                  curr_x = a.drag_x;
                  curr_w = a.w+(a.x-a.drag_x);
                } else if(a.side ==1 && a.drag_x > a.x) {
                  rect(a.x, a.y, a.drag_x-a.x, a.h);
                  curr_x = a.x;
                  curr_w = a.drag_x-a.x;
                }
                wi = Math.min(curr_w*0.4,10);
              } else {
                curr_x = Math.max(Math.min(a.drag_x-a.drag_off,(this.x+this.w)-(a.w)),this.x);
                wi = Math.min(a.w*0.4,10);
                curr_w = a.w;
                rect(curr_x, a.y, a.w, a.h);
              }
              stroke(0);
              line(curr_x, a.y+a.h/2, curr_x+curr_w, a.y+a.h/2);
              triangle(curr_x, a.y+a.h/2, curr_x+wi, a.y+a.h, curr_x+wi, a.y);
              triangle(curr_x+curr_w, a.y+a.h/2, curr_x+curr_w-wi, a.y+a.h, curr_x+curr_w-wi, a.y);
            } else {
              fill(a.color);
              rect(a.x, a.y, a.w, a.h);
            }
            pop();
          }
        }
      }
    }
  }
}
