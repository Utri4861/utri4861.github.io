(() => {
  const nav = document.querySelector('.archive-sidebar nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#year-"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  if (!links.length || sections.some(section => !section)) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 850px)');
  const arrow = document.createElement('span');
  arrow.className = 'timeline-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  nav.append(arrow);
  nav.classList.add('timeline-ready');
  let scheduled = false;
  let previousActive = -1;
  function update() {
    scheduled = false;
    const header = document.querySelector('body > nav');
    const readingLine = (header?.getBoundingClientRect().height || 72) + (mobile.matches ? Math.max(104, nav.offsetHeight + 28) : 32);
    const tops = sections.map(section => section.getBoundingClientRect().top);
    let active = 0;
    tops.forEach((top, index) => { if (top <= readingLine) active = index; });
    const bottom = active + 1 < sections.length ? tops[active + 1] : sections[active].getBoundingClientRect().bottom;
    const progress = Math.max(0, Math.min(1, (readingLine - tops[active]) / Math.max(1, bottom - tops[active])));
    links.forEach((link, index) => {
      link.setAttribute('data-state', index < active ? 'complete' : index === active ? 'active' : 'upcoming');
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const link = links[active];
    const y = link.offsetTop + 6 + progress * Math.max(0, link.offsetHeight - 12);
    arrow.style.transform = `translateY(${y - 5}px)`;
    nav.style.setProperty('--track-top', `${links[0].offsetTop}px`);
    nav.style.setProperty('--track-fill', `${Math.max(0, y - links[0].offsetTop)}px`);
    nav.style.setProperty('--reading-progress', `${100 * (active + progress) / links.length}%`);
    const last = links[links.length - 1];
    nav.style.setProperty('--track-height', `${last.offsetTop + last.offsetHeight - links[0].offsetTop}px`);
    if (mobile.matches && active !== previousActive) {
      // Scroll only the strip, never the document, to keep the current year visible.
      nav.scrollTo({left: Math.max(0, link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2), behavior: reduced.matches ? 'instant' : 'smooth'});
    }
    previousActive = active;
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    sections[index].scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
  }));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  // Images and expanded community notes can move year boundaries without a scroll.
  new ResizeObserver(schedule).observe(document.querySelector('.archive-content'));
  document.fonts?.ready.then(schedule);
  update();
})();
