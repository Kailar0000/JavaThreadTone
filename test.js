

// CONST
const ui_offs = 250;
let cv_d = 650;

// VARS
let cv = [
  { x: ui_offs + cv_d / 2 + 50, y: 50 + cv_d / 2 },
  { x: ui_offs + cv_d + 100 + cv_d / 2, y: 50 + cv_d / 2 }
];
let ui, help;
let img = null;
let nodes = [];
let overlaps = [];
let length;
let density = 1;
let temp_arry = [];
let temp = 0;
let path = 0;
let maxPath = 1;

let update_f = true;
let node = 0;
let count = 0;
let best = 0;
let running = false;
let stop_f = false;
let hold_f = false;
let radialGranularity = 32;
let tmr;
let brigness_arry = [-30, -30, -30, -30]
let contrast_array =[0.9, 1, 1, 0.9];
let edge_arry = [1, 1, 0, 1];
let clear_arry = [2.5, 2.5, 3.5, 5];
let negativ_arry = [true, true, false, true];
let center_arry = [true, false, false, false];

let ui_negative;
let ui_center;
let ui_radial;

let start_x, start_y;
let offs_x = 0, offs_y = 0;
let offs_bx = 0, offs_by = 0;

// =============== SETUP ===============
function setup() {
  let cWidth = ui_offs + cv_d * 2 + 50 * 3;
  let cHeight = cv_d + 100;
  document.body.style.zoom = (Math.min((innerHeight - 25) / cHeight, (innerWidth - 25) / cWidth)).toFixed(1);
  createCanvas(cWidth, cHeight);

  help = QuickSettings.create(ui_offs - 10, 0, "Помощь (кликни дважды)")
    .addHTML("Выбор изображения", '<div style="height:30px"></div>')
    .addHTML('Размер изображения', '<div style="height:20px"></div>')

    .addHTML('Выделить края', '<div style="height:20px"></div>')
    .addHTML('Диаметр холста, см', '<div style="height:20px"></div>')
    .addHTML('Толщина нитки, мм', '<div style="height:20px"></div>')
    .addHTML('Количество гвоздей', '<div style="height:20px"></div>')
    .addHTML('Максимум линий', '<div style="height:20px"></div>')
    .addHTML('Прозрачность очистки', '<div style="height:20px"></div>')
    .addHTML('Запрет на угол возврата', '<div style="height:20px"></div>')
    .addHTML('Максимум ниток на гвозде', '<div style="height:20px"></div>')
    .addHTML('Оптимизация чёрных полос', '')
    .addHTML('Общее улучшение', '')
    .addHTML('Приоритет линий в центре', '')
    .addHTML('Минимальное расстояние до след. гвоздя - 1/4 круга', '')
    .setWidth(200)
    .setDraggable(false)
    .collapse()

  ui = QuickSettings.create(0, 0,)
    .addFileChooser("Pick Image", "", "", handleFile)
    .addRange('Size', cv_d - 300, cv_d + 500, cv_d, 1, update_h)
    .addNumber('Diameter', 10, 100, 30, 0.1, update_h)
    .addRange('Thickness', 0.1, 1.0, 0.5, 0.1, update_h)
    .addRange('Node Amount', 240, 240, 240, 5, update_h)
    .addRange('Max Lines', 0, 4700, 4700, 20, update_h)
    .addRange('Threshold', 0, 2000, 0, 0, update_h)
    .addRange('Clear Alpha', 0, 255, 7, 5, update_h)
    .addRange('Offset', 0, 100, 20, 5, update_h)
    .addRange('Overlaps', 0, 15, 0, 1, update_h)
    .addBoolean('Radial Granularity', 0, update_h)
    .addBoolean('Negative', 1, update_h)
    .addBoolean('Center Balance', 0, update_h)
    .addBoolean('Quarter', 0, update_h)
    .addHTML("Control",
      "<button class='qs_button' onclick='start()'>Start</button>&nbsp;" +
      "<button class='qs_button' onclick='stop()'>Stop</button>&nbsp;" +
      "<button class='qs_button' onclick='save()'>Save</button>&nbsp;" +
      "<button class='qs_button' onclick='save_file()'>File</button>&nbsp;"
    )
    .addHTML("Status", "Stop")
    .addText("Nodes", "")
    .addText("Nodes Num", "")
    .setWidth(ui_offs - 10)
    .setDraggable(false)
    .setCollapsible(false);

  ui.hideControl('Threshold');

  density = pixelDensity();

  imageMode(CENTER);
  ellipseMode(CENTER);
}

