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

  this.div_notes = createDiv();
  this.div_notes.style('overflow','auto');
  this.div_notes.id('div_notes');


  this.click = function(mx, my) {
    // Check to see if a point is inside the rectangle
    for(let n of this.notes) {
      if(this.div_notes.position().x<mx && mx<this.div_notes.position().x+n.elem.position().x+n.elem.size().width &&
      this.div_notes.position().y+n.elem.position().y-can.elt.offsetTop<my && my<this.div_notes.position().y+n.elem.position().y-can.elt.offsetTop+n.elem.size().height) {
        video.time(n.Time);
        break;
      }
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
      this.setDivSize();
      this.input_note.show();
      this.div_notes.show();
      this.select_note.show();
    } else {
      this.input_note.hide();
      this.div_notes.hide();
      this.select_note.hide();
    }
  }

  this.setDivSize = function() {
    this.div_notes.position(mid_width+(reframe_button.position().x-mid_width)/2,can.elt.offsetTop+70);
    this.div_notes.size((reframe_button.position().x-mid_width)/2-10,height-70);
    this.select_note.position(reframe_button.position().x-100,can.elt.offsetTop+10);
  }

  function addNote() {
    if(note_editor.select_note.elt.value == username) {
      let note = {};
      let b = false;
      for(let n of note_editor.notes) {
        if(n.Time == Math.floor(video.time())) {
          n.Text += "\n"+note_editor.input_note.value()+'';
          b = true;
          break;
        }
      }
      if(!b) {
        note.Text = note_editor.input_note.value()+'';
        note.Time = Math.floor(video.time());
        note_editor.notes.push(note);
      }
      note_editor.updateChilds();
      note_editor.input_note.value('');
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
  }
}
