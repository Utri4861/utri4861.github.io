// Render a static archive from reviewed, browser-captured source data.
// node scripts/build-metrocop-archive.cjs [--download]
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/metrocop-thread.json'), 'utf8'));
const journal = require('../data/metrocop-journal.cjs');
// Website edition: omit off-topic entries and their now-orphaned discussion.
const omittedPosts = new Set([11, 12, 18, 19, 20, 31]);
const publishedPosts = data.posts.filter(p => !omittedPosts.has(p.number));
const authoredCount = publishedPosts.filter(p => p.author === 'Utri').length;
const mediaDir = path.join(root, 'assets/images/projects/metrocop/thread');
const titles = {1:'A dream build begins',2:'The first helmet',5:'Building the vest',7:'Choosing the construction method',9:'Foam panels and cloth hinges',10:'A collar, a test fit, and upholstery foam',12:'Salvaged leather',13:'Wrapping the vest',15:'References and proportions',17:'Not quite alien-space-police',19:'On hold, not abandoned',21:'Test fits and Half-Life: Alyx references',23:'Comparing the new Metrocop design',25:'Searching for the jacket',27:'The original budget',29:'Sharing the first templates',30:'Finding a suitable jacket',33:'Placeholder pants and new boots',35:'Getting the fabric drape right',36:'Testing the silhouette',37:'Starting the helmet again',39:'Magnets, paint, and assembly',41:'The costume comes together',44:'Revisiting the vest proportions',46:'Comfort and lens choices',48:'Finding a field coat',51:'Jacket, gloves, and boots',53:'How the vest was made',54:'A voice system and a first CAD enclosure',55:'Nearly ready',56:'WonderCon 2023',61:'Modifying the Columbia coat',66:'Four years, and more to come',68:'The original baton and armband',69:'Digitized vest templates',71:'Voice test, lenses, and edge trim',75:'The source of the lenses',80:'Belt models and shared resources',81:'Updated templates and more Metrocops',86:'Designing for assembly',93:'Still evolving'};
// Paraphrases, not reproductions of other members' posts or photographs.
const replies = {3:'Following the 3D-printing approach, with memories of an earlier Half-Life build.',4:'Following along, especially the fabric work.',6:'Suggests a foam-based vest with individually covered panels and concealed fastening.',8:'Recognizes the overlap with the proposed vest method and offers encouragement.',11:'Encourages salvaging the discarded leather.',14:'Suggests using airbrushing to emphasize the gaps between armor panels.',16:'Makes a Back to the Future comparison and encourages the project.',18:'Asks whether work on the project has stopped.',20:'Looks forward to further progress.',22:'Discusses changes to the Civil Protection design in Half-Life: Alyx.',24:'Shares additional Half-Life reference screenshots.',26:'Welcomes the progress.',28:'Asks when the vest templates will be available.',31:'Congratulates the restart.',32:'Asks how the trousers were made for a similar build.',34:'Offers ideas for trousers and footwear.',38:'Welcomes the helmet update and the renewed progress.',40:'Responds enthusiastically to the progress.',42:'Questions the height of the arch at the bottom of the vest relative to the reference.',43:'Praises the documented process, particularly the vest construction.',45:'Continues the discussion of measurements and costume practicality.',47:'Asks which jacket was used.',49:'Shares a previous Metrocop costume and a parody film.',50:'Asks for jacket, glove, and boot sources.',52:'Asks for more detail on developing the vest pattern.',57:'Celebrates the two Combine cosplayers meeting.',58:'Praises the completed result.',59:'Asks whether the jacket is custom-made.',60:'Reports seeing the costume at WonderCon and shares a photograph of the encounter.',62:'Compliments the build.',63:'Compliments the build.',64:'Asks about commissioning a costume.',65:'Asks about the vest construction.',67:'Asks about the stunstick and armband.',70:'Asks how the lenses attach and how the helmet seam is finished.',72:'Suggests additional weathering.',73:'Asks about the lenses.',74:'Adds to the lens inquiry.',76:'Asks about the belt accessories.',77:'Asks about the vest template.',78:'Requests a consolidated materials and sourcing guide.',79:'Offers encouragement.',82:'Thanks Erik for sharing the work.',83:'Shares a completed costume commissioned from Erik; identifies the pistol and boots as independently supplied. Customer photographs are available through the contribution link.',84:'Praises the commissioned costume.',85:'Responds enthusiastically to the commission.',87:'Looks forward to the upgrades and a future build.',88:'Shares a separate LED stunstick modification and Breen-can props. Follow the contribution link for their design details and photographs.',89:'Asks whether Utri is Citadel Supply Co.',90:'Identifies Utri as Citadel Supply Co.',91:'Praises the research and progress.',92:'Responds to the Citadel connection.'};
const imageRx = /\[\[IMAGE:([^|]+)\|([^|]*)\|([^|]*)\|([^\]]*)\]\]/g;
const images = new Map();
for (const post of publishedPosts.filter(p => p.author === 'Utri')) {
  for (const m of post.text.matchAll(imageRx)) {
    const id = m[1].match(/\.(\d+)\/$/)?.[1];
    if (!id || new URL(m[1]).hostname !== 'www.therpf.com') throw Error('Unexpected media source');
    const ext = /\.png$/i.test(m[2]) ? 'png' : 'jpg';
    images.set(m[1], {url:m[1],file:`${id}.${ext}`,name:m[2],post:post.number});
  }
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const postUrl = p => data.source + p.id;
const date = s => new Date(s.slice(0,10)+'T12:00:00Z').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
function rich(text) {
  // Preserve source wording while linking plain URLs safely, without importing forum HTML.
  return text.split(/(https?:\/\/[^\s\]<>]+)/g).map(part => /^https?:\/\//.test(part) ? `<a href="${esc(part)}" rel="noopener noreferrer">${esc(part.length > 95 ? new URL(part).hostname + ' — linked resource' : part)}</a>` : esc(part)).join('').replace(/\n/g,'<br>');
}
function body(p) {
  const photos = [...p.text.matchAll(imageRx)].map(m => m[0]);
  const videoToken = p.text.match(/\[\[VIDEO:[\s\S]*?\]\]/)?.[0];
  if (!journal[p.number]) throw Error(`Missing journal copy for entry ${p.number}`);
  const used = [];
  let text = journal[p.number].replace(/\{\{(\d+|video)\}\}/g, (_, key) => {
    if (key === 'video') { if (!videoToken) throw Error('Missing video'); return videoToken; }
    const index = Number(key) - 1;
    if (!photos[index] || used.includes(index)) throw Error(`Invalid photo reference in entry ${p.number}`);
    used.push(index); return photos[index];
  });
  if (used.length !== photos.length) throw Error(`Unplaced photo in entry ${p.number}`);
  const chunks=text.split(/(\[\[IMAGE:[\s\S]*?\]\]|\[\[VIDEO:[\s\S]*?\]\])/g);
  let imageIndex=0;
  return chunks.map(chunk => {
    const m=/^\[\[IMAGE:([^|]+)\|([^|]*)\|([^|]*)\|([^\]]*)\]\]$/.exec(chunk);
    if(m){
      const entry=images.get(m[1]); const src='../assets/images/projects/metrocop/thread/'+entry.file;
      imageIndex++;
      const alt=`${titles[p.number]} — original build image ${imageIndex}`;
      return `<figure class="archive-photo"><a href="${src}" aria-label="Open full-size: ${esc(alt)}"><img src="${src}" alt="${esc(alt)}" width="${Number(m[3])||1200}" height="${Number(m[4])||900}" loading="lazy" decoding="async" data-original="${src}"></a><figcaption>Image ${imageIndex} · <a href="${src}">Open full size</a></figcaption></figure>`;
    }
    const video=/^\[\[VIDEO:(.*?)\]\]$/.exec(chunk);
    if(video){ const id=new URL(video[1]).pathname.split('/').pop();return `<p class="archive-video"><a href="https://www.youtube.com/watch?v=${esc(id)}">▶ Watch the original voice test on YouTube</a><br><small>Video opens on YouTube; no third-party player loads here.</small></p>`; }
    return chunk.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean).map(s=>`<p>${rich(s)}</p>`).join('\n');
  }).join('\n');
}
async function main(){
  fs.mkdirSync(mediaDir,{recursive:true});
  if(process.argv.includes('--download')){
    for(const entry of images.values()){
      const dest=path.join(mediaDir,entry.file);
      if(fs.existsSync(dest)) continue;
      try{
        execFileSync('curl.exe',['--fail','--location','--silent','--show-error','--connect-timeout','8','--max-time','25','--output',dest,entry.url],{stdio:'pipe'});
        const bytes=fs.readFileSync(dest);
        if(!(bytes[0]===0xff && bytes[1]===0xd8) && !(bytes[0]===0x89 && bytes[1]===0x50)) throw Error('Not a JPEG or PNG');
        console.log('Downloaded '+entry.file);
      }catch(e){ if(fs.existsSync(dest)) fs.unlinkSync(dest);console.error('FAILED '+entry.url+': '+e.message); }
    }
  }
  const missing=[...images.values()].filter(e=>!fs.existsSync(path.join(mediaDir,e.file)));
  if(missing.length)throw Error(`${missing.length} images missing. Run with --download. No archive page generated.`);
  const project=fs.readFileSync(path.join(root,'projects/metrocop.html'),'utf8');
  const nav=project.match(/<nav aria-label="Main navigation">[\s\S]*?<\/nav>/)[0];
  const footer=project.match(/<footer>[\s\S]*?<\/footer>/)[0];
  const years=[...new Set(data.posts.map(p=>p.date.slice(0,4)))];
  const chapters={2019:'The first prototypes',2020:'References, resources & a restart',2021:'Finding the silhouette',2022:'Helmet assembly & test fits',2023:'Voice electronics & WonderCon',2024:'Sharing the details',2025:'New builds & better assembly',2026:'An ongoing project'};
  const sections=years.map(year=>{
    const posts=publishedPosts.filter(p=>p.date.startsWith(year));let contents='';let group=[];
    const flush=()=>{if(!group.length)return;contents+=`<details class="archive-community"><summary>From the community · ${group.length} ${group.length===1?'reply':'replies'}</summary><p class="archive-quote-note">Feedback and contributions from other builders. Follow the links to read more and see their photographs.</p>${group.map(p=>`<div id="${p.id}" class="community-reply"><p><strong>${esc(p.author)}</strong> · <time datetime="${p.date.slice(0,10)}">${date(p.date)}</time> · <a href="${postUrl(p)}">Read contribution ↗</a></p><p>${esc(replies[p.number]||'A contribution from another builder.')}</p></div>`).join('')}</details>`;group=[];};
    for(const p of posts){if(p.author!=='Utri'){group.push(p);continue;}flush();contents+=`<article class="archive-entry" id="${p.id}"><header><p class="archive-dateline"><time datetime="${p.date.slice(0,10)}">${date(p.date)}</time> · Erik Reiner</p><h3>${titles[p.number]}</h3></header>${p.number===27?'<aside class="archive-note">Historical estimates from 2020, not current prices or a final project total.</aside>':''}${p.number===86?'<aside class="archive-note">The “filters” below are ventilated costume parts, not protective respirators.</aside>':''}${body(p)}</article>`;}flush();return `<section class="archive-year" id="year-${year}" aria-labelledby="heading-${year}"><header class="archive-year-heading"><span>${year}</span><h2 id="heading-${year}">${chapters[year]}</h2></header>${contents}</section>`;
  }).join('\n');
  const html=`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Metrocop — Build Journal, 2019–2026 | Erik Reiner</title>
<meta name="description" content="The Metrocop build journal: ${authoredCount} updates, photographs, prototypes, costume construction, electronics, and years of refinement.">
<link rel="canonical" href="https://www.erikreiner.com/projects/metrocop-build.html">
<meta property="og:type" content="article"><meta property="og:title" content="Metrocop — The Build Journal"><meta property="og:description" content="From the first foam panels to Citadel Supply Co. A build journal documenting Erik Reiner’s Metrocop build."><meta property="og:url" content="https://www.erikreiner.com/projects/metrocop-build.html"><meta property="og:image" content="https://www.erikreiner.com/assets/images/projects/metrocop/metrocop-1.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../assets/images/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#8f9f3f">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="../assets/css/style.css"><link rel="stylesheet" href="../assets/css/metrocop-build.css?v=4"><script src="../assets/js/site.js" defer></script><script src="../assets/js/metrocop-timeline.js" defer></script>
</head><body data-page="project"><a class="skip-link" href="#main-content">Skip to content</a>${nav}
<header class="project-hero shell archive-hero"><a href="metrocop.html" class="back-link">← Project overview</a><p class="archive-eyebrow">Workshop journal / 2019–2026</p><h1>The full Metrocop build.</h1><p class="project-hero-sub">The experiments, false starts, and small breakthroughs behind the uniform.</p><div class="project-meta"><span class="cat-badge">${authoredCount} journal entries</span><span class="cat-badge alt">${images.size} images</span><span class="status-badge evolving">Still evolving</span></div></header>
<main id="main-content" tabindex="-1" class="archive-layout shell"><aside class="archive-sidebar"><nav aria-label="Build log years"><p>Jump to a year</p>${years.map(y=>`<a href="#year-${y}"><span class="timeline-year">${y}</span><span>${chapters[y]}</span></a>`).join('')}</nav><a class="archive-source" href="metrocop.html">Project overview →</a></aside><div class="archive-content"><section class="archive-intro" aria-label="About this journal"><p>I started this build in 2019. This journal follows the work from the beginning: early foam experiments, helmet rebuilds, convention deadlines, and the refinements that came after.</p><p>Follow the experiments year by year, from the first foam panels to finished costumes and redesigned accessories. The optional “From the community” sections collect feedback, questions, and other builders’ contributions along the way.</p><details><summary>About this journal &amp; design credits</summary><p>Adapted from my original build notes, with dates retained to show how the project developed. Some early entries include later photographs. Community contributions are summarized and attributed, with links to the original discussions. Historical prices and resource availability may have changed.</p><p>Reference images are retained beside the discussion they illustrate. Design references include mb814’s model and textures, Half-Life: Alyx references and Max Aristov, and imagery from msleeper’s blog. The early baton uses Lybos’s model; the later stunstick references Pixelitz’s HD remake. The 2021 helmet came from an Etsy model whose creator is not identified in my original notes. Half-Life and its characters belong to Valve; this is an independent fan project.</p><p>The revised <a href="https://drive.google.com/file/d/1DWIzSIhPVoEUIBlLZ2qZyTu38QpTCS7x/view?usp=sharing">vest template linked in the 2025 update</a> supersedes the older template links and preview image.</p></details></section>${sections}<section class="archive-end"><p class="archive-eyebrow">The story continues</p><h2>From a personal build to Citadel.</h2><p>The project is still evolving. Explore the current props and accessories, or return to the condensed project story.</p><div class="page-actions"><a class="button-secondary" href="/citadel/">Citadel Supply Co. →</a><a class="button-secondary" href="metrocop.html">Project overview →</a><a href="#main-content">Back to top ↑</a></div></section></div></main>${footer}</body></html>`;
  fs.writeFileSync(path.join(root,'projects/metrocop-build.html'),html+'\n');
  console.log(`Built archive: ${publishedPosts.length} published entries, ${images.size} local images.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
