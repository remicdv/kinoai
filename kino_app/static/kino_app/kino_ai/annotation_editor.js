// Constructor initializes all variables
function AnnotationEditor()  {

  this.note_editor = new NoteEditor();
  this.partition_editor = new PartitionEditor();

  this.note_book = createCheckbox('Note book', false);
  this.note_book.mouseOver(processToolTip('Show the note book and the reframed shots'));
  this.note_book.mouseOut(processToolTip(''));
  html_elements.push(this.note_book);
  this.note_book.size(150,30);
  this.note_book.changed(updateNoteBook);

  this.partition_check = createCheckbox('Partition', false);
  this.partition_check.mouseOver(processToolTip('Show the partition editor'));
  this.partition_check.mouseOut(processToolTip(''));
  html_elements.push(this.partition_check);
  this.partition_check.size(150,30);
  this.partition_check.changed(updatePartition);

  this.is_note_book = false;
  this.is_note_editor = false;
  this.is_partition_editor = false;

  this.mousePressed = function(mx, my) {
    if(this.is_partition_editor) {
      this.partition_editor.click(mouseX, mouseY);
    }

    if(this.is_note_book && this.note_editor.div_sub) {
      for(let s of this.note_editor.tab_sub) {
        var y1 = s.p.position().y - this.note_editor.div_sub.elt.scrollTop;
        if(mouseX>this.note_editor.div_sub.position().x && mouseX <this.note_editor.div_sub.position().x+this.note_editor.div_sub.width && mouseY>y1 && mouseY <y1+s.p.height) {
          video.time(s.start);
        }
      }
      this.note_editor.click(mouseX,mouseY);
    } else if (this.is_note_book) {
      this.note_editor.click(mouseX,mouseY);
    }
  };

  this.drop = function(mx, my) {

  }

  this.drag = function(mx, my) {

  }

  this.keyPressed = function(keyCode) {
    if(this.is_partition_editor) {
      this.partition_editor.keyPressed(keyCode);
    }

  }

  this.mouseWheel = function(event) {
    this.partition_editor.mouseWheel(event);
  }

  this.updateAndShow = function(checked) {
    resetTabs();
    is_annotation_editor = true;
    clickTab(annotation_editor_button);
    this.showElts();
    // act_input.show();
    // Side el
    check_render_pose.show();
    check_render_shot_trace.show();
    submit.show();
    reset_pos.show();
    hide_show_header_button.show();
    updateSideElems();
    up_rough = true;
  }

  this.hideElts = function() {
    this.note_editor.hideAllElt();
    this.partition_editor.hideAllElt();
    this.note_editor.hideAllElt();
    this.note_book.hide();
    this.partition_check.hide();
    this.note_editor.update(false);
    this.is_note_book = false;
    this.note_book.checked(false);
    $('#div_sub').hide();
    this.partition_editor.update(false);
    this.is_partition_editor = false;
    this.partition_check.checked(false);
  }

  this.showElts = function() {
    this.note_book.show();
    this.partition_check.show();
    this.note_editor.update(true);
    this.is_note_book = true;
    this.note_book.checked(true);
  }

  this.resizeElt = function() {
  }

  this.loadAnnotationEditorData = function() {
    this.partition_editor.loadPartition();
    this.note_editor.updateChilds();

  }


  function updateNoteBook() {
    annotation_editor.is_note_book = this.checked();
    annotation_editor.is_note_editor = this.checked();
    annotation_editor.note_editor.update(annotation_editor.is_note_editor);
  }

  function updatePartition() {
    annotation_editor.is_partition_editor = this.checked();
    annotation_editor.partition_editor.update(annotation_editor.is_partition_editor);
  }

  this.display = function() {
    push();
    if(x_off<0){x_off=0;}
    if(y_off<0){y_off=0;}
    translate(x_off,y_off);
    scale(vid_h/Number(original_height));
    // console.log(x_off,y_off,viewer_width/Number(original_width));
    if(this.is_note_book) {
      preparation_editor.displayTrackBBox();
    }
    preparation_editor.drawTracklets();
    if(is_shots_frame_layout) {
      montage_editor.drawShotsLayout();
    }
    pop();
    if (this.is_partition_editor) {
      this.partition_editor.display();
    } else if (this.is_note_book) {
      this.note_editor.display();
    }
  }
}
