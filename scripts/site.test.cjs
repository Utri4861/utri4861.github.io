const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// A small DOM fixture runs the production interaction code without dependencies.
// These tests cover state and keyboard behavior, not visual browser rendering.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag; this.attrs = {}; this.dataset = {}; this.children = [];
    this.events = {}; this.queries = {}; this.all = {}; this.hidden = false;
    this.disabled = false; this.inert = false; this.textContent = ''; this.offsetHeight = 200;
    this.style = { setProperty(key, value) { this[key] = value; } };
    const classes = new Set();
    this.classList = { add: (...c) => c.forEach(x => classes.add(x)), remove: (...c) => c.forEach(x => classes.delete(x)), contains: c => classes.has(c), toggle(c, value = !classes.has(c)) { value ? classes.add(c) : classes.delete(c); return value; } };
  }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
  emit(type, event = {}) { return Promise.all((this.events[type] || []).map(fn => fn({ target: this, preventDefault() {}, ...event }))); }
  querySelector(selector) { return this.queries[selector] || null; }
  querySelectorAll(selector) { return this.all[selector] || []; }
  closest(selector) { return selector.split(',').map(s => s.trim()).includes(this.tagName) ? this : null; }
  append(child) { if (child.parent) child.parent.children = child.parent.children.filter(c => c !== child); this.children.push(child); child.parent = this; }
  focus() { this.focused = true; }
  getBoundingClientRect() { const i = this.parent?.children.filter(c => !c.hidden).indexOf(this) || 0; return { left: i % 3 * 300, top: Math.floor(i / 3) * 220, width: 280, height: 200 }; }
  animate() { this.animated = true; return { cancel() {}, onfinish: null }; }
}
function fixture({ filter, carousel = false } = {}) {
  const document = new Element(); document.body = new Element(); document.documentElement = new Element();
  document.createElement = tag => new Element(tag);
  document.fonts = { ready: Promise.resolve() };
  document.getElementById = id => document.queries['#' + id] || null;
  const toggle = new Element('button'), links = new Element('ul');
  document.queries['.nav-toggle'] = toggle; document.queries['.nav-links'] = links;
  const queries = {};
  const window = new Element();
  window.matchMedia = key => queries[key] ||= Object.assign(new Element(), { matches: key.includes('max-width') });
  const location = { href: 'https://example.com/projects.html' + (filter ? '?filter=' + filter : '') };
  const context = { document, window, location, URL, navigator: { clipboard: { writeText: async () => {} } }, history: { pushState(_, __, url) { location.href = String(url); } }, requestAnimationFrame(fn) { fn(); return 1; }, cancelAnimationFrame() {}, console };
  let stage, cards, buttons, shuffle, viewer, picker;
  if (!carousel) {
    stage = new Element(); document.queries['#cards-stage'] = stage;
    cards = ['3d-printing', 'sewing', '3d-printing,sewing'].map(tools => { const c = new Element('a'); c.dataset.tools = tools; c.queries['.card-shell'] = new Element(); stage.append(c); return c; });
    stage.all['.project-card'] = cards;
    buttons = ['all', '3d-printing', 'sewing'].map(filter => { const b = new Element('button'); b.dataset.filter = filter; b.textContent = filter; b.disabled = true; return b; });
    document.all['[data-filter]'] = buttons;
    document.queries['#filter-status'] = new Element();
    shuffle = document.queries['[data-shuffle]'] = new Element('button');
  } else {
    viewer = new Element(); const frame = new Element(); const controls = new Element();
    viewer.queries['.sheet-carousel-frame'] = frame;
    viewer.queries['.sheet-carousel-controls'] = controls;
    for (const name of ['prev', 'next', 'status']) viewer.queries[`[data-carousel-${name}]`] = new Element(name === 'status' ? 'span' : 'button');
    const slides = [0, 1, 2].map(i => { const slide = new Element(); const img = new Element('img'); img.src = 'preview-' + i; img.dataset.fullsize = 'original-' + i; slide.queries.img = img; slide.queries.figcaption = Object.assign(new Element(), { textContent: 'Sheet ' + (i + 1) }); return slide; });
    viewer.all['.project-img'] = slides;
    document.all['[data-sheet-carousel]'] = [viewer];
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/site.js'), 'utf8'), context);
  return { document, window, queries, toggle, links, location, stage, cards, buttons, shuffle, viewer };
}
test('menu exposes state, closes with Escape, and restores focus', async () => {
  const f = fixture(); assert.equal(f.links.inert, true);
  await f.toggle.emit('click'); assert.equal(f.links.inert, false); assert.equal(f.toggle.attrs['aria-expanded'], 'true');
  await f.document.emit('keydown', { key: 'Escape' }); assert.equal(f.links.inert, true); assert.ok(f.toggle.focused);
});
test('filters restore from URL; changes update URL and visible document order', async () => {
  const f = fixture({ filter: 'sewing' }); assert.deepEqual(f.cards.map(c => c.hidden), [true, false, false]);
  await f.buttons[1].emit('click'); assert.match(f.location.href, /filter=3d-printing/); assert.deepEqual(f.cards.map(c => c.hidden), [false, true, false]);
  assert.match(f.cards[0].href, /filter=3d-printing/);
  assert.equal(f.buttons[1].attrs['aria-pressed'], 'true');
  await f.shuffle.emit('click'); assert.equal(f.stage.children.length, 3);
  await f.buttons[0].emit('click'); assert.equal(new URL(f.location.href).search, ''); assert.deepEqual(f.stage.children, f.cards);
});
test('unknown filters fall back to all and reduced motion blocks tilt', async () => {
  const f = fixture({ filter: 'unknown' }); assert.ok(f.cards.every(c => !c.hidden));
  f.queries['(hover: hover) and (pointer: fine)'].matches = true;
  f.queries['(prefers-reduced-motion: reduce)'].matches = true;
  await f.cards[0].emit('pointermove', { clientX: 100, clientY: 80 });
  assert.equal(f.cards[0].queries['.card-shell'].style.transform, undefined);
});
test('drawing picker updates full-size link, slide state, and boundary controls', async () => {
  const f = fixture({ carousel: true }), v = f.viewer;
  const controls = v.queries['.sheet-carousel-controls'];
  const picker = controls.children[0].children[0], full = controls.children[1];
  assert.equal(full.href, 'original-0'); assert.equal(v.queries['[data-carousel-prev]'].disabled, true);
  picker.value = '2'; await picker.emit('change');
  assert.equal(full.href, 'original-2'); assert.equal(v.queries['[data-carousel-next]'].disabled, true);
  assert.deepEqual(v.all['.project-img'].map(s => s.inert), [true, true, false]);
  await v.emit('keydown', { key: 'ArrowLeft', target: picker }); assert.equal(full.href, 'original-2');
  await v.emit('keydown', { key: 'ArrowLeft' }); assert.equal(full.href, 'original-1');
});
test('canceled touch gestures do not navigate the drawing deck', async () => {
  const { viewer: v } = fixture({ carousel: true }), frame = v.queries['.sheet-carousel-frame'];
  await frame.emit('pointerdown', { pointerType: 'touch', isPrimary: true, pointerId: 1, clientX: 200, clientY: 0 });
  await frame.emit('pointercancel');
  await frame.emit('pointerup', { pointerId: 1, clientX: 20, clientY: 0 });
  assert.equal(v.queries['.sheet-carousel-controls'].children[1].href, 'original-0');
});
