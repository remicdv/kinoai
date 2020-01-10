// Constructor initializes all variables
function PartitionEditor()  {

  this.div_partition_saved = createDiv();
  this.div_partition_saved.hide();
  this.textarea_current_partition = createElement('textarea');
  this.textarea_current_partition.hide();

  this.partitions_saved = [];

  this.history_partitions = [];

  this.duration = video.duration();

  this.curr_start = 0;

  this.curr_end;

  this.curr_speaker;

  this.curr_repeat;

  this.click = function(mx, my) {

    for(let p of this.partitions_saved) {
      let y_time = p.TimeElt.elt.offsetTop - this.div_partition_saved.elt.scrollTop;
      let h_time = p.TimeElt.height;
      if(p.x && p.w && mx > p.x && mx < p.x + p.w && my > player.y+70 && my < player.y+170) {
        p.on = true;
        p.TextElt.style('color','red');
        video.time(p.Start);
      } else if(mx > mid_width && mx < mid_width + p.TimeElt.width && my > y_time && my < y_time+h_time) {
        p.on = true;
        p.TextElt.style('color','red');
        video.time(p.Start);
      } else {
        p.on = false;
        p.TextElt.style('color',p.color);
      }
    }

  };

  this.drop = function(mx, my) {

  }

  this.drag = function(mx, my) {

  }

  this.keyPressed = function(keyCode) {
    if(keyCode == 46) {
      this.removeSub();
    }
    if(keyCode == 85) {
      this.undoRemove();
    }
  }

  this.removeSub = function() {
    for(let i=0; i<this.partitions_saved.length;i++) {
      let curr = this.partitions_saved[i];
      if(curr.on) {
        let next = this.partitions_saved[i+1];
        let prec = this.partitions_saved[i-1];
        curr.prev_index = i;
        if(prec && next) {
          prec.End = (curr.Start + curr.End)/2;
          next.Start = (curr.Start + curr.End)/2;
        } else if(!prec && next) {
          next.Start = 0;
        }
        this.history_partitions.push(curr);
        this.partitions_saved.splice(i, 1);
        this.updateRemoveUndo();
      }
    }
  }

  this.undoRemove = function() {
    if(this.history_partitions.length!=0) {
      let p = this.history_partitions.pop();
      this.partitions_saved.splice(p.prev_index, 0, p);
      let next = this.partitions_saved[p.prev_index+1];
      let prec = this.partitions_saved[p.prev_index-1];
      if(next) {
        next.Start = p.End;
      }
      if(prec) {
        prec.End = p.Start;
      }
      this.updateRemoveUndo();
    }
  }

  this.updateRemoveUndo = function() {
    while(this.div_partition_saved.elt.firstChild){this.div_partition_saved.elt.firstChild.remove();}
    for(let p of this.partitions_saved) {
      this.updatePartitionSaved(p);
    }
    this.setDivSizePos();
  }

  this.mouseWheel = function(event) {
    if(keyIsPressed && keyCode == 116) {
      for(let i=0; i<this.partitions_saved.length; i++) {
        let p = this.partitions_saved[i];
        let y_time = p.TimeElt.elt.offsetTop - this.div_partition_saved.elt.scrollTop;
        let h_time = p.TimeElt.height;
        if(mouseX > mid_width && mouseX < mid_width + p.TimeElt.width && mouseY > y_time && mouseY < y_time+h_time) {
          event.preventDefault();
          p.on = true;
          p.TextElt.style('color','red');
          this.updateTime(p, event.deltaY, i);
        } else {
          p.on = false;
          p.TextElt.style('color',p.color);
        }
      }
    }
  }

  $(document).bind('keydown', function(e) {
    if(e.ctrlKey && (e.which == 13)) {
      e.preventDefault();
      partition_editor.savePartition();
    }
    if(e.ctrlKey) {
      let element = partition_editor.textarea_current_partition.elt;
      for(let i=0; i<actors_timeline.length; i++) {
        if(e.keyCode == 49+i) {
          e.preventDefault();
          element.value += '   '+actors_timeline[i].actor_name.toUpperCase()+'\n';
          partition_editor.curr_speaker = actors_timeline[i];
          element.focus();
          element.setSelectionRange(element.value.length,element.value.length);
        }
      }
    }
    if(e.ctrlKey && (e.which == 32)) {
      e.preventDefault();
      if(playing)
        dash_player.pause();
      else {
        dash_player.play();
        img_hd = undefined;
        partition_editor.curr_repeat = video.time();
      }
      playing = !playing;
    }
    if(e.ctrlKey && (e.which == 82)) {
      e.preventDefault();
      video.time(partition_editor.curr_repeat);
      dash_player.play();
      playing = true;
    }
    if(e.ctrlKey && (e.which == 76)) {
      e.preventDefault();
      video.time(partition_editor.getPrecTime());
      dash_player.play();
      playing = true;
    }
    if(e.ctrlKey && (e.which == 77)) {
      e.preventDefault();
      video.time(partition_editor.getNextTime());
      dash_player.play();
      playing = true;
    }
    if(e.ctrlKey && (e.which == 37)) {
      e.preventDefault();
      video.time(video.time()-0.05);
    }
    if(e.ctrlKey && (e.which == 39)) {
      e.preventDefault();
      video.time(video.time()+0.05);
    }
  });

  this.getPrecTime = function() {
    let off = video.duration();
    let time = 0;
    for(let p of this.partitions_saved) {
      if(video.time() > p.End && off > video.time() - p.End) {
        off = video.time() - p.End;
        time = p.Start;
      }
    }
    return time;
  }

  this.getNextTime = function() {
    let off = video.duration();
    let time = 0;
    for(let p of this.partitions_saved) {
      if(video.time() < p.Start && off > abs(video.time() - p.Start)) {
        off = abs(video.time() - p.Start);
        time = p.Start;
      }
    }
    return time;
  }



  this.updateTime = function(part, delta, i) {
    if(delta<0) {
      if(this.partitions_saved[i+1]) {
        let next = this.partitions_saved[i+1];
        if(part.End + 0.5 < next.End) {
          part.End += 0.5;
          next.Start = part.End;
          part.TimeElt.elt.innerText = this.timeToString(part.Start)+'  ==>  '+this.timeToString(part.End);
          next.TimeElt.elt.innerText = this.timeToString(next.Start)+'  ==>  '+this.timeToString(next.End);
        }
      } else {
        part.End += 0.5;
        part.End = Math.min(this.duration, part.End);
        part.TimeElt.elt.innerText = this.timeToString(part.Start)+'  ==>  '+this.timeToString(part.End);
      }
    } else {
      if(this.partitions_saved[i+1]) {
        let next = this.partitions_saved[i+1];
        if(part.End -0.5 > part.Start) {
          part.End -= 0.5;
          next.Start = part.End;
          part.TimeElt.elt.innerText = this.timeToString(part.Start)+'  ==>  '+this.timeToString(part.End);
          next.TimeElt.elt.innerText = this.timeToString(next.Start)+'  ==>  '+this.timeToString(next.End);
        }
      } else {
        if(part.End -0.5 > part.Start) {
          part.End -= 0.5;
          part.TimeElt.elt.innerText = this.timeToString(part.Start)+'  ==>  '+this.timeToString(part.End);
        }
      }
    }
  }

  this.update = function(checked) {
    if(checked) {
      note_editor.update(false);
      is_note_book = false;
      note_book.checked(false);
      $('#div_sub').hide();
      if(table_scroll){
        table_scroll.hide();
      }
      for(let act of actors_timeline) {
        act.elem.hide();
      }
      for(let el of html_elements) {
        if(!el.side)
          el.hide();
      }
      this.div_partition_saved.show();
      this.textarea_current_partition.show();
      this.setDivSizePos();
    } else {
      for(let el of html_elements) {
        if(!el.side)
          el.show();
      }
      this.div_partition_saved.hide();
      this.textarea_current_partition.hide();
    }
  }

  this.setDivSizePos = function() {
    if(this.partitions_saved.length>0) {
      this.div_partition_saved.show();
      this.div_partition_saved.position(mid_width,can.elt.offsetTop);
      this.div_partition_saved.size(reframe_button.position().x-mid_width-20);
      this.div_partition_saved.style('margin','0 10');
      this.textarea_current_partition.size(reframe_button.position().x-mid_width-20,150);
      let new_h = height-(this.textarea_current_partition.height*1.5);
      if(this.div_partition_saved.elt.offsetHeight > new_h) {
        this.div_partition_saved.size(reframe_button.position().x-mid_width-20,new_h);
        this.div_partition_saved.style('overflow','auto');
      }
      this.textarea_current_partition.position(mid_width+10,this.div_partition_saved.position().y+this.div_partition_saved.elt.offsetHeight+60);
    } else {
      this.div_partition_saved.hide();
      this.textarea_current_partition.position(mid_width+10,can.elt.offsetTop+60);
      this.textarea_current_partition.size(reframe_button.position().x-mid_width-20,150);
    }
    this.textarea_current_partition.style('background','rgb(150,150,150)');
    this.textarea_current_partition.style('overflow','auto');
    this.textarea_current_partition.style('font-size','15');
    this.textarea_current_partition.style('resize','none');
  }

  this.savePartition = function() {
    //Parse <>
    if(this.curr_end > this.curr_start) {
      let partition_obj = {};
      partition_obj.Start = round_prec(this.curr_start,2);
      partition_obj.End = round_prec(this.curr_end,2);
      partition_obj.Text = this.textarea_current_partition.elt.value;
      if(this.curr_speaker) {
        partition_obj.Speaker = this.curr_speaker.actor_name;
        partition_obj.color = this.curr_speaker.color;
      } else {
        partition_obj.Speaker = "Unknown";
        partition_obj.color = 'black';
      }
      this.partitions_saved.push(partition_obj);
      this.textarea_current_partition.elt.value = "";
      this.curr_start = this.curr_end;
      this.updatePartitionSaved(partition_obj);
      this.setDivSizePos();
    } else {
      alert("A subtitle can't finished before it starts");
    }
  }

  this.savePartitionTimeline = function() {
    let tab = [];
    let tab_json = [];
    for(let p of this.partitions_saved) {
      if(p.Text && p.Text != '<br>') {
        let obj = {};
        obj.start = p.Start;
        obj.end = p.End;
        obj.text = p.Text;
        tab.push(obj);
        obj.speaker = p.Speaker;
        obj.color = p.color;
        tab_json.push(obj);
      }
    }
    $.post({
      url: "save_partitions",
      async: true,
      data: {'abs_path': abs_path, 'partitions':JSON.stringify(tab), 'partitions_json':JSON.stringify(tab)},
      dataType: 'json',
      success: function (data) {
        // console.log(data);
      }
    });
  }

  this.loadSubtitle = function() {
    if(this.partitions_saved.length==0) {
      this.partitions_saved = [];
      this.div_partition_saved.remove();
      this.div_partition_saved = createDiv();
      if (video.elt.textTracks.length>0) {
        let i=0;
        for(let t of video.elt.textTracks) {
          if(t.mode == "showing" && i==video.elt.textTracks.length-1) {
            for(let c of t.cues) {
              let obj = {};
              obj.Start = c.startTime;
              obj.End = c.endTime;
              obj.Text = c.text;
              obj.Speaker = "Unknown";
              obj.color = 'black';
              this.partitions_saved.push(obj);
              this.updatePartitionSaved(obj);
              this.setDivSizePos();
              this.curr_start = c.endTime;
            }
          }
          i++;
        }
      }
      this.setDivSizePos();
    }
    if(!is_partition_editor)
      this.div_partition_saved.hide();
  }

  this.loadPartition = function() {
    if(data_partitions) {
      for(let p of Object.values(data_partitions)) {
        let obj = {};
        obj.Start = p.start;
        obj.End = p.end;
        obj.Text = p.text;
        obj.Speaker = p.speaker;
        obj.color = p.color;
        this.partitions_saved.push(obj);
        this.updatePartitionSaved(obj);
        this.setDivSizePos();
        this.curr_start = p.end;
      }
      this.setDivSizePos();
    }
    if(!is_partition_editor)
      this.div_partition_saved.hide();
  }

  function changeText() {
    for(let p of partition_editor.partitions_saved) {
      if(p.TextElt.elt === this) {
        p.Text = partition_editor.parseActionText(this.innerHTML);
        partition_editor.setDivSizePos();
      }
    }
  }

  this.parseTextAction = function(text) {
    return text.replace(/</g,'<i').replace(/>/g,'</i>').replace(/<i/g,'<i>');
  }

  this.parseActionText = function(text) {
    return text.replace(/<i>/g,'<').replace(/<\/i>/g,'>');
  }

  this.updatePartitionSaved = function(part) {
    let h3 = createElement('h3',this.timeToString(part.Start)+'  ==>  '+this.timeToString(part.End));
    let p = createP(part.Text);
    p.elt.innerHTML = this.parseTextAction(part.Text).replace(/\n/g,'<br>');
    p.elt.contentEditable = true;
    p.elt.onchange = changeText;
    part.TimeElt = h3;
    part.TextElt = p;
    this.div_partition_saved.child(h3);
    this.div_partition_saved.child(p);
  }

  this.displayParts = function() {
    for(let p of this.partitions_saved) {
      let unit = player.w/this.duration;
      if(p.End >= annotation_timeline.first_time && p.Start <= annotation_timeline.last_time) {
        let s = Math.max(p.Start - annotation_timeline.first_time,0);
        let e = Math.min(p.End - annotation_timeline.first_time,this.duration);
        push();
        fill('#2E5C9C');
        if(p.on) {
          fill(170,56,35);
        }
        stroke('yellow');
        rect(player.x + s*unit,player.y+70,e*unit-s*unit,100);
        p.x = player.x + s*unit;
        p.w = e*unit-s*unit;
        pop();
      }
      if(video.time() < p.End && p.Start < video.time()) {
        p.TextElt.style('color','red');
      } else {
        p.TextElt.style('color',p.color);
      }
    }
  }

  this.timeToString = function(time) {
    let min = toTwoDigit(Math.floor(time/60).toString());
    let sec = toTwoDigit(Math.floor(time%60).toString());
    let mil = toTwoDigit(round_prec((time%1)*100,0).toString());
    return min +':'+sec+'.'+mil;
  }

  this.display = function() {

    this.duration = (annotation_timeline.total_frame/frame_rate);
    annotation_timeline.updateFirstLast();
    annotation_timeline.drawCursor();

    this.curr_end = video.time();
    push();
    let off_y = this.textarea_current_partition.position().y-175;
    fill(255);
    rect(player.x,player.y+70,player.w,100);
    fill('grey');
    rect(player.x,player.y+70,annotation_timeline.nav_bar.cursor-player.x,100);
    fill(0);
    textSize(20);
    text('Start : '+this.timeToString(this.curr_start),mid_width+10,off_y);
    text('End : '+this.timeToString(this.curr_end),mid_width+160,off_y);
    pop();
    this.displayParts();
  }
}
