// Constructor initializes all variables
function NoteEditor(tempX=0, tempY=0, tempW=0, tempH=0)  {
  this.x  = tempX;
  this.y  = tempY;
  this.w  = tempW;
  this.h  = tempH;
  this.on = false;

  this.input_note = createInput();
  this.input_note.changed(addNote);
  this.input_note.hide();

  this.select_note = createSelect();

  this.notes = [];
  for(let note of json_data_note) {
    if(note.User == username)
      this.notes = note.Note;
    this.select_note.option(note.User);
  }
  this.select_note.elt.value = username;
  this.select_note.changed(selectAuthor);
  this.select_note.hide();

  this.div_notes = createDiv();
  this.div_notes.style('overflow','auto');
  this.div_notes.id('div_notes');

  this.div_sub;
  this.tab_sub = [];


  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    for(let n of this.notes) {
      if(this.div_notes.position().x<mx && mx<this.div_notes.position().x+n.elem.position().x+n.elem.size().width &&
      this.div_notes.position().y+n.elem.position().y-can.elt.offsetTop<my && my<this.div_notes.position().y+n.elem.position().y-can.elt.offsetTop+n.elem.size().height) {
        video.time(n.Time);
        break;
      }
    }

    for(let a of preparation_editor.actors_timeline) {
      a.click(mx, my);
    }
  };

  this.drop = function(mx, my) {

  }

  this.drag = function(mx, my) {

  }

  this.keyPressed = function(keyCode) {

  }

  this.mouseWheel = function(event) {

  }

  this.saveNote = function() {
    if(this.select_note.elt.value == username) {
      let tab = [];
      for(let n of this.notes) {
        if(n.Text!='') {
          tab.push({'Text':n.Text,'Time':n.Time});
        }
      }
      $.post({
        url: "save_note",
        async: true,
        data: {'abs_path': abs_path, 'notes':JSON.stringify(tab)},
        dataType: 'json',
        success: function (data) {
          // console.log(data);
        }
      });
    } else {
      alert('You have to select yout own notes');
    }
  }

  this.update = function(checked) {
    if(checked) {
      this.showAllElt();
      annotation_editor.partition_editor.update(false);
      annotation_editor.is_partition_editor = false;
      annotation_editor.partition_check.checked(false);
      act_input.hide();
      let div_creation = createDiv();
      div_creation.id('div_creation');
      div_creation.position(windowWidth-150,annotation_editor.partition_check.y+30);
      div_creation.size(150, height+can.elt.offsetTop-div_creation.position().y);
      for(let a of preparation_editor.actors_timeline) {
        a.on = false;
        a.elem.style('margin','5% 0 5% 0');
        a.elem.show();
        div_creation.child(a.elem.elt);
      }
    } else {

      this.hideAllElt();
      for(let a of preparation_editor.actors_timeline) {
        a.elem.remove();
        a.elem = createElement('h3', a.actor_name);
        a.elem.elt.contentEditable = 'true';
        a.elem.id('editor');
        preparation_editor.div_actors_timeline.child(a.elem);
      }

      // showAllElt();

    }
  }

  // Create the notebook and resize it
  this.resizeNoteBook = function() {
    let div_creation = select('#div_creation');
    if(!div_creation) {
      div_creation = createDiv();
      div_creation.id('div_creation');
      for(let a of actors_timeline) {
        a.on = false;
        a.elem.style('margin','5% 0 5% 0');
        div_creation.child(a.elem.elt);
      }
    }
    div_creation.position(windowWidth-150,annotation_editor.partition_check.y+30);
    div_creation.size(150, height+can.elt.offsetTop-div_creation.position().y);
    this.div_sub = select('#div_sub');
    // tab_sub = [];
    let cpt=0;
    for(let t of video.elt.textTracks) {
      if(t.mode == "showing" && cpt==0) {
        let i=0;
        cpt++;
        if(!this.div_sub) {
          this.tab_sub = [];
          this.div_sub = createDiv();
          this.div_sub.id('div_sub');
          this.div_sub.position(mid_width+10,can.elt.offsetTop);
          this.div_sub.size(((windowWidth - 160)-(mid_width+10))/2,height);
          for(let c of t.cues) {
            let obj = {};
            let p = createP(annotation_editor.partition_editor.parseTextAction(c.text));
            obj.p = p;
            obj.start = c.startTime;
            obj.end = c.endTime;
            this.tab_sub.push(obj);
            this.div_sub.child(p);
          }
        } else {
          this.div_sub.position(mid_width+10,can.elt.offsetTop);
          this.div_sub.size(((windowWidth - 160)-(mid_width+10))/2,height);
        }
      }
    }
  }

  // Show the subtitle next to the player and allow the user to navigate in the video
  this.showNoteBook = function() {
    if(!this.div_sub || this.div_sub.size().height!=height || mid_width != viewer_width) {
      this.resizeNoteBook();
    } else {
      if(this.tab_sub.length>1) {
        for(let s of this.tab_sub) {
          if(video.time() >= s.start && video.time() <= s.end) {
            s.p.style('color','red');
            let pos = s.p.position().y - ($('#div_sub').height()/2);
            if(!dash_player.isPaused())
              $('#div_sub').scrollTop(pos);
          } else {
            s.p.style('color','rgb(50,50,50)');
          }
          s.p.style('font-size','20');
        }
      }
    }
    // getShotsFromActs();
    montage_editor.splitScreen(montage_editor.getShotsFromActs());
  }

  this.hideAllElt = function() {
    this.input_note.hide();
    this.div_notes.hide();
    this.select_note.hide();
    for(let el of html_elements) {
      if(!el.side)
        el.hide();
    }
    if(this.div_sub) {
      $("#div_sub").remove();
      this.div_sub = undefined;
      this.tab_sub = [];
    }
  }

  this.showAllElt = function() {
    this.setDivSize();
    this.input_note.show();
    this.div_notes.show();
    this.select_note.show();
  }

  this.setDivSize = function() {
    this.div_notes.position(mid_width+((windowWidth - 160)-mid_width)/2,can.elt.offsetTop+70);
    this.div_notes.size(((windowWidth - 160)-mid_width)/2-10,height-70);
    this.select_note.position((windowWidth - 160)-100,can.elt.offsetTop+10);
    this.select_note.size((windowWidth - 160)-this.select_note.x-15);
  }

  function addNote() {
    if(annotation_editor.note_editor.select_note.elt.value == username) {
      let note = {};
      let b = false;
      for(let n of annotation_editor.note_editor.notes) {
        if(n.Time == Math.floor(video.time())) {
          n.Text += "\n"+annotation_editor.note_editor.input_note.value()+'';
          b = true;
          break;
        }
      }
      if(!b) {
        note.Text = annotation_editor.note_editor.input_note.value()+'';
        note.Time = Math.floor(video.time());
        annotation_editor.note_editor.notes.push(note);
      }
      annotation_editor.note_editor.updateChilds();
      annotation_editor.note_editor.input_note.value('');
    } else {
      alert("Select your notes before editing")
    }
  }

  function selectAuthor() {
    for(let note of json_data_note) {
      if(note.User == this.elt.value)
        note_editor.notes = note.Note;
    }
    note_editor.updateChilds(this.elt.value);
  }

  this.updateChilds = function(name=username) {
    $('#div_notes').empty();
    this.notes.sort(compareTime);
    for(let note of this.notes) {
      let div = createDiv();
      let p = createP(note.Text);
      p.style('font-size','20');
      let h3 = createElement('h3',this.getTimeFrame(note.Time));
      if(name == username)
        p.elt.contentEditable = true;
      note.elem = p;
      div.child(h3);
      div.child(p);
      this.div_notes.child(div);
    }
  }

  this.getTimeFrame = function(sec) {
    let s = sec%60;
    let m = Math.floor((sec/60));
    return ''+m+':'+s;
  }

  function compareTime(a,b) {
    if (a.Time < b.Time)
      return -1;
    if (a.Time > b.Time)
      return 1;
    return 0;
  }

  // Draw the rectangle
  this.display = function() {
    if(this.div_notes.size().height!=height) {
      this.setDivSize();
      this.input_note.position(this.div_notes.position().x+10,can.elt.offsetTop+45);
      this.input_note.size(this.div_notes.size().width-15);
    }
    for(let note of this.notes) {
      note.Text = note.elem.elt.innerText;
    }
    push();
    stroke(0);
    line(this.div_notes.position().x+5,0,this.div_notes.position().x+5,height);
    noStroke();
    textSize(20);
    fill(50);
    text('Add a note :',this.div_notes.position().x+10,30);
    text(this.getTimeFrame(Math.floor(video.time())),this.div_notes.position().x+130,30);
    // let i =0;
    // for(let note of this.notes) {
    //   text(this.getTimeFrame(note.Frame)+'  '+note.Text, mid_width+10, 200+i*20);
    // }
    pop();
    push();
    fill(150);
    rect(0,viewer_height,mid_width,windowHeight-viewer_height);
    pop();
    this.showNoteBook();
  }
}
