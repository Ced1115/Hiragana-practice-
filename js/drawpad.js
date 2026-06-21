// ══════════════════════════════════════════════════════════════════
//  DRAW PAD — finger/mouse drawing canvas + answer overlay compare
// ══════════════════════════════════════════════════════════════════
const drawCanvas = document.getElementById('drawCanvas');
const drawCtx = drawCanvas.getContext('2d');
let drawing = false;
let lastX = 0, lastY = 0;

function setupCanvasStyle() {
  drawCtx.strokeStyle = '#1a1a2e';
  drawCtx.lineWidth = 4;
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';
}
setupCanvasStyle();

function getCanvasPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const scaleX = drawCanvas.width / rect.width;
  const scaleY = drawCanvas.height / rect.height;
  const point = e.touches ? e.touches[0] : e;
  return {
    x: (point.clientX - rect.left) * scaleX,
    y: (point.clientY - rect.top) * scaleY
  };
}

function startDraw(e) {
  e.preventDefault();
  drawing = true;
  const { x, y } = getCanvasPos(e);
  lastX = x; lastY = y;
  // Draw a dot for taps
  drawCtx.beginPath();
  drawCtx.arc(x, y, 2, 0, Math.PI * 2);
  drawCtx.fillStyle = '#1a1a2e';
  drawCtx.fill();
}

function moveDraw(e) {
  if (!drawing) return;
  e.preventDefault();
  const { x, y } = getCanvasPos(e);
  drawCtx.beginPath();
  drawCtx.moveTo(lastX, lastY);
  drawCtx.lineTo(x, y);
  drawCtx.stroke();
  lastX = x; lastY = y;
}

function endDraw(e) {
  drawing = false;
}

drawCanvas.addEventListener('mousedown', startDraw);
drawCanvas.addEventListener('mousemove', moveDraw);
drawCanvas.addEventListener('mouseup', endDraw);
drawCanvas.addEventListener('mouseleave', endDraw);
drawCanvas.addEventListener('touchstart', startDraw, { passive: false });
drawCanvas.addEventListener('touchmove', moveDraw, { passive: false });
drawCanvas.addEventListener('touchend', endDraw);
drawCanvas.addEventListener('touchcancel', endDraw);

function clearDrawCanvas() {
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}

document.getElementById('clearDrawBtn').addEventListener('click', clearDrawCanvas);

document.getElementById('compareBtn').addEventListener('click', () => {
  const overlay = document.getElementById('overlayChar');
  const btn = document.getElementById('compareBtn');
  const isVisible = overlay.classList.contains('visible');
  if (isVisible) {
    overlay.classList.remove('visible');
    btn.textContent = 'Compare';
  } else {
    overlay.textContent = currentChar; // set by flashcards.js when a card loads
    overlay.classList.add('visible');
    btn.textContent = 'Hide';
  }
});
