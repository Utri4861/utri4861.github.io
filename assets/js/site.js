const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const mobileNavQuery = window.matchMedia('(max-width: 720px)');
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
const filterKeys = ['all', '3d-printing', 'fusion360', 'sewing', 'airbrush', 'metalworking', 'leatherworking', 'electronics', 'gamedev'];
const incomingFilter = new URL(location.href).searchParams.get('filter');
const backLink = document.querySelector('.back-link');
if (backLink && filterKeys.includes(incomingFilter) && incomingFilter !== 'all') {
  const target = new URL(backLink.getAttribute('href'), location.href);
  target.searchParams.set('filter', incomingFilter);
  backLink.href = target.href;
}

function syncMobileNav(expanded = false) {
  if (!toggle || !links) return;
  toggle.classList.toggle('open', expanded);
  links.classList.toggle('open', expanded);
  toggle.setAttribute('aria-expanded', String(expanded));
  links.inert = mobileNavQuery.matches && !expanded;
  if (links.inert) links.setAttribute('aria-hidden', 'true');
  else links.removeAttribute('aria-hidden');
}
if (toggle && links) {
  document.body.classList.add('nav-ready');
  toggle.addEventListener('click', () => syncMobileNav(!toggle.classList.contains('open')));
  mobileNavQuery.addEventListener('change', () => syncMobileNav());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.classList.contains('open')) {
      syncMobileNav();
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-inner')) syncMobileNav();
  });
  links.addEventListener('click', (event) => {
    if (event.target.closest('a')) syncMobileNav();
  });
  syncMobileNav();
}

document.querySelectorAll('[data-copy-email]').forEach((button) => {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copyEmail);
      status.textContent = 'Email address copied.';
    } catch {
      status.textContent = 'Select the email address above to copy it.';
    }
  });
});

const stage = document.getElementById('cards-stage');
if (stage) {
  const cards = [...stage.querySelectorAll('.project-card')];
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const status = document.getElementById('filter-status');
  const shuffle = document.querySelector('[data-shuffle]');
  let activeFilter = 'all';
  let order = [...cards];
  const animations = new Set();

  function render(animate = true) {
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    const before = new Map(cards.filter((card) => !card.hidden).map((card) => [card, card.getBoundingClientRect()]));
    order.forEach((card) => {
      card.hidden = activeFilter !== 'all' && !card.dataset.tools.split(',').includes(activeFilter);
      const target = new URL(card.getAttribute('href'), location.href);
      if (activeFilter === 'all') target.searchParams.delete('filter');
      else target.searchParams.set('filter', activeFilter);
      card.href = target.href;
      stage.append(card);
    });
    buttons.forEach((button) => {
      const selected = button.dataset.filter === activeFilter;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const visible = order.filter((card) => !card.hidden);
    const label = buttons.find((button) => button.dataset.filter === activeFilter)?.textContent;
    status.textContent = `Showing ${visible.length}${activeFilter === 'all' ? '' : ` ${label}`} project${visible.length === 1 ? '' : 's'}`;
    shuffle.disabled = visible.length < 2;
    if (!animate || reducedMotionQuery.matches) return;
    visible.forEach((card) => {
      if (!card.animate) return;
      const previous = before.get(card);
      const current = card.getBoundingClientRect();
      const animation = card.animate([
        { transform: previous ? `translate(${previous.left - current.left}px, ${previous.top - current.top}px)` : 'translateY(12px)', opacity: previous ? 1 : 0 },
        { transform: 'translate(0, 0)', opacity: 1 }
      ], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    });
  }
  function restore() {
    const value = new URL(location.href).searchParams.get('filter');
    activeFilter = buttons.some((button) => button.dataset.filter === value) ? value : 'all';
    order = [...cards];
    render(false);
  }
  buttons.forEach((button) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      order = [...cards];
      const url = new URL(location.href);
      if (activeFilter === 'all') url.searchParams.delete('filter');
      else url.searchParams.set('filter', activeFilter);
      history.pushState(null, '', url);
      render();
    });
  });
  shuffle.hidden = false;
  shuffle.addEventListener('click', () => {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    render();
    status.textContent += ' · Order shuffled';
  });
  window.addEventListener('popstate', restore);
  reducedMotionQuery.addEventListener('change', () => {
    if (reducedMotionQuery.matches) animations.forEach((animation) => animation.cancel());
  });
  restore();
  cards.forEach((card) => {
    const shell = card.querySelector('.card-shell');
    let frame = 0;
    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      shell.style.transform = '';
      card.classList.remove('is-active');
    }
    card.addEventListener('pointermove', (event) => {
      if (reducedMotionQuery.matches || !finePointerQuery.matches || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        shell.style.transform = `perspective(1080px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-3px)`;
        card.classList.add('is-active');
      });
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
    reducedMotionQuery.addEventListener('change', reset);
    finePointerQuery.addEventListener('change', reset);
  });
}

