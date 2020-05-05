// Constructor initializes all variables
function AnnotationTimeline(tempX=0, tempY=0, tempW=0, tempH=0)  {
  this.x  = tempX;
  this.y  = tempY;
  this.w  = tempW;
  this.h  = tempH;
  this.on = false;

  this.scale = 1;

  this.move = true;

  this.actors_annotation = [];
  this.erase_button = [];

  this.div_wrap = createDiv();
  this.div_wrap.style('overflow','auto');
  this.div_wrap.id('div_wrap');
  this.div_wrap.hide();

  // this.input_act = createInput('');

  this.act_select = createSelect();
  this.act_select.option('Playing');
  this.act_select.option('Move');
  this.act_select.option('Speaking');
  this.act_select.option('Offstage');
  this.act_select.hide();
  this.curr_action = {};
  this.curr_action.name = 'Playing';


  this.add_act_button = createButton('Add');
  this.add_act_button.mousePressed(addAction);
  this.add_act_button.hide();

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
    for (var i = 0; i < this.erase_button.length; i++) {
      this.erase_button[i].on = false;
      this.erase_button[i].click(mouseX, mouseY);
      if(this.erase_button[i].on && this.erase_button[i]) {
        this.actors_annotation[i].elem.remove();
        this.actors_annotation.splice(i,1);
        this.erase_button.splice(i, 1);
      }
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

  this.keyPressed = function(keyCode) {
    for(let a of this.actors_annotation) {
      a.keyPressed(keyCode);
    }
  }

  this.mouseWheel = function(event) {
    if(keyCode===122) {
      for(let a of this.actors_annotation) {
        for(let act of a.actions) {
          if(this.curr_action.name == act.name)
            act.on = false;
        }
      }
    }
  }

  this.update = function(checked) {
    if(checked) {
      // preparation_editor.note_editor.update(false);
      // preparation_editor.is_note_book = false;
      // preparation_editor.note_book.checked(false);
      // $('#div_sub').hide();
      // preparation_editor.partition_editor.update(false);
      // preparation_editor.is_partition_editor = false;
      // preparation_editor.partition_check.checked(false);
      this.showAllElt();
      this.setWrap();
      this.setActSelect();
      preparation_editor.div_actors_timeline.hide();
    } else {
      this.sortActorAnnotation();
      preparation_editor.div_actors_timeline.show();
      this.hideAllElt();
    }
  }

  this.hideAllElt = function() {
    this.act_select.hide();
    this.div_wrap.hide();
    this.add_act_button.hide();
  }

  this.showAllElt = function() {
    act_input.show();
    this.div_wrap.show();
    this.act_select.show();
    this.add_act_button.show();
  }


  function addAction() {
    for(let a of preparation_editor.annotation_timeline.actors_annotation) {
      if(a.on) {
        a.addAction(preparation_editor.annotation_timeline.curr_action);
      }
    }
  }

  this.sortActorAnnotation = function() {
    this.actors_annotation.sort(compare_name);
    while(this.div_wrap.firstChild){this.div_wrap.firstChild.remove();}
    for(let a of this.actors_annotation) {
      this.div_wrap.child(a.elem);
    }
  }

  this.setWrap = function() {
    this.div_wrap.position(0,viewer_height+can.elt.offsetTop+45);
    this.div_wrap.size(mid_width, windowHeight-this.div_wrap.y-5);
  }

  this.setActSelect = function() {
    this.act_select.position(act_input.position().x+act_input.width+10, viewer_height+can.elt.offsetTop);
    this.act_select.changed(this.selectAction);

    this.add_act_button.position(this.act_select.position().x+this.act_select.elt.offsetWidth+50, viewer_height+can.elt.offsetTop);
    this.add_act_button.size(37);

    // this.input_act.position(mid_width/3*2, viewer_height+can.elt.offsetTop);
  }

  this.selectAction = function() {
    preparation_editor.annotation_timeline.curr_action.name = this.value();
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

  this.getTimeFrame = function(frame) {
    let mil = round_prec(((frame/frame_rate)%1)*100,0);
    let s = Math.floor((frame/frame_rate)%60);
    let m = Math.floor((frame/frame_rate/60));
    return ''+m+':'+s+':'+mil;
  }


  // Draw the rectangle
  this.display = function() {
    this.setWrap();
    this.setActSelect();
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
      this.setCurrActionPosition(this.act_select.position().x+this.act_select.elt.offsetWidth+10,viewer_height+10, 25, 7);
    }
    push();


    fill(this.curr_action.color);
    rect(this.curr_action.x,this.curr_action.y, this.curr_action.w, this.curr_action.h);
    pop();
    for(let i=0; i<this.actors_annotation.length; i++) {
      let a = this.actors_annotation[i];
      a.display(this.curr_action);
      this.erase_button[i].setPosition(mid_width+10, a.y+(a.h/2));
      this.erase_button[i].display();
    }
  }
}
