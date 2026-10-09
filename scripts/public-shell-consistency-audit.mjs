import fs from 'node:fs';

const root='public/site-preview';
const pages=[
  ['home','index.html',false],
  ['read','read/index.html',true],
  ['world','world/index.html',true],
  ['codex','codex/index.html',true],
  ['fan','fan-page/index.html',true],
  ['manga','manga/index.html',true],
  ['support','support/index.html',true],
  ['account','account/index.html',true],
  ['quests','quests/index.html',true]
];

const requiredHeader=[
  'class="game-nav v2-nav"',
  'class="game-brand v2-brand"',
  'class="desktop-nav v2-primary-nav"',
  'id="global-search-input"',
  'id="notification-button"',
  'data-auth-link',
  'class="v25-icon i-home"',
  'class="v25-icon i-read"',
  'class="v25-icon i-world"',
  'class="v25-icon i-codex"',
  'class="v25-icon i-fan"',
  'class="v25-icon i-manga"',
  'class="v25-icon i-support"'
];

const requiredFooter=[
  'class="mobile-bottom-nav v2-mobile-bottom"',
  'id="global-search-panel"',
  'id="global-search-results"',
  'id="notification-panel"',
  'id="notification-list"',
  'id="global-flyout-backdrop"',
  '/site-preview/site.js'
];

const failures=[];
const rows=[];

for(const [name,rel,unified] of pages){
  const path=`${root}/${rel}`;
  const html=fs.readFileSync(path,'utf8');
  const pageFailures=[];

  for(const needle of requiredHeader)if(!html.includes(needle))pageFailures.push(`missing ${needle}`);
  // Seven redesigned destinations use approved PNG; account/quests retain existing legacy asset.
  const expectedBrand=['home','read','world','codex','fan','manga','support'].includes(name)
    ? '/assets/overlays/official%20log.png' : '/assets/genesis-wordmark-v2.svg';
  if(!html.includes(expectedBrand))pageFailures.push(`missing ${expectedBrand}`);
  for(const needle of requiredFooter)if(!html.includes(needle))pageFailures.push(`missing ${needle}`);
  if(unified&&!/class="[^"]*web-ds-v2[^"]*unified-public-page|class="[^"]*unified-public-page[^"]*web-ds-v2/.test(html)){
    pageFailures.push('missing web-ds-v2 unified-public-page body classes');
  }
  if(unified&&html.includes('class="game-nav compact"'))pageFailures.push('legacy compact navigation remains');

  const hs=html.indexOf('<header');
  const he=html.indexOf('</header>',hs);
  const ms=html.lastIndexOf('<nav class="mobile-bottom-nav');
  const me=html.indexOf('</nav>',ms);
  const shell=(hs>=0&&he>hs?html.slice(hs,he):'')+(ms>=0&&me>ms?html.slice(ms,me):'');
  if(/[⌂▤◎▣♟▧♡]/.test(shell))pageFailures.push('legacy Unicode navigation icon remains in shared shell');

  rows.push({page:name,status:pageFailures.length?'FAIL':'PASS',failures:pageFailures});
  failures.push(...pageFailures.map(x=>`${name}: ${x}`));
}

const css=fs.readFileSync(`${root}/site.css`,'utf8');
for(const needle of [
  'WEB-DS-V3 — SITE-WIDE GENESIS SHELL',
  '.unified-public-page',
  '.unified-public-page .reader-commandbar',
  '.unified-public-page .support-game-card',
  '@media(prefers-reduced-motion:reduce)'
]){
  if(!css.includes(needle))failures.push(`site.css: missing ${needle}`);
}

fs.mkdirSync('readiness-artifacts',{recursive:true});
fs.writeFileSync('readiness-artifacts/public-shell-consistency.json',JSON.stringify({rows,failures},null,2));
console.log(JSON.stringify({rows,failures},null,2));
if(failures.length)process.exit(1);
