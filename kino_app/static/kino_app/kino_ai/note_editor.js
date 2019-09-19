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

  this.div_notes = createDiv();
  this.div_notes.style('overflow','auto');
  this.div_notes.id('div_notes');

  this.notes = data_note;

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
  }

  this.update = function(checked) {
    if(checked) {
      this.setDivSize();
      this.input_note.show();
      this.div_notes.show();
    } else {
      this.input_note.hide();
      this.div_notes.hide();
    }
  }

  this.setDivSize = function() {
    this.div_notes.position(mid_width+(reframe_button.position().x-mid_width)/2,can.elt.offsetTop+60);
    this.div_notes.size((reframe_button.position().x-mid_width)/2,height-60);
  }

  function addNote() {
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
  }

  this.updateChilds = function() {
    $('#div_notes').empty();
    this.notes.sort(compareTime);
    for(let note of this.notes) {
      let div = createDiv();
      let p = createP(note.Text);
      let h3 = createElement('h3',this.getTimeFrame(note.Time));
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
      this.input_note.position(this.div_notes.position().x+130,can.elt.offsetTop+15);
      this.input_note.size(this.div_notes.size().width/2);
    }
    for(let note of this.notes) {
      note.Text = note.elem.elt.innerText;
    }
    push();
    stroke(0);
    line(this.div_notes.position().x+5,0,this.div_notes.position().x+5,height);
    noStroke();
    textSize(15);
    fill(120);
    text('Add a note :',this.div_notes.position().x+10,30);
    text(this.getTimeFrame(Math.floor(video.time())),this.div_notes.position().x+100,30);
    // let i =0;
    // for(let note of this.notes) {
    //   text(this.getTimeFrame(note.Frame)+'  '+note.Text, mid_width+10, 200+i*20);
    // }
    pop();
  }
}
