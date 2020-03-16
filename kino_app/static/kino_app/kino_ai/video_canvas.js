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
var scale_ratio;
var data_detects;
var data_tracks = {};
var data_timelines = {};
var data_shots = {};
var data_annotation_timeline = {};
var data_partitions;
var tracks_data = [];
var frames_data = [];
var frame_rate = Number(original_frame_rate);
var total_frame;
var frame_num;
var tracklets_line = [];
var actors_timeline = [];
var div_actors_timeline;
var shots = [];
var go_track = [];
var act_input;
var erase_button = [];
var annotation_timeline;
var viewer_scale = 1;
var act_timeline_scale = 1;
var act_timeline_x_off = 0;
var pos_wheel = 0;
var submit;
var reframe_button;
var hide_show_header_button;
var draw_track;
var shot_creation;
var is_shot_creation = false;
var intersect;
var is_intersect = false;
var stage_position;
var is_stage_position = true;
var gaze_direction;
var is_gaze_direction = true;
var all_types;
var is_all_types = true;
var show_context;
var is_show_context = true;
var show_tracks;
var is_show_tracks = false;
var show_shots;
var is_show_shots = false;
var hidden_state;
var offstage_state;
var is_draw_track = false;
var is_shots =false;
var render_pose = false;
var check_render_pose;
var check_render_shot_trace;
var exploit_rough;
var create_bbox;
var bbox_creation = false;
var curr_creation = undefined;
var sanitize;
var reset_pos;
var get_actors_on_stage;
var get_meta_data;
var extract_video_book;
var extract_keyframes;
var split_screen;
var is_split = false;
var annotation_edit;
var is_annotation = false;
var offset_split = 0;
var note_book;
var is_note_book = false;
var is_note_editor = false;
var note_editor;
var is_partition_editor = false;
var partition_editor;
var div_sub;
var tab_sub = [];
var is_timer = false;
var player;
var dash_player;
var table_scroll;
var table_tracks;
var keyDown;
var remove_timeline = false;
var shot_selector;
var ratio_selector;
var shot_type='BCU';
var ratio_type =1;
var shots_timeline;
var show_shot;
var save_shot;
var editing_button;
var crop_button;
var aspect_ratio;
var add_shot = [];
var img;
var img_hd;
var image_frame;
var time_hd=0;
var stock_img=0;
var detec_modif = false;
var rough_json = undefined;
var up_rough = false;
var tool_tip = {};
var video_element;

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
  json_user_timeline = [];
  for(let name of json_data_timelines) {
    let obj = {};
    obj.User = name;
    obj.Data = loadJSON("/media"+abs_path.split('media')[1]+"/"+name+"_timelines.json");
    json_user_timeline.push(obj);
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

// Active the shots choosen by the user for the notebook
function getShotsFromActs() {
  let acts = [];
  for(let a of actors_timeline) {
    if(a.on) {
      acts.push(a.actor_name);
    }
  }
  // if(all_on_stage) {
  // }
  let printed_shots = [];
  for(let s of shots) {
    let b = false;
    for(let a of s.actors_involved) {
      if(acts.includes(a.actor_name)) {
        b = true;
        break;
      }
    }
    if(b && s.actors_involved.length == 1 && s.aspect_ratio == aspect_ratio) {
      s.on = true;
      printed_shots.push(s);
    } else {
      s.on = false;
      s.bbox_show = [];
    }
  }

  printed_shots.sort(sortShotsByActPosition);
  printed_shots.sort(sortShotsByType);
  return printed_shots;
}
// Get the factor scale factor based on the types
function getFactor(type, prev=false) {
  var shot_factor = 1;
  switch (type){
    case 'BCU':
      if(!prev)
        shot_factor = 1/7;
      else
        shot_factor = 1/9;
      break;
    case 'CU':
      if(!prev)
        shot_factor = 1/5;
      else
        shot_factor = 1/7;
      break;
    case 'MCU':
      if(!prev)
        shot_factor = 1/3;
      else
        shot_factor = 1/5;
      break;
    case 'MS':
      if(!prev)
        shot_factor = 1/2;
      else
        shot_factor = 1/3;
      break;
    case 'MLS':
      if(!prev)
        shot_factor = 2/3;
      else
        shot_factor = 1/2;
      break;
    case 'FS':
      if(!prev)
        shot_factor = 1;
      else
        shot_factor = 2/3;
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
function getBBoxShotAdapted(aspectRatio, keypoints, shot_factor, check_collide = false, curr_bbox = undefined, c_x = undefined, c_y = undefined) {
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
        var boxB = getBBoxShotAdapted(aspectRatio, keypoints_tab['KeyPoints'], shot_factor);
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
        var boxB = getBBoxShotAdapted(aspectRatio, undefined, shot_factor, false, curr_bbox, b.center_x, b.center_y);
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
  if(is_stage_position && actor_neck_position.length!=0) {
    let stage_position = int((actor_neck_position.reduce((pv, cv) => pv + cv, 0))/actor_neck_position.length);
    let stage_position_factor = Math.min(2/3,Math.max(1/3,stage_position/Number(original_width)));
    let prev_w = int(bbox[2]-bbox[0]);
    let offset = int(prev_w*stage_position_factor);
    if(!(is_gaze_direction && gaze_vect && actors_involved.length==1)) {
      bbox[0] = stage_position-offset;
      bbox[2] = bbox[0]+prev_w;
    } else {
      stage_off = (stage_position-offset)-bbox[0];
    }
  }

  if(is_gaze_direction && gaze_vect && actors_involved.length==1) {
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
        let boxB = getBBoxShotAdapted(aspectRatio, keypoints_tab['KeyPoints'], shot_factor, true);
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
        let boxB = getBBoxShotAdapted(aspectRatio, undefined, shot_factor, true, curr_bbox, b.center_x, b.center_y);
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
  for(let a of actors_timeline) {
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

  if(is_intersect) {
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

// Get the index of a specific shot (type and actors involved)
function getShot(tab, type, actors_involved) {
  let ret = undefined;
  for(let i=0; i< tab.length; i++) {
    let s = tab[i];
    if(s.type == type) {
      let b1 = true;
      for(let a of s.actors_involved) {
        if(!actors_involved.includes(a.actor_name)) {
          b1 = false;
          break;
        }
      }
      if(b1 && s.actors_involved.length == actors_involved.length) {
        ret = i;
        break;
      }
    }
  }
  return ret;
}

// Get shot
function getShotAspect(type, actors_involved, aspect_ratio, intersect, stage_pos, gaze_dir) {
  let ret = undefined;
  let acts = [];
  for(let a of actors_involved) {
    acts.push(a.actor_name);
  }
  for(let s of shots) {
    if(s.type == type && s.aspect_ratio == aspect_ratio && intersect == s.is_intersect && stage_pos == s.is_stage_position && gaze_dir == s.is_gaze_direction) {
      let b1 = true;
      for(let a of s.actors_involved) {
        if(!acts.includes(a.actor_name)) {
          b1 = false;
          break;
        }
      }
      if(b1 && s.actors_involved.length == acts.length) {
        ret = s;
        break;
      }
    }
  }
  return ret;
}

// Get the Object actor timeline from an actor name
function getAct(name) {
  let ret;
  for(let a of actors_timeline) {
    if(a.actor_name == name) {
      ret = a;
      break;
    }
  }
  return ret;
}

// Get the names of the actors present on stage
function getActOnStage(fr_n) {
  let ret = [];
  for(let a of actors_timeline) {
    if(a.isOnstage(fr_n)) {
      ret.push(a.actor_name);
    }
  }
  return ret;
}

// Get the indexes of the tracklets
function getTrackletsIndexes(fr_n=undefined,added=false,just_acts=false) {
  if(!fr_n) {
    fr_n =frame_num;
  }
  var keypoints = frames_data[fr_n];
  let tab = [];
  if(keypoints) {
    if(!just_acts) {
      for (let t of tracklets_line) {
        if((added || !t.added) && !t.old) {
          var detections_track = t.detections;
          var first_frame = t.first_frame;
          if(first_frame < fr_n) {
            if(detections_track.length > (fr_n-first_frame)) {
              if(detections_track[fr_n-first_frame] < keypoints.length) {
                let obj = {};
                obj.ind = detections_track[fr_n-first_frame];
                obj.track = t;
                tab.push(obj);
              }
            }
          }
        }
      }
    }
    for(let act of actors_timeline) {
      for(let t of act.tracks) {
        var detections_track = t.detections;
        var first_frame = t.first_frame;
        if(first_frame < fr_n) {
          if(detections_track.length > (fr_n-first_frame)) {
            if(detections_track[fr_n-first_frame] < keypoints.length) {
              let obj = {};
              obj.ind = detections_track[fr_n-first_frame];
              obj.track = t;
              obj.act = act;
              tab.push(obj);
            }
          }
        }
      }
    }
  }
  return tab;
}

// Get a list of all the shots where at least one of actor involved is present on stage
function getShotsOnStage() {
  let ret = [];
  for(let s of shots) {
    let is_on=false;
    for(let a of s.actors_involved) {
      if(getActOnStage(frame_num).includes(a.actor_name)) {
        is_on = true;
        break;
      }
    }
    if(is_on) {
      ret.push(s);
    }
  }
  return ret;
}

// Extract a Json file with the list of actors on stage at each frame
function getListOnStage() {
  let ret = [];
  for(let i=1; i<total_frame+1; i++) {
    ret.push(getActOnStage(i));
  }
  createStringDict(ret).saveJSON('actors_on_stage');
  // for(let act of actors_timeline) {
  //   // ret.push(act.extractMovement());
  //   let tab = [];
  //   let curr = [];
  //   for(let obj of act.extractMovement()) {
  //     if(obj.Mvt != 0) {
  //       curr.push(obj.Frame)
  //     } else {
  //       if(curr.length > 3) {
  //         tab.push(curr);
  //       }
  //       curr = [];
  //     }
  //   }
  //   ret.push(tab);
  // }
  // console.log(ret);
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

// Extract the meta data for each actors on stage at each frame
function getFrameMetaData() {
  let ret = [];
  for(let i=1; i<total_frame+1; i++) {
    let tab_indexes = getTrackletsIndexes(i, false, true);
    let keypoints = frames_data[i];
    let o = {};
    o.ActsOnStage = [];
    for( let obj of tab_indexes) {
      if(obj.act && keypoints[obj.ind]) {
        let meta_data = {};
        meta_data.ActName = obj.act.actor_name;
        let bbox = getBBox(keypoints[obj.ind]['KeyPoints']);
        meta_data.BoundingBox = {w:int(bbox[2]-bbox[0]),l:int(bbox[3]-bbox[1])};
        meta_data.Surface = meta_data.BoundingBox.w * meta_data.BoundingBox.l;
        meta_data.GazeVect = p5VectToJson(getGazevect(keypoints[obj.ind]['KeyPoints']));
        meta_data.VelocityVect = p5VectToJson(obj.act.getVelocityVect(i));
        meta_data.KeyPoints = keypoints[obj.ind]['KeyPoints'];
        o.ActsOnStage.push(meta_data);
      }
    }
    ret.push(o);
  }
  // console.log(ret);
  createStringDict(ret).saveJSON('frames_metadata');
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
    let act = getAct(act_name);
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

// Return true if the shot already exist
function testShot(r) {
  let b = false;
  for(let s of shots) {
    if(s.type == r.Type) {
      let b1 = true;
      for(let a of s.actors_involved) {
        if(!r.ActInvolved.includes(a.actor_name)) {
          b1 = false;
          break;
        }
      }
      if(b1 && s.actors_involved.length == r.ActInvolved.length) {
        b = true;
        break;
      }
    }
  }
  var tab = [];
  for(let a of actors_timeline) {
    tab.push(a.actor_name);
  }
  for(let i=0; i<r.ActInvolved.length; i++) {
    if(!tab.includes(r.ActInvolved[i])) {
      console.log(r.ActInvolved[i]);
      b = false;
    }
  }
  return b;
}

// -----------------------------------------------------------------------------------------------------------------

/*
  Update functions (for checkbox input) and select function (select element)
*/

function updateDrawTrack() {
  is_draw_track = this.checked();
}

function updateDrawShotTrace() {
  is_shots = this.checked();
}

function updateDrawPose() {
  render_pose = this.checked();
}

function updateShotCreate() {
  is_shot_creation = this.checked();
  $('#div_creation').remove();
  if(!is_shot_creation) {
    for(let a of actors_timeline) {
      a.elem.remove();
      a.elem = createElement('h3', a.actor_name);
      a.elem.elt.contentEditable = 'true';
      a.elem.id('editor');
      div_actors_timeline.child(a.elem);
    }
  } else {
    let div_creation = createDiv();
    div_creation.id('div_creation');
    div_creation.position(mid_width,shot_selector.y+60);
    div_creation.style('display','table');
    div_creation.size((reframe_button.position().x-mid_width)-10);
    for(let a of actors_timeline) {
      a.on = false;
    }
  }
}

function updateShotIntersect() {
  is_intersect = this.checked();
}

function updateShotStagePosition() {
  is_stage_position = this.checked();
}

function updateShotGazeDirection() {
  is_gaze_direction = this.checked();
}

function updateAllShotSelect() {
  is_all_types = this.checked();
}

function updateShowContextSelect() {
  is_show_context = this.checked();
}

function updateShowTracks() {
  is_show_tracks = this.checked();
}

function updateShowShots() {
  is_show_shots = this.checked();
  if(is_show_shots) {
    editing_button.setOnOff(true);
  }
}

function updateSplitScreen() {
  is_split = this.checked();
}

function updateAnnotationEdit() {
  is_annotation = this.checked();
}

function updateNoteBook() {
  is_note_book = this.checked();
  is_note_editor = this.checked();
  note_editor.update(is_note_editor);
  $('#div_creation').remove();
  if(is_note_book) {
    is_shot_creation = false;
    shot_creation.checked(false);
    is_show_shots = false;
    show_shots.checked(false);
    editing_button.setOnOff(false);
    let div_creation = createDiv();
    div_creation.id('div_creation');
    div_creation.position(windowWidth-150,draw_track.y+30);
    div_creation.size(150, height+can.elt.offsetTop-div_creation.position().y);
    for(let a of actors_timeline) {
      a.on = false;
      a.elem.style('margin','5% 0 5% 0');
      a.elem.show();
      div_creation.child(a.elem.elt);
    }
  }else {
    for(let a of actors_timeline) {
      a.elem.remove();
      a.elem = createElement('h3', a.actor_name);
      a.elem.elt.contentEditable = 'true';
      a.elem.id('editor');
      div_actors_timeline.child(a.elem);
    }
    showAllElt();
  }
}

function updatePartition() {
  is_partition_editor = this.checked();
  partition_editor.update(is_partition_editor);
}

function selectShotType() {
  shot_type = shot_selector.value();
  if(is_show_shots) {
    all_types.checked(false);
    is_all_types = false;
  }
}

function selectRatio() {
  ratio_type = ratio_selector.value();
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

function sortActorTimelines() {
  actors_timeline.sort(compare_name);
  while(div_actors_timeline.firstChild){div_actors_timeline.firstChild.remove();}
  for(let a of actors_timeline) {
    div_actors_timeline.child(a.elem);
  }
}

// Create all needed shots and assign them on the timeline based on the rough cut file specification
function exploitRoughCut() {
  shots_timeline.shots = [];
  var frames_no_info = [];
  createAllActorsFullShot();
  let len = rough_json.length;
  if(!len){len = Object.getOwnPropertyNames(rough_json).length;}
  for(let i=0; i<len; i++) {
    let r = rough_json[i];
    if(r.ActInvolved.length<1) {
      for(let a of actors_timeline) {
        r.ActInvolved.push(a.actor_name);
      }
      r.Type = 'FS';
    } else {
      let test_name = [];
      for(let i=0; i<r.ActInvolved.length; i++) {
        if(test_name.includes(r.ActInvolved[i])) {
          r.ActInvolved.splice(i,1);
        } else {
          test_name.push(r.ActInvolved[i]);
        }
      }
    }
    if(!testShot(r)) {
      let s = new Shot();
      for(let a of r.ActInvolved) {
        s.actors_involved.push(getAct(a));
      }
      // console.log(s.actors_involved.length);
      s.type = r.Type;

      s.start_frame = 0;
      s.end_frame = Math.round(frame_rate*video.duration());

      s.aspect_ratio = aspect_ratio;

      s.calcBboxes(aspect_ratio);

      shots.push(s);
      // shots_timeline.addShotJson(s);
      add_shot.push(s);

      s.in_stabilize = true;

    } else {
      let ind = getShot(shots, r.Type, r.ActInvolved);
      if(add_shot.length < 1){
        let indexes = [];
        for(let i=0; i<r.EndFrame-r.StartFrame; i++) {
          let num = r.StartFrame + i;
          // if(shots[ind]){
          //   let bbox = shots[ind].getCurrStabShot(num);
          //   if(dist(bbox[0],bbox[1],bbox[2],bbox[3])<50){
          //     indexes.push(num);
          //   }
          // }

          let acts = getActOnStage(num);
          var b = true;
          for(let name of r.ActInvolved) {
            if(acts.includes(name)) {
              b = false;
              break;
            }
          }
          if(b) {
            indexes.push(num);
          }
        }
        let nb=1;
        for(let i=0; i < indexes.length; i++) {
          if(i>=1 && indexes[i-1] != indexes[i]-1) {
            nb++;
          }
        }
        if(indexes.length>1) {
          if(indexes.length==r.EndFrame - r.StartFrame) {
            console.log('oui');
            if(nb==1) {
              console.log(r.StartFrame, r.EndFrame);
              frames_no_info.push(indexes);
            }
          }else if(nb == 1 && indexes.length>frame_rate) {
            if(indexes[indexes.length-1] == r.EndFrame-1) {
              console.log('end');
              r.EndFrame = indexes[0];
            }
            if(indexes[0] == r.StartFrame) {
              console.log('start');
              r.StartFrame = indexes[0];
            }
          }
          // console.log(nb);
          // console.log(indexes);
          // console.log(r.ActInvolved);
          // console.log(r.Type);
        }
        if(indexes.length!=r.EndFrame - r.StartFrame) {
          let s_stab = {};//new Shot();
          s_stab.actors_involved = shots[ind].actors_involved;
          // s_stab.bboxes = shots[ind].bboxes;
          s_stab.type = shots[ind].type;
          s_stab.start_frame = r.StartFrame;
          s_stab.end_frame = r.EndFrame;
          s_stab.aspect_ratio = shots[ind].aspect_ratio;
          // console.log(s_stab.start_frame, s_stab.end_frame);
          shots_timeline.addShotJson(s_stab);
        }
      }
    }
  }
  if(add_shot.length < 1){
    console.log(frames_no_info);
      // console.log(shots_timeline.shots);
    shots_timeline.fillRough(frames_no_info);
  }
  shots.sort(sortShotsByName);
  shots.sort(sortShotsByType);
}

function createContextShot() {
  let shot = new Shot();
  shot.aspect_ratio = aspect_ratio;
  shot.start_frame = 0;
  shot.end_frame = Math.round(frame_rate*video.duration());
  shot.is_intersect = false;
  shot.is_stage_position = false;
  shot.is_gaze_direction = false;
  shot.type = 'WS';
  let b = false;
  for(let s of shots) {
    if(s.equalTo(shot, false)) {
      b = true;
      break;
    }
  }
  if(!b) {
    shot.calcBboxes(aspect_ratio);
    shots.push(shot);
  }
}


// Get the specification and launch the stabilization of the shot created by the user
function saveShot() {

  var shot = new Shot();

  for(let act of actors_timeline) {
    if(act.on) {
      shot.actors_involved.push(act);
    }
  }

  // console.log(aspect_ratio/ratio_type);
  shot.aspect_ratio = aspect_ratio/ratio_type;
  shot.start_frame = 0;
  shot.end_frame = Math.round(frame_rate*video.duration());

  shot.is_intersect = is_intersect;
  shot.is_stage_position = is_stage_position;
  shot.is_gaze_direction = is_gaze_direction;

  shot.type = shot_type;

  let b = false;
  for(let s of shots) {
    if(s.equalTo(shot, false)) {
      b = true;
      break;
    }
  }

  if(!b) {
    shot.calcBboxes(aspect_ratio);

    shots.push(shot);

    if(shot.actors_involved.length>=1) {
      add_shot.push(shot);
      shot.in_stabilize = true;
    }
    shots.sort(sortShotsByName);
    shots.sort(sortShotsByType);

    is_show_shots = true;
    show_shots.checked(is_show_shots);

    is_shot_creation = false;
    shot_creation.checked(is_shot_creation);
    for(let a of actors_timeline) {
      a.elem.remove();
      a.elem = createElement('h3', a.actor_name);
      a.elem.elt.contentEditable = 'true';
      a.elem.id('editor');
      div_actors_timeline.child(a.elem);
    }
  } else {
    alert('already created');
  }
}

function hideShowHeader() {
  if($('#header_info').css('display') !== 'none') {
    $('#header_info').hide();
    up_rough = true;
  } else {
    $('#header_info').show();
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
  if(is_annotation) {
    let a = new ActorAnnotation(act_input.value());
    annotation_timeline.actors_annotation.push(a);
    annotation_timeline.div_wrap.child(a.elem);
    act_input.value('');
  } else {
    var actors = [];
    for(let act of actors_timeline) {
      actors.push(act.actor_name);
    }
    if(act_input.value() && !actors.includes(act_input.value())) {
      actors.push(act_input.value());
      var elem = createElement('h3', actors[actors.length-1]);
      elem.elt.contentEditable = 'true';
      elem.id('editor');
      var x = 100;
      var y = viewer_height+40+(actors.length-1-1)*20+25;
      var act = new ActorTimeline(x, y, player.w, 15, frames_data);
      act.elem = elem;
      div_actors_timeline.child(act.elem);
      act.actor_name = actors[actors.length-1];
      actors_timeline.push(act);
      sortActorTimelines();
      erase_button.push(new EraseButton(actors_timeline.length-1));
      let a = new ActorAnnotation(act_input.value());
      annotation_timeline.actors_annotation.push(a);
      annotation_timeline.div_wrap.child(a.elem);
      act_input.value('');
    }
  }
}

// Sort the tracks table (short length ==> long length)
function sortTable() {
  var table, rows, switching, i, x, y, shouldSwitch;
  table = table_scroll.elt.firstElementChild;
  switching = true;
  // Make a loop that will continue until no switching has been done:
  while (switching) {
    //start by saying: no switching is done:
    switching = false;
    rows = table.rows;
    // Loop through all table rows (except the first, which contains table headers):
    for (i = 1; i < (rows.length - 1); i++) {
      //start by saying there should be no switching:
      shouldSwitch = false;
      // Get the two elements you want to compare, one from current row and one from the next:
      x = rows[i].getElementsByTagName("TD")[2];
      y = rows[i + 1].getElementsByTagName("TD")[2];
      //check if the two rows should switch place:
      if (Number(x.innerHTML) > Number(y.innerHTML)) {
        //if so, mark as a switch and break the loop:
        shouldSwitch = true;
        break;
      }
    }
    if (shouldSwitch) {
      // If a switch has been marked, make the switch and mark that a switch has been done:
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
}

// Create a html table to navigate into the tracklets
function createTableTracks() {

  if(is_show_tracks && !table_scroll) {
    go_track = [];
    table_scroll = createElement('div');
    table_scroll.id('table-scroll');
    table_scroll.position(viewer_width + 20, can.elt.offsetTop+60);
    table_tracks = createElement('table');
    var head = createElement('thead');
    var row = createElement('tr');
    row.child(createElement('th','Actor'));
    row.child(createElement('th','First'));
    let le = createElement('th','Length');
    le.mouseClicked(sortTable);
    row.child(le);
    row.child(createElement('th','Go'));
    head.child(row);
    table_tracks.child(head);

    for (let t of tracklets_line) {
      var row = createElement('tr');
      row.child(createElement('td',t.actor_name));
      row.child(createElement('td',t.first_frame));
      row.child(createElement('td',t.detections.length));
      var g = createElement('td','Go');
      row.child(g);
      table_tracks.child(row);
      var x1 = table_scroll.position().x+g.position().x;
      var y1 = table_scroll.position().y+g.position().y;
      go_track.push(new GoButton(g.width, g.height, t, g));
    }
    table_scroll.child(table_tracks);
  } else {
    if(table_scroll && !is_show_tracks) {
      table_scroll.remove();
      table_scroll = undefined;
    }
  }

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
  // detec_modif = true;
}

// Reset the zooming
function resetPos() {
  viewer_scale=1;
  act_timeline_scale=1;
  act_timeline_x_off=0;
  annotation_timeline.scale = 1;
}

//Save a json file with tracklets, actors timelines and shots information
function saveTimeline() {

  var json_act_name = [];

  for(let act of actors_timeline) {
    // json_act_name.id =
    var timeline = {};
    timeline.Name = act.actor_name;
    timelines = [];
    if(act.tracks.length>0){
      for(let t of act.tracks) {
        var track = {};
        track.Detections = t.detections;
        track.FirstFrame = t.first_frame;
        timelines.push(track);
      }
    }
    if(act.states.length>0){
      for(let st of act.states) {
        var state = {};
        state.State = st.Num;
        state.FirstFrame = st.FirstFrame;
        timelines.push(state);
      }
    }
    if(act.track_bbox_shot.length>0){
      for(let t of act.track_bbox_shot) {
        var t_bbox = {};
        t_bbox.FirstFrame = t.first_frame;
        t_bbox.LastFrame = t.last_frame;
        t_bbox.BBoxes = [];
        for(let b of t.bboxes){
          let val = [b.x, b.y, b.w, b.h, b.center_x, b.center_y];
          t_bbox.BBoxes.push(val);
        }
        timelines.push(t_bbox);
      }
    }
    timeline.Timeline = timelines;
    json_act_name.push(timeline);
  }

  var json_tracks = [];

  for(let t of tracklets_line) {
    if(!t.added && !t.old) {
      var track = {};
      track.Detections = t.detections;
      track.FirstFrame = t.first_frame;
      json_tracks.push(track);
    }
  }

  var new_json_shots = [];

  for(let s of shots) {
    var shot = {};
    shot.Type = s.type;
    shot.StartFrame = s.start_frame;
    shot.EndFrame = s.end_frame;
    shot.Timeline = 0;
    shot.BBoxes = s.bboxes;
    shot.ActInvolved = s.getActNameInvolved();
    shot.AspectRatio = s.aspect_ratio;
    shot.GazeDir = s.is_gaze_direction;
    shot.Intersect = s.is_intersect;
    shot.StagePos = s.is_stage_position;
    new_json_shots.push(shot);
  }

  for(let s of shots_timeline.shots) {
    var shot = {};
    shot.Type = s.type;
    shot.StartFrame = s.start_frame;
    shot.EndFrame = s.end_frame;
    shot.Timeline = 1;
    // shot.BBoxes = s.bboxes;
    let tab = [];
    for(let a of s.actors_involved) {
      tab.push(a.actor_name);
    }
    shot.ActInvolved = tab;
    shot.AspectRatio = s.aspect_ratio;
    shot.GazeDir = s.is_gaze_direction;
    shot.Intersect = s.is_intersect;
    shot.StagePos = s.is_stage_position;
    new_json_shots.push(shot);
  }

  let annot_t = [];
  for(let a_t of annotation_timeline.actors_annotation) {
    let obj = {};
    obj.Name = a_t.actor_name;
    obj.Actions = [];
    for(let act of a_t.actions) {
      let o = {};
      o.Name = act.name;
      o.FirstFrame = act.first_frame;
      o.EndFrame = act.end_frame;
      o.Color = act.color;
      obj.Actions.push(o);
    }
    annot_t.push(obj);
  }

  var new_fr_data = {'Frames':frames_data};
  data_detects = new_fr_data;
  data_tracks = json_tracks;
  data_timelines = json_act_name;
  data_shots = new_json_shots;

  var detections;
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
  if(table_scroll){
    table_scroll.hide();
  }
  for(let act of actors_timeline) {
    act.elem.hide();
  }
  hideNoteBook();
  note_editor.update(false);
  if(div_sub) {
    $("#div_sub").remove();
    div_sub = undefined;
    tab_sub = [];
  }
}

// Show all hmtl elements
function showAllElt() {
  var elems = selectAll('.aside');
  for(let el of elems){
    el.show();
  }
  for(let el of html_elements) {
    el.show();
  }
  if(table_scroll){
    table_scroll.show();
  }
  for(let act of actors_timeline) {
    act.elem.show();
  }
  if(is_note_book) {
    note_editor.update(true);
  }
}

// Hide note book elements
function hideNoteBook() {
  for(let el of html_elements) {
    if(!el.side)
      el.hide();
  }
  if(table_scroll){
    table_scroll.hide();
  }
  // for(let act of actors_timeline) {
  //   act.elem.hide();
  // }
}

function resizeNoteBook() {
  let div_creation = select('#div_creation');
  is_shot_creation = false;
  shot_creation.checked(false);
  is_show_shots = false;
  show_shots.checked(false);
  editing_button.setOnOff(false);
  if(!div_creation) {
    div_creation = createDiv();
    div_creation.id('div_creation');
    for(let a of actors_timeline) {
      a.on = false;
      a.elem.style('margin','5% 0 5% 0');
      div_creation.child(a.elem.elt);
    }
  }
  div_creation.position(windowWidth-150,draw_track.y+30);
  div_creation.size(150, height+can.elt.offsetTop-div_creation.position().y);
  div_sub = select('#div_sub');
  // tab_sub = [];
  let cpt=0;
  for(let t of video.elt.textTracks) {
    if(t.mode == "showing" && cpt==0) {
      let i=0;
      cpt++;
      if(!div_sub) {
        tab_sub = [];
        div_sub = createDiv();
        div_sub.id('div_sub');
        div_sub.position(mid_width+10,can.elt.offsetTop);
        div_sub.size((reframe_button.position().x-(mid_width+10))/2,height);
        for(let c of t.cues) {
          let obj = {};
          let p = createP(partition_editor.parseTextAction(c.text));
          obj.p = p;
          obj.start = c.startTime;
          obj.end = c.endTime;
          tab_sub.push(obj);
          div_sub.child(p);
        }
      } else {
        div_sub.position(mid_width+10,can.elt.offsetTop);
        div_sub.size((reframe_button.position().x-(mid_width+10))/2,height);
      }
    }
  }
}

// Show the subtitle next to the player and allow the user to navigate in the video
function showNoteBook() {
  if(!div_sub || div_sub.size().height!=height || mid_width != viewer_width) {
    resizeNoteBook();
  } else {
    if(tab_sub.length>1) {
      for(let s of tab_sub) {
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
  splitScreen(getShotsFromActs());
}

// Remove the selected tracklet
function removeTracklet() {
  for(var i=0; i<tracklets_line.length; i++) {
    if(tracklets_line[i].on && !tracklets_line[i].added) {
      tracklets_line.splice(i,1);
      table_scroll.remove();
      table_scroll = undefined;
    }
  }
}

// Remove the selected shot
function removeShot() {
  for(var i=0; i<shots.length; i++) {
    if(shots[i].on) {
      shots_timeline.removeSpecificShot(shots[i]);
      for(let tab of shots_timeline.list_data) {
        shots_timeline.removeSpecificShot(shots[i],tab.Data);
      }
      shots.splice(i,1);
    }
  }
}

// split current tracklet at the current frame
function splitTracklet() {
  for(let t of tracklets_line) {
    if(t.on && !t.added) {
      var first = t.first_frame;
      var new_track = new Track();
      new_track.first_frame = frame_num;
      var detec = t.detections;
      var len = detec.length;
      detec = detec.slice(frame_num-first, len);
      t.detections = t.detections.slice(0,frame_num-first);
      t.drag = false;
      t.on = false;
      t.setPosition(0,0,0,0);
      new_track.detections = detec;
      new_track.actor_name = 'unknown';
      tracklets_line.push(new_track);
    }
  }
  for(let a of actors_timeline) {
    for(let t of a.tracks) {
      if(t.on) {
        var first = t.first_frame;
        var new_track = new Track();
        new_track.first_frame = frame_num;
        var detec = t.detections;
        var len = detec.length;
        detec = detec.slice(frame_num-first, len);
        t.detections = t.detections.slice(0,frame_num-first);
        t.drag = false;
        t.on = false;
        t.setPosition(0,0,0,0);
        new_track.detections = detec;
        a.addTrack(new_track);
        a.updateTrackPos(total_frame);
        tracklets_line.push(new_track);
      }
    }
    for(let t of a.track_bbox_shot) {
      if(t.on) {
        let new_track = new TrackBboxShot(a);
        new_track.first_frame = t.first_frame;
        new_track.last_frame = frame_num-1;
        new_track.bboxes = t.bboxes.slice(0,new_track.last_frame-t.first_frame);
        t.bboxes = t.bboxes.slice(frame_num-t.first_frame, t.bboxes.length);
        t.first_frame = frame_num;
        a.track_bbox_shot.push(new_track);
      }
    }
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

// Download the reframed video when the process is finished
function callbackReframe(data) {
  var a = createA(data['src'], 'link');
  a.elt.download = "reframe_video.mp4";
  a.id('click');
  a.hide();
  // console.log(a);
  document.getElementById('click').click();
  a.remove();
}

// Launch the reframing of the video based on the timeline information
function reframeRequest() {
  $.post({
    url: "reframeMov",
    data: {'abs_path': abs_path, 'bboxes':JSON.stringify(shots_timeline.compressBBoxes()), 'is_split':false, 'width':Number(original_width), 'aspect_ratio':shots_timeline.getAspectRatio()},
    dataType: 'json',
    success: function (data) {
      console.log(data);
      return callbackReframe(data);
    }
  });
  alert('Your video is processing, it will be downloaded automatically when the process will be finished, you can continue your work but you have to keep this tabs opened');
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
        // console.log('success');
        note_book.checked(true);
        let div_creation = createDiv();
        div_creation.id('div_creation');
        div_creation.position(windowWidth-150,draw_track.y+30);
        div_creation.size(150);
        for(let a of actors_timeline) {
          a.on = false;
          a.elem.style('margin','5% 0 5% 0');
          div_creation.child(a.elem.elt);
        }
        is_note_book = true;
        is_note_editor = true;
        note_editor.update(is_note_editor);
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
  partition_editor.loadSubtitle();
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

// Draw the bounding box created by the user
function createBBox() {
  if(!bbox_creation) {
    bbox_creation = true;
    let name;
    for(let a of actors_timeline){
      if(a.on) {
        name = a;
      }
    }
    if(!name || getActOnStage(frame_num).includes(name.actor_name)) {
      bbox_creation = false;
      curr_creation = undefined;
    }else if(!curr_creation) {
      curr_creation = new TrackBboxShot(name);
      curr_creation.first_bbox = new BboxShot(0,0,0,0);
      curr_creation.first_frame = frame_num;
    } else {
      curr_creation.last_bbox = new BboxShot(0,0,0,0);
      curr_creation.last_frame = frame_num;
    }
  } else {
    bbox_creation = false;
    curr_creation = undefined;
  }
}

// Draw a preview of the selected tracklet
function drawPreview() {
  let k=0;
  for(let t of tracklets_line) {
    if(t.on && !t.added && !t.old) {
      text('Preview '+k,10,viewer_height+37);
      t.updatePos(player.w/annotation_timeline.total_frame, player.x, viewer_height+30);
      t.display();
    }
    if(t.drag) {
      rect(mouseX, mouseY, 25, 7);
    }
    k++;
  }
}

// Draw the current frame open pose detections wich are in a tracklet
function drawTracklets() {
  let keypoints = frames_data[frame_num];
  let tab_indexes = getTrackletsIndexes();
  for( let obj of tab_indexes) {
    if(!render_pose && !crop_button.on && !is_split && !is_note_book) {
      drawBBox(keypoints[obj.ind]['KeyPoints'], obj.track);
    } else if(render_pose) {
      if(!obj.act) {
        drawPose(keypoints[obj.ind]['KeyPoints']);
      } else {
        drawPose(keypoints[obj.ind]['KeyPoints'],obj.act);
      }
    }
  }
}

function drawFramesData() {
  for(let keypoints of frames_data[frame_num]) {
    drawPose(keypoints.KeyPoints);
  }
}

// Show the creation shot interface
function drawCreationShot() {

  var top_shot = shot_selector.original_y+85;
  if(table_scroll) {
    top_shot = table_scroll.y + table_scroll.height + 10;
  }
  shot_selector.show();
  ratio_selector.show();
  intersect.show();
  stage_position.show();
  gaze_direction.show();
  save_shot.show();
  for(let i=0; i<actors_timeline.length; i++) {
    $('#div_creation').append(actors_timeline[i].elem.elt);
    actors_timeline[i].elem.style('display','table-cell');
  }
  var keypoints = frames_data[frame_num];
  var w = 300;
  var h = Math.floor(w/(aspect_ratio/ratio_type));
  var arr = getBBoxShot(shot_type, aspect_ratio/ratio_type);
  push();
  if(x_off<0){x_off=0;}
  if(y_off<0){y_off=0;}
  translate(x_off,y_off);
  scale(vid_h/Number(original_height));
  stroke('skyblue');
  noFill();
  rect(arr[0], arr[1], arr[2]-arr[0], arr[3]-arr[1]);
  noStroke();
  fill(255);
  text(shot_type, arr[0]+5, arr[1]+10);
  pop();
  var bbox = [];
  for(var j=0; j<arr.length; j++) {
    bbox.push((arr[j]*scale_ratio));
  }
  if(img_hd) {
    let ratio = img_hd.width / video.elt.videoWidth;
    image(img_hd, (viewer_width+10), top_shot, w, h, bbox[0]*ratio, bbox[1]*ratio, bbox[2]*ratio - bbox[0]*ratio, bbox[3]*ratio - bbox[1]*ratio);
  } else {
    image(image_frame, (viewer_width+10), top_shot, w, h, bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
  }
  push();
  fill(255);
  text('Curr '+round_prec(video.time(),2),viewer_width+10, top_shot+10);
  pop();
}

// Draw the open pose skeleton
function drawPose(keypoints, a=undefined) {
  let bbox;
  let x_off=0;
  let y_off=0;
  let alpha=200;
  if(crop_button.on) {
    bbox = shots_timeline.getCurrStabShotNoScale(frame_num);
  }
  if((is_split || is_note_book) && show_shot) {
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

// Draw the actor movement on stage from the tracklet beginning  until the current frame
function drawTrackOn() {
  push();
  colorMode(HSB);
  let from = color(120, 100, 20);
  let to = color(120, 100, 80);
  for(let t of tracklets_line) {
    var detections_track = t.detections;
    if(t.on) {
      if(video.duration()) {
        var last_frames_track = t.first_frame+detections_track.length;
        if(frame_num>t.first_frame && frame_num < last_frames_track) {
          for(var j = t.first_frame; j < frame_num; j++) {
            var keypoints = frames_data[j];
            if(keypoints[detections_track[j-t.first_frame]]) {
              var center = getCenter(keypoints[detections_track[j-t.first_frame]]['KeyPoints']);
              push();
              let color = lerpColor(from, to, j/(frame_num-t.first_frame));
              fill(color);
              ellipse(center[0],center[1],3);
              pop();
            }
          }
        }
      }
    }
  }
  pop();
}

// Draw a colored rectangle on the player based on the shots specification (only when the actors involved in the shots are on stage)
function drawShotsLayout() {
  let shots_on_stage = getShotsOnStage();
  for(let s of shots_on_stage) {
    var bbox = s.getCurrStabShot(frame_num);
    if(bbox) {
      let type = s.getUpdatedSizeShot(s.getCurrStabShot(frame_num)[3]);
      if(!type) {
        type = s.type;
      }
      push();
      strokeWeight(1);
      switch(s.type){
        case 'CU':
          stroke('green');
          break;
        case 'MCU':
          stroke('orange');
          break;
        case 'MS':
          stroke('red');
          break;
        case 'MLS':
          stroke('purple');
          break;
        case 'FS':
          stroke('blue');
          break;
        default:
          stroke('white');
          break;
      }
      noFill();
      rect(bbox[0], bbox[1], bbox[2]-bbox[0], bbox[3]-bbox[1]);
      noStroke();
      fill(255);
      // text(s.type, bbox[0]+5, bbox[1]+10);
      // text(s.type, bbox[2]-20, bbox[1]+10);
      pop();
    }
  }
}

// Draw a grid with a preview for all the shots
function drawShots() {
  var top_shot = shot_selector.original_y+65;
  let context_height = int((reframe_button.position().x-mid_width-20)/2);
  if(table_scroll) {
    top_shot = table_scroll.y + table_scroll.height + 10;
  }
  if(is_show_context) {
    top_shot += context_height+10;
  }

  shot_selector.show();
  all_types.show();
  show_context.show();
  var k=0;
  var off_x = 0;
  var off_y = 0;
  if(!is_show_tracks) {
    push();
    fill('red');
    textSize(15);
    text('Shots created :', viewer_width+10, shot_selector.original_y+45);
    pop();
  }
  var front_shot;
  var front_bbox;

  for(let s of shots) {
    if(!s.aspect_ratio){
      s.aspect_ratio = aspect_ratio;
    }
    var arr = s.getCurrStabShot(frame_num);
    if(arr && s.type != 'WS' && (s.type == shot_type || is_all_types)) {
      var bbox = [];
      for(var j=0; j<arr.length; j++) {
        bbox.push(arr[j]*scale_ratio);
      }
      w = Math.round((reframe_button.position().x-mid_width-40)/3);
      h = Math.floor(w/aspect_ratio);
      let n_w=w;let n_h=h;
      if(!s.drag) {
        if(h*s.aspect_ratio>w){
          n_h = w/s.aspect_ratio;
        }else{ n_w = h*s.aspect_ratio;}
        if(k%3==2) {
          off_x = 2;
          s.setPosition((viewer_width+10)+(off_x*w)+(off_x*10), top_shot + (off_y*h)+ (off_y*10), n_w, n_h);
          off_y++;
        } else if(k%3==1) {
          off_x = 1;
          s.setPosition((viewer_width+10)+(off_x*w)+(off_x*10), top_shot + (off_y*h)+ (off_y*10), n_w, n_h);
        }else {
          off_x=0;
          s.setPosition(viewer_width+10+(off_x*w), top_shot + (off_y*h) + (off_y*10), n_w, n_h);
        }
        k++;
      }
      if(mouseX > s.x && mouseX<s.x+s.w && mouseY > s.y && mouseY < s.y+s.h) {
        s.w = 300;
        s.h = Math.floor(s.w/s.aspect_ratio);
        front_shot = s;
        front_bbox =bbox;
      } else {
        s.display();
        if(img_hd) {
          let ratio = img_hd.width / video.elt.videoWidth;
          image(img_hd, s.x, s.y, s.w, s.h, bbox[0]*ratio, bbox[1]*ratio, bbox[2]*ratio - bbox[0]*ratio, bbox[3]*ratio - bbox[1]*ratio);
        } else {
          if(s.w!=0 && s.h!=0) {
            image(image_frame, s.x, s.y, s.w, s.h, bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
          }
        }
        s.displayText();
      }
    } else if (is_show_context && s.type == 'WS') {
      s.setPosition((viewer_width+10), top_shot-(context_height+10), context_height*aspect_ratio, context_height);
      s.display();
      if(img_hd) {
        image(img_hd, s.x, s.y, s.w, s.h);
      } else {
        image(image_frame, s.x, s.y, s.w, s.h);
      }
      s.displayText();
    }
  }
  if(front_shot) {
    let s = front_shot;
    let bbox = front_bbox;
    s.display();
    if(img_hd) {
      let ratio = img_hd.width / video.elt.videoWidth;
      image(img_hd, s.x, s.y, s.w, s.h, bbox[0]*ratio, bbox[1]*ratio, bbox[2]*ratio - bbox[0]*ratio, bbox[3]*ratio - bbox[1]*ratio);
    } else {
      image(image_frame, s.x, s.y, s.w, s.h, bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
    }
    s.displayText();
  }
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

// Draw the actors timeline
function displayTimeline() {
  annotation_timeline.updateFirstLast();
  annotation_timeline.drawCursor();
  for(var i=0; i < actors_timeline.length; i++) {
    let act = actors_timeline[i];
    act.elem.show();
    act.elem.size(player.x);
    if(!is_shot_creation) {
      act.setPosition(player.x, act.elem.elt.offsetTop+act.elem.elt.parentNode.offsetTop-can.elt.offsetTop-$('#div_wrap_actor').scrollTop(),player.w,20);
    }
    act.updateTrackPos(annotation_timeline.total_frame/*Math.floor(video.duration()*frame_rate)*/);
    // push();
    // let x_off = ((act_timeline_x_off*act_timeline_scale)-act_timeline_x_off);
    // translate(-x_off,0);
    // scale(act_timeline_scale,1);
    actors_timeline[i].display();
    // pop();
    erase_button[i].setPosition(mid_width+10, actors_timeline[i].y+(actors_timeline[i].h/2));
    erase_button[i].display();
  }
  remove_timeline = false;
}

function displayTrackBBox(){
  if(!crop_button.on) {
    for(let a of actors_timeline) {
      for(let t of a.track_bbox_shot) {
        t.display();
      }
    }
  }
}

function sortSplit(a,b) {
  if (a.bbox[0] < b.bbox[0])
    return -1;
  if (a.bbox[0] > b.bbox[0])
    return 1;
  return 0;
}

// Show the selected shot preview below the player
function splitScreen(printed_shots=undefined) {
  let split_shot = [];
  if(!is_note_book) {
    for(let s of shots) {
      if(s.on) {
        split_shot.push(s);
      }
    }
  } else {
    if(printed_shots) {
      split_shot = printed_shots;
    }
  }
  let j=0;
  let bboxes = [];
  for(let s of split_shot) {
    let b = s.getCurrStabShot(frame_num);
    if(b) {
      let bb = {};
      bb.bbox = b;
      bb.shot = s;
      bboxes.push(bb);
    }
  }

  let max_by_raw=4;
  if(is_note_book) {
    max_by_raw=0;
    for(let a of actors_timeline) {
      if(a.on) {
        max_by_raw++;
      }
    }
  }
  let nb_raw = Math.ceil(bboxes.length/max_by_raw);
  // if(nb_raw!=0 && offset_split>(nb_raw-1)*max_by_raw) {
  //   offset_split = (nb_raw-1)*max_by_raw;
  // } else if(nb_raw==0) {
  //   offset_split = 0;
  // }
  // if(Math.ceil(offset_split/nb_raw)>0) {
  //   bboxes.splice(0,Math.ceil(offset_split/nb_raw)*max_by_raw);
  // }
  let y_vid=0;
  let x_vid=0;
  let max_h = 0;
  let curr_raw = 1;
  let total_height = 0;
  let total_width = 0;

  for(let b of bboxes) {
    let bb = b.bbox;
    let a_s = aspect_ratio;
    if(b.shot && b.shot.aspect_ratio) {
      a_s = b.shot.aspect_ratio;
    }
    let w=0;
    if(nb_raw==1) {
      w = viewer_width/bboxes.length;
    } else {
      if(j<(max_by_raw*curr_raw)){
        w = viewer_width/max_by_raw;
      } else {
        if(curr_raw==nb_raw) {
          w = viewer_height/(bboxes.length-(max_by_raw*curr_raw));
        } else {
          w = viewer_width/max_by_raw;
        }
        y_vid = max_h*curr_raw;
        max_h = 0;
        x_vid=0;
        curr_raw++;
      }
    }
    x_vid = (j%max_by_raw) * w;
    if(w/a_s>viewer_height) {
      w = viewer_height*a_s;
    }
    if(w/a_s>max_h) {
      max_h = w/a_s;
    }
    total_height += max_h;
    total_width += w;
    b.shot.bbox_show = [x_vid,viewer_height+y_vid,w,w/a_s];
    j++;
  }

  let sc = 1;
  let off_height = 0;
  let off_width = 0;
  if(max_by_raw!=0 && (height-viewer_height)<(total_height/max_by_raw)) {
    sc = (height-viewer_height)/(total_height/max_by_raw);
    off_height = viewer_height-bboxes[0].shot.bbox_show[1]*sc;
    off_width = (mid_width-(total_width/3)*sc)/2;
  }
  for(let b of bboxes) {
    b.shot.bbox_show = b.shot.bbox_show.map(x => x*sc);
    b.shot.bbox_show[1] = b.shot.bbox_show[1]+off_height;
    b.shot.bbox_show[0] = b.shot.bbox_show[0]+off_width;
    let bb = b.bbox;
    let a_s = aspect_ratio;
    if(b.shot && b.shot.aspect_ratio) {
      a_s = b.shot.aspect_ratio;
    }
    if (bb) {
      // let acts = b.shot.getUpdateActInvolved();
      bbox = [bb[0]*scale_ratio, bb[1]*scale_ratio, bb[2]*scale_ratio, bb[3]*scale_ratio];
      if(bbox) {
        if(img_hd) {
          let ratio = img_hd.width / video.elt.videoWidth;
          bbox = [bbox[0]*ratio, bbox[1]*ratio, bbox[2]*ratio, bbox[3]*ratio];
          image(img_hd, b.shot.bbox_show[0],b.shot.bbox_show[1],b.shot.bbox_show[2],b.shot.bbox_show[3], bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
        } else {
          image(image_frame, b.shot.bbox_show[0],b.shot.bbox_show[1],b.shot.bbox_show[2],b.shot.bbox_show[3],bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]);
        }
        push();
        fill(255);
        // let type = b.shot.getUpdatedSizeShot(b.shot.getCurrStabShot(frame_num)[3]);
        // if(!type) {
        //   type = b.shot.type;
        // }
        text(b.shot.type/*+round_prec(a_s,2)*/, b.shot.bbox_show[0],b.shot.bbox_show[1]+10);
        for(var i=0; i<b.shot.actors_involved.length; i++) {
          text(b.shot.actors_involved[i].actor_name, b.shot.bbox_show[0],b.shot.bbox_show[1]+20+i*10);
        }
        pop();
      }
    }
  }
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

function createAllShots() {
  for(let s_t of ['CU', 'MS', 'FS']) {
    for(let act of actors_timeline) {
      for(let act of actors_timeline) {
        act.on = false;
      }
      let shot = new Shot();
      act.on = true;
      shot.actors_involved.push(act);
      shot.type = s_t;
      shot.aspect_ratio = aspect_ratio;
      let b = false;
      for(let s of shots) {
        if(s.equalTo(shot, false)) {
          b = true;
          break;
        }
      }
      if(!b) {
        shot.start_frame = 0;
        shot.end_frame = Math.round(frame_rate*video.duration());
        shot.calcBboxes(aspect_ratio);
        shots.push(shot);
        if(shot.actors_involved.length>=1) {
          add_shot.push(shot);
          shot.in_stabilize = true;
        }
      }
    }
  }
  shots.sort(sortShotsByName);
  shots.sort(sortShotsByType);
}

// Create a full shots with every actors included
function createAllActorsFullShot() {
  let r = {};
  r.Type = 'FS';
  let tab = [];
  for(let a of actors_timeline) {
    tab.push(a.actor_name);
  }
  r.ActInvolved = tab;
  if(!testShot(r)) {
    let s = new Shot();
    for(let a of r.ActInvolved) {
      s.actors_involved.push(getAct(a));
    }
    s.type = r.Type;

    s.start_frame = 0;
    s.end_frame = Math.round(frame_rate*video.duration());

    s.aspect_ratio = aspect_ratio;
    console.log(s);

    s.calcBboxes(aspect_ratio);

    shots.push(s);
    add_shot.push(s);

    s.in_stabilize = true;

    shots.sort(sortShotsByName);
    shots.sort(sortShotsByType);
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
    div_actors_timeline = createDiv();
    div_actors_timeline.style('overflow','auto');
    div_actors_timeline.id('div_wrap_actor');
    loadSubtile();
    scale_ratio = video.elt.videoWidth/Number(original_width);
    aspect_ratio = Number(original_width)/Number(original_height);
    viewer_height = windowHeight*((1/2)*viewer_scale);
    createVideoTimer(viewer_height-15);

    createShotsTimeline();

    annotation_timeline = new AnnotationTimeline();

    if(data_timelines[0]) {
      const data_own_t = Object.getOwnPropertyNames(data_timelines);
      for(let i=0; i<data_own_t.length; i++) {
        var act = new ActorTimeline(frames_data);
        act.frames_data = frames_data;
        act.actor_name = data_timelines[i].Name;
        var x = 100;
        var y = viewer_height+40+i*20+25;
        act.setPosition(x, y, player.w, 15);
        for(var j=0; j<data_timelines[i].Timeline.length; j++) {
          if(data_timelines[i].Timeline[j].Detections) {
            var t = new Track();
            t.setActorName(act.actor_name);
            t.setFirstFrame(data_timelines[i].Timeline[j].FirstFrame);
            t.detections = data_timelines[i].Timeline[j].Detections;
            tracklets_line.push(t);
            act.addTrack(t);
          }
          if(data_timelines[i].Timeline[j].BBoxes) {
            let t = new TrackBboxShot(act);
            t.first_frame = data_timelines[i].Timeline[j].FirstFrame;
            t.last_frame = data_timelines[i].Timeline[j].LastFrame;
            for(let b of data_timelines[i].Timeline[j].BBoxes) {
              let bb = new BboxShot(b[0],b[1],b[2],b[3]);
              bb.setCenter(b[4],b[5]);
              t.bboxes.push(bb);
            }
            act.track_bbox_shot.push(t);
          }
        }
        var elem = createElement('h3', act.actor_name);
        elem.elt.contentEditable = 'true';
        elem.id('editor');
        act.elem = elem;
        switch (act.actor_name) {
          case 'Jeanne':
            act.color = '#4D8A52';
            break;
          case 'Jacques':
            act.color = '#694008';
            break;
          case 'Joel':
            act.color = '#451306';
            break;
          case 'Victor':
            act.color = '#5752A1';
            break;
          default:
            act.color = 'black';
        }
        div_actors_timeline.child(act.elem);
        actors_timeline.push(act);
        sortActorTimelines();
        remove_timeline = true;
        erase_button.push(new EraseButton(i));
      }

    }

    if(data_annotation_timeline[0]) {
      const data_own_t = Object.getOwnPropertyNames(data_annotation_timeline);
      for(let i=0; i<data_own_t.length; i++) {
        let a = new ActorAnnotation(data_annotation_timeline[i].Name);
        for(let act of data_annotation_timeline[i].Actions) {
          let obj = {};
          obj.name = act.Name;
          obj.first_frame = act.FirstFrame;
          obj.end_frame = act.EndFrame;
          obj.color = act.Color;
          a.setAction(obj);
        }
        annotation_timeline.actors_annotation.push(a);
        annotation_timeline.div_wrap.child(a.elem);
      }
    } else {
      for(let act of actors_timeline) {
        let a = new ActorAnnotation(act.actor_name);
        annotation_timeline.actors_annotation.push(a);
        annotation_timeline.div_wrap.child(a.elem);
      }
    }
    var l_t;
    if(data_tracks.length) {
      l_t = data_tracks.length
    } else {
      const data_own = Object.getOwnPropertyNames(data_tracks);
      l_t = data_own.length;
    }
    for (var i = 0; i < l_t; i++) {
      tracks_data.push(data_tracks[i]);
    }

    for (var i = 0; i < tracks_data.length; i++) {
      var t = new Track();
      t.setActorName("unknown");
      t.setFirstFrame(tracks_data[i]['FirstFrame']);
      t.detections = tracks_data[i]['Detections'];
      tracklets_line.push(t);
    }

    for (var i=0; i<Object.getOwnPropertyNames(data_shots).length; i++) {
      if(data_shots[i].Timeline == 0) {
        let s = new Shot();
        s.type = data_shots[i].Type;
        s.start_frame = data_shots[i].StartFrame;
        s.end_frame = data_shots[i].EndFrame;
        s.bboxes = data_shots[i].BBoxes;
        s.setActInvoled(data_shots[i].ActInvolved);
        s.aspect_ratio = data_shots[i].AspectRatio;
        if(data_shots[i].GazeDir==undefined) {
          data_shots[i].GazeDir = true;
        }
        s.is_gaze_direction = data_shots[i].GazeDir;
        if(data_shots[i].Intersect==undefined) {
          data_shots[i].Intersect = true;
        }
        s.is_intersect = data_shots[i].Intersect;
        if(data_shots[i].StagePos==undefined) {
          data_shots[i].StagePos = false;
        }
        s.is_stage_position = data_shots[i].StagePos;
        shots.push(s);
      }
    }

    shots_timeline.list_data = [];
    for(let obj of json_user_timeline) {
      let tab_shots = [];
      for(let data_shots of Object.values(obj.Data)) {
        let s = {};
        s.type = data_shots.Type;
        s.start_frame = data_shots.StartFrame;
        s.end_frame = data_shots.EndFrame;
        s.aspect_ratio = data_shots.AspectRatio;
        if(data_shots.GazeDir ==undefined) {
          data_shots.GazeDir = true;
        }
        s.is_gaze_direction = data_shots.GazeDir;
        if(data_shots.Intersect ==undefined) {
          data_shots.Intersect = true;
        }
        s.is_intersect = data_shots.Intersect;
        if(data_shots.StagePos ==undefined) {
          data_shots.StagePos = false;
        }
        s.is_stage_position = data_shots.StagePos;
        let tab = [];
        for(let n of data_shots.ActInvolved) {
          tab.push(getAct(n));
        }
        s.actors_involved = tab;
        tab_shots.push(s);
        if(obj.User == username) {
          shots_timeline.addShotJson(s, true);
        }
      }
      obj.Data = tab_shots;
      shots_timeline.list_data.push(obj);
    }
    shots.sort(sortShotsByName);
    shots.sort(sortShotsByType);

    can.size(windowWidth, viewer_height * 2);

    shot_selector = createSelect();
    shot_selector.side = false;
    shot_selector.mouseOver(processToolTip('Select the shot size'));
    shot_selector.mouseOut(processToolTip(''));
    html_elements.push(shot_selector);
    shot_selector.position(windowWidth/2 + 10, 40);
    shot_selector.option('BCU');
    shot_selector.option('CU');
    shot_selector.option('MCU');
    shot_selector.option('MS');
    shot_selector.option('MLS');
    shot_selector.option('FS');
    shot_selector.changed(selectShotType);

    ratio_selector = createSelect();
    ratio_selector.side = false;
    ratio_selector.mouseOver(processToolTip('Select the shot aspect ratio (1 for keep the original)'));
    ratio_selector.mouseOut(processToolTip(''));
    html_elements.push(ratio_selector);
    ratio_selector.position(windowWidth/2 + 120, 40);
    ratio_selector.option(1);
    ratio_selector.option(0.25);
    ratio_selector.option(0.5);
    ratio_selector.option(2);
    ratio_selector.option(3);
    ratio_selector.changed(selectRatio);

    intersect = createCheckbox('Intersect', false);
    intersect.side = false;
    intersect.mouseOver(processToolTip('Test intersection with not included actors'));
    intersect.mouseOut(processToolTip(''));
    html_elements.push(intersect);
    intersect.position(windowWidth/2 + 5, 70);
    intersect.changed(updateShotIntersect);

    stage_position = createCheckbox('Stage position', true);
    stage_position.side = false;
    stage_position.mouseOver(processToolTip('Keep the stage position'));
    stage_position.mouseOut(processToolTip(''));
    html_elements.push(stage_position);
    stage_position.position(windowWidth/2 + 140, 70);
    stage_position.changed(updateShotStagePosition);

    gaze_direction = createCheckbox('Gaze direction', true);
    gaze_direction.side = false;
    gaze_direction.mouseOver(processToolTip('Use the gaze direction'));
    gaze_direction.mouseOut(processToolTip(''));
    html_elements.push(gaze_direction);
    gaze_direction.position(windowWidth/2 + 315, 70);
    gaze_direction.changed(updateShotGazeDirection);

    all_types = createCheckbox('All types', true);
    all_types.side = false;
    all_types.mouseOver(processToolTip('Display all types'));
    all_types.mouseOut(processToolTip(''));
    html_elements.push(all_types);
    all_types.position(windowWidth/2 + 140, 40);
    all_types.changed(updateAllShotSelect);

    show_context = createCheckbox('Show context', true);
    show_context.side = false;
    show_context.mouseOver(processToolTip('Display the stage'));
    show_context.mouseOut(processToolTip(''));
    html_elements.push(show_context);
    show_context.position(windowWidth/2 + 320, 40);
    show_context.changed(updateShowContextSelect);

    save_shot = createButton('Create');
    save_shot.side = false;
    save_shot.mouseOver(processToolTip('Launch the stabilization process of the shot'));
    save_shot.mouseOut(processToolTip(''));
    html_elements.push(save_shot);
    save_shot.position(windowWidth/2 + 180, 40);
    save_shot.mousePressed(saveShot);

    shot_creation = createCheckbox('Create shot', false);
    shot_creation.side = false;
    shot_creation.mouseOver(processToolTip('Open the creation interface'));
    shot_creation.mouseOut(processToolTip(''));
    html_elements.push(shot_creation);
    shot_creation.position(windowWidth/2 + 10, 10);
    shot_creation.size(150,20);
    shot_creation.changed(updateShotCreate);

    show_tracks = createCheckbox('Show tracks', false);
    show_tracks.side = false;
    show_tracks.mouseOver(processToolTip('Show all the tracklets'));
    show_tracks.mouseOut(processToolTip(''));
    html_elements.push(show_tracks);
    show_tracks.position(windowWidth/2 + 210, 10);
    show_tracks.size(150,20);
    show_tracks.changed(updateShowTracks);

    show_shots = createCheckbox('Show shots', false);
    show_shots.side = false;
    show_shots.mouseOver(processToolTip('Show all the shots already created'));
    show_shots.mouseOut(processToolTip(''));
    html_elements.push(show_shots);
    show_shots.position(windowWidth/2 + 300, 10);
    show_shots.size(150,20);
    show_shots.changed(updateShowShots);

    submit = select('#submit');
    if(!sub_granted) {
      submit.hide();
    } else {
      submit.mouseOver(processToolTip('Save your work'));
      submit.mouseOut(processToolTip(''));
      html_elements.push(submit);
      submit.mousePressed(saveTimeline);
    }

    reframe_button = createButton('Process Reframing');
    reframe_button.mouseOver(processToolTip('Reframe your video according to the timeline'));
    reframe_button.mouseOut(processToolTip(''));
    html_elements.push(reframe_button);
    reframe_button.mousePressed(reframeRequest);

    hide_show_header_button = createButton('Hide/Show Header');
    hide_show_header_button.mouseOver(processToolTip('Hide or show the header'));
    hide_show_header_button.mouseOut(processToolTip(''));
    html_elements.push(hide_show_header_button);
    hide_show_header_button.mousePressed(hideShowHeader);

    // create_bbox = createButton('Create bbox');
    // create_bbox.mouseOver(processToolTip('Create a personalize bounding box for a selected actor'));
    // create_bbox.mouseOut(processToolTip(''));
    // html_elements.push(create_bbox);
    // create_bbox.mousePressed(createBBox);

    // sanitize = createButton('Sanitize');
    // sanitize.mouseOver(processToolTip('Clean the timeline'));
    // sanitize.mouseOut(processToolTip(''));
    // html_elements.push(sanitize);
    // sanitize.mousePressed(sanitizeFramesData);

    reset_pos = createButton('Reset Pos');
    reset_pos.mouseOver(processToolTip('Reset the scale factor'));
    reset_pos.mouseOut(processToolTip(''));
    html_elements.push(reset_pos);
    reset_pos.mousePressed(resetPos);

    get_actors_on_stage = createButton('Actors On Stage');
    get_actors_on_stage.mouseOver(processToolTip('Download JSON with actors on stage for each frame'));
    get_actors_on_stage.mouseOut(processToolTip(''));
    html_elements.push(get_actors_on_stage);
    get_actors_on_stage.mousePressed(getListOnStage);

    get_meta_data = createButton('Meta Data');
    get_meta_data.mouseOver(processToolTip('Download JSON with meta data informations for each frame'));
    get_meta_data.mouseOut(processToolTip(''));
    html_elements.push(get_meta_data);
    get_meta_data.mousePressed(getFrameMetaData);

    extract_video_book = createButton('Video Book');
    extract_video_book.mouseOver(processToolTip('Go to the video book based on the subtitles'));
    extract_video_book.mouseOut(processToolTip(''));
    html_elements.push(extract_video_book);
    extract_video_book.mousePressed(extractVideoBook);

    // extract_keyframes = createButton('Extract Keyframes');
    // extract_keyframes.mouseOver(processToolTip('Extract an image for each subtitle'));
    // extract_keyframes.mouseOut(processToolTip(''));
    // html_elements.push(extract_keyframes);
    // extract_keyframes.mousePressed(processKeyFrames);

    annotation_edit = createCheckbox('Annotation Timeline', false);
    annotation_edit.mouseOver(processToolTip('Annotation edition tool'));
    annotation_edit.mouseOut(processToolTip(''));
    html_elements.push(annotation_edit);
    annotation_edit.size(150,30);
    annotation_edit.changed(updateAnnotationEdit);

    split_screen = createCheckbox('Split Screen', false);
    split_screen.mouseOver(processToolTip('Show the selected shots below the viewer'));
    split_screen.mouseOut(processToolTip(''));
    html_elements.push(split_screen);
    split_screen.size(150,30);
    split_screen.changed(updateSplitScreen);

    note_book = createCheckbox('Note book', false);
    note_book.mouseOver(processToolTip('Show the note book and the reframed shots'));
    note_book.mouseOut(processToolTip(''));
    html_elements.push(note_book);
    note_book.size(150,30);
    note_book.changed(updateNoteBook);

    partition_check = createCheckbox('Partition', false);
    partition_check.mouseOver(processToolTip('Show the partition editor'));
    partition_check.mouseOut(processToolTip(''));
    html_elements.push(partition_check);
    partition_check.size(150,30);
    partition_check.changed(updatePartition);

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

    draw_track = createCheckbox('Draw track', false);
    draw_track.mouseOver(processToolTip('Show the selected track path'));
    draw_track.mouseOut(processToolTip(''));
    html_elements.push(draw_track);
    draw_track.size(150,30);
    draw_track.changed(updateDrawTrack);

    if(rough_json) {
      exploit_rough = createButton('Roughisation');
      exploit_rough.mouseOver(processToolTip('Create a rough cut for the video based on the note'));
      exploit_rough.mouseOut(processToolTip(''));
      html_elements.push(exploit_rough);
      exploit_rough.mousePressed(exploitRoughCut);
    }
    hidden_state = new StateButton(10,viewer_height+15,40,5,'Hidden','red');
    offstage_state = new StateButton(100,viewer_height+15,40,5,'Offstage','blue');

    act_input = createInput();
    act_input.side = false;
    html_elements.push(act_input);
    act_input.changed(createActTimeline);
    act_input.position(280, viewer_height+1);

    editing_button = new Button(act_input.position().x+act_input.width+15,viewer_height+10,15);
    crop_button = new Button(editing_button.x+30,viewer_height+10,15);

    note_editor = new NoteEditor();
    note_editor.updateChilds();

    partition_editor = new PartitionEditor();
    partition_editor.loadPartition();

    let k=0;
    let off = 5;
    for(let i=0; i<html_elements.length;i++) {
      let elem = html_elements[i];
      if(elem.side == undefined) {
        elem.side = true;
        if(html_elements[i-1].elt.clientHeight>30) {
          off += html_elements[i-1].elt.clientHeight-27;
        }
        elem.position(windowWidth-160,off+k*30);
        elem.class('side')
        k++;
      }
      elem.original_x = elem.position().x;
      elem.original_y = elem.position().y;
    }
    // shot_selector.hide();
    save_shot.hide();
    ratio_selector.hide();
    intersect.hide();
    stage_position.hide();
    gaze_direction.hide();
    all_types.hide();
    show_context.hide();
    // createAllShots();
  }
  frameRate(frame_rate);
  total_frame = Math.floor(video.duration()*frame_rate);
  createContextShot();
}

function draw() {

  if(is_show_shots || is_note_book || is_split) {
    p5ImageFromDash();
  } else {
    image_frame = video;
  }
  var x_vid = 0;
  var y_vid = 0;
  if(viewer_scale==1)
    mid_width = windowWidth*((3/5)*viewer_scale);
  can.size(windowWidth, windowHeight-can.elt.offsetTop-5);
  editing_button.setPosition(act_input.position().x+act_input.elt.offsetWidth+15,viewer_height+10);
  crop_button.setPosition(editing_button.x+30,viewer_height+10);
  shots_timeline.y = viewer_height+60;
  hidden_state.y = viewer_height+15;
  offstage_state.y = viewer_height+15;
  if(is_annotation) {
    annotation_timeline.setWrap();
    annotation_timeline.setActSelect();
  } else {
    div_actors_timeline.position(0,viewer_height+can.elt.offsetTop+40);
    div_actors_timeline.size(mid_width, windowHeight-div_actors_timeline.y-5);
  }
  if(viewer_width!=mid_width || up_rough){
    showAllElt();
    shot_selector.original_x = mid_width + 10;
    ratio_selector.original_x = mid_width + 80;
    intersect.original_x = mid_width + 10;
    stage_position.original_x = mid_width + 140;
    gaze_direction.original_x = mid_width + 315;
    all_types.original_x = mid_width + 140;
    show_context.original_x = mid_width + 320;
    shot_creation.original_x = mid_width + 10;
    show_tracks.original_x = mid_width + 160;
    show_shots.original_x = mid_width + 320;
    save_shot.original_x = mid_width + 180;
    for(let elem of html_elements) {
      if(elem.side) {
        let x = can.width-160;
        let y = elem.original_y + can.elt.offsetTop;
        elem.position(x,y)
      } else {
        let x = elem.original_x;
        let y = elem.original_y + can.elt.offsetTop;
        elem.position(x,y)
      }
    }
    up_rough = false;
    if(is_partition_editor) {
      partition_editor.update(true);
    }
  }
  act_input.position(280, can.elt.offsetTop+viewer_height+1);
  x_off = 0;
  y_off = 0;
  if(fullscreen()) {
    mid_width = screen.width;
    if(can.height<=screen.height){
      can.size(screen.width, screen.height);
    }
    if(table_scroll) {
      table_scroll.hide();
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
    if(table_scroll){
      table_scroll.show();
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

  noStroke();

  if(tool_tip.is_on) {
    tool_tip.p.style('background-color','white');
    tool_tip.p.style('border','1px solid grey');
    tool_tip.p.position(mouseX, can.elt.offsetTop+mouseY);
  }

  push();
  let x = x_off;
  let y = y_off;
  if(x < 0){ x=0;}
  if(y<0){y=0;}
  translate(x, y)
  if(crop_button.on || (is_split || is_note_book)) {
    if(video.duration()) {
      total_frame = Math.floor(video.duration()*frame_rate);
      frame_num = Math.floor(video.time()*frame_rate)%total_frame+1;
      var bbox;
      if(crop_button.on) {
        bbox = shots_timeline.getCurrStabShot(frame_num);
      }
      if((is_split || is_note_book) && show_shot) {
        bbox = show_shot.getCurrStabShotScale(frame_num);
      }
      if (bbox) {
          var a_s;
          if(crop_button.on) {
            a_s = shots_timeline.getCurrShot(frame_num).aspect_ratio;
          }
          if((is_split || is_note_book) && show_shot) {
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
    // showAllElt();
    let w = player.w;
    player.updatePos(95, viewer_height-15, (viewer_width-90-20), 10);
    drawStatus();
    if(w!=player.w){shots_timeline.updatePos();}

    if(is_partition_editor) {
      total_frame = Math.floor(video.duration()*frame_rate);
      frame_num = Math.floor(video.time()*frame_rate)%total_frame+1;
      setCursor();
      player.display();
      partition_editor.display();
    } else {
      if(!is_note_book) {
        if(keyIsDown(17)) {
          keyDown = 17;
        }
        if(video.duration() && frames_data.length>0)
        {
          total_frame = Math.floor(video.duration()*frame_rate);
          frame_num = Math.floor(video.time()*frame_rate)%total_frame+1;
          push();
          if(x_off<0){x_off=0;}
          if(y_off<0){y_off=0;}
          translate(x_off,y_off);
          scale(vid_h/Number(original_height));
          // console.log(x_off,y_off,viewer_width/Number(original_width));
          displayTrackBBox();
          drawTracklets();
          if(is_draw_track && !crop_button.on) {
            drawTrackOn();
          }
          if((is_shots && !crop_button.on) && !((is_split || is_note_book) && show_shot))
          {
            drawShotsLayout();
            // drawFramesData();
          }

          if(curr_creation)
            curr_creation.display();
          pop();
          push();
          fill(back_color);
          rect(0,viewer_height,viewer_width, viewer_height*2);
          pop();

          push();
          textSize(17);
          text('Actor name', 180, viewer_height+20);
          pop();
          if(!is_annotation) {
            editing_button.display();
            crop_button.display();
            hidden_state.display();
            offstage_state.display();
          }
          setCursor();
          player.display();
          if(editing_button.on) {
            for(let act of actors_timeline) {
              if(!is_shot_creation) {
                act.elem.hide();
              } else {
                act.elem.show();
              }
            }
            if(!is_split && !is_note_book && !is_annotation){shots_timeline.display();}
          } else {
            if(!is_split && !is_note_book && !is_annotation){displayTimeline();}
          }
          if(is_annotation) {
            for(let act of actors_timeline) {
                act.elem.hide();
            }
          }
          if(is_shot_creation) {
            all_types.hide();
            show_context.hide();
            drawCreationShot();
            if(table_scroll) {
              table_scroll.remove();
              table_scroll = undefined;
            }
          } else {
            createTableTracks();
            if(!is_show_shots)
              shot_selector.hide();
            ratio_selector.hide();
            intersect.hide();
            stage_position.hide();
            gaze_direction.hide();
            save_shot.hide();
            if(is_show_shots && !is_show_tracks) {
              drawShots();
            } else {
              all_types.hide();
              show_context.hide();
            }
          }
          if(!crop_button.on) {
            drawPreview();
          }
        }

        // testSplitScreen(5,0);
        // testSplitScreen(6,viewer_width/2);
        if(is_split) {
          act_input.hide();
          splitScreen();
        }else {
          act_input.show();
        }
        if(div_sub) {
          $("#div_sub").remove();
          div_sub = undefined;
          tab_sub = [];
        }

      } else {
        total_frame = Math.floor(video.duration()*frame_rate);
        frame_num = Math.floor(video.time()*frame_rate)%total_frame+1;
        setCursor();
        player.display();
        push();
        if(x_off<0){x_off=0;}
        if(y_off<0){y_off=0;}
        translate(x_off,y_off);
        scale(vid_h/Number(original_height));
        drawTracklets();
        if(is_shots) {
          drawShotsLayout();
        }
        pop();
        hideNoteBook();
        note_editor.display();
        push();
        fill(back_color);
        rect(0,viewer_height,viewer_width, viewer_height*2);
        pop();
        showNoteBook();
      }
    }


  } else {
    hideAllElt();
    total_frame = Math.floor(video.duration()*frame_rate);
    frame_num = Math.floor(video.time()*frame_rate)%total_frame+1;
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
    if(is_shots) {
      drawShotsLayout();
    }
    if(render_pose)
      drawTracklets();
    pop();
    pop();
  }
  var cpt = 0;
  var l = 0;
  for(let t of tracklets_line) {
    if(t.actor_name!='unknown' && !t.old) {
      cpt++;
      l++;
    } else if(!t.old) {
      l++;
    }
  }
  push();
  fill(255);
  text(cpt+'/'+l,100,15);
  let min = toTwoDigit(Math.floor(video.time()/60).toString());
  let sec = toTwoDigit(Math.floor(video.time()%60).toString());
  let mil = toTwoDigit(round_prec((video.time()%1)*100,0).toString());
  text(scale_ratio, 150,15);
  text(frame_num, 200,15);
  text(Math.round(frameRate()), viewer_width-40,15);
  textSize(20);
  text(min +':'+sec+'.'+mil, 10,20);
  min = toTwoDigit(Math.floor(video.duration()/60).toString());
  sec = toTwoDigit(Math.floor(video.duration()%60).toString());
  mil = toTwoDigit(round_prec((video.duration()%1)*100,0).toString());
  text(min +':'+sec+'.'+mil, 10,45);
  stroke(255);
  line(10,25,90,25);
  pop();

  if(is_annotation && !is_note_book) {
    annotation_timeline.div_wrap.show();
    annotation_timeline.act_select.show();
    annotation_timeline.add_act_button.show();
    annotation_timeline.display();
  } else {
    annotation_timeline.act_select.hide();
    annotation_timeline.div_wrap.hide();
    annotation_timeline.add_act_button.hide();
  }
}

// -----------------------------------------------------------------------------------------------------------------

/*
  Events manager
*/

function mousePressed() {

  if(is_annotation) {
    annotation_timeline.click(mouseX, mouseY);
  }
  if(is_partition_editor) {
    partition_editor.click(mouseX, mouseY);
  }
  if(is_note_book && div_sub) {
    for(let s of tab_sub) {
      var y1 = s.p.position().y - div_sub.elt.scrollTop;
      if(mouseX>div_sub.position().x && mouseX <div_sub.position().x+div_sub.width && mouseY>y1 && mouseY <y1+s.p.height) {
        video.time(s.start);
      }
    }
    note_editor.click(mouseX,mouseY);
  }
  if((is_split || is_note_book) && (mouseY>viewer_height || mouseX>viewer_width)) {
    let b = false;
    for(let s of shots) {
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
  if(mouseX<width && mouseY < height && !bbox_creation) {
    var retime = false;
    if(is_show_tracks && table_scroll) {
      for(let g of go_track) {
        g.on = false;
        g.click(mouseX, mouseY);
        if(g.on){
          retime = true;
        }
      }
    }
    if(!is_annotation) {
      editing_button.click(mouseX, mouseY);
      crop_button.click(mouseX, mouseY);
    }

    player.on = false;
    player.click(mouseX, mouseY);
    if(player.on) {
      retime = true;
      video.time(player.time);
      img_hd = undefined;
    }
    if(!retime && !is_annotation) {
      if(!editing_button.on) {
        for(let act of actors_timeline) {
          act.click(mouseX, mouseY);
        }
        if(mouseButton === CENTER) {
          for(let act of actors_timeline) {
            act.removeState(mouseX, mouseY);
            var b = act.removeTrack(mouseX, mouseY);
          }
        }
        for (var i = 0; i < erase_button.length; i++) {
          erase_button[i].on = false;
          erase_button[i].click(mouseX, mouseY);
          if(erase_button[i].on && erase_button[i]) {
            for(var j=0; j<tracklets_line.length; j++) {
              if(tracklets_line[j].actor_name == actors_timeline[i].actor_name && table_tracks) {
                table_tracks.elt.rows[j+1].cells[0].innerHTML = 'unknown';
              }
            }
            let ind;
            for(let j=0;j<annotation_timeline.actors_annotation.length; j++) {
              if(annotation_timeline.actors_annotation[j].actor_name == actors_timeline[i].actor_name) {
                ind = j;
              }
            }
            actors_timeline[i].removeAll();
            actors_timeline[i].elem.remove();
            annotation_timeline.actors_annotation[ind].elem.remove();
            annotation_timeline.actors_annotation.splice(ind,1);
            actors_timeline.splice(i, 1);
            erase_button.splice(i, 1);
            remove_timeline = true;
          }
        }
        var clic = false;
        var prev = undefined;
        for (let i=0; i<tracklets_line.length; i++) {
          if(tracklets_line[i].on) {
            prev = i;
          }
          tracklets_line[i].on = false;
          if(!clic)
            clic = tracklets_line[i].click(mouseX, mouseY);
        }
        if(!clic) {
          if(prev || prev==0) {
            tracklets_line[prev].on = true;
          }
        }
      } else {
        if(!is_shot_creation) {
          for(let s of shots) {
            if(!is_split) {
              s.on = false;
            }
            s.click(mouseX, mouseY);
          }
          keyCode = undefined;
        } else {
          for(let act of actors_timeline) {
            act.click(mouseX, mouseY);
          }
        }
        var b = shots_timeline.click(mouseX, mouseY);
      }
    }
    if(!retime) {
      if(mouseY < viewer_height && mouseX < viewer_width) {
        if (playing) {
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
  } else if (mouseX<viewer_width && mouseY < viewer_height){
    if(x_off<0){x_off=0;}
    if(y_off<0){y_off=0;}
    let mx = mouseX-x_off;
    let my = mouseY-y_off;
    mx /=(vid_h/Number(original_height));
    my /=(vid_h/Number(original_height));
    let bbox;
    let save = false;
    if(curr_creation && curr_creation.first_bbox && !curr_creation.last_bbox) {
      bbox = curr_creation.first_bbox;
    } else if(curr_creation && curr_creation.last_bbox) {
      bbox = curr_creation.last_bbox;
      save = true;
    }
    if(bbox && bbox.x == 0 && bbox.y == 0) {
      bbox.setPosition(Math.round(mx), Math.round(my));
      console.log('x, y');
    } else if (bbox && bbox.w == 0 && bbox.h == 0){
      bbox.setDimension(Math.round(mx) - bbox.x, Math.round(my) - bbox.y);
      console.log('w, h');
    } else if (bbox && !bbox.center_x && !bbox.center_y) {
      bbox.setCenter(Math.round(mx), Math.round(my));
      console.log('center');
    } else {
      bbox_creation = false;
      if(save){
        curr_creation.interpolate();
        if(curr_creation.act) {
          let t = new TrackBboxShot(curr_creation.act);
          t = curr_creation;
          curr_creation.act.track_bbox_shot.push(t);
        }
        curr_creation = undefined;
      }
    }
  }

}

function mouseDragged() {
  if(is_annotation) {
    annotation_timeline.drag(mouseX, mouseY);
  }

  dash_player.pause();
  playing = false;

  let b = false;
  if(!is_annotation) {
    if(!editing_button.on) {
      for(let act of actors_timeline) {
        if(act.dragExtTrack(mouseX, mouseY) && act.t_dragged) {
          let unit = act.w/annotation_timeline.total_frame;
          video.time((annotation_timeline.first+(mouseX-act.x)/unit)/frame_rate);
          img_hd = undefined;
        }
      }
      for(let t of tracklets_line) {
        if(t.drag) {
          b = true;
          break;
        }
      }
    }
    for(let s of shots) {
      s.draggin(mouseX, mouseY);
    }
    hidden_state.drag(mouseX, mouseY);
    offstage_state.drag(mouseX, mouseY);
  }

  if(editing_button.on) {
    shots_timeline.drag(mouseX,mouseY);
  }

  let new_t = player.drag(mouseX, mouseY);
  if(new_t && !b)
    video.time(new_t);

  annotation_timeline.dragNavBar(mouseX, mouseY);
}

function mouseReleased() {
  player.drop();

  if(is_annotation) {
    annotation_timeline.drop(mouseX, mouseY);
  } else {
    if(editing_button.on) {
      var b = shots_timeline.drop(mouseX, mouseY);
      if(b!=undefined) {
        video.time(b);
        shots_timeline.released = true;
        img_hd = undefined;
      }
      for(let s of shots) {
        s.drag = false;
      }
    } else {
      var state;
      var num_state;
      if(hidden_state.in_drag) {
        state = hidden_state;
        num_state = 0;
      } else if(offstage_state.in_drag) {
        state = offstage_state;
        num_state = 1;
      }
      if(state) {
        for(let act of actors_timeline) {
          act.dropState(mouseX, mouseY, state, num_state);
        }
      }
      hidden_state.drop();
      offstage_state.drop();
      var ind = 0;
      var is_obj = false;
      for(let i=0; i<tracklets_line.length; i++) {
        if(tracklets_line[i].drag) {
          is_obj = true;
          ind = i;
        }
        tracklets_line[i].drag = false;
      }
      for(let act of actors_timeline) {
        if(is_obj) {
          var detec = tracklets_line[ind].detections;
          if(mouseButton != CENTER && act.dropTrack(mouseX, mouseY, tracklets_line[ind], detec, total_frame) && table_tracks) {
            table_tracks.elt.rows[ind+1].cells[0].innerHTML = act.actor_name;
          }
        }
        var t = act.drop(mouseX, mouseY, annotation_timeline.total_frame/*Math.floor(video.duration()*frame_rate)*/);
        if(t) {
          tracklets_line.push(t);
        }
      }
    }
  }

}

function mouseWheel(event) {
  if(keyIsPressed) {
    //shift key = 16
    if(keyCode===16) {
      if(event.delta<0) {
          viewer_scale += 0.1;
      } else {
          viewer_scale -= 0.1;
      }
      // console.log(event.delta, viewer_scale);
    }
    //z = 122
  }
  if((is_split || is_note_book) &&
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
  annotation_timeline.mouseWheel(event);
  partition_editor.mouseWheel(event);
}

function doubleClicked() {
  var fs = fullscreen();
  if(mouseX<viewer_width && mouseY<viewer_height) {
    fullscreen(!fs);
    if(fullscreen()) {
      showAllElt();
    } else {
      hideAllElt();
    }
  }
}

function keyPressed() {
  if(!is_partition_editor) {
    annotation_timeline.keyPressed(keyCode);
    if (!keyDown && keyCode == 17) {
      keyDown = 17;
    } else if(keyDown == 17 && keyCode == 90) {
      for(let act of actors_timeline) {
        var t = act.undoExtend();
        if(t) {
          t.on = true;
          removeTracklet();
        }
      }
      keyDown = undefined;
    }

    if(keyCode===46) {
      if(!is_note_book) {
        if(is_show_shots)
          removeShot();
        if(!editing_button.on) {
          removeTracklet();
        } else {
          shots_timeline.removeShot();
        }
      }
    }
    if(keyCode===83) {
      splitTracklet();
    }
    if(keyCode===69) {
      for(let act of actors_timeline) {
        for(var i=0; i< act.tracks.length; i++) {
          if(act.tracks[i].on) {
            act.tracks[i].actor_name = 'unknown';
            act.tracks[i].added = false;
            act.tracks.splice(i, 1);
            break;
          }
        }
      }
    }
    if (keyCode === 32) {
      if(!is_note_editor) {
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
    } else if(keyCode == 85) {
      for(let act of actors_timeline) {
        var t = act.undoExtend(Math.floor(video.duration()*frame_rate));
        if(t) {
          t.on = true;
          removeTracklet();
        }
      }
    }
  } else {
    partition_editor.keyPressed(keyCode);
  }
}

// -----------------------------------------------------------------------------------------------------------------
