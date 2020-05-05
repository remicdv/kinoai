// Constructor initializes all variables
function Shot()  {

  this.x  = 0;
  this.y  = 0;
  this.w  = 0;
  this.h  = 0;

  this.bboxes = [];

  this.bbox_show = [];

  this.type;

  this.start_frame;

  this.start;

  // this.img_start;

  this.aspect_ratio;

  this.end_frame;

  this.end;

  this.is_intersect = false;

  this.is_stage_position = true;

  this.is_gaze_direction = true;

  this.actors_involved = [];

  this.on = false;

  this.drag;

  this.in_stabilize = false;

  this.accuracy_rate;

  this.click = function(mx, my) {
    if(!(!montage_editor.is_show_context && this.type == 'WS') && (this.type == cadrage_editor.shot_type || montage_editor.is_all_types) && mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h) {
      this.on = !this.on;
      if(this.on && !this.in_stabilize) {
        this.drag = true;
      }
      if(is_montage_editor && keyIsPressed && keyCode == 17) {
        shots_timeline.addShotOnCursor(this);
      }
      if(is_montage_editor && keyIsPressed && keyCode == 16) {
        shots_timeline.replaceShot(this);
      }
      if(crop_button.on) {
        show_shot = this;
      }
    }
  }

  this.draggin = function(mx, my) {
    if(this.drag) {
      this.x = mx - this.w/2;
      this.y = my - this.h/2;
      if(mx > shots_timeline.x && mx < shots_timeline.x + shots_timeline.w && my > shots_timeline.y && my < shots_timeline.y + shots_timeline.h) {
        this.x = mx;
        this.y = my;
        this.w /= 2;
        this.h /= 2;
      }
    }
  }

  this.showInViewer = function(mx, my) {
    if(this.bbox_show.length>1 && mx > this.bbox_show[0] && mx < this.bbox_show[0]+this.bbox_show[2] && my > this.bbox_show[1] && my < this.bbox_show[1]+this.bbox_show[3]) {
      // console.log('show ',this.type, mx, my);
      return true;
    } else {
      return false;
    }
  }

  this.equalTo = function(s, updated=true) {
    let b = false;
    let act_inv = this.actors_involved;
    let type = this.type;
    let s_act_inv = s.actors_involved;
    let s_type = s.type;
    if(updated) {
      act_inv = this.getUpdateActInvolved();
      type = this.getUpdatedSizeShot(this.getCurrStabShot(frame_num)[3]);
      s_act_inv = s.getUpdateActInvolved();
      s_type = s.getUpdatedSizeShot(s.getCurrStabShot(frame_num)[3]);
    }
    if(s.aspect_ratio == this.aspect_ratio && s_type == type && s.is_intersect == this.is_intersect && s.is_stage_position == this.is_stage_position && s.is_gaze_direction == this.is_gaze_direction) {
      let b1 = true;
      for(let name of s_act_inv) {
        if(!act_inv.includes(name)) {
          b1 = false;
          break;
        }
      }
      if(b1 && s_act_inv.length == act_inv.length) {
        b = true;
      }
    }

    return b;
  }

  this.getBBoxShotAdapted = function(keypoints, shot_factor, curr_bbox = undefined, c_x = undefined, c_y = undefined) {
    if(keypoints == undefined && !curr_bbox) {
      var bbox = [0,0,Number(original_height),Number(original_height)];
      // console.log(bbox);
    } else {
      var cx;
      var cy;
      var oppbbox;
      if(curr_bbox && c_x && c_y) {
        cx = c_x;
        cy = c_y;
        oppbbox = curr_bbox;
      } else {
        cx = keypoints[1*3];
        cy = keypoints[1*3+1];
        oppbbox = getBBox(keypoints);
        let xNose = keypoints[0*3];
        var yNose = keypoints[0*3+1];
        let xNeck = keypoints[1*3];
        let yNeck = keypoints[1*3+1];
        let xMid = keypoints[8*3];
        let yMid = keypoints[8*3+1];
        if((xNeck && yNeck && xMid && yMid) &&
        (xNeck != 'null' && yNeck != 'null' && xMid != 'null' && yMid != 'null')){
          var sizeBody=int(dist(xNeck, yNeck, xMid, yMid));
          var sizeHead = int((sizeBody/3));
        }else if((xNose && yNose && xNeck && yNeck) &&
         (xNose != 'null' && yNose != 'null' && xNeck != 'null' && yNeck != 'null')){
          var sizeHead=int(dist(xNose, yNose, xNeck, yNeck)*2/3);
        }
      }
      if(sizeHead) {
        var offset = [cx - oppbbox[0], cy - oppbbox[1], oppbbox[2] - cx, oppbbox[3] - cy];
        var bbox = [0,0,0,0];
        //left
        bbox[0] = oppbbox[0];
        //top
        bbox[1] = int(cy - sizeHead);
        //right
        bbox[2] = oppbbox[2];
        //bottom ===> bottom = center y - top offset + (top offset - bottom offset) / shot_factor
        // bbox[3] = cy - offset[1] + (oppbbox[3] - oppbbox[1]) * shot_factor;
        bbox[3] = bbox[1] + int((sizeHead*8) * shot_factor);
        var shot_height = bbox[3] - bbox[1];
        bbox[1] -= shot_height/3;
        bbox[3] += shot_height/3;
      } else {
        var offset = [cx - oppbbox[0], cy - oppbbox[1], oppbbox[2] - cx, oppbbox[3] - cy];
        var bbox = [0,0,0,0];
        //left
        bbox[0] = oppbbox[0];
        //top
        bbox[1] = oppbbox[1];
        //right
        bbox[2] = oppbbox[2];
        //bottom ===> bottom = center y - top offset + (top offset - bottom offset) / shot_factor
        bbox[3] = cy - offset[1] + (oppbbox[3] - oppbbox[1]) * shot_factor;
        var shot_height = bbox[3] - bbox[1];
        bbox[1] -= shot_height/3;
        bbox[3] += shot_height/3;

      }

      if ((bbox[2] - bbox[0]) < (bbox[3] - bbox[1])) {
        // enlarge width
        halfdim = (bbox[3] - bbox[1]) / 2;
        center = (bbox[2] + bbox[0]) / 2;
        bbox[0] = center - halfdim;
        bbox[2] = center + halfdim;
      }
    }
    return bbox;
  }

  this.getCurrBBoxShot = function(aspectRatio, frame_num, frames_data, is_all = false) {
    var not_involved = [];
    var curr_involved = [];
    var names = [];
    var type_curr;
    if(!is_all) {
      curr_involved = this.actors_involved;
      for(let a of this.actors_involved) {
        names.push(a.actor_name);
      }
      type_curr = this.type;
    } else {
      curr_involved =preparation_editor.actors_timeline;
      for(let a of preparation_editor.actors_timeline) {
        names.push(a.actor_name);
      }
      type_curr = 'FS';
    }

    for(let a of preparation_editor.actors_timeline) {
      if(!names.includes(a.actor_name)){
        not_involved.push(a);
      }
    }
    var keypoints_tab = frames_data[frame_num];
    var imageSize = [0, 0, Number(original_width), Number(original_height)];
    var shot_factor = 1;
    switch (type_curr){
      case 'BCU':
        shot_factor = 1/7;
        break;
      case 'CU':
        shot_factor = 1/5;
        break;
      case 'MCU':
        shot_factor = 1/3;
        break;
      case 'MS':
        shot_factor = 1/2;
        break;
      case 'MLS':
        shot_factor = 2/3;
        break;
      case 'FS':
        shot_factor = 1;
        break;
      default:
        shot_factor = 1;
        break;
    }
    var bbox = [];
    var k=0;
    let x_centers = [];
    let y_centers = [];
    var gaze_vect;
    for(var i=0; i<curr_involved.length; i++) {
      for(var j=0; j<curr_involved[i].tracks.length;j++) {
        var detections_track = curr_involved[i].tracks[j].detections;
        var first_frame = curr_involved[i].tracks[j].first_frame;
        if(first_frame < frame_num && detections_track.length > (frame_num-first_frame)) {
          var boxB;
          if(keypoints_tab[detections_track[frame_num-first_frame]]) {
            boxB = getBBoxShotAdapted(this.aspect_ratio, keypoints_tab[detections_track[frame_num-first_frame]]['KeyPoints'], shot_factor, curr_involved[i]);
            x_centers.push((boxB[0]+boxB[2])/2);
            y_centers.push((boxB[1]+boxB[3])/2);
            if(!gaze_vect && this.actors_involved.length==1) {
              gaze_vect = getGazevect(keypoints_tab[detections_track[frame_num-first_frame]]['KeyPoints']);
              let vel = curr_involved[i].getVelocityVect(frame_num);
              if(vel) {
                gaze_vect = p5.Vector.add(gaze_vect, vel);
              }
            }
            // else {
            //   gaze_vect = p5.Vector.add(gaze_vect, getGazevect(keypoints_tab[detections_track[frame_num-first_frame]]['KeyPoints']));
            // }
            if(k==0) {
              bbox = boxB;
              k++;
            }
            bbox[0] = min(bbox[0], boxB[0]);
            bbox[1] = min(bbox[1], boxB[1]);
            bbox[2] = max(bbox[2], boxB[2]);
            bbox[3] = max(bbox[3], boxB[3]);
          }
        }
      }
      for(let t of curr_involved[i].track_bbox_shot) {
        if(t.first_frame < frame_num && t.last_frame > frame_num) {
          let b = t.bboxes[frame_num-t.first_frame];
          let curr_bbox = [b.x, b.y,b.x+b.w, b.y+b.h];
          var boxB = getBBoxShotAdapted(this.aspect_ratio, undefined, shot_factor, curr_involved[i], false, curr_bbox, b.center_x, b.center_y);
          x_centers.push((boxB[0]+boxB[2])/2);
          y_centers.push((boxB[1]+boxB[3])/2);
          if(bbox.length > 0) {
            bbox[0] = min(bbox[0], boxB[0]);
            bbox[1] = min(bbox[1], boxB[1]);
            bbox[2] = max(bbox[2], boxB[2]);
            bbox[3] = max(bbox[3], boxB[3]);
          } else {
            bbox = boxB;
            k++;
          }
        }
      }
    }

    let is_not_inv = false;
    let s_gaze = undefined;
    let v_gaze = undefined;

    if(is_intersect) {
      bbox = this.adaptAspectRatio(bbox, imageSize, int((x_centers.reduce((pv, cv) => pv + cv, 0))/x_centers.length), int((y_centers.reduce((pv, cv) => pv + cv, 0))/y_centers.length));
      for(let a of not_involved) {
        for(let t of a.tracks) {
          var detections_track = t.detections;
          var first_frame = t.first_frame;
          if(first_frame < frame_num && detections_track.length > (frame_num-first_frame)) {
            var boxB;
            if(keypoints_tab[detections_track[frame_num-first_frame]]) {
              boxB = getBBoxShotAdapted(this.aspect_ratio, keypoints_tab[detections_track[frame_num-first_frame]]['KeyPoints'], shot_factor, a);
              let box_side = getBBox(keypoints_tab[detections_track[frame_num-first_frame]]['KeyPoints']);
              boxB = [box_side[0],boxB[1],box_side[2],boxB[3]];
            }
            if(boxB && bbox) {
              if(!(bbox[2]<boxB[0] || boxB[2]<bbox[0] || bbox[3]<boxB[1] || boxB[3] < bbox[1])) {
                x_centers.push((boxB[0]+boxB[2])/2);
                y_centers.push((boxB[1]+boxB[3])/2);
                is_not_inv = true;
                bbox[0] = min(bbox[0], boxB[0]);
                bbox[1] = min(bbox[1], boxB[1]);
                bbox[2] = max(bbox[2], boxB[2]);
                bbox[3] = max(bbox[3], boxB[3]);
              }
            }
          }
        }
        for(let t of a.track_bbox_shot) {
          if(t.first_frame < frame_num && t.last_frame > frame_num) {
            let b = t.bboxes[frame_num-t.first_frame];
            let curr_bbox = [b.x, b.y,b.x+b.w, b.y+b.h];
            var boxB = getBBoxShotAdapted(this.aspect_ratio,undefined, shot_factor, a, false, curr_bbox, b.center_x, b.center_y);
            let box_side = curr_bbox;
            boxB = [box_side[0],boxB[1],box_side[2],boxB[3]];
            if(boxB && bbox) {
              if(!(bbox[2]<boxB[0] || boxB[2]<bbox[0] || bbox[3]<boxB[1] || boxB[3] < bbox[1])) {
                x_centers.push((boxB[0]+boxB[2])/2);
                y_centers.push((boxB[1]+boxB[3])/2);
                is_not_inv = true;
                bbox[0] = min(bbox[0], boxB[0]);
                bbox[1] = min(bbox[1], boxB[1]);
                bbox[2] = max(bbox[2], boxB[2]);
                bbox[3] = max(bbox[3], boxB[3]);
              }
            }
          }
        }
      }
    }

    if(!is_not_inv) {
      if(gaze_vect) {
        s_gaze = abs((gaze_vect.x*shot_factor)/100);
        v_gaze = gaze_vect.normalize().x;
      }
    }

    return this.adaptAspectRatio(bbox, imageSize, int((x_centers.reduce((pv, cv) => pv + cv, 0))/x_centers.length), int((y_centers.reduce((pv, cv) => pv + cv, 0))/y_centers.length), s_gaze, v_gaze);
  }

  this.adaptAspectRatio = function(bbox, imageSize, mid_x = undefined, mid_y = undefined, s_gaze=undefined, v_gaze=undefined) {
    if(imageSize[3]*this.aspect_ratio < imageSize[2]) {
      imageSize[2] = imageSize[3]*this.aspect_ratio;
    } else if(imageSize[2]/this.aspect_ratio < imageSize[3]) {
      imageSize[3] = imageSize[2]/this.aspect_ratio;
    }
    if(bbox && bbox.findIndex(Number.isNaN)==-1 && bbox.length>1) {
      if ((bbox[2] - bbox[0]) < this.aspect_ratio * (bbox[3] - bbox[1])){
        // enlarge width
        halfdim = this.aspect_ratio * (bbox[3] - bbox[1]) / 2;
        center = (bbox[0] + bbox[2]) / 2;
        bbox[0] = center - halfdim;
        bbox[2] = center + halfdim;
      } else {
        // enlarge height
        halfdim = (1 / this.aspect_ratio) * (bbox[2] - bbox[0]) / 2;
        center = (bbox[1] + bbox[3]) / 2;
        bbox[1] = center - halfdim;
        bbox[3] = center + halfdim;
      }
      bbox = [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])];

      if(s_gaze && v_gaze) {
        off = v_gaze*((bbox[2]-bbox[0])*s_gaze);
        bbox = [int(bbox[0]+off), bbox[1], int(bbox[2]+off), bbox[3]];
      }
      var off_left=0;
      var off_top=0;
      var off_right=0;
      var off_bottom=0;

      if(!mid_x && !mid_x) {
        if(bbox[3]-bbox[1] > imageSize[3]) {
          let w = imageSize[3]*this.aspect_ratio;
          let h = imageSize[3];
          let x = int((bbox[0] + (bbox[2]-bbox[0])/2) - w/2);
          bbox = [x, 0, x+w, h];
        } else if(bbox[2] - bbox[0] > imageSize[2]) {
          let w = imageSize[2];
          let h = imageSize[2]/this.aspect_ratio;
          let y = int((bbox[1] + (bbox[3]-bbox[1])/2 ) - h/2);
          bbox = [0, y, 0+w, y+h];
        }
      } else {
        if((bbox[3] - bbox[1])>int(imageSize[3]*0.9)) {
          let s = (1/((bbox[3] - bbox[1])/int(imageSize[3]*0.9)));
          let mid = mid_x;
          // console.log(s, mid_x);
          let half = int((int(bbox[2]*s)-int(bbox[0]*s))/2);
          bbox = [mid-half,int(bbox[1]*s),mid+half,int(bbox[3]*s)];
        } else if(bbox[2] - bbox[0] > int(imageSize[2]*0.9)) {
          let s = (1/((bbox[2] - bbox[0])/ int(imageSize[2]*0.9)));
          let mid = mid_y;
          let half = int((int(bbox[3]*s)-int(bbox[1]*s))/2);
          bbox = [int(bbox[0]*s),mid-half,int(bbox[2]*s),mid+half];
        }
      }

      // if(bbox[0]<imageSize[0]) {
      //    off_left = imageSize[0] - bbox[0];
      // }
      // if(bbox[1]<imageSize[1]) {
      //   off_top = imageSize[1] - bbox[1];
      // }
      // if(bbox[2]>imageSize[2]) {
      //   off_right = bbox[2]- imageSize[2];
      // }
      // if(bbox[3]>imageSize[3]) {
      //   off_bottom = bbox[3]- imageSize[3];
      // }
      // // console.log(bbox);
      // bbox[0] = bbox[0] + off_left - off_right;
      // bbox[1] = bbox[1] + off_top - off_bottom;
      // bbox[2] = bbox[2] + off_left - off_right;
      // bbox[3] = bbox[3] + off_top - off_bottom;
      // console.log(frame_num,bbox, off_left, off_top, off_right, off_bottom);
      return bbox;
    } else {
      // console.log(bbox);
      return undefined;
    }
  }

  this.getCSBbox = function(f_n, a) {
    var bbox;
    for(let t of a.tracks) {
      var keypointsB = frames_data[f_n];
      var detections_track = t.detections;
      var first_frame = t.first_frame;
      if(first_frame < f_n && detections_track.length > (f_n-first_frame)) {
        if(keypointsB[detections_track[f_n-first_frame]]) {
          bbox = getBBoxShotAdapted(keypointsB[detections_track[f_n-first_frame]]['KeyPoints'], 1/4, a);
        }
      }
    }
    if(bbox && bbox[0]!=0) {
      for(let t of a.track_bbox_shot) {
        if(t.first_frame < f_n && t.last_frame > f_n) {
          let b = t.bboxes[f_n-t.first_frame];
          let curr_bbox = [b.x, b.y,b.x+b.w, b.y+b.h];
          var boxB = getBBoxShotAdapted(undefined, 1/4, a, false, curr_bbox, b.center_x, b.center_y);
          if(bbox.length > 0) {
            bbox[0] = min(bbox[0], boxB[0]);
            bbox[1] = min(bbox[1], boxB[1]);
            bbox[2] = max(bbox[2], boxB[2]);
            bbox[3] = max(bbox[3], boxB[3]);
          }
        }
      }
    }
    return bbox;
  }

  this.calcCropingFactor = function(aspectRatio, threshold) {
    let arr = [];
    for(let a of this.actors_involved) {
      let obj = [];
      for(let i=0; i<this.bboxes.length-1; i++) {
        let bb = this.getCSBbox(i, a);
        let bb1 = this.getCSBbox(i+1, a);
        let bbC = [0,0,0];
        if(bb && bb1) {
          let fx = (bb[0] + bb[2])/2;
          let fy = (bb[1] + bb[3])/2;
          let fs = (bb[3] - bb[1])/2;
          let fx1 = (bb1[0] + bb1[2])/2;
          let fy1 = (bb1[1] + bb1[3])/2;
          let fs1 = (bb1[3] - bb1[1])/2;
          let cx = 0;
          let cy = 0;
          let cs = 0;
          if(abs(fx1-fx)<threshold){
            cx = 1;
          }
          if(abs(fy1-fy)<threshold){
            cy = 1;
          }
          if(abs(fs1-fs)<threshold){
            cs = 1;
          }
          bbC = [cx, cy, cs];
        }
        obj.push(bbC);
      }
      arr.push(obj);
    }
    // console.log(arr);
    return arr;
  }

  this.calcApparentMotion = function(aspectRatio) {
    let arr = [];
    for(let a of this.actors_involved) {
      let obj = [];
      for(let i=0; i<this.bboxes.length-1; i++) {
        let bb = this.getCSBbox(i, a);
        let bb1 = this.getCSBbox(i+1, a);
        let bbC = [0,0,0];
        if(bb && bb1) {
          let fx = (bb[0] + bb[2])/2;
          let fy = (bb[1] + bb[3])/2;
          let fs = (bb[3] - bb[1])/2;
          let fx1 = (bb1[0] + bb1[2])/2;
          let fy1 = (bb1[1] + bb1[3])/2;
          let fs1 = (bb1[3] - bb1[1])/2;
          let bx = (fx1 - fx)/2 || 0;
          let by = (fy1 - fy)/2 || 0;
          let bs = (fs1 - fs)/2 || 0;
          bbC = [bx, by, bs];
        }
        obj.push(bbC);
      }
      arr.push(obj);
    }
    // console.log(arr);
    return arr;
  }

  this.calcExternalBoundaries = function() {
    let arr = [];
    let names_involved = [];
    for(let a of this.actors_involved) {
      names_involved.push(a.actor_name);
    }
    for(let i=0; i<this.bboxes.length; i++) {
      let val_l = Number.MAX_VALUE;
      let val_r = Number.MAX_VALUE;
      let xl = 0;
      let xl1 = 0;
      let xr = 0;
      let xr1 = 0;
      let tl = 0;
      let tr = 0;
      for(let a of preparation_editor.actors_timeline) {
        if(!names_involved.includes(a.actor_name)) {
          let bb = this.getCSBbox(i, a);
          if(bb && bb[0] < this.bboxes[i][0]) {
            if(abs(bb[0], this.bboxes[i][0]) < val_l) {
              val_l = abs(bb[2], this.bboxes[i][0]);
              xl = bb[0];
              xl1 = bb[2];
              if(bb[2]<this.bboxes[i][0]) {
                tl = 0;
              } else {
                tl = 1;
              }
            }
          } else if(bb && bb[2] > this.bboxes[i][2]) {
            if(abs(bb[2], this.bboxes[i][2])< val_r) {
              val_r = abs(bb[2], this.bboxes[i][2]);
              xr = bb[2];
              xr1 = bb[0];
              if(bb[0]>this.bboxes[i][2]) {
                tr = 0;
              } else {
                tr = 1;
              }
            }
          }
        }
      }
      let obj = [xl, xl1, xr, xr1, tl, tr];
      arr.push(obj);
    }
    // console.log(arr);
    return arr;
  }

  this.calcVectorScreenPos = function() {
    let arr = [];
    let names_involved = [];
    for(let a of this.actors_involved) {
      names_involved.push(a.actor_name);
    }
    for (let i=0; i<this.bboxes.length; i++) {
      let left = false;
      let right = false;
      for(let a of preparation_editor.actors_timeline) {
        if(!names_involved.includes(a.actor_name)) {
          let c = a.getCenterAct(i);
          if(c.x < this.bboxes[i][0]) {
            left = true;
          }
          if(c.x > this.bboxes[i][2]) {
            right = true;
          }
        }
      }
      if(left && right) {
        arr.push(0);
      } else if(right && !left) {
        arr.push(-1);
      } else if(!right && left) {
        arr.push(1);
      } else {
        arr.push(0);
      }
    }
    return arr;
  }

  this.getInOutBBox = function(act_out, act_in) {
    let bbox_out;
    if(this.bboxes[act_out] && this.bboxes[act_out] != [0,0,0,0]) {
      bbox_out = this.bboxes[act_out];
    }
    let bbox_in;
    if(this.bboxes[act_in] && this.bboxes[act_in] != [0,0,0,0]) {
      bbox_in = this.bboxes[act_in];
    }
    if(bbox_in && bbox_out) {
      let bbox = [];
      bbox[0] = min(bbox_out[0], bbox_in[0]);
      bbox[1] = min(bbox_out[1], bbox_in[1]);
      bbox[2] = max(bbox_out[2], bbox_in[2]);
      bbox[3] = max(bbox_out[3], bbox_in[3]);
      bbox = getAdaptedBBox(bbox, this.aspect_ratio);
      return bbox;
    } else if(bbox_in && !bbox_out) {
      return bbox_in;
    } else if(!bbox_in && bbox_out) {
      return bbox_out;
    } else {
      return undefined;
    }
  }

  this.calcBboxes = function(aspectRatio) {
    this.bboxes = [];
    var mask = [];
    let curr;
    let curr_mask = [];
    for(var i=1; i<= total_frame; i++) {
      var f_num = i;
      if(this.actors_involved.length<1) {
        this.bboxes.push([0,0,Number(original_width),Number(original_height)]);
      } else {
        var bbox = getBBoxShot(this.type, this.aspect_ratio, f_num);//this.getCurrBBoxShot(this.aspect_ratio, f_num, frames_data);
        if(bbox) {
          // if(curr && abs(curr[0]-bbox[0]) > 5) {
          //   let off = abs(curr[0]-bbox[0])/2;
          //   if(curr[0]<bbox[0]){bbox[0]-=off;bbox[2]-=off;}
          //   if(curr[0]>bbox[0]){bbox[0]+=off;bbox[2]+=off;}
          // }
          // console.log(f_num,bbox);
          // var fx = (bbox[0] + bbox[2])/2;
          // var fy = (bbox[1] + bbox[3])/2;
          // var fs = (bbox[3] - bbox[1])/2;
          // var output = [fx, fy, fs];
          let index = bbox.findIndex(Number.isNaN)
          if(index!=-1) {
            this.bboxes.push([0,0,0,0]);
            mask.push(f_num);
            // console.log(f_num);
            curr = undefined;
          } else {
            // let w = int((bbox[2]-bbox[0])*0.05);
            // let h = int((bbox[3]-bbox[1])*0.05);
            // bbox = [int(bbox[0]+w),int(bbox[1]+h),int(bbox[2]-w),int(bbox[3]-h)];
            this.bboxes.push(bbox);
            curr = bbox;
          }
        } else {
          if(curr_mask.length<1) {
            curr_mask.push(f_num);
          }else if(curr_mask[curr_mask.length-1] == f_num-1) {
            curr_mask.push(f_num);
          } else {
            mask.push(curr_mask);
            curr_mask = [];
            curr_mask.push(f_num);
          }
          this.bboxes.push([0,0,0,0]);
          curr = undefined;
        }
      }
    }
    if(curr_mask.length>=1) {
        mask.push(curr_mask);
    }
    curr_mask = [];
    for(let i=0; i< mask.length; i++) {
      // if(mask[i].length>10) {
        curr_mask.push(mask[i]);
        // mask.splice(i,1);
      // }
    }
    mask = [];//.concat.apply([], mask);
    // console.log(curr_mask);
    for(let c of curr_mask) {
      let in_out_bbox = this.getInOutBBox(c[0]-2, c[c.length-1]);
      // console.log(in_out_bbox, this.bboxes[c[0]-2], this.bboxes[c[c.length-1]]);
      if(in_out_bbox) {
        // console.log(in_out_bbox, (in_out_bbox[2]-in_out_bbox[0])/(in_out_bbox[3]-in_out_bbox[1]));
        for(f_num of c) {
          this.bboxes[f_num-1] = in_out_bbox;
        }
      }
    }
    // console.log(curr_mask,mask);
    // curr_mask = [].concat.apply([], curr_mask);
    // for(let f_num of curr_mask) {
    //   let full_bbox = this.getCurrBBoxShot(this.aspect_ratio, f_num, frames_data, true);
    //   if(full_bbox) {
    //     if(full_bbox.findIndex(Number.isNaN)==-1) {
    //       this.bboxes[f_num-this.start_frame] = full_bbox;
    //     }
    //   }
    // }
    // let index = this.bboxes.findIndex(Number.isNaN)
    // console.log(this.bboxes)
    if(this.actors_involved.length>=1) {
      var tab = [];
      for(let a of this.actors_involved) {
        tab.push(a.actor_name);
      }
      // this.calcExternalBoundaries();
      // console.log(this.calcVectorScreenPos());
      let vid_w = Number(original_width);
      let vid_h = Number(original_height);
      // console.log(vid_w, vid_h, this.aspect_ratio);
      var data = {'aspect_ratio':this.aspect_ratio, 'video_width': vid_w, 'video_height': vid_h,
      'shot':JSON.stringify(this.bboxes), 'mask':JSON.stringify(mask), 'type':this.type, 'actors_involved': JSON.stringify(tab),
       'crop_factor': JSON.stringify(this.calcCropingFactor(this.aspect_ratio,1)), 'apparent_motion': JSON.stringify(this.calcApparentMotion(this.aspect_ratio)), 'external_bound': JSON.stringify(this.calcExternalBoundaries()), 'screen_pos':JSON.stringify(this.calcVectorScreenPos())};
       // console.log(data);
      this.doAnAjax('stabilize', data, this.callbackBBox);
    } else {
      this.type = 'WS';
    }
  }

  this.doAnAjax = function(newUrl, data, callBack) {
      $.post({
          url: newUrl,
          async: true,
          dataType: 'json',
          data: data,
          cache: false,
          success: function(data, i) {
              myRtnA = "succes";
              return callBack( myRtnA, data);  // return callBack() with myRtna
          },
          error: function() {
              myRtnA = "error";
              return callBack ( myRtnA, [] ); // return callBack() with myRtna
          }
      });
    }

  this.callbackBBox = function(myRtnA, data) {
    if(myRtnA == "succes") {
      console.log(data);
      let i = montage_editor.getShot(cadrage_editor.add_shot, data['type'], data['actors_involved']);
      // console.log(add_shot[i]);
      cadrage_editor.add_shot[i].bboxes = data['bboxes'];
      cadrage_editor.add_shot[i].in_stabilize = false;
      // add_shot[i].accuracy_rate = add_shot[i].getAccuracyRate();
      // console.log(add_shot[0].bboxes);
      cadrage_editor.add_shot.splice(i,1);
    } else if(myRtnA == "error") {
      console.error('error');
    }
  }

  this.isFrameBbox = function(f_n = undefined) {
    if(!f_n) {
      f_n = frame_num;
    }
    let ret = false;
    let is_t_b = false;
    for(let act of this.actors_involved) {
      for(let t of act.tracks) {
        var detections_track = t.detections;
        var first_frame = t.first_frame;
        if(first_frame < f_n) {
          if(detections_track.length > (f_n-first_frame)) {
            ret = true;
            break;
          }
        }
      }
      for(let t of act.track_bbox_shot) {
        if(t.first_frame < f_n && t.last_frame > f_n) {
          is_t_b = true;
          break;
        }
      }
    }
    if(ret || is_t_b){ret = true;}
    return ret;
  }
  this.getCurrStabShot = function(frame_num) {
    var ret;
    var bb;
    bb = this.bboxes[frame_num];
    if(bb && bb[0] != "null") {
      ret = bb;
    }
    return ret;
  }

  this.getCurrStabShotScale = function(frame_num) {
    var ret;
    var bb;
    bb = this.bboxes[frame_num];
    if(bb && bb[0] != "null") {
      ret = [bb[0]*scale_ratio, bb[1]*scale_ratio, bb[2]*scale_ratio, bb[3]*scale_ratio];
    }
    return ret;
  }

  this.getActNameInvolved = function() {
    var tab = [];
    for(var j=0; j<this.actors_involved.length;j++) {
        tab.push(this.actors_involved[j].actor_name);
    }
    return tab;
  }

  this.getUpdateActInvolved = function(f_n = undefined) {
    if(!f_n) {
      f_n = frame_num;
    }
    let tab = [];
    let bbox = this.getCurrStabShot(f_n);
    if(bbox) {
      for(let a of preparation_editor.actors_timeline) {
        let center_act = a.getCenterAct(f_n);
        if(center_act.x > bbox[0] && center_act.x < bbox[2] && center_act.y > bbox[1] && center_act.y < bbox[3]) {
          tab.push(a.actor_name);
        }
      }
    }
    return tab;
  }

  this.splitActInvolved = function(act_inv = undefined, f_n = undefined) {
    if(!f_n) {
      f_n = frame_num;
    }
    if(!act_inv) {
      act_inv = preparation_editor.actors_timeline;
    }
    let tab = [];
    let bbox = this.getCurrStabShot(f_n);
    if(bbox) {
      for(let a of act_inv) {
        let shot_act = montage_editor.getShotAspect(this.type, [a], 1, false, false, false);
        if(shot_act) {
          let boxB = shot_act.getCurrStabShot(f_n);
          if(!(bbox[2]<boxB[0] || boxB[2]<bbox[0] || bbox[3]<boxB[1] || boxB[3] < bbox[1])) {
            tab.push(a.actor_name);
          }
        }
      }
    }
    if(tab.length==0) {
      tab = this.actors_involved;
    }
    return tab;
  }

  this.getAccuracyRate = function() {
    let cpt=0;
    let total=this.bboxes.length;
    for(let i=0; i<this.bboxes.length; i++) {
      if(this.isFrameBbox(i) && this.getUpdatedSizeShot(this.getCurrStabShot(i)[3],i)==this.type) {
        cpt++;
      } else if(!this.isFrameBbox(i)) {
        total--;
      }
    }
    return cpt/total;
  }

  this.setActInvoled = function(tab) {
    for(var j=0; j<tab.length; j++) {
      for(var i=0; i<preparation_editor.actors_timeline.length; i++) {
        if(preparation_editor.actors_timeline[i].actor_name == tab[j]) {
          this.actors_involved.push(preparation_editor.actors_timeline[i]);
        }
      }
    }
  }

  this.getUpdatedSizeShot = function(low_bound, f_n=undefined) {
    if(!f_n) {
      f_n = frame_num;
    }
    let size = 0;
    let acts = this.getUpdateActInvolved(f_n);
    let dist = Number.MAX_VALUE;
    for(let name of acts) {
      let a = preparation_editor.getAct(name);
      let keypoints = a.getKeyPoints(f_n);
      if(keypoints) {
        let shot_factors = [1/7,1/5,1/3,1/2,2/3,1];
        for(let fact of shot_factors) {
          let bbox = getBBoxShotAdapted(this.aspectRatio, keypoints, fact, a);
          if(abs(low_bound-bbox[3]) < dist && fact > size) {
            size = fact;
            dist = abs(low_bound-bbox[3]);
          }
        }
      }
    }
    let ret;
    if(size) {
      switch (size){
        case 1/7:
          ret = 'BCU';
          break;
        case 1/5:
          ret = 'CU';
          break;
        case 1/3:
          ret = 'MCU';
          break;
        case 1/2:
          ret = 'MS';
          break;
        case 2/3:
          ret = 'MLS';
          break;
        case  1:
          ret ='FS';
          break;
        default:
          ret = 1;
          break;
      }
    }
    return ret;
  }

  this.getPanMove = function(f_n = undefined) {
    if(!f_n) {
      f_n = frame_num;
    }
    let pan = {};
    let w=Math.round(this.getCurrStabShot(f_n-5)[2]-this.getCurrStabShot(f_n-5)[0]);
    let x=Math.round((this.getCurrStabShot(f_n-5)[2]+this.getCurrStabShot(f_n-5)[0])/2);
    let y=Math.round((this.getCurrStabShot(f_n-5)[1]+this.getCurrStabShot(f_n-5)[3])/2);
    // for(let i=0; i<5; i++) {
    //   let off = f_n - i;
    //   w+=Math.round(this.getCurrStabShot(off)[2]-this.getCurrStabShot(off)[0]);
    //   x+=Math.round((this.getCurrStabShot(off)[2]+this.getCurrStabShot(off)[0])/2);
    //   y+=Math.round((this.getCurrStabShot(off)[3]+this.getCurrStabShot(off)[1])/2);
    // }
    // w /=5;
    // x /=5;
    // y /=5;
    pan.zoom = Math.round(Math.round(this.getCurrStabShot(f_n)[2]-this.getCurrStabShot(f_n)[0])- w);// / abs(Math.round(this.getCurrStabShot(f_n)[2]-this.getCurrStabShot(f_n)[0])- w);
    pan.horizontal = Math.round(Math.round((this.getCurrStabShot(f_n)[2]+this.getCurrStabShot(f_n)[0])/2)-x);// / abs(Math.round((this.getCurrStabShot(f_n)[2]+this.getCurrStabShot(f_n)[0])/2)-x);
    pan.vertical = Math.round(Math.round((this.getCurrStabShot(f_n)[1]+this.getCurrStabShot(f_n)[3])/2)-y);// / abs(Math.round((this.getCurrStabShot(f_n)[1]+this.getCurrStabShot(f_n)[3])/2)-y);
    return pan;
  }

  this.getPlacement = function(act, f_n = undefined) {
    let ret;
    if(!f_n) {
      f_n = frame_num;
    }
    let bbox = this.getCurrStabShot(f_n);
    let c = act.getCenterAct(f_n);
    let quarter = Math.round((bbox[2]-bbox[0])/4);
    let fact;
    let ratio;
    for(let i=1; i<=4; i++) {
      if(c.x < bbox[0]+quarter*i) {
        fact = i;
        ratio = round_prec((c.x-bbox[0])/(bbox[2]-bbox[0]),2);
        break;
      }
    }
    switch(fact) {
      case 1:
        ret = 'left '+ratio;
        break;
      case 2:
        ret = 'center left '+ratio;
        break;
      case 3:
        ret = 'center rigth '+ratio;
        break;
      case 4:
        ret = 'rigth '+ratio;
        break;
    }
    return ret;
  }

  this.setPosition = function(tX, tY, tW, tH) {
    this.x  = tX;
    this.y  = tY;
    this.w  = tW;
    this.h  = tH;
  }
  // Draw the rectangle
  this.display = function() {
    if(this.on) {
      push();
      fill('green');
      rect(this.x-5,this.y-5, this.w+10, this.h+10);
      pop();
    }
  }
  this.displayText = function() {
    // let acts = this.getUpdateActInvolved();
    push();
    fill(255);;
    let type;
    if(this.getCurrStabShot(frame_num)) {
      type = this.getUpdatedSizeShot(this.getCurrStabShot(frame_num)[3]);
    }
    if(!type) {
      type = this.type;
    }
    let intersect = "";
    if(this.is_intersect) {
      intersect = " I";
    }
    let gaze = "";
    if(this.is_gaze_direction) {
      gaze = " G";
    }
    let stage_pos = "";
    if(this.is_stage_position) {
      stage_pos = " S";
    }
    text(this.type+' '+round_prec(this.aspect_ratio,2)+intersect+gaze+stage_pos/*+Math.round(this.accuracy_rate*100)+'%'*/, this.x, this.y+10);
    for(let i=0; i<this.actors_involved.length; i++) {
      text(this.actors_involved[i].actor_name, this.x, this.y+20+i*10);
    }
    if(this.in_stabilize) {
      text('STABILIZATION IN PROCESS',this.x + 100, this.y + 20);
    }
    pop();
  }
}
