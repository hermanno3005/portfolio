/* Generate favicon from canvas after JetBrains Mono is loaded */
document.fonts.ready.then(() => {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  /* Dark rounded background */
  ctx.fillStyle = '#0d0d0d';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 6);
  ctx.fill();

  /* H in terminal green */
  ctx.fillStyle = '#5af78e';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', size / 2, size / 2 + 1);

  const link = document.querySelector('link[rel="icon"]');
  link.type = 'image/png';
  link.href = canvas.toDataURL('image/png');
});
