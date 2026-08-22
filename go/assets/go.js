const root = document.documentElement;

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let frame = null;

  window.addEventListener("pointermove", (event) => {
    if (frame) return;

    frame = requestAnimationFrame(() => {
      root.style.setProperty("--mx", `${event.clientX}px`);
      root.style.setProperty("--my", `${event.clientY}px`);
      frame = null;
    });
  });
}
