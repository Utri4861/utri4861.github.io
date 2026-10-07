const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/metrocop-thread.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'projects/metrocop-build.html'),'utf8');
test('source preserves all 93 posts; website omits the requested off-topic entries',()=>{
  assert.deepEqual(data.posts.map(p=>p.number),Array.from({length:93},(_,i)=>i+1));
  assert.equal(data.posts.filter(p=>p.author==='Utri').length,41);
  for(const post of data.posts.filter(p=>![11,12,18,19,20,31].includes(p.number))){ assert.ok(html.includes(`id="${post.id}"`));if(post.author!=='Utri') {assert.ok(html.includes(data.source+post.id));assert.equal(post.text,undefined);} }
  assert.equal((html.match(/class="archive-entry"/g)||[]).length,39);
  assert.equal((html.match(/class="community-reply"/g)||[]).length,48);
});
test('all 68 published images are local, real images, and represented once',()=>{
  const images=[...html.matchAll(/data-original="([^\"]+)"/g)].map(m=>m[1]);assert.equal(images.length,68);
  for(const image of images){const file=path.resolve(root,'projects',image);assert.ok(file.startsWith(root));const bytes=fs.readFileSync(file);assert.ok(bytes[0]===0xff||bytes[0]===0x89);}
  assert.ok(!/<img[^>]+src="https?:/.test(html));
  assert.ok(!html.includes('[[IMAGE:'));assert.ok(!html.includes('[[VIDEO:'));
});
test('journal has year anchors, safety context and no tracking embeds',()=>{
  for(let year=2019;year<=2026;year++) assert.ok(html.includes(`id="year-${year}"`));
  assert.ok(!html.includes('Last edited on the forum:'));
  assert.ok(html.includes('not protective respirators'));
  assert.ok(html.includes('Historical estimates'));
  assert.ok(html.includes('aGcL0O29WU8'));
  assert.ok(!html.includes('<iframe'));
  assert.ok(!html.includes('\ufffd'), 'Original punctuation must survive the capture');
  assert.ok(html.includes('From the community'));
});
test('every archived image comes from an Utri post, never another member or a quoted reply',()=>{
  const allowed=new Set(data.posts.filter(p=>p.author==='Utri').flatMap(p=>[...p.text.matchAll(/\[\[IMAGE:([^|]+)\|([^|]*)/g)].map(m=>m[1].match(/\.(\d+)\/$/)[1]+(/\.png$/i.test(m[2])?'.png':'.jpg'))));
  const originals=[...html.matchAll(/data-original="([^"]+)"/g)].map(m=>path.basename(m[1]));
  assert.equal(originals.length,68);
  for(const url of originals) assert.ok(allowed.has(url),`Unapproved image: ${url}`);
  for(const match of html.matchAll(/<details class="archive-community">([\s\S]*?)<\/details>/g)) assert.ok(!match[1].includes('<img'));
});
test('owner-requested edits remove the sentence and rotate only the selected photo',()=>{
  assert.ok(!html.includes('It is upside down because I am a scumbag.'));
  const css=fs.readFileSync(path.join(root,'assets/css/metrocop-build.css'),'utf8');
  assert.ok(css.includes('img[data-original$="/983415.jpg"] { transform: rotate(180deg); }'));
});
test('selected entries read as standalone website notes',()=>{
  for(const id of ['post-4575292','post-5063061']) assert.ok(!html.includes(`id="${id}"`));
  assert.ok(!html.includes('/983932.jpg'));
  for(const id of ['post-4576230','post-4577588','post-5119866']) {
    const article=html.match(new RegExp(`<article[^>]+id="${id}"[\\s\\S]*?</article>`))[0];
    for(const phrase of ['Replying to a forum member','Thanks!','PROJECT&#39;S BACK UP!','I secured a job','posting more pics']) assert.ok(!article.includes(phrase));
  }
  assert.ok(html.includes('39 journal entries'));
  assert.ok(html.includes('68 images'));
});
test('all authored entries have standalone journal copy without forum housekeeping',()=>{
  const journal=require('../data/metrocop-journal.cjs');
  assert.equal(Object.keys(journal).length,39);
  const visible=html.replace(/<[^>]*>/g,' ');
  assert.doesNotMatch(visible,/\bRPF\b|Replying to a forum member|Last edited on the forum|Original #|Forum original/);
  for(const article of html.matchAll(/<article class="archive-entry"[\s\S]*?<\/article>/g)) {
    assert.doesNotMatch(article[0].replace(/<[^>]*>/g,' '),/\bforum\b|\bthread\b|Thanks!|Quoted reply omitted|posting more pics/i);
  }
  assert.ok(!html.includes('{{'));
});
