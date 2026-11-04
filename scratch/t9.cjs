const fs=require('fs');const f='docs/index.html';let c=fs.readFileSync(f,'utf8');
const s=c.indexOf('        <!-- Project 2: Abyssal Dive -->');
const e=c.indexOf('        <!-- Project 4: Idle RPG -->');
if(s<0||e<s) throw new Error('9a anchors');
c=c.slice(0,s)+c.slice(e);
const rep=(a,b)=>{ if(c.split(a).length!==2) throw new Error('not unique: '+a); c=c.replace(a,b); };
rep('<!-- Project 4: Idle RPG -->','<!-- Project 2: Idle RPG -->');
rep('04 / 3D WEAPON FORGE &amp; BATTLE','02 / 3D WEAPON FORGE &amp; BATTLE');
const newCards=`
        <!-- Project 3: Sticker Room -->
        <article class="project" data-category="game">
          <div class="project-art art-stickerroom">
            <span class="art-label">03 / 3D UNPACK &amp; DECORATE</span>
            <img src="assets/projects/sticker-room.png" alt="Sticker Room 3D puzzle game preview" class="project-thumb-img" width="800" height="500" loading="lazy">
          </div>
          <div class="project-info">
            <div class="project-meta">WEB 3D GAME <span>↗ 2026</span></div>
            <h3>Sticker Room<span class="project-arrow" aria-hidden="true">↗</span></h3>
            <p>Cute 3D unpack &amp; decorate puzzle game — Three.js + Jolt Physics. 10 rooms × 3 stages, Zen mode, auto graphics tier, ~36 draw calls, render-on-demand.</p>
            <div class="project-foot">
              <div class="project-tags">
                <span>THREE.JS</span><span>JOLT PHYSICS</span><span>ZEN MODE</span><span>~36 DRAW CALLS</span>
              </div>
              <div class="project-links">
                <a href="https://shaikowannasleep.github.io/sticker-room/" target="_blank" rel="noopener noreferrer" aria-label="Open Sticker Room live demo">LIVE DEMO ↗</a>
                <a href="https://github.com/shaikowannasleep/sticker-room" target="_blank" rel="noopener noreferrer" aria-label="Sticker Room source on GitHub">GITHUB ↗</a>
              </div>
            </div>
          </div>
        </article>

        <!-- Project 4: WebWiki (TGSH Wiki) -->
        <article class="project" data-category="web">
          <div class="project-art art-webwiki">
            <span class="art-label">04 / WIKI &amp; STUDIO TOOLS</span>
            <img src="assets/projects/webwiki.png" alt="WebWiki (TGSH Wiki) website preview" class="project-thumb-img" width="800" height="500" loading="lazy">
          </div>
          <div class="project-info">
            <div class="project-meta">WEB APP <span>↗ 2026</span></div>
            <h3>WebWiki (TGSH Wiki)<span class="project-arrow" aria-hidden="true">↗</span></h3>
            <p>Vietnamese wiki + studio tools for Soul Land: Awakening World — soul rings, soul bones, team builder, OCR crop tool. Node + Vercel serverless + Postgres.</p>
            <div class="project-foot">
              <div class="project-tags">
                <span>NODE.JS</span><span>VERCEL</span><span>POSTGRES</span><span>OCR TOOL</span>
              </div>
              <div class="project-links">
                <a href="https://tgsh-wiki.vercel.app/" target="_blank" rel="noopener noreferrer" aria-label="Open WebWiki live site">LIVE ↗</a>
                <a href="https://github.com/shaikowannasleep/WebWiki" target="_blank" rel="noopener noreferrer" aria-label="WebWiki source on GitHub">GITHUB ↗</a>
              </div>
            </div>
          </div>
        </article>
`;
const anchor='        </article>\n      </div>\n\n      <!-- Additional Commercial';
if(c.split(anchor).length!==2) throw new Error('grid anchor');
c=c.replace(anchor,'        </article>\n'+newCards+'      </div>\n\n      <!-- Additional Commercial');
const sub='Playable ads, interactive living simulations, and compact game systems.';
rep(sub,'A playable ad, a living simulation, a 3D web game and a web app.');
const f2='        <button type="button" class="filter-btn" data-filter="experiment" aria-pressed="false">';
rep(f2,`        <button type="button" class="filter-btn" data-filter="web" aria-pressed="false">
          <span>WEB APPS</span>
        </button>
`+f2);
fs.writeFileSync(f,c);console.log('ok');
