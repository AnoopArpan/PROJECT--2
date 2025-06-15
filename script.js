const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const instructions = document.getElementById('instructions');
const crosshair = document.getElementById('crosshair');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Player state
let player = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  speed: 0.15
};

// Environment: simple boxes (walls/obstacles)
const environment = [
  { x: 4, y: 0, z: -6, w: 2, h: 2, d: 2 },
  { x: -6, y: 0, z: -12, w: 2, h: 2, d: 2 },
  { x: 0, y: 0, z: -18, w: 8, h: 2, d: 2 }
];

// Characters: multiple targets
let targets = [
  { x: 5, y: 0, z: -10, alive: true },
  { x: -3, y: 0, z: -14, alive: true },
  { x: 2, y: 0, z: -20, alive: true }
];

// Controls
let keys = {};
let pointerLocked = false;

// Pointer lock
canvas.onclick = () => {
  canvas.requestPointerLock();
};
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  instructions.style.display = pointerLocked ? 'none' : '';
  crosshair.style.display = pointerLocked ? '' : 'none';
});

// Mouse look
document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
  player.yaw -= e.movementX * 0.002;
  player.pitch -= e.movementY * 0.002;
  player.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.pitch));
});

// Keyboard
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// Shooting
document.addEventListener('mousedown', () => {
  if (!pointerLocked) return;
  for (let t of targets) {
    if (t.alive && isTargetHit(t)) {
      t.alive = false;
      setTimeout(() => resetTarget(t), 2000);
    }
  }
});

function isTargetHit(target) {
  // Ray-sphere intersection
  const dx = -Math.sin(player.yaw) * Math.cos(player.pitch);
  const dy = Math.sin(player.pitch);
  const dz = -Math.cos(player.yaw) * Math.cos(player.pitch);
  const tx = target.x - player.x;
  const ty = target.y - player.y;
  const tz = target.z - player.z;
  const t = (tx*dx + ty*dy + tz*dz);
  if (t < 0) return false;
  const closestX = dx * t;
  const closestY = dy * t;
  const closestZ = dz * t;
  const distSq = (tx - closestX)**2 + (ty - closestY)**2 + (tz - closestZ)**2;
  return distSq < 1;
}

function resetTarget(target) {
  target.x = (Math.random() - 0.5) * 16;
  target.y = 0;
  target.z = -8 - Math.random() * 20;
  target.alive = true;
}

function update() {
  let forward = 0, right = 0;
  if (keys['KeyW']) forward += 1;
  if (keys['KeyS']) forward -= 1;
  if (keys['KeyA']) right -= 1;
  if (keys['KeyD']) right += 1;
  const sinYaw = Math.sin(player.yaw), cosYaw = Math.cos(player.yaw);
  player.x += (forward * -sinYaw + right * cosYaw) * player.speed;
  player.z += (forward * -cosYaw - right * sinYaw) * player.speed;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Ground
  ctx.fillStyle = '#444';
  ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

  // Draw environment (boxes)
  for (const box of environment) {
    const faces = [
      // front face
      [
        {x: box.x - box.w/2, y: box.y - box.h/2, z: box.z - box.d/2},
        {x: box.x + box.w/2, y: box.y - box.h/2, z: box.z - box.d/2},
        {x: box.x + box.w/2, y: box.y + box.h/2, z: box.z - box.d/2},
        {x: box.x - box.w/2, y: box.y + box.h/2, z: box.z - box.d/2}
      ]
    ];
    ctx.fillStyle = "#666";
    for (const face of faces) {
      const pts = face.map(v => worldToScreen(v.x, v.y, v.z));
      if (pts.every(p => p)) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; ++i) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#222";
        ctx.stroke();
      }
    }
  }

  // Draw characters (targets)
  for (const t of targets) {
    if (t.alive) {
      const screen = worldToScreen(t.x, t.y, t.z);
      if (screen) {
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 40 / screen.depth, 0, Math.PI*2);
        ctx.fillStyle = '#e33';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Draw "face"
        ctx.beginPath();
        ctx.arc(screen.x - 8 / screen.depth, screen.y - 5 / screen.depth, 3 / screen.depth, 0, Math.PI*2);
        ctx.arc(screen.x + 8 / screen.depth, screen.y - 5 / screen.depth, 3 / screen.depth, 0, Math.PI*2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
    }
  }
}

function worldToScreen(wx, wy, wz) {
  const dx = wx - player.x;
  const dy = wy - player.y;
  const dz = wz - player.z;
  const xz = dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw);
  const zz = dx * Math.sin(player.yaw) + dz * Math.cos(player.yaw);
  const yz = dy * Math.cos(player.pitch) - zz * Math.sin(player.pitch);
  const zz2 = dy * Math.sin(player.pitch) + zz * Math.cos(player.pitch);
  if (zz2 > 0) return null;
  const fov = 1.2;
  const scale = canvas.height / (2 * Math.tan(fov/2));
  const sx = canvas.width/2 + xz * scale / -zz2;
  const sy = canvas.height/2 + yz * scale / -zz2;
  return { x: sx, y: sy, depth: -zz2 };
}

function loop() {
  if (pointerLocked) update();
  render();
  requestAnimationFrame(loop);
}

loop();