// =============== MAIN LOOP ===============
function draw() {
  if (update_f || hold_f) {
    if (hold_f) {
      offs_x = offs_bx + mouseX - start_x;
      offs_y = offs_by + mouseY - start_y;
    }
    background(255);
    showImage();
    cropImage();
    drawCanvas();

    drawNodes();
    update_f = 0;
    setStatus("Stop");
  }
  if (running) tracer();

  cursor(ARROW);
  if (inCanvas()) cursor(HAND);
  if (hold_f) cursor('grab');
}

// =============== TRACER ===============
function tracer() {
  setStatus("Running. Lines: " + count);

  let ui_amount = ui_get('Node Amount');//ноды
  let ui_offset = ui_get("Offset");
  let ui_quarter = ui_get("Quarter");
  let ui_overlaps = ui_get("Overlaps");
  let ui_max = ui_get('Max Lines');
  let ui_clear_a = ui_get('Clear Alpha');
  let ui_clear_w = clear_arry[path];
  let ui_diameter = ui_get("Diameter");
  let ui_thick = ui_get("Thickness");
  let last_max = [1, 1, 1, 1, 1];

  for (let i = 0; i < 20; i++) {
    let max = -10000000000;
    best = -1;

    loadPixels();
    for (let i = 0; i < ui_amount; i++) {
      if (node == i) continue;

      if (count >= 2) {
        dst = abs(i - nodes[count - 2]);
        if (dst > ui_amount / 2) dst = ui_amount - dst;
        dst = dst / ui_amount * 360;
        if (dst < ui_offset) continue;
      }

      if (ui_quarter) {
        let delta = abs(node - i);
        if (min(ui_amount - delta, delta) <= ui_amount / 8) continue;
      }

      if (ui_overlaps > 0 && overlaps[i] + 1 > ui_overlaps) continue;
      let res = scanLine(node, i);

      if (res > max) {
        max = res;
        best = i;
      }
    }
    overlaps[best]++;

    last_max.push(max);
    last_max.shift();
    let stop = true;
    for (let m in last_max) if (last_max[m] != 0) stop = false;

    if (count > ui_max || best < 0 || stop || stop_f) {
      running = false;
      count--;
      setStatus("Done! " + count + " lines, " + Math.round(length / 100) + " m, max overlap " + Math.max(...overlaps) + ' in ' + ((Date.now() - tmr) / 1000).toFixed(1) + ' seconds');
      ui_set("Nodes", temp_arry);
      nodes.push(ui_amount & 0xff);
      ui_set("Nodes Num", nodes)
      nodes.pop();
      if (path<maxPath)
      {
        save()
        save_file()
        restart()
        return
      }
      else{
        save()
        save_file()
        return
      }
    }

    nodes.push(best);
    if (best < 60){
      temp_arry.push("B"+(61 - (60 -best)));
    }
    else if (best < 120){
      temp_arry.push("C"+(61 - (120 - best)));
    }
    else if (best < 180){
      temp_arry.push("D"+(61 - (180 - best)));
    }
    else if (best < 240){
      temp_arry.push("A"+(61 - (240 - best)));
    }
    let xy = [get_xy(0, node), get_xy(0, best)];
    clearLine(xy, ui_clear_w, ui_clear_a);
    updatePixels();

    stroke(0, 0, 0, 150);
    strokeWeight(ui_thick / ((ui_diameter * 10 / cv_d)));

    xy = [get_xy(1, node), get_xy(1, best)];
    line(xy[0].x, xy[0].y, xy[1].x, xy[1].y);
    length += dist(xy[0].x, xy[0].y, xy[1].x, xy[1].y) * ui_diameter / (cv_d);
    node = best;
    count++;
  }
}
function scanLine(start, end) {
  let xy = [get_xy(0, start), get_xy(0, end)];

  let x0 = xy[0].x;
  let y0 = xy[0].y;
  let x1 = xy[1].x;
  let y1 = xy[1].y;

  let sum = 0;
  let sx = (x0 < x1) ? 1 : -1;
  let sy = (y0 < y1) ? 1 : -1;
  let dx = abs(x1 - x0);
  let dy = abs(y1 - y0);
  let err = dx - dy;
  let e2 = 0;
  let len = 0;
  let radialMask = getRadialMask(x0, y0, x1, y1);

  while (1) {
    let i = getPixelIndex(x0, y0);
    let val;

    if (ui_negative) {
      val = (255 - pixels[i]) - (255 - pixels[i + 3]);
    } else {
      val = 255 - pixels[i];
    }

    if (ui_center) {
      let cx = abs(cv[0].x - x0);
      let cy = abs(cv[0].y - y0);
      let cl = Math.sqrt(cx * cx + cy * cy);
      val *= Math.log(cv_d / 2 / cl);
    }

    if (ui_radial) {
      if (radialMask == 0 || ((radialFill[i] || 0) & radialMask) == 0) sum += val;
    } else {
      sum += val;
    }

    len++;

    if (x0 == x1 && y0 == y1) break;
    e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  sum /= len;
  return Math.round(sum);
}
function clearLine(xy, w, a) {
  for (let i = 0; i < w; i++) {
    let x0 = xy[0].x;
    let y0 = xy[0].y;
    let x1 = xy[1].x;
    let y1 = xy[1].y;

    let lx = abs(x0 - x1);
    let ly = abs(y0 - y1);
    let w2 = Math.round(w / 2);

    if (lx < ly) {
      x0 = x0 - w2 + i;
      x1 = x1 - w2 + i;
    } else {
      y0 = y0 - w2 + i;
      y1 = y1 - w2 + i;
    }

    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let dx = abs(x1 - x0);
    let dy = abs(y1 - y0);
    let err = dx - dy;
    let e2 = 0;
    let radialMask = getRadialMask(x0, y0, x1, y1);

    while (1) {
      let i = getPixelIndex(x0, y0);
      radialFill[i] = (radialFill[i] || 0) | radialMask;

      if (ui_negative) {
        if (pixels[i] + a < 255) {
          pixels[i] += a;
          pixels[i + 1] += a;
          pixels[i + 2] += a;
        } else {
          const ra = a - (255 - pixels[i]);
          pixels[i] = 255;
          pixels[i + 1] = 255;
          pixels[i + 2] = 255;
          pixels[i + 3] -= ra;
          if (pixels[i + 3] < 0) {
            pixels[i + 3] = 0;
          }
        }
      } else {
        pixels[i] += a;
        pixels[i + 1] += a;
        pixels[i + 2] += a;
      }

      if (x0 == x1 && y0 == y1) break;
      e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}

// =============== MISC ===============
function cropImage() {
  noStroke();
  fill(255);
  rect(0, 0, width, 50 - 5);
  rect(0, 0, cv[0].x - cv_d / 2 - 5, width);
  rect(0, cv[0].y + cv_d / 2 + 5, width, height);
  rect(cv[0].x + cv_d / 2 + 5, 0, width, height);
}
function showImage() {
  if (img) {
    let img_x = cv[0].x + offs_x;
    let img_y = cv[0].y + offs_y;
    let show = createImage(img.width, img.height);
    show.copy(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
    if (show.width < show.height) show.resize(ui_get("Size"), 0);
    else show.resize(0, ui_get("Size"));
    show.filter(GRAY);
    b_and_c(show, brigness_arry[path-1], (contrast_array[path-1]));
    if (ui_get('Gamma') != 1.0) gamma(show, ui_get('Gamma'));
    
    let edge_i = edge_arry[path];
    if (edge_i > 0 && !hold_f) {
      if (edge_i == 1) edges(show);
      else sobel_edges(show, edge_i);
    }
    copy(show, 0, 0, show.width, show.height, img_x - show.width / 2, img_y - show.width / 2, show.width, show.height);
  }
}

function drawCanvas() {
  stroke(0);
  strokeWeight(1);
  noFill();
  circle(cv[0].x, cv[0].y, cv_d + 7);
  circle(cv[1].x, cv[1].y, cv_d);
}
function drawNodes() {
  noStroke();
  fill(0);
  for (let i = 0; i < ui_get("Node Amount"); i++) {
    xy = get_xy(1, i);
    circle(xy.x, xy.y, 5);
  }
}
function get_xy(num, node) {
  let xy = get_xy_raw(cv[num].x, cv[num].y, cv_d / 2, node, ui_get("Node Amount"));
  return xy;
}
function get_xy_raw(x, y, r, cur, max) {
  x = x + r * Math.cos(2 * Math.PI * cur / max);
  y = y + r * Math.sin(2 * Math.PI * cur / max);
  x = Math.round(x);
  y = Math.round(y);
  return { x, y };
}
function inCanvas() {
  let vx = mouseX - cv[0].x;
  let vy = mouseY - cv[0].y;
  return (vx * vx + vy * vy < cv_d * cv_d / 4);
}
function mousePressed() {
  if (inCanvas()) {
    hold_f = true;
    offs_bx = offs_x;
    offs_by = offs_y;
    start_x = mouseX;
    start_y = mouseY;
  }
}
function mouseReleased() {
  if (hold_f) {
    hold_f = false;
    offs_x = offs_bx + mouseX - start_x;
    offs_y = offs_by + mouseY - start_y;
    update_f = true;
  }
}
function mouseWheel(event) {
  if (inCanvas()) {
    update_f = true;
    ui_set('Size', ui_get('Size') - event.delta / 5);
  }
}

// =============== HANDLERS ===============
function update_h() {
  update_f = true;
  running = false;
  ui_negative = negativ_arry[path];
  ui_center = center_arry[path];
  ui_radial = ui_get('Radial Granularity');
}
function start() {
  maxPath = 3;
  path = 1;
  temp_arry = ["B1"];
  temp = 0;
  node = 0;
  count = 1;
  nodes = [0];
  overlaps = new Array(ui_get("Node Amount")).fill(0);
  length = 0;
  update_f = true;
  running = true;
  stop_f = false;
  radialFill = [];
  tmr = Date.now();
}
function stop() {
  if (!running) update_f = true;
  stop_f = true;
}
function handleFile(file) {
  if (file.type.toString().includes('image')) {
    loadImage(URL.createObjectURL(file), nimg => {
      img = createImage(nimg.width, nimg.height);
      img.copy(nimg, 0, 0, nimg.width, nimg.height, 0, 0, nimg.width, nimg.height);
      if (img.width < img.height) img.resize(cv_d, 0);
      else img.resize(0, cv_d);

      stop_f = true;
      update_h();
      let c = contrast_array[path];
      ui_set('Brightness', 0);
      ui_set('Edges', 0);
      ui_set('Contrast', c);
      ui_set('Size', cv_d);
      ui_set('Gamma', 1);
      offs_x = offs_bx = 0;
      offs_y = offs_by = 0;
    });
  }
}
function save_file() {
  let blob = new Blob([temp_arry], {type: "text/plain"});
  let link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", "my-text.txt");
  link.click();
}

// =============== UTILITY ===============
function getRadialMask(x0, y0, x1, y1) {
  if (radialGranularity <= 0) return 0;
  let angle = x1 == x0 ? (y0 < y1 ? 1 : -1) : Math.atan((y1 - y0) / (x1 - x0));
  let radialAngle = Math.round((angle + Math.PI / 2) * radialGranularity / Math.PI);
  return 1 << radialAngle;
}
function getPixelIndex(x, y) {
  return Math.round((x + y * width * density) * 4 * density);
}
function edges(eimg) {
  let kernel = [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]];
  let bimg = createImage(eimg.width, eimg.height);
  bimg.copy(eimg, 0, 0, eimg.width, eimg.height, 0, 0, eimg.width, eimg.height);

  bimg.loadPixels();
  eimg.loadPixels();

  for (let x = 1; x < bimg.width - 1; x++) {
    for (let y = 1; y < bimg.height - 1; y++) {
      let sum = 0;

      for (kx = -1; kx <= 1; kx++) {
        for (ky = -1; ky <= 1; ky++) {
          let idx = ((x + kx) + (y + ky) * bimg.width) * 4;
          let val = bimg.pixels[idx];
          sum += kernel[ky + 1][kx + 1] * val;
        }
      }
      sum = constrain(sum, 0, 255);
      let idx = (x + y * bimg.width) * 4;
      eimg.pixels[idx] = sum;
      eimg.pixels[idx + 1] = sum;
      eimg.pixels[idx + 2] = sum;
    }
  }
  eimg.updatePixels();
}
function gamma(oimg, exp) {
  oimg.loadPixels();
  for (let i = 0; i < oimg.width * oimg.height * 4; i += 4) {
    let val = Math.pow(oimg.pixels[i] / 255.0, exp) * 255;
    oimg.pixels[i] = val;
    oimg.pixels[i + 1] = val;
    oimg.pixels[i + 2] = val;
  }
  oimg.updatePixels();
}
function sobel_edges(oimg, idx) {
  let kernel_x = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  let kernel_y = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  let W = oimg.width;
  let H = oimg.height;

  let bimg = createImage(W, H);
  bimg.copy(oimg, 0, 0, W, H, 0, 0, W, H);

  bimg.loadPixels();
  oimg.loadPixels();

  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let sum_x = 0;
      let sum_y = 0;

      if (!((x == 0) || (x == W - 1) || (y == 0) || (y == H - 1))) {
        for (kx = -1; kx <= 1; kx++) {
          for (ky = -1; ky <= 1; ky++) {
            let idx = ((x + kx) + (y + ky) * W) * 4;
            let val = oimg.pixels[idx];
            sum_x += kernel_x[ky + 1][kx + 1] * val;
            sum_y += kernel_y[ky + 1][kx + 1] * val;
          }
        }
      }

      let sum = sqrt(sum_x * sum_x + sum_y * sum_y);
      sum = constrain(sum, 0, 255);

      let idx = (x + y * W) * 4;
      bimg.pixels[idx] = sum;
      bimg.pixels[idx + 1] = sum;
      bimg.pixels[idx + 2] = sum;
    }
  }
  bimg.updatePixels();
  bimg.filter(INVERT);
  bimg.loadPixels();

  let k = 0;
  switch (idx) {
    case 2: k = 0.2; break;
    case 3: k = 0.4; break;
    case 4: k = 0.6; break;
    case 5: k = 0.8; break;
  }

  for (let i = 0; i < W * H * 4; i += 4) {
    let val = oimg.pixels[i] * (1 - k) + bimg.pixels[i] * k;
    oimg.pixels[i] = val;
    oimg.pixels[i + 1] = val;
    oimg.pixels[i + 2] = val;
  }

  oimg.updatePixels();
}
function setStatus(stat) {
  ui_set("Status", stat);
}
function ui_get(name) {
  return ui.getValue(name);
}
function ui_set(name, value) {
  return ui.setValue(name, value);
}
function b_and_c(input, bright, cont) {
  let w = input.width;
  let h = input.height;

  input.loadPixels();
  for (let i = 0; i < w * h * 4; i += 4) {

    let r = input.pixels[i];
    let g = input.pixels[i + 1];
    let b = input.pixels[i + 2];

    r = (r * cont + bright);
    g = (g * cont + bright);
    b = (b * cont + bright);

    r = r < 0 ? 0 : r > 255 ? 255 : r;
    g = g < 0 ? 0 : g > 255 ? 255 : g;
    b = b < 0 ? 0 : b > 255 ? 255 : b;

    input.pixels[i] = r;
    input.pixels[i + 1] = g;
    input.pixels[i + 2] = b;
  }
  input.updatePixels();
}
function restart(){
    path ++;
    showImage();
    temp_arry = ["B1"];
    temp = 0;
    node = 0;
    count = 1;
    nodes = [0];
    overlaps = new Array(ui_get("Node Amount")).fill(0);
    length = 0;
    update_f = true;
    running = true;
    stop_f = false;
    radialFill = [];
    tmr = Date.now();
}