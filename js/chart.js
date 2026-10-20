/* chart.js — رسم دائري (Donut) بدون أي مكتبة، باستخدام Canvas */
function drawDonut(canvas, slices) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = 220;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const total = slices.reduce((s, x) => s + x.total, 0);
  if (!total) return;

  const cx = size / 2;
  const cy = size / 2;
  const outer = 100;
  const inner = 62;
  let start = -Math.PI / 2;

  slices.forEach((s) => {
    const angle = (s.total / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, start, start + angle);
    ctx.arc(cx, cy, inner, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    start += angle;
  });
}
