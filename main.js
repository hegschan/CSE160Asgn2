let canvas;
let gl;
let a_Position;
let u_ModelMatrix;
let u_GlobalRotation;
let u_FragColor;

let cubeBuffer;
let cubeVertexCount = 0;
let pyramidBuffer;
let pyramidVertexCount = 0;

const modelStack = [];

const g_joint = {
  neck: 0,
  head: 0,
  beak: 0,
  tail: 0,
  leftShoulder: 10,
  leftElbow: -10,
  leftWrist: 10,
  rightShoulder: -10,
  rightElbow: 10,
  rightWrist: -10,
  leftHip: 0,
  leftKnee: 0,
  rightHip: 0,
  rightKnee: 0
};

const g_global = {
  x: 15,
  y: 0,
  mouseX: 0,
  mouseY: 0
};

let g_animationOn = true;
let g_pokeAnimation = false;
let g_pokeStart = 0;
let g_startTime = performance.now();
let g_lastFrame = g_startTime;

function main() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl");
  if (!gl) {
    console.log("Failed to get WebGL context");
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_GlobalRotation = gl.getUniformLocation(gl.program, "u_GlobalRotation");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");

  initGeometry();
  initUI();
  initMouseControls();

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.68, 0.84, 0.97, 1.0);

  requestAnimationFrame(tick);
}

function initGeometry() {
  const cubeVertices = new Float32Array([
    // Front
    0, 0, 0, 1, 1, 0, 1, 0, 0,
    0, 0, 0, 0, 1, 0, 1, 1, 0,
    // Back
    0, 0, 1, 1, 0, 1, 1, 1, 1,
    0, 0, 1, 1, 1, 1, 0, 1, 1,
    // Left
    0, 0, 0, 0, 0, 1, 0, 1, 1,
    0, 0, 0, 0, 1, 1, 0, 1, 0,
    // Right
    1, 0, 0, 1, 1, 1, 1, 0, 1,
    1, 0, 0, 1, 1, 0, 1, 1, 1,
    // Top
    0, 1, 0, 0, 1, 1, 1, 1, 1,
    0, 1, 0, 1, 1, 1, 1, 1, 0,
    // Bottom
    0, 0, 0, 1, 0, 1, 0, 0, 1,
    0, 0, 0, 1, 0, 0, 1, 0, 1
  ]);

  cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
  cubeVertexCount = cubeVertices.length / 3;

  const pyramidVertices = new Float32Array([
    // Base
    0, 0, 0, 1, 0, 0, 0.5, 0, 1,
    // Sides
    0, 0, 0, 1, 0, 0, 0.5, 0.6, 0.5,
    1, 0, 0, 0.5, 0, 1, 0.5, 0.6, 0.5,
    0.5, 0, 1, 0, 0, 0, 0.5, 0.6, 0.5
  ]);

  pyramidBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pyramidBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, pyramidVertices, gl.STATIC_DRAW);
  pyramidVertexCount = pyramidVertices.length / 3;
}

function initUI() {
  bindSlider("globalXSlider", (v) => { g_global.x = Number(v); renderScene(); });
  bindSlider("globalYSlider", (v) => { g_global.y = Number(v); renderScene(); });

  bindSlider("neckSlider", (v) => { g_joint.neck = Number(v); renderScene(); });
  bindSlider("headSlider", (v) => { g_joint.head = Number(v); renderScene(); });
  bindSlider("beakSlider", (v) => { g_joint.beak = Number(v); renderScene(); });
  bindSlider("tailSlider", (v) => { g_joint.tail = Number(v); renderScene(); });

  bindSlider("leftShoulderSlider", (v) => { g_joint.leftShoulder = Number(v); renderScene(); });
  bindSlider("leftElbowSlider", (v) => { g_joint.leftElbow = Number(v); renderScene(); });
  bindSlider("leftWristSlider", (v) => { g_joint.leftWrist = Number(v); renderScene(); });

  bindSlider("rightShoulderSlider", (v) => { g_joint.rightShoulder = Number(v); renderScene(); });
  bindSlider("rightElbowSlider", (v) => { g_joint.rightElbow = Number(v); renderScene(); });
  bindSlider("rightWristSlider", (v) => { g_joint.rightWrist = Number(v); renderScene(); });

  bindSlider("leftHipSlider", (v) => { g_joint.leftHip = Number(v); renderScene(); });
  bindSlider("leftKneeSlider", (v) => { g_joint.leftKnee = Number(v); renderScene(); });
  bindSlider("rightHipSlider", (v) => { g_joint.rightHip = Number(v); renderScene(); });
  bindSlider("rightKneeSlider", (v) => { g_joint.rightKnee = Number(v); renderScene(); });

  document.getElementById("animOnBtn").onclick = () => { g_animationOn = true; };
  document.getElementById("animOffBtn").onclick = () => { g_animationOn = false; };
}

