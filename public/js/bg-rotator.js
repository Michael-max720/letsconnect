// public/js/bg-rotator.js
function startBackgroundRotator(images, intervalMs = 6000) {
  if (!images || images.length === 0) return;
  const container = document.createElement('div');
  container.className = 'bg-rotator';
  images.forEach((url, i) => {
    const layer = document.createElement('div');
    layer.className = 'bg-layer' + (i === 0 ? ' active' : '');
    layer.style.backgroundImage = `url('${url}')`;
    container.appendChild(layer);
  });
  document.body.prepend(container);

  let current = 0;
  setInterval(() => {
    const layers = container.querySelectorAll('.bg-layer');
    layers[current].classList.remove('active');
    current = (current + 1) % layers.length;
    layers[current].classList.add('active');
  }, intervalMs);
}
function startBackgroundRotator(images, intervalMs = 6000) {
  if (!images || images.length === 0) return;
  const container = document.createElement('div');
  container.className = 'bg-rotator';
  document.body.prepend(container);

  images.forEach((url, i) => {
    const img = new Image();
    img.onload = () => {
      const layer = document.createElement('div');
      layer.className = 'bg-layer';
      layer.style.backgroundImage = `url('${url}')`;
      container.appendChild(layer);
      if (container.querySelectorAll('.bg-layer').length === 1) {
        layer.classList.add('active');
      }
    };
    img.src = url;
  });

  let current = 0;
  setInterval(() => {
    const layers = container.querySelectorAll('.bg-layer');
    if (layers.length < 2) return;
    layers[current].classList.remove('active');
    current = (current + 1) % layers.length;
    layers[current].classList.add('active');
  }, intervalMs);
}