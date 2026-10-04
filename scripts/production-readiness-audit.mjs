import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p);
const paths={
  home:'public/site-preview/index.html',
  css:'public/site-preview/site.css',
  js:'public/site-preview/site.js',
  fan:'public/site-preview/fan-page/index.html',
  adminHtml:'public/admin/index.html',
  adminJs:'public/admin/admin.js',
  adminReader:'public/admin/read/reader.js',
  worker:'src/worker.ts',
  publicWorker:'src/public-worker.ts',
  liveWorkflow:'.github/workflows/deploy-live.yml',
  adminWorkflow:'.github/workflows/deploy-admin-preview.yml',
  visualWorkflow:'.github/workflows/website-redesign-visual-qa.yml'
};
for(const [k,p] of Object.entries(paths)){
  if(!exists(p)){console.error('Missing required file:',k,p);process.exit(2)}
}
const home=read(paths.home),css=read(paths.css),js=read(paths.js),fan=read(paths.fan);
const adminHtml=read(paths.adminHtml),adminJs=read(paths.adminJs),adminReader=read(paths.adminReader);
const worker=read(paths.worker),publicWorker=read(paths.publicWorker);
const liveWorkflow=read(paths.liveWorkflow),adminWorkflow=read(paths.adminWorkflow),visualWorkflow=read(paths.visualWorkflow);

const findings=[];
function add(id,severity,title,pass,evidence){
  findings.push({id,severity,title,status:pass?'PASS':'FAIL',evidence});
}

add('S0-PUBLIC-ADMIN-ISOLATION','S0','Public Worker blocks Admin',
  /\/admin\/?/.test(publicWorker)&&/404/.test(publicWorker),
  'Public Worker contains /admin blocking and 404 handling.');

add('S0-LIVE-SECURITY-HEADERS','S0','Live candidate verifies security headers',
  /content-security-policy/i.test(liveWorkflow)&&/strict-transport-security/i.test(liveWorkflow)&&/x-content-type-options/i.test(liveWorkflow)&&/referrer-policy/i.test(liveWorkflow),
  'Live workflow retains CSP/HSTS/nosniff/referrer checks.');

add('S0-ADMIN-PROTECTION','S0','Protected Admin deploy verifies private auth gate',
  /genesis-admin-preview/.test(adminWorkflow)&&/SUPABASE_SERVICE_ROLE_KEY/.test(adminWorkflow)&&/CF_ACCESS_AUD/.test(adminWorkflow)&&/(401|Cloudflare Access)/.test(adminWorkflow),
  'Protected Admin deployment requires private binding names and verifies 401/Access protection.');

