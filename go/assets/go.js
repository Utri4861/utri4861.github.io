const root = document.documentElement;
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const button = document.querySelector('[data-motion-toggle]');
let paused = motion.matches;
let frame = 0;
function sync() {
  root.classList.toggle('motion-paused', paused || motion.matches);
  button.textContent = paused || motion.matches ? 'Enable background motion' : 'Pause background motion';
  button.disabled = motion.matches;
  button.title = motion.matches ? 'Motion is disabled by your device preference.' : '';
}
button.hidden = false;
button.addEventListener('click', () => { paused = !paused; sync(); });
motion.addEventListener('change', () => { paused = motion.matches; sync(); });
window.addEventListener('pointermove', (event) => {
  if (paused || motion.matches || !pointer.matches || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    root.style.setProperty('--mx', event.clientX + 'px');
    root.style.setProperty('--my', event.clientY + 'px');
  });
});
sync();