document.querySelectorAll('[data-sheet-carousel]').forEach((carousel) => {
  const frame = carousel.querySelector('.sheet-carousel-frame');
  const slides = [...carousel.querySelectorAll('.project-img')];
  const previous = carousel.querySelector('[data-carousel-prev]');
  const next = carousel.querySelector('[data-carousel-next]');
  const status = carousel.querySelector('[data-carousel-status]');
  const controls = carousel.querySelector('.sheet-carousel-controls');
  if (!frame || !slides.length || !controls) return;
  let index = 0;
  let pointerStart = null;
  const label = document.createElement('label');
  label.className = 'sheet-picker';
  label.textContent = 'Choose sheet ';
  const picker = document.createElement('select');
  picker.setAttribute('aria-label', `Choose sheet: ${carousel.getAttribute('aria-label') || 'drawing set'}`);
  slides.forEach((slide, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = slide.querySelector('figcaption')?.textContent || `Sheet ${i + 1}`;
    picker.append(option);
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${slides.length}`);
  });
  label.append(picker);
  controls.append(label);
  const fullSize = document.createElement('a');
  fullSize.className = 'sheet-fullsize';
  fullSize.textContent = 'Open full-size sheet ↗';
  fullSize.target = '_blank';
  fullSize.rel = 'noopener noreferrer';
  controls.append(fullSize);
  carousel.setAttribute('aria-roledescription', 'carousel');
  status?.setAttribute('aria-live', 'polite');
  function syncHeight() {
    const height = slides[index].offsetHeight;
    if (height) frame.style.height = `${height}px`;
  }
  function render() {
    const classes = ['is-far-prev', 'is-prev', 'is-current', 'is-next', 'is-far-next'];
    slides.forEach((slide, i) => {
      slide.classList.remove(...classes);
      slide.setAttribute('aria-hidden', String(i !== index));
      slide.inert = i !== index;
      const delta = i - index;
      if (Math.abs(delta) <= 2) slide.classList.add(classes[delta + 2]);
    });
    picker.value = String(index);
    const image = slides[index].querySelector('img');
    fullSize.href = image.dataset.fullsize || image.src;
    if (status) status.textContent = `${index + 1} / ${slides.length}`;
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === slides.length - 1;
    requestAnimationFrame(syncHeight);
  }
  function goTo(value) {
    index = Math.max(0, Math.min(slides.length - 1, value));
    render();
  }
  picker.addEventListener('change', () => goTo(Number(picker.value)));
  previous?.addEventListener('click', () => goTo(index - 1));
  next?.addEventListener('click', () => goTo(index + 1));
  carousel.addEventListener('keydown', (event) => {
    if (event.target.closest('select, input, textarea, a')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  frame.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' && event.isPrimary) pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  frame.addEventListener('pointerup', (event) => {
    const start = pointerStart;
    pointerStart = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy)) goTo(index + (dx < 0 ? 1 : -1));
  });
  frame.addEventListener('pointercancel', () => { pointerStart = null; });
  frame.addEventListener('pointerleave', () => { pointerStart = null; });
  slides.forEach((slide) => slide.querySelector('img')?.addEventListener('load', syncHeight));
  window.addEventListener('resize', syncHeight);
  document.fonts?.ready.then(syncHeight);
  carousel.classList.add('carousel-ready');
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => carousel.classList.add('carousel-initialized')));
});
