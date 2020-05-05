var playing = false;
var video;
var can;
var html_elements = [];
var viewer_height = Number(original_height);
var viewer_width = Number(original_width);
var vid_w;
var vid_h;
var mid_width = viewer_width;
var x_off = 0;
var y_off = 0;
var back_color = 150;

var data_detects;
var data_tracks = {};
var data_timelines = {};
var data_shots = {};
var data_annotation_timeline = {};
var data_partitions;
var tracks_data = [];
var frames_data = [];
var act_input;
var annotation_timeline;

var scale_ratio;
var frame_rate = Number(original_frame_rate);
var total_frame;
var frame_num;
var viewer_scale = 1;
var act_timeline_scale = 1;
var act_timeline_x_off = 0;
var pos_wheel = 0;

var preparation_editor_button;
var is_preparation_editor;
var cadrage_editor_button;
var is_cadrage_editor;
var montage_editor_button;
var is_montage_editor;
var annotation_editor_button;
var is_annotation_editor;
var export_editor_button;
var is_export_editor;

var submit;
// var reframe_button;
var hide_show_header_button;
var is_shots_frame_layout =false;
var render_pose = false;
var check_render_pose;
var check_render_shot_trace;
var exploit_rough;
var bbox_creation = false;
var curr_creation = undefined;
var sanitize;
var reset_pos;
var get_actors_on_stage;
var get_meta_data;
var extract_video_book;
var extract_keyframes;
var offset_split = 0;
var is_timer = false;
var player;
var dash_player;
var keyDown;
var remove_timeline = false;
var shots_timeline;
var show_shot;
var crop_button;
var aspect_ratio;
var img;
var img_hd;
var image_frame;
var time_hd=0;
var stock_img=0;
var detec_modif = false;
var rough_json = undefined;
var up_rough = false;
var double_click = false;
var tool_tip = {};
var video_element;
var json_user_timeline;

function round_prec(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

function UrlExists(url)
{
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status!=404;
}

function loadRough(url) {
  if(UrlExists(url)) {
    rough_json = loadJSON(url);
  }
}

function preload() {

  // loadJSON(json_detec, gotDetects, 'jsonp');
  // data_detects = loadJSON(json_detec);
  data_tracks = loadJSON(json_track);
  if(UrlExists(json_timeline)) {
    data_timelines = loadJSON(json_timeline);
  }
  if(UrlExists(json_annotation_timeline)) {
    data_annotation_timeline = loadJSON(json_annotation_timeline);
  }
  data_shots = loadJSON(json_shots);
  if(UrlExists("/media"+abs_path.split('media')[1]+"/"+username+"_timelines.json")) {
    json_user_timeline = loadJSON("/media"+abs_path.split('media')[1]+"/"+username+"_timelines.json");
  } else {
    json_user_timeline = [];
  }
  if(UrlExists("/media"+abs_path.split('media')[1]+"/partitions_objects.json")) {
    data_partitions = loadJSON("/media"+abs_path.split('media')[1]+"/partitions_objects.json");
  }
  // specify multiple formats for different browsers
  loadRough(abs_path.split('kinoai')[abs_path.split('kinoai').length-1]+'/Rough.json');
  can = createCanvas();
  var div = select('#div_player');
  can.child(div);
  div.hide();
  video = new p5.MediaElement(dash_player.getVideoElement());
  video_element = createVideo("/media"+abs_path.split('media')[1]+"/original540.mp4");
  video_element.hide();
  video.hide();
}

// -----------------------------------------------------------------------------------------------------------------

/*
  Getters functions
*/

// Sort the created shots
function sortShotsByType(a, b) {
  if (getFactor(a.type) < getFactor(b.type))
    return -1;
  if (getFactor(a.type) > getFactor(b.type))
    return 1;
  return 0;
}

// Sort the created shots
function sortShotsByName(a, b) {
  if(a.actors_involved.length==1&&b.actors_involved.length==1) {
    if (a.actors_involved[0].actor_name < b.actors_involved[0].actor_name)
      return -1;
    if (a.actors_involved[0].actor_name > b.actors_involved[0].actor_name)
      return 1;
    return 0;
  } else {
    return -1;
  }
}

function sortShotsByActPosition(a, b) {
  if(a.actors_involved.length==1&&b.actors_involved.length==1) {
    if (a.actors_involved[0].getActPosition().x < b.actors_involved[0].getActPosition().x)
      return -1;
    if (a.actors_involved[0].getActPosition().x > b.actors_involved[0].getActPosition().x)
      return 1;
    return 0;
  } else {
    return -1;
  }
}

function sortByActPosition(a, b) {
  if (a.getActPosition().x < b.getActPosition().x)
    return -1;
  if (a.getActPosition().x > b.getActPosition().x)
    return 1;
  return 0;
}

function sortShotsByPosition(a,b) {
  if(a.bboxes[frame_num]&&b.bboxes[frame_num]) {
    let x1 = int((a.bboxes[frame_num][0]+a.bboxes[frame_num][2])/2);
    let x2 = int((b.bboxes[frame_num][0]+b.bboxes[frame_num][2])/2);
    if (x1 < x2)
      return -1;
    if (x1 > x2)
      return 1;
    return 0;
  } else {
    return -1;
  }
}

// Get the factor scale factor based on the types
function getFactor(type, prev=false) {
  var shot_factor = 1;
  switch (type){
    case 'BCU':
      if(!prev)
        shot_factor = 1/9;
      else
        shot_factor = 1/10;
      break;
    case 'CU':
      if(!prev)
        shot_factor = 1/7;
      else
        shot_factor = 1/9;
      break;
    case 'MCU':
      if(!prev)
        shot_factor = 1/5;
      else
        shot_factor = 1/7;
      break;
    case 'MS':
      if(!prev)
        shot_factor = 1/3;
      else
        shot_factor = 1/5;
      break;
    case 'MLS':
      if(!prev)
        shot_factor = 3/5;
      else
        shot_factor = 1/2;
      break;
    case 'FS':
      if(!prev)
        shot_factor = 1;
      else
        shot_factor = 4/5;
      break;
    default:
      shot_factor = 1;
      break;
  }
  return shot_factor;
}


//Get the bounding box from open pose detect
function getBBox(keypoints, scale=0) {
  // console.log(keypoints);
  if(keypoints) {
    var len = keypoints.length / 3;
    var bbox = [Number.MAX_VALUE, Number.MAX_VALUE, 0, 0];
    for(var i = 0; i<len; i++)
    {
      if(keypoints[i*3] != "null" && keypoints[i*3+1] != "null")
      {
        if(keypoints[i*3]<bbox[0])
        {
          bbox[0] = keypoints[i*3]
        }
        if(keypoints[i*3]>bbox[2])
        {
          bbox[2] = keypoints[i*3]
        }
        if(keypoints[i*3+1]<bbox[1])
        {
          bbox[1] = keypoints[i*3+1]
        }
        if(keypoints[i*3+1]>bbox[3])
        {
          bbox[3] = keypoints[i*3+1]
        }
      }
    }
    return [bbox[0]*(1-scale),bbox[1]*(1-scale),bbox[2]*(1+scale),bbox[3]*(1+scale)];//[bbox[0]-int(bbox[0]*0.05),bbox[1]-int(bbox[1]*0.05),bbox[2]+int(bbox[2]*0.05),bbox[3]+int(bbox[3]*0.05)];
  } else {
    return [0,0,0,0];
  }
}

//Get the keypoints bounding box center
function getCenter(keypoints) {
  var len = keypoints.length / 3;
  var cpt = 0;
  var total_x = 0;
  var total_y = 0;

  for(var i = 0; i<len; i++) {
    if(keypoints[i*3] != "null" && keypoints[i*3+1] != "null") {
      cpt++;
      total_x+=keypoints[i*3];
      total_y+=keypoints[i*3+1];
    }
  }

  var center = [total_x/cpt, total_y/cpt];
  return center;
}

//Get the shot bounding box following the specification for one specific actor
function getBBoxShotAdapted(aspectRatio, keypoints, shot_factor, actor, check_collide = false, curr_bbox = undefined, c_x = undefined, c_y = undefined) {
  if(cadrage_editor.is_split_screen) {
    aspectRatio = 1;
  }
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
    if(cy == 'null') {
      cy = oppbbox[1];
    }
    if(cx == 'null') {
      cx = (oppbbox[0] + oppbbox[2])/2;
    }
    let xNose = keypoints[0*3];
    var yNose = keypoints[0*3+1];
    let xNeck = keypoints[1*3];
    let yNeck = keypoints[1*3+1];
    let xMid = keypoints[8*3];
    let yMid = keypoints[8*3+1];
    var fact = int(dist(xNeck, yNeck, xMid, yMid)/dist(xNeck, yNeck, xNose, yNose));
    if((xNeck && yNeck && xMid && yMid) &&
    (xNeck != 'null' && yNeck != 'null' && xMid != 'null' && yMid != 'null')){
      var sizeBody=int(dist(xNeck, yNeck, xMid, yMid));
      var sizeHead = int((sizeBody/3));
    }else if((xNose && yNose && xNeck && yNeck) &&
     (xNose != 'null' && yNose != 'null' && xNeck != 'null' && yNeck != 'null')){
      var sizeHead=int(dist(xNose, yNose, xNeck, yNeck)*2/3);
    }
    if(actor && !actor.size_head) {
      actor.updateHeadSize();
    }
    if(actor && !sizeHead)
      var sizeHead = actor.size_head;
  }
  if(sizeHead) {
    var offset = [cx - oppbbox[0], cy - oppbbox[1], oppbbox[2] - cx, oppbbox[3] - cy];
    var bbox = [0,0,0,0];
    //left
    bbox[0] = oppbbox[0];
    //top
    if(fact>2) {
      fact = 1.5;
    } else {
      fact = 2;
    }
    fact = 1.7;
    bbox[1] = int(cy - (sizeHead*fact));
    //right
    bbox[2] = oppbbox[2];
    //bottom ===> bottom = center y - top offset + (top offset - bottom offset) / shot_factor
    // bbox[3] = cy - offset[1] + (oppbbox[3] - oppbbox[1]) * shot_factor;
    bbox[3] = bbox[1] + int((sizeHead*10) * shot_factor);
    var shot_height = bbox[3] - bbox[1];
    bbox[1] -= shot_height/8;
    bbox[3] += shot_height/8;//(3/shot_factor);
  } else {
    var offset = [cx - oppbbox[0], cy - oppbbox[1], oppbbox[2] - cx, oppbbox[3] - cy];
    var shot_height = Math.max(oppbbox[3] - oppbbox[1],oppbbox[2] - oppbbox[0]);
    var bbox = [0,0,0,0];
    //left
    bbox[0] = oppbbox[0];
    //top
    bbox[1] = cy - (shot_height / 8);
    //right
    bbox[2] = oppbbox[2];
    //bottom ===> bottom = center y - top offset + (top offset - bottom offset) / shot_factor
    bbox[3] = bbox[1] + shot_height * shot_factor;

    bbox[1] -= (bbox[3] - bbox[1])/3;
    bbox[3] += (bbox[3] - bbox[1])/3;
    // console.log(shot_height, cx, cy, (bbox[3] - bbox[1]));
  }

  bbox = [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])];

  // enlarge width or reduce width
  if(!check_collide || aspectRatio * (bbox[3] - bbox[1]) < bbox[2]-bbox[0]) {
    halfdim = aspectRatio * (bbox[3] - bbox[1]) / 2;
    bbox[0] = cx - halfdim;
    bbox[2] = cx + halfdim;
  }

  return bbox;
}