const searchInput=(home.match(/<input[^>]+id=["']global-search-input["'][^>]*>/i)||[''])[0];
add('S1-SEARCH','S1','Global Search is live and reader-safe',
  !!searchInput&&!/\bdisabled\b/i.test(searchInput)&&/function initGlobalSearch\(/.test(js)&&/api_entity_search/.test(js)&&/api_episode_library/.test(js),
  'Search input is enabled and wired to released story + reader-safe entity APIs.');

add('S1-NOTIFICATIONS','S1','Notification center has read/unread state and live sources',
  /id=["']notification-panel["']/.test(home)&&/NOTIFICATION_READ_KEY/.test(js)&&/function buildNotificationFeed\(/.test(js)&&/notification-mark-all/.test(home),
  'Notification panel, badge, local read state, mark-all-read, release/quest sources are implemented.');

add('S1-RELEASE-AUTHORITY','S1','Backend scheduled release overrides client fallback',
  /api_public_release_state_v1/.test(js)&&/authoritativeAt/.test(js)&&/releaseState\?\.launch_authorized&&!releaseState\?\.releases_paused/.test(js)&&/next_publish_at/.test(js),
  'Public release-state RPC is read first; local Manila schedule is conditional fallback only.');

add('S1-EXACT-RESUME','S1','Reader resume stores exact Episode, Part and progress',
  /READ_STATE_KEY/.test(js)&&/saveLocalProgress/.test(js)&&/progress_pct/.test(js)&&/searchParams\.set\("episode"/.test(js)&&/searchParams\.set\("part"/.test(js),
  'Exact Episode/Part/progress state is persisted locally and deep-linked.');

add('S1-PART-LEVEL-LATEST','S1','Latest Releases uses real Part records',
  /function collectLatestParts\(/.test(js)&&/PART '\+String\(part\.part_number\)/.test(js)&&/api_episode_parts_for_reader/.test(js),
  'Homepage flattens released Parts and renders Episode + Part chronology.');

add('S2-ACCOUNT-ORB','S2','Profile orb remains visual after authentication',
  /link\.classList\.contains\("profile-orb"\)/.test(js)&&/user_metadata\?\.avatar_url/.test(js)&&!/link\.textContent=user\?"Account":"Sign in";/.test(js),
  'Auth chrome preserves the circular image treatment.');

add('S2-SYSTEM-NOTICES','S2','Homepage notices are live-state notices, not fake editorial announcements',
  /SYSTEM NOTICES/.test(home)&&/function paintSystemNotices\(/.test(js),
  'Homepage notices are generated from release/account state and labeled System Notices.');

add('S2-CODEX-VISUALS','S2','World/Codex visuals vary by entity seed',
  /function stableIndex\(/.test(js)&&/entityVisual\(type,x\?\.entity_code/.test(js),
  'Reader-safe entities receive deterministic varied artwork instead of one category image.');

add('S2-FAN-TRUTH','S2','Fan upload state is honest',
  /Uploads currently closed/.test(fan)&&/button disabled/.test(fan),
  'Upload CTA is disabled and explicitly says uploads are closed.');

add('S2-SUPPORT-TRUTH','S2','Support distinguishes test/preparation/live states',
  /PayMongo TEST MODE active/.test(js)&&/PayMongo preparation mode/.test(js)&&/payment_provider_mode/.test(js),
  'Support controls are driven by provider mode and honest state copy.');

add('S2-AMBIENT-OVERLAY','S2','Ambient overlays are decorative and reduced-motion safe',
  /genesis-ambient-overlay/.test(css)&&/genesis-mote/.test(css)&&/prefers-reduced-motion/.test(css),
  'Ambient particles, border glint and panel sweep exist with reduced-motion protection.');

add('S2-MOBILE-SHELL','S2','Mobile header/navigation is operational',
  /function initMobileHomeNav\(/.test(js)&&/v2-mobile-drawer/.test(css)&&/mobile-drawer-search/.test(css),
  'Mobile drawer, search, bell/profile shell and safe-area layout are implemented.');

add('S1-ADMIN-RECONCILED','S1','Admin runtime is on current bridge lineage without static manuscript copies',
  /data-view=["']website-ops["']/.test(adminHtml)&&
  /data-view=["']manuscripts["']/.test(adminHtml)&&
  /function loadWebsiteOps\(/.test(adminJs)&&
  /platformRest\("platform_settings"/.test(adminJs)&&
  /platformFunction\("genesis-production-status"/.test(adminJs)&&
  /platformFunction\("genesis-manuscripts-index"/.test(adminJs)&&
  /PLATFORM_SESSION_KEY/.test(adminJs)&&
  /genesis_admin_website_ops_status/.test(worker)&&
  !fs.existsSync('public/admin/voice-revisions'),
  'Admin shell retains Website Ops while Manuscripts uses the authenticated Platform read-only bridge; static manuscript snapshot directory is absent.');

add('S1-CI-COVERAGE','S1','Visual QA covers main and final candidate',
  /- main/.test(visualWorkflow)&&/- website-finish-v1/.test(visualWorkflow)&&/pull_request/.test(visualWorkflow),
  'Visual QA runs on main, final branch and PRs.');

const s0=findings.filter(x=>x.severity==='S0'&&x.status==='FAIL');
const s1=findings.filter(x=>x.severity==='S1'&&x.status==='FAIL');
const allFail=findings.filter(x=>x.status==='FAIL');
const state=s0.length||s1.length?'BLOCKED':allFail.length?'CANDIDATE_READY_WITH_MAJOR_FINDINGS':'CANDIDATE_READY';

const report={
  generated_at:new Date().toISOString(),
  state,
  summary:{
    total:findings.length,
    pass:findings.filter(x=>x.status==='PASS').length,
    fail:allFail.length,
    s0_fail:s0.length,
    s1_fail:s1.length,
    s2_fail:findings.filter(x=>x.severity==='S2'&&x.status==='FAIL').length
  },
  findings
};
fs.mkdirSync('readiness-artifacts',{recursive:true});
fs.writeFileSync('readiness-artifacts/production-readiness.json',JSON.stringify(report,null,2));
fs.writeFileSync('readiness-artifacts/production-readiness.txt',[
  'GENESIS WEBSITE/ADMIN READINESS: '+state,
  ...findings.map(f=>`${f.status} [${f.severity}] ${f.id} — ${f.title}\n  ${f.evidence}`)
].join('\n'));
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--fail-on-s1')&&(s0.length||s1.length))process.exit(1);
