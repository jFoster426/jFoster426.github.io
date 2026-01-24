const joy = document.getElementById("joystick");
const map = document.getElementById("mapping")
const ctxJoy = joy.getContext("2d");
const ctxMap = map.getContext("2d");

const canvasSize = 300;
const R = (canvasSize*0.45);
let x = 0, y = 0;
let dragging = false;

function clampToCircle(px, py) {
  const r = Math.hypot(px, py);
  if (r > 1) return [px / r, py / r];
  return [px, py];
}

/* ---------------- MAPPINGS ---------------- */

function mapping1(x, y) {
    if (x === 0 && y === 0) return [0, 0]; // Special case
    const r = Math.hypot(x, y);
    const a = 2 / r;

    var motorL, motorR;

    if(x >= 0 && y <= 0) {
	    motorL = -r;
	    motorR = -r + (a * x*x);
    }
    if(x <= 0 && y <= 0) {
	    motorL = -r + (a * x*x);
        motorR = -r;
    }
    if(x >= 0 && y >= 0) {
        motorL = r - (a * x*x);
        motorR = r;
    }
    if(x <= 0 && y >= 0) {
        motorL = r;
    	motorR = r - (a * x*x);
    }
    return [motorL, motorR];
}

function mapping2(x, y) {
    var rr = Math.min(x*x + y*y, 1);
    var c;
    var L, R;
    if (rr === 0.0) {
        c = 0;
    } else {
        c = rr / (Math.abs(x) + Math.abs(y));
    }
    L = c*y - c*x;
    R = c*y + c*x;
    return [L, R];
}

/* ---------------- DRAWING ---------------- */

function update() {
  const [ml1, mr1] = mapping1(x, y);
  const [ml2, mr2] = mapping2(x, y);

  ctxJoy.resetTransform();
  ctxJoy.clearRect(0, 0, canvasSize, canvasSize);
  ctxJoy.translate(canvasSize/2, canvasSize/2);
  ctxJoy.strokeStyle = "#555";
  ctxJoy.beginPath();
  ctxJoy.arc(0, 0, R, 0, Math.PI*2);
  ctxJoy.stroke();
  ctxJoy.beginPath();
  ctxJoy.moveTo(-canvasSize/2, 0);
  ctxJoy.lineTo(canvasSize/2, 0);
  ctxJoy.stroke();
  ctxJoy.beginPath();
  ctxJoy.moveTo(0, -canvasSize/2);
  ctxJoy.lineTo(0, canvasSize);
  ctxJoy.stroke();
  ctxJoy.fillStyle = "#4af";
  ctxJoy.beginPath();
  ctxJoy.arc(x*R, y*R, 6, 0, Math.PI*2);
  ctxJoy.fill();

  ctxMap.resetTransform();
  ctxMap.clearRect(0, 0, canvasSize, canvasSize);
  ctxMap.translate(canvasSize/2, canvasSize/2);
  ctxMap.fillStyle = "rgba(255, 0, 0, 1)";
  ctxMap.fillRect(-R, 0, R/2, ml1*R);
  ctxMap.fillRect(R/2, 0, R/2, mr1*R);
  ctxMap.fill();
  ctxMap.fillStyle = "rgba(0, 255, 0, 1)";
  ctxMap.fillRect(-R/2, 0, R/2, ml2*R);
  ctxMap.fillRect(0, 0, R/2, mr2*R);
  ctxMap.fill();

  // Grid color
  ctxMap.strokeStyle = "#555";
  // Horizontal grid lines
  ctxMap.beginPath();
  ctxMap.moveTo(-canvasSize/2, R);
  ctxMap.lineTo(canvasSize/2, R);
  ctxMap.stroke();
  ctxMap.beginPath();
  ctxMap.moveTo(-canvasSize/2, R/2);
  ctxMap.lineTo(canvasSize/2, R/2);
  ctxMap.stroke();
  ctxMap.beginPath();
  ctxMap.moveTo(-canvasSize/2, -R/2);
  ctxMap.lineTo(canvasSize/2, -R/2);
  ctxMap.stroke();
  ctxMap.beginPath();
  ctxMap.moveTo(-canvasSize/2, -R);
  ctxMap.lineTo(canvasSize/2, -R);
  ctxMap.stroke();
  // Vertical grid lines
  ctxMap.beginPath();
  ctxMap.moveTo(-canvasSize/2, 0);
  ctxMap.lineTo(canvasSize/2, 0);
  ctxMap.stroke();
  ctxMap.beginPath();
  ctxMap.moveTo(0, -canvasSize/2);
  ctxMap.lineTo(0, canvasSize/2);
  ctxMap.stroke();
  ctxMap.beginPath();
  ctxMap.moveTo(-R, -canvasSize/2);
  ctxMap.lineTo(-R, canvasSize/2);
  ctxMap.stroke();
  ctxMap.beginPath();
  ctxMap.moveTo(-R/2, -canvasSize/2);
  ctxMap.lineTo(-R/2, canvasSize/2);
  ctxMap.stroke();
  ctxMap.beginPath();
  ctxMap.moveTo(R/2, -canvasSize/2);
  ctxMap.lineTo(R/2, canvasSize/2);
  ctxMap.stroke();
  ctxMap.beginPath();
  ctxMap.moveTo(R, -canvasSize/2);
  ctxMap.lineTo(R, canvasSize/2);
  ctxMap.stroke();
}

joy.addEventListener("pointermove", e => {
  const rect = joy.getBoundingClientRect();
  const px = (e.clientX - rect.left - (canvasSize/2)) / R;
  const py = (e.clientY - rect.top - (canvasSize/2)) / R;
  [x, y] = clampToCircle(px, py);
  update();
});