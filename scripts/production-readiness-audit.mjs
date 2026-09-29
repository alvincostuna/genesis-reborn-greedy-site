import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

const paths = {
  home: 'public/site-preview/index.html',
  js: 'public/site-preview/site.js',
  publicWorker: 'src/public-worker.ts',
  liveWorkflow: '.github/workflows/deploy-live.yml',
  visualWorkflow: '.github/workflows/website-redesign-visual-qa.yml'
};

for (const [name,p] of Object.entries(paths)) {
  if (!exists(p)) {
    console.error('Missing required readiness input:', name, p);
    process.exit(2);
  }
}

const home = read(paths.home);
const js = read(paths.js);
const publicWorker = read(paths.publicWorker);
const liveWorkflow = read(paths.liveWorkflow);
const visualWorkflow = read(paths.visualWorkflow);

const findings = [];
function add(id,severity,title,pass,evidence,remediation) {
  findings.push({id,severity,title,status: pass ? 'PASS' : 'FAIL',evidence,remediation});
}

add(
  'PRG-SEC-ADMIN-ISOLATION','S0',
  'Public Worker blocks /admin',
  /\/admin\/?/.test(publicWorker) && /404/.test(publicWorker),
  'src/public-worker.ts contains public Admin route blocking and 404 handling.',
  'Keep /admin unavailable on the public Worker and verify candidate/live HTTP 404.'
);

add(
  'PRG-SEC-HEADERS','S0',
  'Public Worker installs core security headers',
  /content-security-policy/i.test(publicWorker) &&
  /strict-transport-security/i.test(publicWorker) &&
  /x-content-type-options/i.test(publicWorker) &&
  /referrer-policy/i.test(publicWorker),
  'Core header names found in src/public-worker.ts.',
  'Restore CSP/HSTS/nosniff/referrer policy before release.'
);

const searchTag = (home.match(/<input[^>]*(?:search|Search)[^>]*>/s) || [null])[0];
const searchVisible = Boolean(searchTag);
const searchDisabled = Boolean(searchTag && /\bdisabled\b/i.test(searchTag));
add(
  'PRG-FUNC-SEARCH','S1',
  'Visible global Search is functional or absent',
  !searchVisible || !searchDisabled,
  searchVisible
    ? (searchDisabled ? 'Search input is present and disabled.' : 'Search input is present and not disabled.')
    : 'No Search input is rendered.',
  'Implement public-safe search with reveal filtering, or remove the control from production.'
);

const notificationSurface = /notification|aria-label=["'][^"']*notification/i.test(home);
const notificationBackend =
  /\/api\/(?:public|reader)\/[^"'\s]*notification/i.test(js) ||
  /notification(?:Inbox|List|Feed|State|Read)/.test(js);
add(
  'PRG-FUNC-NOTIFICATIONS','S1',
  'Visible notification surface has a real data flow or is absent',
  !notificationSurface || notificationBackend,
  notificationSurface
    ? (notificationBackend ? 'Notification surface and backend/data-flow markers found.' : 'Notification surface found, but no notification backend/data-flow marker found.')
    : 'No notification surface is rendered.',
  'Implement inbox/read-state/badge flow, or hide the bell until it exists.'
);

add(
  'PRG-CI-MAIN-COVERAGE','S1',
  'Visual QA covers current main/release source',
  /branches:\s*[\s\S]*?-\s*main\s*(?:\n|$)/m.test(visualWorkflow),
  /branches:\s*[\s\S]*?-\s*main\s*(?:\n|$)/m.test(visualWorkflow)
    ? 'main is included in the visual-QA push branch list.'
    : 'main is not included in the visual-QA push branch list.',
  'Run visual QA on main/release candidates, not only historical feature branches.'
);

add(
  'PRG-DEPLOY-MANUAL','S0',
  'Live deployment remains manually gated',
  /workflow_dispatch/.test(liveWorkflow) && /environment:\s*genesis-live/.test(liveWorkflow),
  'deploy-live.yml uses workflow_dispatch and the genesis-live environment.',
  'Keep live promotion manually/environment gated.'
);

add(
  'PRG-DEPLOY-CANDIDATE','S0',
  'Live workflow verifies an isolated candidate before promotion',
  /Upload live candidate/.test(liveWorkflow) &&
  /Verify public-only candidate/.test(liveWorkflow) &&
  /Promote verified candidate/.test(liveWorkflow),
  'Candidate upload, verification, and promotion stages found.',
  'Do not promote without isolated candidate verification.'
);

add(
  'PRG-DEPLOY-ADMIN404','S0',
  'Live workflow checks public /admin remains private',
  /\/admin\//.test(liveWorkflow) && /404/.test(liveWorkflow),
  'deploy-live.yml contains /admin/ status verification against 404.',
  'Restore the public/Admin isolation check.'
);

const hasReleaseApi = /release[-_/ ]?state|release[-_/ ]?queue|\/api\/public\/[^"'\s]*release/i.test(js);
const hasClientSchedule = /8\s*(?:AM|:00)|14:00|20:00|nextManilaRelease|Manila/i.test(js);
add(
  'PRG-DATA-RELEASE-AUTHORITY','S1',
  'Homepage release state is demonstrably backend-authoritative',
  hasReleaseApi && !hasClientSchedule,
  hasReleaseApi
    ? (hasClientSchedule
        ? 'Release API marker and client schedule logic both exist; manual authority review required.'
        : 'Release API marker found without obvious client schedule authority.')
    : 'No clear public release-state/queue API marker found in site.js.',
  'Make Admin/backend queue authoritative. Client schedule may be fallback only and must not override exceptions.'
);

const hasResumeMarker =
  /reading[_-]?progress|resume[_-]?(?:state|position)|latest[_-]?read|part[_-]?progress/i.test(js);
add(
  'PRG-DATA-READER-RESUME','S1',
  'Currently Reading has exact persisted reader resume state',
  hasResumeMarker,
  hasResumeMarker
    ? 'Reader resume/progress marker found in site.js; requires runtime verification.'
    : 'No clear persisted reader resume/progress marker found in site.js.',
  'Persist/load exact Episode + Part + progress and deep-link Continue Reading.'
);

const s0fails = findings.filter(x => x.severity === 'S0' && x.status === 'FAIL');
const s1fails = findings.filter(x => x.severity === 'S1' && x.status === 'FAIL');
const state = s0fails.length || s1fails.length ? 'BLOCKED' : 'CANDIDATE_READY';

const report = {
  generated_at: new Date().toISOString(),
  state,
  summary: {
    total: findings.length,
    pass: findings.filter(x => x.status === 'PASS').length,
    fail: findings.filter(x => x.status === 'FAIL').length,
    s0_fail: s0fails.length,
    s1_fail: s1fails.length
  },
  findings
};

fs.mkdirSync('readiness-artifacts', {recursive:true});
fs.writeFileSync('readiness-artifacts/production-readiness.json', JSON.stringify(report,null,2));
fs.writeFileSync(
  'readiness-artifacts/production-readiness.txt',
  [
    'GENESIS PRODUCTION READINESS: ' + state,
    ...findings.map(f => `${f.status} [${f.severity}] ${f.id} — ${f.title}\n  ${f.evidence}\n  Remediation: ${f.remediation}`)
  ].join('\n')
);

console.log(JSON.stringify(report,null,2));

if (process.argv.includes('--fail-on-s1') && (s0fails.length || s1fails.length)) {
  process.exit(1);
}