function bindSlider(id, onInput) {
  const slider = document.getElementById(id);
  slider.addEventListener("input", (e) => onInput(e.target.value));
}

function initMouseControls() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.onmousedown = (e) => {
    const rect = canvas.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) return;

    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;

    if (e.shiftKey) {
      g_pokeAnimation = true;
      g_pokeStart = performance.now();
    }
  };

  canvas.onmouseup = () => { dragging = false; };
  canvas.onmouseleave = () => { dragging = false; };

  canvas.onmousemove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    g_global.mouseY += dx * 0.5;
    g_global.mouseX += dy * 0.5;
    g_global.mouseX = Math.max(-80, Math.min(80, g_global.mouseX));
    lastX = e.clientX;
    lastY = e.clientY;
  };
}

function pushMatrix(m) {
  modelStack.push(new Matrix4(m));
}

function popMatrix() {
  return modelStack.pop();
}

function tick(now) {
  const elapsedSec = (now - g_startTime) / 1000.0;
  const dtSec = (now - g_lastFrame) / 1000.0;
  g_lastFrame = now;

  updateAnimation(elapsedSec, dtSec);
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimation(t, dt) {
  if (g_animationOn) {
    const flap = 35 * Math.sin(t * 5.0);
    const elbowWave = 18 * Math.sin(t * 5.0 + 0.8);
    const wristWave = 12 * Math.sin(t * 5.0 + 1.4);

    g_joint.leftShoulder = 10 + flap;
    g_joint.rightShoulder = -10 - flap;
    g_joint.leftElbow = -10 + elbowWave;
    g_joint.rightElbow = 10 - elbowWave;
    g_joint.leftWrist = 8 + wristWave;
    g_joint.rightWrist = -8 - wristWave;

    g_joint.neck = 10 * Math.sin(t * 1.6);
    g_joint.head = 6 * Math.sin(t * 2.2);
    g_joint.tail = 14 * Math.sin(t * 2.0 + 2.2);
    g_joint.leftHip = 12 * Math.sin(t * 3.5);
    g_joint.rightHip = -12 * Math.sin(t * 3.5);
    g_joint.leftKnee = 8 * Math.sin(t * 3.5 + 0.5);
    g_joint.rightKnee = -8 * Math.sin(t * 3.5 + 0.5);
    g_joint.beak = 6 * Math.max(0, Math.sin(t * 4.0));
  } else if (dt > 0) {
    // Keep static pose when animation is off.
  }

  if (g_pokeAnimation) {
    const pokeT = (performance.now() - g_pokeStart) / 1000.0;
    if (pokeT < 0.8) {
      const pulse = Math.sin(pokeT * 20.0) * (1.0 - pokeT / 0.8);
      g_joint.head += pulse * 20;
      g_joint.beak += Math.max(0, pulse * 15);
      g_joint.tail += pulse * 15;
    } else {
      g_pokeAnimation = false;
    }
  }
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  const globalRot = new Matrix4();
  globalRot.rotate((g_global.x + g_global.mouseX) * 0.6, 1, 0, 0);
  globalRot.rotate((g_global.y + g_global.mouseY) * 0.6, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRot.elements);

  const eagleRoot = new Matrix4();
  eagleRoot.translate(-0.72, -0.66, -0.18);
  eagleRoot.scale(0.42, 0.42, 0.42);

  // Reference marker: confirms model-space drawing is visible.
  const reference = new Matrix4(eagleRoot);
  reference.translate(-0.05, -0.1, -0.05);
  reference.scale(0.12, 0.12, 0.12);
  drawCube(reference, [1.0, 0.15, 0.15, 1.0]);

  let body = new Matrix4(eagleRoot);
  body.translate(-1.2, 0.6, -0.4);
  body.scale(2.4, 1.2, 1.4);
  drawCube(body, [0.38, 0.25, 0.13, 1.0]); // torso

  let chest = new Matrix4(eagleRoot);
  chest.translate(-0.8, 0.35, -0.25);
  chest.scale(1.6, 1.0, 1.1);
  drawCube(chest, [0.55, 0.35, 0.20, 1.0]); // chest

  let pelvis = new Matrix4(eagleRoot);
  pelvis.translate(-0.7, 0.0, -0.3);
  pelvis.scale(1.4, 0.6, 1.2);
  drawCube(pelvis, [0.30, 0.20, 0.10, 1.0]); // back body

  let neckBase = new Matrix4(eagleRoot);
  neckBase.translate(-0.25, 1.35, 0.08);
  neckBase.rotate(g_joint.neck, 0, 0, 1);
  pushMatrix(neckBase);
  neckBase.scale(0.45, 0.7, 0.45);
  drawCube(neckBase, [0.56, 0.42, 0.27, 1.0]); // neck

  let headRoot = popMatrix();
  headRoot.translate(0.07, 0.7, 0.1);
  headRoot.rotate(g_joint.head, 0, 0, 1);
  pushMatrix(headRoot);
  let head = new Matrix4(headRoot);
  head.scale(0.6, 0.5, 0.55);
  drawCube(head, [0.90, 0.90, 0.85, 1.0]); // head

  let beakRoot = popMatrix();
  beakRoot.translate(0.55, 0.22, 0.12);
  beakRoot.rotate(g_joint.beak, 0, 0, 1);
  let beak = new Matrix4(beakRoot);
  beak.scale(0.5, 0.35, 0.35);
  drawPyramid(beak, [0.95, 0.75, 0.15, 1.0]); // non-cube primitive

  let tailRoot = new Matrix4(eagleRoot);
  tailRoot.translate(-1.25, 0.95, 0.1);
  tailRoot.rotate(g_joint.tail, 0, 0, 1);
  let tail = new Matrix4(tailRoot);
  tail.scale(0.8, 0.25, 0.6);
  drawCube(tail, [0.26, 0.16, 0.08, 1.0]); // tail

  drawWing(eagleRoot, -0.1, 1.0, -0.35, true);
  drawWing(eagleRoot, -0.1, 1.0, 1.05, false);
  drawLeg(eagleRoot, 0.2, 0.03, -0.1, true);
  drawLeg(eagleRoot, 0.2, 0.03, 0.7, false);
}

function drawWing(root, x, y, z, left) {
  const shoulder = new Matrix4(root);
  shoulder.translate(x, y, z);
  shoulder.rotate(left ? g_joint.leftShoulder : g_joint.rightShoulder, 0, 0, 1);
  pushMatrix(shoulder);

  const upper = new Matrix4(shoulder);
  upper.scale(1.1, 0.2, 0.35);
  drawCube(upper, [0.29, 0.18, 0.10, 1.0]); // upper wing

  let elbow = popMatrix();
  elbow.translate(1.05, 0.05, 0.0);
  elbow.rotate(left ? g_joint.leftElbow : g_joint.rightElbow, 0, 0, 1);
  pushMatrix(elbow);

  const fore = new Matrix4(elbow);
  fore.scale(1.0, 0.16, 0.32);
  drawCube(fore, [0.22, 0.14, 0.08, 1.0]); // fore wing

  let wrist = popMatrix();
  wrist.translate(0.95, 0.02, 0.0);
  wrist.rotate(left ? g_joint.leftWrist : g_joint.rightWrist, 0, 0, 1);
  const tip = new Matrix4(wrist);
  tip.scale(0.85, 0.12, 0.3);
  drawCube(tip, [0.17, 0.11, 0.07, 1.0]); // wing tip
}

function drawLeg(root, x, y, z, left) {
  const hip = new Matrix4(root);
  hip.translate(x, y, z);
  hip.rotate(left ? g_joint.leftHip : g_joint.rightHip, 0, 0, 1);
  pushMatrix(hip);

  const thigh = new Matrix4(hip);
  thigh.scale(0.16, 0.55, 0.16);
  drawCube(thigh, [0.90, 0.73, 0.31, 1.0]); // thigh

  let knee = popMatrix();
  knee.translate(0.0, -0.53, 0.0);
  knee.rotate(left ? g_joint.leftKnee : g_joint.rightKnee, 0, 0, 1);
  pushMatrix(knee);

  const shin = new Matrix4(knee);
  shin.scale(0.13, 0.5, 0.13);
  drawCube(shin, [0.86, 0.67, 0.20, 1.0]); // shin

  const foot = popMatrix();
  foot.translate(0.0, -0.5, 0.0);
  foot.scale(0.35, 0.08, 0.22);
  drawCube(foot, [0.97, 0.79, 0.28, 1.0]); // foot
}

function drawCube(modelMatrix, color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.drawArrays(gl.TRIANGLES, 0, cubeVertexCount);
}

function drawPyramid(modelMatrix, color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, pyramidBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.drawArrays(gl.TRIANGLES, 0, pyramidVertexCount);
}

main();