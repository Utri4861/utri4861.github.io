const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../assets/js/metrocop-timeline.js'), 'utf8');
function setup(reduce = false, mobile = false) {
  let scroll = 0;
  const listeners = {};
  const calls = [];
  const stripCalls = [];
  const properties = {};
  const links = Array.from({length: 3}, (_, i) => ({
    hash: `#year-${2019 + i}`, offsetTop: 40 + i * 68, offsetHeight: 68, offsetLeft: i * 80, offsetWidth: 72, attrs: {},
    setAttribute(k,v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(_,fn) { this.click = fn; }
  }));
  const sections = links.map((_, i) => ({getBoundingClientRect: () => ({top: 200 + i * 1000 - scroll, bottom: 1200 + i * 1000 - scroll}), scrollIntoView: options => calls.push(options)}));
  const arrow = {style: {}, setAttribute() {}};
  const nav = {offsetHeight: 60, clientWidth: 160, scrollTo: options => stripCalls.push(options), querySelectorAll: () => links, append() {}, classList: {add() {}}, style: {setProperty(k,v) {properties[k] = v;}}};
  const location = {hash: ''};
  vm.runInNewContext(code, {
    document: {querySelector: s => s === '.archive-sidebar nav' ? nav : s === 'body > nav' ? {getBoundingClientRect: () => ({height: 72})} : {}, getElementById: id => sections[Number(id.slice(-4)) - 2019], createElement: () => arrow},
    window: {matchMedia: query => ({matches: query.includes('850px') ? mobile : reduce}), addEventListener: (name, fn) => listeners[name] = fn},
    requestAnimationFrame: fn => fn(), ResizeObserver: class {observe() {}}, location,
    history: {pushState: (_,__,hash) => location.hash = hash}
  });
  return {links, arrow, calls, stripCalls, properties, location, scrollTo(value) {scroll = value; listeners.scroll();}};
}
test('timeline follows reading position and moves within an active year', () => {
  const state = setup();
  assert.equal(state.links[0].attrs['aria-current'], 'location');
  state.scrollTo(1300);
  assert.equal(state.links[1].attrs['aria-current'], 'location');
  assert.equal(state.links[0].attrs['aria-current'], undefined);
  assert.equal(state.links[0].attrs['data-state'], 'complete');
  assert.equal(state.links[1].attrs['data-state'], 'active');
  assert.equal(state.links[2].attrs['data-state'], 'upcoming');
  const fill = parseFloat(state.properties['--track-fill']);
  const before = state.arrow.style.transform;
  state.scrollTo(1500);
  assert.notEqual(state.arrow.style.transform, before);
  assert.ok(parseFloat(state.properties['--track-fill']) > fill);
  state.scrollTo(4000);
  assert.equal(state.links[2].attrs['aria-current'], 'location');
});
test('mobile strip follows active years without scrolling the document or repeatedly recentering', () => {
  const state = setup(true, true);
  state.scrollTo(2200);
  assert.equal(state.links[2].attrs['aria-current'], 'location');
  assert.equal(state.stripCalls.at(-1).behavior, 'instant');
  assert.ok(state.stripCalls.at(-1).left > 0);
  const count = state.stripCalls.length;
  state.scrollTo(2300);
  assert.equal(state.stripCalls.length, count);
  assert.equal(state.calls.length, 0);
  state.scrollTo(0);
  assert.equal(state.links[2].attrs['data-state'], 'upcoming');
});
test('year selection updates the anchor and smooth scrolls, respecting reduced motion', () => {
  for (const reduced of [false, true]) {
    const state = setup(reduced);
    let prevented = false;
    state.links[2].click({button: 0, preventDefault() {prevented = true;}});
    assert.ok(prevented);
    assert.equal(state.location.hash, '#year-2021');
    assert.equal(state.calls[0].behavior, reduced ? 'instant' : 'smooth');
    state.links[0].click({button: 0, ctrlKey: true});
    assert.equal(state.calls.length, 1);
  }
});