function getBBoxShotInvolved(actors_involved, aspectRatio, shot_factor, imageSize, fr_num) {
  let gaze_vect;
  let bbox = [];
  let x_centers = [];
  let y_centers = [];
  let actor_neck_position = [];
  let k=0;
  for(let act of actors_involved) {
    for(let t of act.tracks) {
      let keypointsB = frames_data[fr_num];
      let detections_track = t.detections;
      let first_frame = t.first_frame;
      let keypoints_tab;
      if(keypointsB != null && keypointsB != undefined) {
        keypoints_tab = keypointsB[detections_track[fr_num-first_frame]];
      }
      if(first_frame < fr_num && detections_track.length > (fr_num-first_frame) && keypoints_tab) {
        var boxB = getBBoxShotAdapted(aspectRatio, keypoints_tab['KeyPoints'], shot_factor, act);
        let neck_position  = keypoints_tab['KeyPoints'][1*3];
        if(neck_position == 'null') {
          let oppbbox = getBBox(keypoints_tab['KeyPoints']);
          neck_position = (oppbbox[0] + oppbbox[2])/2;
        }
        actor_neck_position.push(neck_position);
        if(!gaze_vect) {
          gaze_vect = getGazevect(keypointsB[detections_track[fr_num-first_frame]]['KeyPoints']);
          let vel = act.getVelocityVect(fr_num);
          if(vel) {
            gaze_vect = p5.Vector.add(gaze_vect, vel);
          }
        } else {
          gaze_vect = p5.Vector.add(gaze_vect, getGazevect(keypointsB[detections_track[fr_num-first_frame]]['KeyPoints']));
        }
        x_centers.push((boxB[0]+boxB[2])/2);
        y_centers.push((boxB[1]+boxB[3])/2);
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
    for(let t of act.track_bbox_shot) {
      if(t.first_frame < fr_num && t.last_frame > fr_num) {
        let b = t.bboxes[fr_num-t.first_frame];
        let curr_bbox = [b.x, b.y,b.x+b.w, b.y+b.h];
        var boxB = getBBoxShotAdapted(aspectRatio, undefined, shot_factor, act, false, curr_bbox, b.center_x, b.center_y);
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

  bbox = getAdaptedBBox(bbox, aspectRatio);

  let stage_off;
  if(cadrage_editor.is_stage_position && actor_neck_position.length!=0 && actors_involved.length==1) {
    let stage_position = int((actor_neck_position.reduce((pv, cv) => pv + cv, 0))/actor_neck_position.length);
    // console.log(actor_neck_position, stage_position);
    let stage_position_factor = Math.min(2/3,Math.max(1/3,stage_position/Number(original_width)));
    let prev_w = int(bbox[2]-bbox[0]);
    let offset = int(prev_w*stage_position_factor);
    if(!(cadrage_editor.is_gaze_direction && gaze_vect && actors_involved.length==1)) {
      bbox[0] = stage_position-offset;
      bbox[2] = bbox[0]+prev_w;
    } else {
      stage_off = (stage_position-offset)-bbox[0];
    }
  }

  if(cadrage_editor.is_gaze_direction && gaze_vect && actors_involved.length==1) {
    let s_gaze = abs((gaze_vect.x*shot_factor)/150);
    let off = gaze_vect.normalize().x*((bbox[2]-bbox[0])*s_gaze);
    if(stage_off) {
      let n_o = off;
      if(stage_off<0 && off<0) {
        n_o = Math.min(off, stage_off);
      } else if(stage_off>0 && off>0) {
        n_o = Math.max(off, stage_off);
      } else {
        n_o = off + stage_off;
      }
      off = n_o;
    }
    // console.log(off);
    bbox = [int(bbox[0]+off), bbox[1], int(bbox[2]+off), bbox[3]];
  }

  bbox = [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])];

  if((bbox[3] - bbox[1])>int(imageSize[3])) {
    let s = (1/((bbox[3] - bbox[1])/int(imageSize[3]*0.9)));
    let mid = int((x_centers.reduce((pv, cv) => pv + cv, 0))/x_centers.length);
    let half = int((int(bbox[2]*s)-int(bbox[0]*s))/2);
    bbox = [mid-half,int(bbox[1]*s),mid+half,int(bbox[3]*s)];
  } else if(bbox[2] - bbox[0] > imageSize[2]) {
    let s = 1/((bbox[2] - bbox[0])/ imageSize[2]);
    let mid = int((y_centers.reduce((pv, cv) => pv + cv, 0))/y_centers.length);
    let half = int((int(bbox[3]*s)-int(bbox[1]*s))/2);
    bbox = [int(bbox[0]*s),mid-half,int(bbox[2]*s),mid+half];
  }

  return bbox;
}

function getAdaptedBBox(bbox, aspectRatio) {
  if ((bbox[2] - bbox[0]) < aspectRatio * (bbox[3] - bbox[1])){
    // enlarge width
    halfdim = aspectRatio * (bbox[3] - bbox[1]) / 2;
    center = (bbox[0] + bbox[2]) / 2;
    bbox[0] = center - halfdim;
    bbox[2] = center + halfdim;
  } else {
    // enlarge height
    halfdim = (1 / aspectRatio) * (bbox[2] - bbox[0]) / 2;
    center = (bbox[1] + bbox[3]) / 2;
    bbox[1] = center - halfdim;
    bbox[3] = center + halfdim;
  }
  return [int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])];
}

// Get the actor gaze vector from open pose keypoints
function getGazevect(keypoints) {
  if(keypoints) {
    let xNose = keypoints[0*3];
    let yNose = keypoints[0*3+1];
    let xNeck = keypoints[1*3];
    let yNeck = keypoints[1*3+1];
    var xMid = keypoints[8*3];
    var yMid = keypoints[8*3+1];
    let bbox = getBBox(keypoints);
    let vect = createVector(xMid - xNeck,0).normalize();
    if(bbox && (bbox[2] - bbox[0]) > (bbox[3]- bbox[1])) {
      // console.log(p5.Vector.mult(createVector(xNose-xNeck, yNeck-yNeck),vect.x),createVector(xNose-xNeck, yNeck-yNeck));
      return createVector(0);
    }
    return createVector(xNose-xNeck, yNeck-yNeck);
  } else {
    return createVector(0);
  }
}

function getActorsBBoxIntersect(bbox, not_involved, aspectRatio, shot_factor, fr_num) {
  let bboxes_intersect = [];
  let lim_x_right = Math.round(original_width);
  let lim_x_left = 0;
  for(let act of not_involved) {
    for(let t of act.tracks) {
      let keypointsB = frames_data[fr_num];
      let detections_track = t.detections;
      let first_frame = t.first_frame;
      let keypoints_tab;
      if(keypointsB != null && keypointsB != undefined) {
        keypoints_tab = keypointsB[detections_track[fr_num-first_frame]];
      }
      if(first_frame < fr_num && detections_track.length > (fr_num-first_frame) && keypoints_tab) {
        let boxB = getBBoxShotAdapted(aspectRatio, keypoints_tab['KeyPoints'], shot_factor, act, true);
        if(boxB && bbox) {
          if(!(bbox[2]<boxB[0] || boxB[2]<bbox[0] || bbox[3]<boxB[1] || boxB[3] < bbox[1])) {
            bboxes_intersect.push({'bbox':boxB,'x_center':(boxB[0]+boxB[2])/2,'y_center':(boxB[1]+boxB[3])/2,'act':act});
          } else {
            if(boxB[2] < bbox[0] && boxB[2]>lim_x_left) {
              lim_x_left = boxB[2];
            } else if(boxB[0] > bbox[2] && boxB[0]<lim_x_right) {
              lim_x_right = boxB[0];
            }
          }
        }
      }
    }
    for(let t of act.track_bbox_shot) {
      if(t.first_frame < fr_num && t.last_frame > fr_num) {
        let b = t.bboxes[fr_num-t.first_frame];
        let curr_bbox = [b.x, b.y,b.x+b.w, b.y+b.h];
        let boxB = getBBoxShotAdapted(aspectRatio, undefined, shot_factor, act, true, curr_bbox, b.center_x, b.center_y);
        if(boxB && bbox) {
          if(!(bbox[2]<boxB[0] || boxB[2]<bbox[0] || bbox[3]<boxB[1] || boxB[3] < bbox[1])) {
            bboxes_intersect.push({'bbox':boxB,'x_center':b.center_x,'y_center':b.center_y,'act':act});
          } else {
            if(boxB[2] < bbox[0] && boxB[2]>lim_x_left) {
              lim_x_left = boxB[2];
            } else if(boxB[0] > bbox[2] && boxB[0]<lim_x_right) {
              lim_x_right = boxB[0];
            }
          }
        }
      }
    }
  }
  return {'bboxes_intersect':bboxes_intersect,'lim_x_left':lim_x_left,'lim_x_right':lim_x_right};
}

function updateBBox(bbox, bboxes, aspect_ratio) {
  for(let b of bboxes) {
    bbox[0] = min(int(b.bbox[0]*0.9),bbox[0]);
    bbox[2] = max(int(b.bbox[2]*1.1),bbox[2]);
  }
  bbox = getAdaptedBBox(bbox, aspect_ratio);
  return bbox;
}

// Get the bounding box shot for the actors on stage
function getBBoxShot(shotType, aspectRatio, fr_num=undefined) {
  let draw = true;
  if(!fr_num) {
    fr_num = frame_num;
  } else {
    draw = false;
  }
  let not_involved = [];
  let involved = [];
  for(let a of preparation_editor.actors_timeline) {
    if(!a.on){
      not_involved.push(a);
    } else {
      involved.push(a);
    }
  }
  let imageSize = [0, 0, Number(original_width), Number(original_height)];
  let shot_factor = getFactor(shotType);
  let lim_shot_factor = getFactor(shotType, true);
  let inter_shot_factor = (lim_shot_factor+shot_factor)/2;

  let bbox;

  if(cadrage_editor.is_intersect) {
    let i=0;
    for(let f of [lim_shot_factor, inter_shot_factor, shot_factor]) {
      let new_bbox = getBBoxShotInvolved(involved, aspectRatio, f, imageSize, fr_num);
      let bboxes_intersect = getActorsBBoxIntersect(new_bbox, not_involved, aspectRatio, f, fr_num).bboxes_intersect;
      if(bboxes_intersect.length>0 && i>0) {
        break;
      } else if (bboxes_intersect.length>0 && i==0) {
        for(let b of bboxes_intersect) {
          involved.push(b.act);
        }
        // bbox = updateBBox(new_bbox, bboxes_intersect, aspectRatio);
        bbox = getBBoxShotInvolved(involved, aspectRatio, f, imageSize, fr_num);
        break;
      }
      i++;
      bbox = new_bbox;
    }
  } else {
    bbox = getBBoxShotInvolved(involved, aspectRatio, shot_factor, imageSize, fr_num);
  }
  // bbox.forEach(function(item, i) {if(item==undefined) bbox=undefined;});
  if(!draw && bbox.indexOf(undefined)!=-1) {
    return undefined;
  }

  return bbox;
}

//Transform a p5vect to classic vector
function p5VectToJson(vect) {
  if(vect) {
    return {x:vect.x, y:vect.y};
  } else {
    return {x:0,y:0};
  }
}

// Extract a p5 Image object from the current frame
function p5ImageFromDash() {
  if(video.elt.videoWidth) {
    if(image_frame.width==0 || video.elt.videoWidth != image_frame.width) {
      image_frame = new p5.Image(video.elt.videoWidth, video.elt.videoHeight);
      image_frame.drawingContext.drawImage(video.elt, 0, 0);
    } else {
      image_frame.width = video.elt.videoWidth;
      image_frame.height = video.elt.videoHeight;
      image_frame.drawingContext.drawImage(video.elt, 0, 0);
    }
  } else {
    image_frame = new p5.Image(100,100);
  }
}

function extractVideoBook() {
  if(video.elt.textTracks.length > 0) {
    // processKeyFrames();
    var a = createA('../video_book/'+id_db, 'link');
    a.id('click');
    a.hide();
    // console.log(a);
    document.getElementById('click').click();
    a.remove();
  } else {
    alert('No book');
  }

}

function getIndex(first_frame, name) {
  var index = 0;
  let i =0;
  for(let t of tracklets_line) {
    if(t.first_frame == first_frame && t.actor_name == name) {
      index = i;
      break;
    }
    i++;
  }
  return index;
}

// Return true if all key points of openpose are detected
function isFull(keypoints) {
  var ret = true;
  for(var i = 0; i<keypoints.length; i++) {
    if(!keypoints[i] || keypoints[i] == 'null') {
      ret = false;
      break;
    }
  }
  return ret;
}

// Extract the coordinates of the ROI of all actors present in the shot bounding box
function getROI(acts, x_off, y_off, lim_w, lim_h) {
  let roi = [];
  let keypoints = frames_data[frame_num];
  for(let act_name of acts) {
    let act = preparation_editor.getAct(act_name);
    for(let t of act.tracks) {
      var detections_track = t.detections;
      var first_frame = t.first_frame;
      if(first_frame < frame_num) {
        if(detections_track.length > (frame_num-first_frame)) {
          if(detections_track[frame_num-first_frame] < keypoints.length) {
            if(keypoints[detections_track[frame_num-first_frame]]) {
              let bbox = getBBox(keypoints[detections_track[frame_num-first_frame]]['KeyPoints'], 0.05);
              bbox[1] = bbox[1]-(bbox[3]-bbox[1])*0.05;
              bbox[3] = bbox[3]+(bbox[3]-bbox[1])*0.05;
            }
            if(bbox) {
              let scale = Number(original_height)/(lim_h-y_off);
              let x = bbox[2]-x_off;
              let y = bbox[3]-y_off;
              let w = x -(bbox[0]-x_off);
              let h = y - (bbox[1]-y_off);
              bbox = [(bbox[0]-x_off)*scale, (bbox[1]-y_off)*scale, w*scale, h*scale];
              roi.push(bbox);
            }
          }
        }
      }
    }
  }
  return roi;
}

// -----------------------------------------------------------------------------------------------------------------

/*
  Update functions (for checkbox input) and select function (select element)
*/

function updateDrawShotTrace() {
  is_shots_frame_layout = this.checked();
}

function updateDrawPose() {
  render_pose = this.checked();
}

// -----------------------------------------------------------------------------------------------------------------

/*
  UI elements manager
*/

// Compare two actor timelines by name
function compare_name(a,b) {
  if (a.actor_name < b.actor_name)
    return -1;
  if (a.actor_name > b.actor_name)
    return 1;
  return 0;
}

function hideShowHeader() {
  if($('#header_info').css('display') !== 'none') {
    $('#header_info').hide();
    for(let el of selectAll('.tabs')) {
      el.position(el.position().x,0);
    }
    up_rough = true;
  } else {
    $('#header_info').show();
    for(let el of selectAll('.tabs')) {
      el.position(el.position().x,can.elt.offsetTop-30);
    }
    up_rough = true;
  }
}

function setCursor() {
  var unit_time = player.w/total_frame;
  var x_cursor = 95+Math.round(frame_num*unit_time);
  player.setXCursor(x_cursor);
}

function createVideoTimer(h) {
  player = new Player(95, h, (viewer_width-90-20), 10, video.duration(), frame_rate);
}

function createShotsTimeline() {
  shots_timeline = new ShotsTimeline(player.x, viewer_height+40, player.w, 100, video.duration(), frame_rate);
}

// Create an actor timeline with the name and the related erase button
function createActTimeline() {
  preparation_editor.createActTimeline();
}

// Clear the video editing timeline
function sanitizeFramesData() {

  for(let i=0; i<frames_data.length; i++) {
    let tab_indexes = getTrackletsIndexes(i,true);
    var ind = [];
    for(let obj of tab_indexes){
      ind.push(obj.ind)
    }
    if(frames_data[i] && ind.length != frames_data[i].length) {
      // console.log(i, ind.length, frames_data[i].length);
      for(let j=0; j<frames_data[i].length; j++){
        if(!ind.includes(j)){
          frames_data[i][j]='null';
        }
      }
    }
  }

  // shots_timeline.shots = [];
  detec_modif = true;
}

// Reset the zooming
function resetPos() {
  viewer_scale=1;
  act_timeline_scale=1;
  act_timeline_x_off=0;
  player.scale = 1;
}

//Save a json file with tracklets, actors timelines and shots information
function saveTimeline() {

  let json_act_name = preparation_editor.getTimelinesData();
  let json_tracks = preparation_editor.getTrackletsData();

  let new_json_shots = montage_editor.getShotsData();

  let annot_t = preparation_editor.getAnnotationData();

  let new_fr_data = {'Frames':frames_data};
  data_detects = new_fr_data;
  data_tracks = json_tracks;
  data_timelines = json_act_name;
  data_shots = new_json_shots;

  let detections;
  if(detec_modif) {
   console.log('detec modif');
   detections = JSON.stringify(data_detects);
  } else {
   console.log('detec modif false');
   detections = 'null';
  }
  // console.log(data_detects, data_tracks, data_timelines, data_shots);
  $.post({
    url: "submit",
    async: true,
    data: {'abs_path': abs_path, 'detec':detections, 'timeline':JSON.stringify(data_timelines), 'track':JSON.stringify(data_tracks), 'shots':JSON.stringify(data_shots), 'annotation':JSON.stringify(annot_t)},
    dataType: 'json',
    success: function (data) {
      // console.log(data);
    }
  });
   detec_modif = false;
}

// Set the position of button and check box according to the window size
function positionUIElements() {
  let k=0;
  let off = 5;
  for(let i=0; i<html_elements.length;i++) {
    let elem = html_elements[i];
    if(elem.side == true) {
      if(html_elements[i-1].elt.clientHeight>30) {
        off += html_elements[i-1].elt.clientHeight-27;
      }
      elem.position(windowWidth-160,off+k*30);
      elem.class('side')
      k++;
      elem.original_x = elem.position().x;
      elem.original_y = elem.position().y;
    }
  }
  up_rough = true;
}

// Create a tool tip assigned to an element with an information text
function processToolTip(text) {
  return function() {
    tool_tip.is_on = !tool_tip.is_on;
    if(tool_tip.is_on) {
      tool_tip.p = createP(text);
    } else {
      tool_tip.p.remove();
    }
  }
}

// Add 0 if one digit
function toTwoDigit(str) {
  if(str.length == 1) {
    return '0'+str;
  } else {
    return str;
  }
}

function clickTab(elt) {
  for( let el of document.getElementsByClassName('tabs')){el.style["background-color"] = '#2E5C9C';el.style['color'] = 'white';}
  elt.style('background-color', 'white');
  elt.style('color', '#2E5C9C');
}

function resetTabs() {
  is_preparation_editor = false;
  is_cadrage_editor = false;
  is_montage_editor = false;
  is_annotation_editor = false;
  is_export_editor = false;
  for(let el of html_elements) {
    if(el.side == true) {
      el.hide();
    }
  }
  preparation_editor.hideElts();
  cadrage_editor.hideElts();
  montage_editor.hideElts();
  annotation_editor.hideElts();
  export_editor.hideElts();
}

function updateSideElems() {
  let off = 5;
  let k=0;
  for(let i=0; i<html_elements.length;i++) {
    let elem = html_elements[i];
    if(elem.side == true && elem.elt.style.display != "none") {
      if(html_elements[i-1] && html_elements[i-1].elt.clientHeight>30) {
        off += html_elements[i-1].elt.clientHeight-27;
      }
      elem.position(windowWidth-160,off+k*32+ can.elt.offsetTop);
      k++;
    }
  }
}

// select the preparation editor
function showPreparationEditor() {
  preparation_editor.updateAndShow();
}

// select the framing editor
function showCadrageEditor() {
  cadrage_editor.updateAndShow();
}

// select the video editing editor
function showMontageEditor() {
  montage_editor.updateAndShow();
}

// select the annotation editor
function showAnnotationEditor() {
  annotation_editor.updateAndShow();
}

// select the export editor
function showExportEditor() {
  export_editor.updateAndShow();
}

// Hide all hmtl elements for showing the player in fullscreen
function hideAllElt() {
  $("#header_info").hide();
  var elems = selectAll('.aside');
  for(let el of elems){
    el.hide();
  }
  for(let el of html_elements) {
    el.hide();
  }
  for(let act of preparation_editor.actors_timeline) {
    act.elem.hide();
  }
  preparation_editor.hideElts();
  cadrage_editor.hideElts();
  montage_editor.hideElts();
  annotation_editor.hideElts();
  export_editor.hideElts();
  for(let el of selectAll('.tabs')) {
    el.hide();
  }
}

// Show all hmtl elements
function showAllElt() {

  let name = "";
  for(let el of document.getElementsByClassName('tabs')) {
    if(el.style.color != "white") {
      name = el.innerText;
    }
  }
  switch (name) {
    case 'Export':
      showExportEditor();
      break;
    case 'Cadrage':
      showCadrageEditor();
      break;
    case 'Montage':
      showMontageEditor();
      break;
    case 'Annotation':
      showAnnotationEditor();
      break;
    case 'Preparation':
      showPreparationEditor();
      break;
    default:
      showPreparationEditor();
  }
  for(let el of selectAll('.tabs')) {
    el.show();
  }

}

// -----------------------------------------------------------------------------------------------------------------

/*
  Ajax request manager
*/

// Receive the 4k image from the server
function callBackImg(data) {
  if(!playing && stock_img == 1) {
    img_hd = loadImage(data['src']);
    // console.log('New Im HD ',data['src']);
  }
  stock_img--;
}

// Ask a 4k screenshot from the original source
function imgHDRequest(rect = undefined) {
  stock_img++;
  $.post({
    url: "fullhd",
    data: {'abs_path': abs_path, 'time':time_hd},
    dataType: 'json',
    success: function (data) {
      return callBackImg(data);
    }
  });
}

// Extract key frames from subtitles
function processKeyFrames() {
  $.post({
    url : "processKeyFrames",
    data: {'abs_path': abs_path, 'KeyFrames':JSON.stringify(shots_timeline.extractKeyFrames())},
    dataType: 'json',
    success: function (data) {
      console.log(data);
    }
  });
}

function gotDetects(data) {
  data_detects = data;
  loadDetec();
}


function loadSubtile() {
  if(UrlExists(abs_path.split('kinoai')[abs_path.split('kinoai').length-1]+'/subtitle.vtt')) {
    $.post({
      url : "load_sub",
      data: {'abs_path': abs_path},
      dataType: 'json',
      success: function (data) {
        return setSubtitle(data);
      },
      error: function (error) {
        console.log('error');
      }
    });
  }
}

// Parse the openpose detections json
function parseDetec(data) {
  var json_detec_test = data['data_detec'];
  data_detects = JSON.parse(json_detec_test.replace(/&quot;/g,'"'));
  if(!Object.getOwnPropertyNames(data_detects['Frames'])) {
    frames_data = data_detects['Frames'];
  } else {
    const detec_own = Object.getOwnPropertyNames(data_detects['Frames']);
    for (var i = 0; i <= detec_own.length; i++) {
      frames_data.push(data_detects['Frames'][i]);
    }
  }
  shots_timeline.updateTimeline();
  // for(let s of shots) {
  //   s.accuracy_rate = s.getAccuracyRate();
  // }
}

// Assign subtitle to the video
function setSubtitle(data) {
  let track = video.elt.addTextTrack("captions", "French", "fr");
  track.mode = "showing";
  for(let c of data['sub']){
    track.addCue(new VTTCue(c.start, c.end, c.text));
  }
  annotation_editor.partition_editor.loadSubtitle();
}

function loadDetec() {
  $.post({
    url: "get_data_detec",
    data: {'abs_path': abs_path},
    dataType: 'json',
    success: function (data) {
      return parseDetec(data);
    }
  });
}

// -----------------------------------------------------------------------------------------------------------------

/*
  Drawing functions
*/


// Draw the open pose skeleton
function drawPose(keypoints, a=undefined) {
  let bbox;
  let x_off=0;
  let y_off=0;
  let alpha=200;
  if(is_montage_editor) {
    bbox = shots_timeline.getCurrStabShotNoScale(frame_num);
  }
  if((montage_editor.is_split || annotation_editor.is_note_book) && show_shot) {
    bbox = show_shot.getCurrStabShot(frame_num);
  }
  let sc_f;
  if(bbox) {
    sc_f = Number(original_height)/(bbox[3]-bbox[1]);
    x_off=bbox[0];
    y_off=bbox[1];
    alpha=150;
  }
  let vel = undefined;
  if(a) {
    vel = a.getVelocityVect(frame_num);
  }
  push();
  var c = color(250,100,250,alpha);
  var xNose = keypoints[0*3]-x_off;
  var yNose = keypoints[0*3+1]-y_off;
  var xNeck = keypoints[1*3]-x_off;
  var yNeck = keypoints[1*3+1]-y_off;
  var xMid = keypoints[8*3]-x_off;
  var yMid = keypoints[8*3+1]-y_off;
  if(sc_f && keypoints[1*3]>bbox[0] && keypoints[1*3]<bbox[2] && keypoints[1*3+1]>bbox[1] && keypoints[1*3+1]<bbox[3]) {
    scale(sc_f);
  }
  stroke(c);
  strokeWeight(5);
  let fact = int(dist(xNeck, yNeck, xMid, yMid)/dist(xNeck, yNeck, xNose, yNose));
  if(fact>2) {
    fact = 1.5;
  } else {
    fact = 2;
  }
  if(!bbox) {
    push();
    stroke('red');
    strokeWeight(5);
    translate(0,-100);
    let v = getGazevect(keypoints);
    line(xNeck, yNeck, xNeck+v.x, yNeck);
    let temp = xNeck+v.x;
    if(xNeck<temp) {
      triangle(temp, yNeck - 3, temp, yNeck + 3, temp +3, yNeck);
    }else {
      triangle(temp, yNeck - 3, temp, yNeck + 3, temp -3, yNeck);
    }
    if(vel) {
      translate(0,20);
      stroke('blue');
      line(xNeck, yNeck, xNeck+vel.x, yNeck);
      let temp = xNeck+vel.x;
      if(xNeck<temp) {
        triangle(temp, yNeck - 3, temp, yNeck + 3, temp +3, yNeck);
      }else {
        triangle(temp, yNeck - 3, temp, yNeck + 3, temp -3, yNeck);
      }
    }
    // if(vel && v) {
    //   translate(0,-50);
    //   stroke('green');
    //   let vect = p5.Vector.add(vel,v);
    //   line(xNeck, yNeck, xNeck+vect.x, yNeck);
    //   let temp = xNeck+vect.x;
    //   if(xNeck<temp) {
    //     triangle(temp, yNeck - 3, temp, yNeck + 3, temp +3, yNeck);
    //   }else {
    //     triangle(temp, yNeck - 3, temp, yNeck + 3, temp -3, yNeck);
    //   }
    // }
    pop();
  }
  // let sizehead = int(dist(xNeck, yNeck, xMid, yMid)/3);
  // line(xNeck+20, yNeck, xNeck+20, yNeck - sizehead*fact);
  // line(xNeck+20, yNeck, xNeck+20, (yNeck + sizehead*8));
  // text(fact, xNeck-50, yNeck-20);
  if(!bbox || (keypoints[1*3]>bbox[0] && keypoints[1*3]<bbox[2] && keypoints[1*3+1]>bbox[1] && keypoints[1*3+1]<bbox[3])) {
    line(xNose,yNose,xNeck,yNeck);
    line(xNeck, yNeck, xMid, yMid);
    for(let x of [2,5,9,12]) {
      c = color(0,250,100,alpha);
      var x3 = keypoints[(x)*3]-x_off;
      var y3 = keypoints[(x)*3+1]-y_off;
      stroke(c);
      strokeWeight(5);
      if(x<6)
        line(xNeck,yNeck,x3,y3);
      else {
        line(xMid,yMid,x3,y3);
      }
      for(var i=0; i<2; i++) {
        c = color(0,100,250,alpha);
        var j = x+i;
        var x1 = keypoints[j*3]-x_off;
        var y1 = keypoints[j*3+1]-y_off;
        var x4 = keypoints[(j+1)*3]-x_off;
        var y4 = keypoints[(j+1)*3+1]-y_off;
        stroke(c);
        strokeWeight(5);
        line(x1,y1,x4,y4);
      }
    }
    for(var i=0; i<25; i++) {
      noStroke();
      c = color(255,100,0,alpha);
      // c.setAlpha(100);
      fill(c);
      ellipse(keypoints[i*3]-x_off,keypoints[i*3+1]-y_off,5);
    }
  }
  pop();
}

// Draw the bounding box arround the actor
function drawBBox(keypoints, t) {
  var bbox = getBBox(keypoints);
  push();
  noFill();
  strokeWeight(3);
  if(t.on) {
    stroke(170,56,35);
  }
  else{
    stroke(255);
  }
  rect(bbox[0], bbox[1], bbox[2]-bbox[0], bbox[3]-bbox[1]);
  noStroke();
  fill(255);
  text(t.actor_name, bbox[0], bbox[1]-5);
  pop();
  t.setBBox(bbox);
}

// draw the playing status button
function drawStatus() {
  let h = player.y+15;
  push();
  fill(220);
  ellipse(40, h-35, 60);
  if(!playing) {
    fill(100);
    noStroke();
    triangle(30, h-50, 30 , h-20, 55, h-35);
  } else {
    fill(100);
    noStroke();
    rect(30, h-50, 7, 30);
    rect(45, h-50, 7, 30);
  }
  pop();
}

// -----------------------------------------------------------------------------------------------------------------

/*
  unused functions
*/

function enhancePose(l_offset, r_offset, index, k, first_frame, detections_track) {
  const reducer = (accumulator, currentValue) => accumulator + currentValue;
  var keypoints = k;

  var new_poses = [];
  var poses_null = [];
  var len = keypoints.length / 3;
  for(var i = 0; i<len; i++) {
    if(!keypoints[i*3] || keypoints[i*3] == "null") {
      poses_null.push(i*3);
    }
  }

  for(var x=0; x<poses_null.length; x++) {
    var j = poses_null[x];
    var n_p = {};
    n_p.Id = j;
    var means_x = [];
    var means_y = [];
    var means_c = [];
    for(var i=index-l_offset; i<index+r_offset; i++){
      if(i!=index) {
        var frame_keypoint = frames_data[first_frame+i];
        var keypoints_to_compute = frame_keypoint[detections_track[i]]['KeyPoints'];
        if(keypoints_to_compute[j] && keypoints_to_compute[j]!='null') {
          means_x.push(keypoints_to_compute[j]);
          means_y.push(keypoints_to_compute[j+1]);
          means_c.push(keypoints_to_compute[j+2]);
        }
      }
    }
    n_p.MeansX = means_x;
    n_p.MeansY = means_y;
    n_p.MeansC = means_c;
    new_poses.push(n_p);
  }
  for(var i = 0; i<new_poses.length; i++) {
    if(new_poses[i].MeansX.length>1)
      keypoints[new_poses[i].Id] = new_poses[i].MeansX.reduce(reducer) / new_poses[i].MeansX.length;
    if(new_poses[i].MeansY.length>1)
      keypoints[new_poses[i].Id+1] = new_poses[i].MeansY.reduce(reducer) / new_poses[i].MeansY.length;
    if(new_poses[i].MeansC.length>1)
      keypoints[new_poses[i].Id+2] = new_poses[i].MeansC.reduce(reducer) / new_poses[i].MeansC.length;
  }
  return keypoints;
}

function getStartEndImg() {
  if(shots_timeline.released) {
    loadPixels();
    var b = false;
    for(var i=0; i<viewer_height; i++) {
      for(var j=0; j<viewer_width; j++) {
        var index = (i*windowWidth+j)*4;
        if(pixels[index+0]!=back_color) {
          b = true;
          break;
        }
      }
    }
    if(b) {
      img = createImage(viewer_width, viewer_height);
      img.loadPixels();
      for(var i=0; i<viewer_height; i++) {
        for(var j=0; j<viewer_width; j++) {
          var index = (i*windowWidth+j)*4;
          var c = color(pixels[index+0], pixels[index+1], pixels[index+2]);
          img.set(j, i, c);
        }
      }
      img.updatePixels();
      shots_timeline.drop_shot.img_start = img;
      shots_timeline.released = false;
    }
    updatePixels();
  }
}

function smoothDetections(off) {
  for(let t of tracklets_line) {
    var detections_track = t.detections;
    var first_frame = t.first_frame;
    for(var j=0; j<detections_track.length; j++) {
      var keypoints = frames_data[first_frame+j];
      var l_offset
      if(j<off)
        l_offset = j;
      else {
        l_offset = off;
      }
      var r_offset;
      if(j>detections_track.length-off)
        r_offset = detections_track.length-j;
      else {
        r_offset = off;
      }
      if(!isFull(keypoints[detections_track[j]]['KeyPoints'])) {
        var test = enhancePose(l_offset, r_offset, j, keypoints[detections_track[j]]['KeyPoints'], first_frame, detections_track);
        frames_data[first_frame+j][detections_track[j]]['KeyPoints'] = test;
      }
    }
  }
}


// -----------------------------------------------------------------------------------------------------------------

/*
  Main setup and draw P5
*/

function setup() {
  tool_tip.is_on = false;
  tool_tip.text = "";
  // loadJSON(json_detec, gotDetects);
  loadDetec();
  if(video) {

    submit = createButton('Save');
    submit.id('submit');
    if(!sub_granted) {
      submit.hide();
    } else {
      submit.mouseOver(processToolTip('Save your work'));
      submit.mouseOut(processToolTip(''));
      html_elements.push(submit);
      submit.mousePressed(saveTimeline);
    }

    hide_show_header_button = createButton('Hide/Show Header');
    hide_show_header_button.mouseOver(processToolTip('Hide or show the header'));
    hide_show_header_button.mouseOut(processToolTip(''));
    html_elements.push(hide_show_header_button);
    hide_show_header_button.mousePressed(hideShowHeader);

    reset_pos = createButton('Reset Pos');
    reset_pos.mouseOver(processToolTip('Reset the scale factor'));
    reset_pos.mouseOut(processToolTip(''));
    html_elements.push(reset_pos);
    reset_pos.mousePressed(resetPos);

    check_render_pose = createCheckbox('Render pose', false);
    check_render_pose.mouseOver(processToolTip('Show the openpose detections on the viewer'));
    check_render_pose.mouseOut(processToolTip(''));
    html_elements.push(check_render_pose);
    check_render_pose.size(150,30);
    check_render_pose.changed(updateDrawPose);

    check_render_shot_trace = createCheckbox('Render shots frame', false);
    check_render_shot_trace.mouseOver(processToolTip('Show bounding box of the created shots'));
    check_render_shot_trace.mouseOut(processToolTip(''));
    html_elements.push(check_render_shot_trace);
    check_render_shot_trace.size(150,30);
    check_render_shot_trace.changed(updateDrawShotTrace);

    cadrage_editor = new CadrageEditor();
    montage_editor = new MontageEditor();
    annotation_editor = new AnnotationEditor();
    export_editor = new ExportEditor();
    preparation_editor = new PreparationEditor();

    loadSubtile();
    scale_ratio = video.elt.videoWidth/Number(original_width);
    aspect_ratio = Number(original_width)/Number(original_height);
    ratio_type = aspect_ratio;
    viewer_height = windowHeight*((1/2)*viewer_scale);
    createVideoTimer(viewer_height-15);

    createShotsTimeline();

    preparation_editor.loadActorTimelines();

    annotation_editor.loadAnnotationEditorData();

    montage_editor.loadMontageEditorData();

    cadrage_editor_button = createButton('Cadrage');
    cadrage_editor_button.mouseOver(processToolTip('Interface de cadrage'));
    cadrage_editor_button.mouseOut(processToolTip(''));
    cadrage_editor_button.position(150, can.elt.offsetTop-30);
    cadrage_editor_button.class('tabs');
    cadrage_editor_button.mousePressed(showCadrageEditor);

    montage_editor_button = createButton('Montage');
    montage_editor_button.mouseOver(processToolTip('Interface de montage'));
    montage_editor_button.mouseOut(processToolTip(''));
    montage_editor_button.position(300, can.elt.offsetTop-30);
    montage_editor_button.class('tabs');
    montage_editor_button.mousePressed(showMontageEditor);

    annotation_editor_button = createButton('Annotation');
    annotation_editor_button.mouseOver(processToolTip("Interface d'annotation"));
    annotation_editor_button.mouseOut(processToolTip(''));
    annotation_editor_button.position(450, can.elt.offsetTop-30);
    annotation_editor_button.class('tabs');
    annotation_editor_button.mousePressed(showAnnotationEditor);

    export_editor_button = createButton('Export');
    export_editor_button.mouseOver(processToolTip("Interface d'export"));
    export_editor_button.mouseOut(processToolTip(''));
    export_editor_button.position(600, can.elt.offsetTop-30);
    export_editor_button.class('tabs');
    export_editor_button.mousePressed(showExportEditor);

    preparation_editor_button = createButton('Preparation');
    preparation_editor_button.mouseOver(processToolTip('Interface de preparation'));
    preparation_editor_button.mouseOut(processToolTip(''));
    preparation_editor_button.position(0, can.elt.offsetTop-30);
    preparation_editor_button.class('tabs');
    preparation_editor_button.mousePressed(showPreparationEditor);
    //
    // extract_video_book = createButton('Video Book');
    // extract_video_book.mouseOver(processToolTip('Go to the video book based on the subtitles'));
    // extract_video_book.mouseOut(processToolTip(''));
    // html_elements.push(extract_video_book);
    // extract_video_book.mousePressed(extractVideoBook);

    // extract_keyframes = createButton('Extract Keyframes');
    // extract_keyframes.mouseOver(processToolTip('Extract an image for each subtitle'));
    // extract_keyframes.mouseOut(processToolTip(''));
    // html_elements.push(extract_keyframes);
    // extract_keyframes.mousePressed(processKeyFrames);
    //
    // if(rough_json) {
    //   exploit_rough = createButton('Roughisation');
    //   exploit_rough.mouseOver(processToolTip('Create a rough cut for the video based on the note'));
    //   exploit_rough.mouseOut(processToolTip(''));
    //   html_elements.push(exploit_rough);
    //   exploit_rough.mousePressed(exploitRoughCut);
    // }

    act_input = createInput();
    act_input.side = false;
    html_elements.push(act_input);
    act_input.changed(createActTimeline);
    act_input.position(0, viewer_height+1);

    crop_button = new Button(act_input.position().x+15,viewer_height+10,15);

    let k=0;
    let off = 5;
    for(let i=0; i<html_elements.length;i++) {
      let elem = html_elements[i];
      if(elem.side == undefined) {
        elem.side = true;
        if(html_elements[i-1] && html_elements[i-1].elt.clientHeight>30) {
          off += html_elements[i-1].elt.clientHeight-27;
        }
        elem.position(windowWidth-160,off+k*30);
        elem.class('side')
        k++;
      }
      elem.original_x = elem.position().x;
      elem.original_y = elem.position().y;
    }
  }
  frameRate(frame_rate);
  total_frame = Math.floor(video.duration()*frame_rate);
  montage_editor.createContextShot();
  showAllElt();
}

function draw() {

  if(annotation_editor.is_note_book || is_montage_editor || is_cadrage_editor) {
    p5ImageFromDash();
  } else {
    image_frame = video;
  }
  if(video.duration()) {
    total_frame = Math.floor(video.duration()*frame_rate);
    frame_num = Math.floor(video.time()*frame_rate)%total_frame+1;
  }

  // ---------------------------------------------------------------
  // Manage the UI elements and resize them
  // ---------------------------------------------------------------
  var x_vid = 0;
  var y_vid = 0;
  mid_width = windowWidth*(3/5);
  viewer_height = windowHeight*((1/2)*viewer_scale);

  if(double_click) {
    if(!fullscreen()) {
      showAllElt();
      hideShowHeader();
    } else {
      hideAllElt();
    }
    double_click = false;
  }

  if(viewer_width!=mid_width || up_rough || can.height != windowHeight-can.elt.offsetTop-5){

    if($('#header_info').css('display') !== 'none') {
      can.size(windowWidth, windowHeight-can.elt.offsetTop-5);
    } else {
      can.size(windowWidth, windowHeight-can.elt.offsetTop-5);
      can.position(0,30);
    }

    if(!fullscreen()) {
      if(is_preparation_editor) {
        preparation_editor.resizeElt();
      }
      if(is_cadrage_editor) {
        cadrage_editor.resizeElt();
      }
      if(is_montage_editor) {
        montage_editor.resizeElt();
      }
      if(is_annotation_editor) {
        annotation_editor.resizeElt();
      }
      if(is_export_editor) {
        export_editor.resizeElt();
      }
      updateSideElems();
      for(let elem of html_elements) {
        if(!elem.side) {
          let x = elem.original_x;
          let y = elem.original_y + can.elt.offsetTop;
          elem.position(x,y)
        }
      }
      act_input.position(130, can.elt.offsetTop+viewer_height+1);

      for(let el of selectAll('.tabs')) {
        el.position(el.position().x,can.elt.offsetTop-30);
      }
    }

    up_rough = false;
  }

  // ---------------------------------------------------------------
  // Compute the canvas size + the player and offset size
  // ---------------------------------------------------------------
  x_off = 0;
  y_off = 0;
  if(fullscreen()) {
    mid_width = screen.width;
    if(can.height<=screen.height){
      can.size(screen.width, screen.height);
    }
    if(screen.width/aspect_ratio < screen.height) {
      viewer_width = screen.width;
      viewer_height = screen.width/aspect_ratio;
      y_vid = (screen.height - viewer_height) / 2;
    } else {
      viewer_height = screen.height;
      viewer_width = viewer_height*aspect_ratio;
      x_vid = (screen.width - viewer_width) / 2;
    }
    vid_h = viewer_height;
    vid_w = viewer_width;
    background(0);
  } else {
    if(can.height>=screen.height){
      can.size(windowWidth, viewer_height * 2-5);
    }
    viewer_width = mid_width;
    viewer_height = windowHeight*((1/2)*viewer_scale);
    if(viewer_height*aspect_ratio>mid_width){
      vid_h = mid_width/aspect_ratio;
      vid_w = mid_width;
    } else {
      vid_h = viewer_height;
      vid_w = vid_h*aspect_ratio;
    }
    x_off = (mid_width - vid_w)/2;
    y_off = (viewer_height-vid_h)/2;
    background(255);
    push();
    fill(0);
    rect(0,0,mid_width, viewer_height);
    fill(back_color);
    rect(0,viewer_height,viewer_width, viewer_height*2);
    pop();
  }
  scale_ratio = video.elt.videoWidth/Number(original_width);

  // ---------------------------------------------------------------
  // Manage the helping message system
  // ---------------------------------------------------------------
  noStroke();
  if(tool_tip.is_on) {
    tool_tip.p.style('background-color','white');
    tool_tip.p.style('border','1px solid grey');
    tool_tip.p.position(mouseX, can.elt.offsetTop+mouseY);
  }

  // ---------------------------------------------------------------
  // Display the original video or the choosen rush
  // ---------------------------------------------------------------
  push();
  let x = x_off;
  let y = y_off;
  if(x < 0){ x=0;}
  if(y<0){y=0;}
  translate(x, y)
  if( (!is_shots_frame_layout && is_montage_editor) || ((montage_editor.is_split && show_shot)|| annotation_editor.is_note_book)) {
    if(video.duration()) {
      let bbox;
      if(is_montage_editor && !(montage_editor.is_split)) {
        bbox = shots_timeline.getCurrStabShot(frame_num);
      }
      if((crop_button.on || montage_editor.is_split || annotation_editor.is_note_book) && show_shot) {
        bbox = show_shot.getCurrStabShotScale(frame_num);
      }
      if (bbox) {
          var a_s;
          if(is_montage_editor && !show_shot) {
            a_s = shots_timeline.getCurrShot(frame_num).aspect_ratio;
          }
          if((montage_editor.is_split || annotation_editor.is_note_book) && show_shot) {
            a_s = show_shot.aspect_ratio;
          }
          if(!a_s){a_s = aspect_ratio;}
          if(vid_h*a_s<mid_width) {
            x_vid = (vid_w - vid_h*a_s)/2;
            vid_w = vid_h*a_s;
            if(vid_h == screen.height) {
              x_vid = (screen.width - viewer_width) / 2;
            }
          } else {
            vid_w = mid_width;
            x_vid=0;
            translate(-x, 0);
            x=0;
            y_vid = (vid_h - vid_w/a_s)/2;
            if(vid_w == screen.width) {
              y_vid = (screen.height - viewer_height) / 2;
            }
            vid_h = vid_w/a_s;
          }
          x_off+=x_vid;
          y_off+=y_vid;
          if(img_hd) {
            let ratio = img_hd.width / video.elt.videoWidth;
            image(img_hd, x_vid,y_vid,vid_w,vid_h, bbox[0]*ratio, bbox[1]*ratio, bbox[2]*ratio - bbox[0]*ratio, bbox[3]*ratio - bbox[1]*ratio);
          } else {
            image(image_frame, x_vid,y_vid,vid_w,vid_h, bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
          }
      } else {
        if(img_hd) {
          image(img_hd, x_vid,y_vid,vid_w,vid_h);
        } else {
          image(image_frame, x_vid,y_vid,vid_w,vid_h); // draw a second copy to canvas
        }
      }
    }
  } else {
    if(img_hd) {
      image(img_hd, x_vid,y_vid,vid_w,vid_h); // draw a second copy to canvas
    } else {
      image(image_frame, x_vid,y_vid,vid_w,vid_h); // draw a second copy to canvas
    }
  }
  pop();

  // getStartEndImg();

  if(!fullscreen()) {
    let w = player.w;
    player.updatePos(95, viewer_height-15, (viewer_width-90-20), 10);
    setCursor();
    player.display();
    drawStatus();
    if(w!=player.w){shots_timeline.updatePos();}

    if(is_preparation_editor) {
      preparation_editor.display();
    }
    if(is_cadrage_editor) {
      cadrage_editor.display();
    }
    if(is_montage_editor) {
      montage_editor.display();
    }
    if(is_annotation_editor) {
      annotation_editor.display();
    }
    if(is_export_editor) {
      export_editor.display();
    }

    if(keyIsDown(17)) {
      keyDown = 17;
    }

  } else {
    // hideAllElt();
    // createVideoTimer(y_vid + viewer_height-15);
    player.updatePos(95, y_vid + viewer_height-15, (viewer_width-90-20), 10);
    push();
    if(vid_h == screen.height) {translate(x_vid,0);}
    drawStatus();
    setCursor();
    player.display();

    if(x_off<0){x_off=0;}
    if(y_off<0){y_off=0;}
    push();
    if(vid_h != screen.height) {translate(x_vid,y_vid);}
    scale(vid_h/Number(original_height));
    if((is_montage_editor || is_cadrage_editor) && is_shots_frame_layout) {
      montage_editor.drawShotsLayout();
    }
    if(render_pose)
      preparation_editor.drawTracklets();
    pop();
    pop();
  }

  // Show the informations in the player
  preparation_editor.displayCounter();

}

// -----------------------------------------------------------------------------------------------------------------

/*
  Events manager
*/

function mousePressed() {

  if(is_preparation_editor) {
    preparation_editor.mousePressed(mouseX, mouseY);
  }
  if(is_cadrage_editor) {
    cadrage_editor.mousePressed(mouseX, mouseY);
  }
  if(is_montage_editor) {
    montage_editor.mousePressed(mouseX, mouseY);
  }
  if(is_annotation_editor) {
    annotation_editor.mousePressed(mouseX, mouseY);
  }
  if(is_export_editor) {
    export_editor.mousePressed(mouseX, mouseY);
  }


  if((montage_editor.is_split || annotation_editor.is_note_book) && (mouseY>viewer_height || mouseX>viewer_width)) {
    let b = false;
    for(let s of montage_editor.shots) {
      if(s.showInViewer(mouseX, mouseY)) {
        show_shot = s;
        b = true;
        break;
      }
    }
    if(!b) {
      show_shot = undefined;
    }
  }

  if(mouseX<width && mouseY < height) {
    var retime = false;

    player.on = false;
    player.click(mouseX, mouseY);
    if(player.on) {
      retime = true;
      video.time(player.time);
      img_hd = undefined;
    }
    if(!retime) {
      if(mouseX >0 && mouseY>0 && mouseY < viewer_height && mouseX < viewer_width) {
        if(bbox_creation) {
          dash_player.pause();
          img_hd = undefined;
        }else if (playing) {
          time_hd = video.time();
          imgHDRequest();
          dash_player.pause();
        } else {
          dash_player.play();
          img_hd = undefined;
        }
        playing = !playing; // set the video to loop and start playing
      }
    }
    if(is_cadrage_editor || is_montage_editor) {
      crop_button.click(mouseX, mouseY);
    }
  }
  keyCode = undefined;
}


function mouseDragged() {

  if(is_preparation_editor) {
    preparation_editor.drag(mouseX, mouseY);
  }
  if(is_cadrage_editor) {
    cadrage_editor.drag(mouseX, mouseY);
  }
  if(is_montage_editor) {
    montage_editor.drag(mouseX, mouseY);
  }
  if(is_annotation_editor) {
    annotation_editor.drag(mouseX, mouseY);
  }
  if(is_export_editor) {
    export_editor.drag(mouseX, mouseY);
  }

  dash_player.pause();
  playing = false;

  player.dragNavBar(mouseX, mouseY);

  player.drag(mouseX, mouseY);

}

function mouseReleased() {
  player.drop();

  if(is_preparation_editor) {
    preparation_editor.drop(mouseX, mouseY);
  }
  if(is_cadrage_editor) {
    cadrage_editor.drop(mouseX, mouseY);
  }
  if(is_montage_editor) {
    montage_editor.drop(mouseX, mouseY);
  }
  if(is_annotation_editor) {
    annotation_editor.drop(mouseX, mouseY);
  }
  if(is_export_editor) {
    export_editor.drop(mouseX, mouseY);
  }

}


function mouseWheel(event) {
  if(keyIsPressed) {
    //shift key = 16
    if(keyCode===16) {
      if(event.delta<0) {
          viewer_scale += 0.1;
          up_rough=true;
      } else {
          viewer_scale -= 0.1;
          up_rough=true;
      }
      // console.log(event.delta, viewer_scale);
    }
    //z = 122
  }
  if((montage_editor.is_split || annotation_editor.is_note_book) &&
  (mouseX >0 && mouseX < mid_width)) {
    // increase offset_split
    if(event.delta<0) {
      if(offset_split>0)
        offset_split--;
    } else {
        offset_split++;
    }
    // offset_split++;
  }
  player.mouseWheel(event);
  if(is_annotation_editor) {
    annotation_editor.mouseWheel(event);
  }
}

function doubleClicked() {
  var fs = fullscreen();
  if(mouseX<viewer_width && mouseY<viewer_height) {
    fullscreen(!fs);
    double_click = true;
  }
  if(is_montage_editor) {
    montage_editor.doubleClicked(mouseX, mouseY);
  }
}

document.addEventListener("fullscreenchange", function( event ) {
    double_click = true;
});

function keyPressed() {

  if(is_preparation_editor) {
    preparation_editor.keyPressed(keyCode);
  }
  if(is_cadrage_editor) {
    cadrage_editor.keyPressed(keyCode);
  }
  if(is_montage_editor) {
    montage_editor.keyPressed(keyCode);
  }
  if(is_annotation_editor) {
    annotation_editor.keyPressed(keyCode);
  }
  if(is_export_editor) {
    export_editor.keyPressed(keyCode);
  }

  if (keyCode === 32) {
    if(!annotation_editor.is_note_editor && !annotation_editor.is_partition_editor) {
      if (playing) {
        time_hd = video.time();
        imgHDRequest();
        dash_player.pause();
      } else {
        dash_player.play();
        img_hd = undefined;
      }
      playing = !playing;
    }
  } else if(keyCode == 37) {
    img_hd = undefined;
    video.time(video.time()-0.05);
  } else if(keyCode == 39) {
    img_hd = undefined;
    video.time(video.time()+0.05);
  }

}

// -----------------------------------------------------------------------------------------------------------------
