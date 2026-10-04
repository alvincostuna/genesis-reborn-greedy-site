const state={manuscripts:[],activePart:null,activeStage:"stage2",rbac:null,activeReader:null,readerEligibleParts:[],activeDatabaseRecord:null,databaseAllowedFields:{},artAssetsManifest:null};
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];

const PLATFORM_URL="https://qtfdqurbcqkpkpnvkvdh.supabase.co";
const PLATFORM_PUBLISHABLE_KEY="sb_publishable_V7DrgmlPJfe1d-KZX3rSsg_VpSouhlp";
const PLATFORM_SESSION_KEY="genesis_platform_admin_session_v1";

function platformSession(){
  try{
    const raw=sessionStorage.getItem(PLATFORM_SESSION_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(!parsed?.access_token)return null;
    if(parsed.expires_at&&Date.now()>=Number(parsed.expires_at)*1000){
      sessionStorage.removeItem(PLATFORM_SESSION_KEY);
      return null;
    }
    return parsed;
  }catch{
    sessionStorage.removeItem(PLATFORM_SESSION_KEY);
    return null;
  }
}

function storePlatformSession(data){
  const session={
    access_token:String(data?.access_token||""),
    refresh_token:String(data?.refresh_token||""),
    expires_at:Number(data?.expires_at||0)
  };
  if(!session.access_token)throw new Error("GENESIS PLATFORM did not return an access token.");
  sessionStorage.setItem(PLATFORM_SESSION_KEY,JSON.stringify(session));
  return session;
}

function clearPlatformSession(){
  sessionStorage.removeItem(PLATFORM_SESSION_KEY);
}

async function platformLogin(email,password){
  const response=await fetch(PLATFORM_URL+"/auth/v1/token?grant_type=password",{
    method:"POST",
    headers:{"Content-Type":"application/json",apikey:PLATFORM_PUBLISHABLE_KEY},
    body:JSON.stringify({email,password})
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.access_token){
    throw new Error(payload?.msg||payload?.message||payload?.error_description||("Platform login failed ("+response.status+")"));
  }
  return storePlatformSession(payload);
}

async function platformFunction(name,params){
  const session=platformSession();
  if(!session)throw new Error("GENESIS PLATFORM session required.");
  const query=params?("?"+new URLSearchParams(params).toString()):"";
  const response=await fetch(PLATFORM_URL+"/functions/v1/"+name+query,{
    method:"GET",
    headers:{
      Authorization:"Bearer "+session.access_token,
      apikey:PLATFORM_PUBLISHABLE_KEY,
      Accept:"application/json"
    },
    cache:"no-store"
  });
  const payload=await response.json().catch(()=>null);
  if(response.status===401){
    clearPlatformSession();
    throw new Error("GENESIS PLATFORM session expired. Connect again.");
  }
  if(!response.ok){
    throw new Error(payload?.error||payload?.message||("Bridge request failed ("+response.status+")"));
  }
  return payload;
}

async function api(path){
  const response=await fetch(path,{credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json","Cache-Control":"no-cache","Pragma":"no-cache"}});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.ok){
    throw new Error(payload?.error?.message||("Request failed ("+response.status+")"));
  }
  return payload.data;
}

async function apiPost(path,body){
  const response=await fetch(path,{
    method:"POST",
    credentials:"same-origin",
    headers:{"Content-Type":"application/json",Accept:"application/json"},
    body:JSON.stringify(body||{})
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.ok){
    throw new Error(payload?.error?.message||("Request failed ("+response.status+")"));
  }
  return payload.data;
}

function bridgeLoginPanel(message){
  return '<div class="panel admin-note compact">'+
    '<div class="database-head"><span>GENESIS PLATFORM SESSION</span><small>REQUIRED</small></div>'+
    '<p>'+escapeHtml(message||"Connect your GENESIS PLATFORM admin account to read this Core surface through the isolated bridge.")+'</p>'+
    '<div class="bridge-inline-login">'+
      '<input id="platform-bridge-email" type="email" autocomplete="username" placeholder="Platform admin email">'+
      '<input id="platform-bridge-password" type="password" autocomplete="current-password" placeholder="Platform admin password">'+
      '<button id="platform-bridge-connect" type="button">Connect Platform</button>'+
    '</div>'+
  '</div>';
}

function bindBridgeLogin(reload){
  const button=$("#platform-bridge-connect");
  if(!button)return;
  const password=$("#platform-bridge-password");
  const run=async()=>{
    const email=$("#platform-bridge-email")?.value.trim()||"";
    const value=password?.value||"";
    if(!email||!value){alert("Enter your GENESIS PLATFORM admin email and password.");return;}
    button.disabled=true;
    try{
      await platformLogin(email,value);
      if(password)password.value="";
      await reload();
    }catch(error){
      alert(error.message);
      button.disabled=false;
    }
  };
  button.addEventListener("click",run);
  password?.addEventListener("keydown",(event)=>{if(event.key==="Enter")run();});
}

function bridgeFailurePanel(error){
  return '<div class="panel admin-note compact">'+
    '<div class="database-head"><span>CORE BRIDGE</span><small>UNAVAILABLE</small></div>'+
    '<p>'+escapeHtml(error?.message||String(error||"Core bridge unavailable."))+'</p>'+
    '<p>This screen remains isolated. Platform-native Admin areas continue operating.</p>'+
  '</div>';
}

function humanKey(key){
  return String(key||"").replaceAll("_"," ").replace(/\b\w/g,(m)=>m.toUpperCase());
}

function bridgeValue(value){
  if(value===null||value===undefined||value==="")return "—";
  if(typeof value==="boolean")return value?"YES":"NO";
  if(typeof value==="object")return JSON.stringify(value);
  return String(value);
}

function bridgeRecordTable(rows){
  if(!Array.isArray(rows)||!rows.length)return '<div class="empty">No rows returned by the Core bridge.</div>';
  const keys=[...new Set(rows.flatMap((row)=>Object.keys(row||{})))];
  return '<div class="table-scroll"><table><thead><tr>'+
    keys.map((key)=>'<th>'+escapeHtml(humanKey(key))+'</th>').join("")+
    '</tr></thead><tbody>'+
    rows.map((row)=>'<tr>'+keys.map((key)=>'<td>'+escapeHtml(bridgeValue(row?.[key]))+'</td>').join("")+'</tr>').join("")+
    '</tbody></table></div>';
}

function bridgeKeyValueGrid(row){
  if(!row||typeof row!=="object")return '<div class="empty">No Core row returned.</div>';
  return '<div class="runtime">'+Object.entries(row).map(([key,value])=>
    '<div><small>'+escapeHtml(humanKey(key))+'</small><strong>'+escapeHtml(bridgeValue(value))+'</strong></div>'
  ).join("")+'</div>';
}


function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,(ch)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[ch]);
}

function statusClass(value){
  if(value==="Final Canon")return"final";
  if(value==="Published")return"published";
  return"review";
}

function isMobileAdminDevice(){
  return Boolean(
    navigator.maxTouchPoints>0 ||
    window.matchMedia?.("(pointer: coarse)").matches ||
    window.matchMedia?.("(max-width: 900px)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||"")
  );
}

async function loadProduction(){
  const root=$("#production-view");
  root.innerHTML='<div class="panel"><div class="empty">Loading Core production status through GENESIS PLATFORM…</div></div>';

  if(!platformSession()){
    root.innerHTML=bridgeLoginPanel("Production is now a Core read-only surface. Connect GENESIS PLATFORM to load it.");
    bindBridgeLogin(loadProduction);
    return;
  }

  try{
    const envelope=await platformFunction("genesis-production-status");
    const runtime=Array.isArray(envelope?.data)?envelope.data[0]:null;
    if(!runtime)throw new Error("The production bridge returned no production row.");

    if($("#release-badge")){
      $("#release-badge").textContent="CORE READ ONLY";
      $("#release-badge").className="badge good";
    }

    root.innerHTML=
      '<div class="panel admin-note compact">'+
        '<div class="database-head"><span>GENESIS PLATFORM BRIDGE</span><small>CONNECTED · READ ONLY</small></div>'+
        '<p>Authoritative production state is being read from Core through <code>genesis_bridge.production_status_v1</code>. No Core write capability is available on this screen.</p>'+
      '</div>'+
      '<div class="cards">'+
        '<div class="card"><span>Stage 1 verified</span><strong>'+escapeHtml(runtime.stage1_verified_count??"—")+' / '+escapeHtml(runtime.expected_part_count??"—")+'</strong></div>'+
        '<div class="card"><span>Stage 2 verified</span><strong>'+escapeHtml(runtime.stage2_verified_count??"—")+' / '+escapeHtml(runtime.expected_part_count??"—")+'</strong></div>'+
        '<div class="card"><span>Lock revision</span><strong>'+escapeHtml(runtime.lock_revision??"—")+'</strong></div>'+
        '<div class="card"><span>AI-2 gate</span><strong>'+escapeHtml(runtime.ai2_gate||"—")+'</strong></div>'+
      '</div>'+
      '<div class="panel">'+bridgeKeyValueGrid(runtime)+'</div>'+
      '<div class="panel admin-note compact">'+
        '<div class="database-head"><span>MIGRATION GATES</span><small>PRODUCTION · PASS</small></div>'+
        '<p><strong>Data parity:</strong> authoritative Core bridge row · <strong>Auth/RBAC:</strong> Platform admin required · <strong>Boundary:</strong> SELECT-only · <strong>UI:</strong> operational fields preserved · <strong>Failure isolation:</strong> Platform shell remains usable.</p>'+
      '</div>';
  }catch(error){
    root.innerHTML=bridgeFailurePanel(error);
  }
}

async function loadWebsiteOps(){
  const summary=$("#website-ops-summary");
  const integrity=$("#website-ops-integrity");
  const queue=$("#website-ops-queue");
  const publicRoot=$("#website-ops-public");
  summary.innerHTML='<div class="card"><span>Website operations</span><strong>Loading…</strong></div>';
  integrity.innerHTML='<div class="empty">Checking production → release handoff…</div>';
  queue.innerHTML='<div class="empty">Loading release queue state…</div>';
  publicRoot.innerHTML='<div class="empty">Loading public-site state…</div>';
  try{
    const d=await api("/admin/api/website-ops");
    const production=d.production||{};
    const handoff=d.handoff_integrity||{};
    const release=d.release_queue||{};
    const pub=d.public_site||{};
    const controls=d.release_controls||{};
    const lock=d.production_lock||{};
    const clock=pub.clock||{};
    const healthy=handoff.health==="PASS";

    summary.innerHTML=
      '<div class="card"><span>Operational state</span><strong class="'+(healthy?"good-text":"danger-text")+'">'+escapeHtml(d.operational_status||"UNKNOWN")+'</strong></div>'+
      '<div class="card"><span>Handoff integrity</span><strong class="'+(healthy?"good-text":"danger-text")+'">'+escapeHtml(handoff.health||"UNKNOWN")+'</strong></div>'+
      '<div class="card"><span>AI-2 Stage 1</span><strong>'+escapeHtml(production.stage1_available??0)+'</strong></div>'+
      '<div class="card"><span>AI-1 / Stage 2</span><strong>'+escapeHtml(production.stage2_available??0)+'</strong></div>'+
      '<div class="card"><span>Final Canon</span><strong>'+escapeHtml(production.final_canon??0)+'</strong></div>'+
      '<div class="card"><span>Public Parts</span><strong>'+escapeHtml(pub.published_story_parts??0)+'</strong></div>';

    const latest=production.latest_final_canon||null;
    integrity.innerHTML=
      '<div class="database-head"><span>Automatic Story Handoff</span><small>'+escapeHtml(d.contract_version||"")+'</small></div>'+
      '<div class="ops-health">'+
        '<div class="ops-health-row"><span>Active branch</span><strong>'+escapeHtml(d.active_context?.branch_key||"—")+'</strong></div>'+
        '<div class="ops-health-row"><span>Production router</span><strong>'+escapeHtml(lock.router_state||"—")+'</strong></div>'+
        '<div class="ops-health-row"><span>Final Canon without queue item</span><strong class="'+((handoff.final_canon_without_release_item||0)===0?"good-text":"danger-text")+'">'+escapeHtml(handoff.final_canon_without_release_item??0)+'</strong></div>'+
        '<div class="ops-health-row"><span>Release pointer mismatches</span><strong class="'+((handoff.release_pointer_mismatches||0)===0?"good-text":"danger-text")+'">'+escapeHtml(handoff.release_pointer_mismatches??0)+'</strong></div>'+
        '<div class="ops-health-row"><span>Auto-queue trigger</span><strong>'+escapeHtml(handoff.auto_queue_trigger||"—")+'</strong></div>'+
        '<div class="ops-health-row"><span>Latest Final Canon</span><strong>'+(latest?escapeHtml(latest.part_key+" · "+latest.title):"Waiting for Final Canon")+'</strong></div>'+
      '</div>';

    const next=release.next_item||null;
    queue.innerHTML=
      '<div class="database-head"><span>Release Queue</span><small>Final Canon enters HIDDEN automatically</small></div>'+
      '<div class="runtime">'+
        '<div><small>Hidden</small><strong>'+escapeHtml(release.hidden??0)+'</strong></div>'+
        '<div><small>Ready</small><strong>'+escapeHtml(release.ready??0)+'</strong></div>'+
        '<div><small>Scheduled</small><strong>'+escapeHtml(release.scheduled??0)+'</strong></div>'+
        '<div><small>Published</small><strong>'+escapeHtml(release.published??0)+'</strong></div>'+
        '<div><small>Withdrawn</small><strong>'+escapeHtml(release.withdrawn??0)+'</strong></div>'+
        '<div><small>Next queue item</small><strong>'+(next?escapeHtml(next.part_key+" · "+next.release_status):"None yet")+'</strong></div>'+
      '</div>';

    const slots=Array.isArray(clock.daily_slots)?clock.daily_slots.join(" / "):"08:00 / 14:00 / 20:00";
    publicRoot.innerHTML=
      '<div class="database-head"><span>Official Website Publication State</span><small>Public site reads published content only</small></div>'+
      '<div class="runtime">'+
        '<div><small>Releases</small><strong>'+escapeHtml(controls.releases_paused?"PAUSED":"ACTIVE")+'</strong></div>'+
        '<div><small>Launch authorized</small><strong>'+escapeHtml(controls.launch_authorized?"YES":"NO")+'</strong></div>'+
        '<div><small>Cadence</small><strong>'+escapeHtml(slots)+' PHT</strong></div>'+
        '<div><small>Sunday</small><strong>'+escapeHtml(clock.sunday_rest?"REST DAY":"ACTIVE")+'</strong></div>'+
        '<div><small>Next scheduled publish</small><strong>'+escapeHtml(clock.next_publish_at||"NOT SET")+'</strong></div>'+
        '<div><small>Published Parts</small><strong>'+escapeHtml(clock.released_parts??0)+'</strong></div>'+
      '</div>'+
      '<div class="admin-note compact"><strong>Operational contract</strong><p>Production remains authoritative. A Part becomes website-eligible only after FINAL_CANON. The database automatically creates a hidden release item. Admin controls readiness/scheduling; only PUBLISHED Parts become public. This view is read-only and cannot resume story production.</p></div>';
  }catch(error){
    summary.innerHTML="";
    integrity.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
    queue.innerHTML="";
    publicRoot.innerHTML="";
  }
}

async function loadManuscripts(){
  const table=$("#manuscript-table");
  table.innerHTML='<div class="empty">Loading manuscripts through GENESIS PLATFORM…</div>';

  if(!platformSession()){
    table.innerHTML=bridgeLoginPanel("Manuscripts now read through the isolated Core bridge. Sign in with the GENESIS PLATFORM Admin account.");
    bindBridgeLogin(loadManuscripts);
    return;
  }

  const search=$("#search").value.trim();
  const episode=$("#episode-filter").value;
  const params={limit:"200",offset:"0"};
  if(search)params.q=search;
  if(episode)params.episode=episode;

  try{
    const envelope=await platformFunction("genesis-manuscripts-index",params);
    state.manuscripts=Array.isArray(envelope?.data)?envelope.data:[];
    if(!state.manuscripts.length){
      table.innerHTML='<div class="empty">No manuscripts match this filter.</div>';
      return;
    }

    table.innerHTML=
      '<div class="database-head"><span>CORE MANUSCRIPTS</span><small>READ ONLY · '+escapeHtml(envelope.total??state.manuscripts.length)+' MATCHING</small></div>'+
      '<table><thead><tr>'+
      '<th>Part</th><th>Title</th><th>State</th><th>S1</th><th>S2</th><th>Final</th><th>Words (latest)</th>'+
      '</tr></thead><tbody>'+
      state.manuscripts.map((p)=>{
        const latestWords=p.final_word_count??p.stage2_word_count??p.stage1_word_count??"—";
        return '<tr data-part="'+escapeHtml(p.production_part_id)+'">'+
          '<td>'+escapeHtml(p.part_key)+'</td>'+
          '<td>'+escapeHtml(p.title)+'</td>'+
          '<td><span class="status '+statusClass(p.dashboard_state)+'">'+escapeHtml(p.dashboard_state)+'</span></td>'+
          '<td>'+(p.stage1_available?"✓":"—")+'</td>'+
          '<td>'+(p.stage2_available?"✓":"—")+'</td>'+
          '<td>'+(p.final_canon_available?"✓":"—")+'</td>'+
          '<td>'+escapeHtml(latestWords)+'</td>'+
          '</tr>';
      }).join("")+
      '</tbody></table>';

    $("#manuscript-table tbody tr").forEach((row)=>row.addEventListener("click",()=>openPart(row.dataset.part)));
  }catch(error){
    table.innerHTML=bridgeFailurePanel(error);
  }
}

async function loadReleases(){
  const cards=$("#release-policy");
  const launchRoot=$("#release-launch-control");
  const table=$("#release-table");
  cards.innerHTML='<div class="card"><span>Release policy</span><strong>Loading…</strong></div>';
  launchRoot.innerHTML='<div class="empty">Loading launch readiness…</div>';
  table.innerHTML='<div class="empty">Loading release queue…</div>';
  try{
    const [data,envelope,launch]=await Promise.all([
      api("/admin/api/releases"),
      api("/admin/api/release-policy"),
      api("/admin/api/releases/launch-preview")
    ]);
    const policy=envelope.policy||{};
    const clock=envelope.clock||{};
    cards.innerHTML=
      '<div class="card"><span>Launch batch</span><strong>Episodes 1–'+escapeHtml(policy.launch_episode_count??10)+'</strong></div>'+
      '<div class="card"><span>Ongoing cadence</span><strong>1 Part / '+escapeHtml(policy.cycle_hours??8)+'h</strong></div>'+
      '<div class="card"><span>Timezone</span><strong>'+escapeHtml(policy.timezone||"Asia/Manila")+'</strong></div>'+
      '<div class="card"><span>Launch state</span><strong>'+escapeHtml(policy.launch_authorized?"AUTHORIZED":"NOT AUTHORIZED")+'</strong></div>'+
      '<div class="card"><span>Releases</span><strong>'+escapeHtml(policy.releases_paused?"PAUSED":"ACTIVE")+'</strong></div>'+
      '<div class="card"><span>Next publish</span><strong>'+escapeHtml(clock.next_publish_at||"NOT SET")+'</strong></div>'+
      '<div class="card"><span>Released Parts</span><strong>'+escapeHtml(clock.released_parts??0)+'</strong></div>'+
      '<div class="card"><span>Release unit</span><strong>'+escapeHtml(policy.ongoing_release_unit||"PART")+'</strong></div>';

    const active=launch.active_roadmap||{};
    const verify=launch.latest_live_verification||{};
    const canLaunch=Boolean(launch.can_authorize);
    const canManage=hasPermission("RELEASE_MANAGE");
    const canLaunchControl=hasPermission("RELEASE_LAUNCH");

    launchRoot.innerHTML=
      '<div class="database-head"><span>Public Launch Gate</span><small>'+escapeHtml(launch.contract_version||"")+'</small></div>'+
      '<div class="release-control-body">'+
        '<div class="runtime">'+
          '<div><small>Active roadmap</small><strong>V'+escapeHtml(active.version??"—")+' · '+escapeHtml(active.source_system||"—")+'</strong></div>'+
          '<div><small>Final Canon buffer</small><strong>'+escapeHtml(launch.final_canon_parts??0)+' / '+escapeHtml(launch.launch_min_buffer_parts??90)+'</strong></div>'+
          '<div><small>Opening Episodes</small><strong>'+escapeHtml(launch.opening_final_parts??0)+' / '+escapeHtml(launch.opening_expected_parts??0)+'</strong></div>'+
          '<div><small>Live site verification</small><strong>'+escapeHtml(launch.live_site_ready?"PASS":"NOT PASS")+'</strong></div>'+
          '<div><small>Launch authorized</small><strong>'+escapeHtml(policy.launch_authorized?"YES":"NO")+'</strong></div>'+
          '<div><small>Release engine</small><strong>'+escapeHtml(policy.releases_paused?"PAUSED":"ACTIVE")+'</strong></div>'+
        '</div>'+
        (verify.id?'<div class="admin-note compact"><strong>Latest live verification</strong><p>'+escapeHtml(verify.created_at||"")+' · homepage '+escapeHtml(verify.homepage_status)+' · /admin '+escapeHtml(verify.admin_status)+'</p></div>':'')+
        '<div class="cutover-actions">'+
          (canLaunchControl?'<button id="verify-live-site">Verify live public site</button>':'')+
          (canLaunchControl&&!policy.launch_authorized?'<button id="authorize-public-launch" class="danger-action" '+(canLaunch?"":"disabled")+'>Authorize public launch</button>':'')+
          (canLaunchControl&&policy.releases_paused?'<button id="resume-release-engine" '+(policy.launch_authorized?"":"disabled")+'>Resume release engine</button>':'')+
          (canLaunchControl&&!policy.releases_paused?'<button id="pause-release-engine" class="danger-action">Pause release engine</button>':'')+
        '</div>'+
        (!canLaunch
          ?'<div class="empty">Launch remains locked until V2 is active, the Final Canon buffer reaches the configured minimum, opening Episodes are complete, and the live site verification passes.</div>'
          :'<div class="admin-note compact"><strong>Launch prerequisites pass.</strong><p>Authorization still keeps releases paused until you explicitly resume them.</p></div>')+
      '</div>';

    const verifyButton=$("#verify-live-site");
    if(verifyButton)verifyButton.addEventListener("click",async()=>{
      verifyButton.disabled=true;
      try{
        const result=await apiPost("/admin/api/releases/verify-live-site",{});
        alert("Live-site verification: "+result.status+"\nHomepage: "+result.checks.homepage_status+"\n/admin: "+result.checks.admin_status);
        await loadReleases();
      }catch(error){alert(error.message);verifyButton.disabled=false;}
    });

    const authButton=$("#authorize-public-launch");
    if(authButton)authButton.addEventListener("click",async()=>{
      const confirmation=prompt("Type exactly:\nAUTHORIZE GENESIS PUBLIC LAUNCH")||"";
      if(confirmation!=="AUTHORIZE GENESIS PUBLIC LAUNCH")return;
      const local=prompt("Launch date/time (for example 2026-10-01T18:00):")||"";
      const dt=new Date(local);
      if(!local||Number.isNaN(dt.getTime())){alert("Invalid launch date/time.");return;}
      const reason=prompt("Launch authorization reason (minimum 12 characters):")||"";
      if(reason.trim().length<12)return;
      authButton.disabled=true;
      try{
        await apiPost("/admin/api/releases/authorize-launch",{launch_at:dt.toISOString(),confirmation,reason});
        await loadReleases();
      }catch(error){alert(error.message);authButton.disabled=false;}
    });

    const resume=$("#resume-release-engine");
    if(resume)resume.addEventListener("click",async()=>{
      const reason=prompt("Reason for resuming releases (minimum 8 characters):")||"";
      if(reason.trim().length<8)return;
      resume.disabled=true;
      try{await apiPost("/admin/api/releases/resume",{reason});await loadReleases();}
      catch(error){alert(error.message);resume.disabled=false;}
    });

    const pause=$("#pause-release-engine");
    if(pause)pause.addEventListener("click",async()=>{
      const reason=prompt("Reason for pausing releases (minimum 8 characters):")||"";
      if(reason.trim().length<8)return;
      pause.disabled=true;
      try{await apiPost("/admin/api/releases/pause",{reason});await loadReleases();}
      catch(error){alert(error.message);pause.disabled=false;}
    });

    const items=data.items||[];
    if(!items.length){
      table.innerHTML='<div class="empty"><strong>No release items yet.</strong><br>Fresh Final Canon Parts will appear here automatically.</div>';
      return;
    }
    table.innerHTML=
      '<div class="table-scroll"><table><thead><tr><th>Roadmap</th><th>Part</th><th>Title</th><th>Status</th><th>Mode</th><th>Publish at</th><th>Actions</th></tr></thead><tbody>'+
      items.map((x)=>{
        const current=Boolean(x.is_current_active);
        let actions='<span class="muted">'+(current?"No permitted action":"Historical / inactive")+'</span>';
        if(current&&(canManage||canLaunchControl)){
          const a=[];
          if(canManage&&["HIDDEN","RELEASE_READY","SCHEDULED"].includes(x.release_status)){
            if(x.release_status!=="RELEASE_READY")a.push('<button data-release-action="ready" data-id="'+escapeHtml(x.release_item_id)+'">Ready</button>');
            if(x.release_status!=="HIDDEN")a.push('<button data-release-action="hide" data-id="'+escapeHtml(x.release_item_id)+'">Hide</button>');
            if(policy.launch_authorized&&x.release_status!=="PUBLISHED"){
              a.push('<button data-release-action="next-cycle" data-id="'+escapeHtml(x.release_item_id)+'">Next cycle</button>');
              a.push('<button data-release-action="schedule" data-id="'+escapeHtml(x.release_item_id)+'">Exact time</button>');
            }
          }
          if((canManage&&x.release_status==="SCHEDULED")||(canLaunchControl&&x.release_status==="PUBLISHED")){
            a.push('<button data-release-action="withdraw" data-id="'+escapeHtml(x.release_item_id)+'" class="danger-mini">Withdraw</button>');
          }
          if(canLaunchControl&&policy.launch_authorized&&!policy.releases_paused&&["RELEASE_READY","SCHEDULED"].includes(x.release_status)){
            a.push('<button data-release-action="release-now" data-id="'+escapeHtml(x.release_item_id)+'" class="danger-mini">Release now</button>');
          }
          if(a.length)actions='<div class="release-row-actions">'+a.join("")+'</div>';
        }
        return '<tr><td>V'+escapeHtml(x.roadmap_version??"—")+'<br><small>'+escapeHtml(x.roadmap_status||"—")+'</small></td><td>'+escapeHtml(x.part_key)+'</td><td>'+escapeHtml(x.title)+'</td><td>'+escapeHtml(x.release_status)+'</td><td>'+escapeHtml(x.release_mode)+'</td><td>'+escapeHtml(x.publish_at||"—")+'</td><td>'+actions+'</td></tr>';
      }).join("")+
      '</tbody></table></div>';

    table.querySelectorAll("[data-release-action]").forEach(button=>button.addEventListener("click",async()=>{
      const id=button.dataset.id;
      const action=button.dataset.releaseAction;
      let payload={};
      if(action==="release-now"){
        const confirmation=prompt("Type exactly:\nRELEASE THIS PART NOW")||"";
        if(confirmation!=="RELEASE THIS PART NOW")return;
        const reason=prompt("Reason for immediate release:")||"";
        if(reason.trim().length<8)return;
        payload={confirmation,reason};
      }else if(action==="schedule"){
        const local=prompt("Publish date/time (for example 2026-10-01T18:00):")||"";
        const dt=new Date(local);
        if(!local||Number.isNaN(dt.getTime()))return;
        const reason=prompt("Scheduling reason:")||"";
        if(reason.trim().length<4)return;
        payload={publish_at:dt.toISOString(),reason};
      }else if(action==="next-cycle"){
        const reason=prompt("Scheduling reason:")||"";
        if(reason.trim().length<4)return;
        payload={reason};
      }else{
        const reason=prompt("Reason for "+action+":")||"";
        if(reason.trim().length<4)return;
        payload={reason};
      }
      button.disabled=true;
      try{await apiPost("/admin/api/releases/"+id+"/"+action,payload);await loadReleases();}
      catch(error){alert(error.message);button.disabled=false;}
    }));
  }catch(error){
    cards.innerHTML='';
    launchRoot.innerHTML='';
    table.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
  }
}

function compactMeta(meta){
  if(!meta||typeof meta!=="object")return "—";
  const preferred=["family","species","rank","tier","role","type","region","map_type","category","subtype","rarity","quest_type","source_name","visibility","mode","race_family","civilization","settlement_kind","route_kind","mode_family","movement_domain","vehicle_class","runtime_enabled","runtime_authorized","canon_status","website_status","reveal_state","first_roadmap_use"];
  const pairs=[];
  for(const k of preferred){
    if(meta[k]!==undefined&&meta[k]!==null&&meta[k]!==""&&pairs.length<4){
      const v=typeof meta[k]==="object"?JSON.stringify(meta[k]):String(meta[k]);
      pairs.push(k.replaceAll("_"," ")+": "+v);
    }
  }
  if(!pairs.length){
    for(const [k,v] of Object.entries(meta)){
      if(v===undefined||v===null||v===""||typeof v==="object")continue;
      pairs.push(k.replaceAll("_"," ")+": "+String(v));
      if(pairs.length>=4)break;
    }
  }
  return pairs.join(" · ")||"—";
}

async function loadDatabaseSummary(){
  const root=$("#database-summary");
  root.innerHTML='<div class="card"><span>Database</span><strong>Loading…</strong></div>';
  try{
    const data=await api("/admin/api/database/summary");
    const core=data.core_counts||data.counts||{};
    const expanded=data.expanded_counts||{};
    const projection=data.public_projection||{};
    const readerSafeNow=Object.values(projection).reduce((sum,row)=>sum+Number(row?.reader_safe_now||0),0);
    const groups=[
      ["Core Monsters",core.monsters??0],["Bestiary Projection",expanded.monster_catalog??0],
      ["Core Items",core.items??0],["Equipment Registry",expanded.equipment_catalog??0],
      ["Maps",core.maps??0],["Routes",expanded.routes??0],
      ["Shops",expanded.shops??0],["Transport Nodes",expanded.transport_nodes??0],
      ["Civilizations",expanded.civilizations??0],["Race Structures",expanded.races??0],
      ["Settlements",expanded.settlements??0],["Freight Corridors",expanded.freight_corridors??0],
      ["Currencies",expanded.currencies??0],["Guild Skills",expanded.guild_skills??0],
      ["Competition Venues",expanded.competitions??0],["Reader-safe Now",readerSafeNow]
    ];
    root.innerHTML=groups.map(([k,v])=>
      '<div class="card"><span>'+escapeHtml(k)+'</span><strong>'+escapeHtml(v)+'</strong></div>'
    ).join("");
  }catch(error){
    root.innerHTML='<div class="panel"><div class="error">'+escapeHtml(error.message)+'</div></div>';
  }
}

async function loadDatabase(){
  const table=$("#database-table");
  table.innerHTML='<div class="empty">Loading game database…</div>';
  const domain=$("#database-domain").value;
  const q=new URLSearchParams({domain,limit:"100"});
  const search=$("#database-search").value.trim();
  if(search)q.set("q",search);
  try{
    const data=await api("/admin/api/database?"+q.toString());
    const items=data.items||[];
    const readOnly=Boolean(data.read_only);
    items.forEach(item=>{item._readOnly=readOnly;item._layer=data.layer||"";});
    if(!items.length){
      table.innerHTML='<div class="empty"><strong>No records.</strong><br>'+escapeHtml(domain)+' returned no matching rows.</div>';
      return;
    }
    table.innerHTML=
      '<div class="database-head"><span>'+escapeHtml(domain.toUpperCase())+(readOnly?' · READ-ONLY DESIGN':' · CORE')+'</span><small>'+escapeHtml(data.total??items.length)+' total records</small></div>'+
      '<div class="table-scroll"><table><thead><tr><th>Name</th><th>Code</th><th>Status</th><th>Key metadata</th><th>Detail</th></tr></thead><tbody>'+
      items.map((x)=>
        '<tr><td><strong>'+escapeHtml(x.name||"—")+'</strong></td>'+
        '<td><code>'+escapeHtml(x.code||"—")+'</code></td>'+
        '<td><span class="status review">'+escapeHtml(x.status||"—")+'</span></td>'+
        '<td class="meta-text">'+escapeHtml(compactMeta(x.meta))+'</td>'+
        '<td><button class="db-stage-button" data-db-code="'+escapeHtml(x.code||"")+'">'+(x._readOnly?'View read-only design':(hasPermission("DATABASE_EDIT")?'Open detail / stage':'View detail'))+'</button></td></tr>'
      ).join("")+
      '</tbody></table></div>';

    table.querySelectorAll("[data-db-code]").forEach(button=>button.addEventListener("click",()=>{
      const record=items.find(x=>String(x.code)===button.dataset.dbCode);
      if(record)renderDatabaseStaging(domain,record);
    }));
  }catch(error){
    table.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
  }
}

async function loadDatabaseProposals(){
  const root=$("#database-proposals");
  const staging=$("#database-staging");
  root.innerHTML='<div class="empty">Loading staged changes…</div>';
  if(!state.activeDatabaseRecord)staging.innerHTML='<div class="empty">Open a database record to inspect protected detail, Atlas gates and Visual Status. Direct table editing is disabled.</div>';
  try{
    const d=await api("/admin/api/database/proposals?limit=200");
    state.databaseAllowedFields=d.allowed_fields||{};
    const rows=d.proposals||[];
    root.innerHTML=
      '<div class="database-head"><span>Staged Database Changes</span><small>'+escapeHtml(rows.length)+' proposal(s)</small></div>'+
      (rows.length
        ?'<div class="table-scroll"><table><thead><tr><th>Target</th><th>Status</th><th>Patch</th><th>Validation</th><th>Created by</th><th>Actions</th></tr></thead><tbody>'+
          rows.map(p=>{
            const actions=[];
            if(["DRAFT","VALIDATED"].includes(p.status)&&hasPermission("DATABASE_EDIT")){
              actions.push('<button data-db-proposal="update" data-id="'+escapeHtml(p.id)+'">Edit / revalidate</button>');
            }
            if(p.status==="VALIDATED"&&hasPermission("DATABASE_APPROVE")){
              actions.push('<button data-db-proposal="apply" data-id="'+escapeHtml(p.id)+'" class="danger-mini">Apply</button>');
            }
            if(["DRAFT","VALIDATED"].includes(p.status)&&hasPermission("DATABASE_APPROVE")){
              actions.push('<button data-db-proposal="reject" data-id="'+escapeHtml(p.id)+'">Reject</button>');
            }
            const validation=(p.validation_errors||[]).length
              ?JSON.stringify(p.validation_errors)
              :"PASS";
            return '<tr>'+
              '<td><strong>'+escapeHtml(p.domain)+'</strong><br><code>'+escapeHtml(p.target_code)+'</code></td>'+
              '<td><span class="status '+(p.status==="APPLIED"?"final":"review")+'">'+escapeHtml(p.status)+'</span></td>'+
              '<td><code class="json-cell">'+escapeHtml(JSON.stringify(p.patch||{}))+'</code></td>'+
              '<td><code class="json-cell">'+escapeHtml(validation)+'</code></td>'+
              '<td>'+escapeHtml(p.created_by||"—")+'<br><small>'+escapeHtml(p.created_at||"")+'</small></td>'+
              '<td><div class="release-row-actions">'+(actions.join("")||'<span class="muted">No action</span>')+'</div></td>'+
            '</tr>';
          }).join("")+
          '</tbody></table></div>'
        :'<div class="empty">No staged database changes.</div>');

    root.querySelectorAll("[data-db-proposal]").forEach(button=>button.addEventListener("click",async()=>{
      const id=button.dataset.id;
      const action=button.dataset.dbProposal;
      const row=rows.find(x=>x.id===id);
      if(!row)return;
      button.disabled=true;
      try{
        if(action==="update"){
          const raw=prompt("Patch JSON:",JSON.stringify(row.patch||{},null,2));
          if(raw===null){button.disabled=false;return;}
          let patch={};
          try{patch=JSON.parse(raw);}catch{alert("Patch must be valid JSON.");button.disabled=false;return;}
          const reason=prompt("Reason for updating/revalidating this proposal:",row.reason||"")||"";
          if(reason.trim().length<8){button.disabled=false;return;}
          await apiPost("/admin/api/database/proposals/"+id+"/update",{patch,reason});
        }else if(action==="apply"){
          const confirmation=prompt("Type exactly:\nAPPLY STAGED DATABASE CHANGE")||"";
          if(confirmation!=="APPLY STAGED DATABASE CHANGE"){button.disabled=false;return;}
          const reason=prompt("Approval reason (minimum 12 characters):")||"";
          if(reason.trim().length<12){button.disabled=false;return;}
          await apiPost("/admin/api/database/proposals/"+id+"/apply",{confirmation,reason});
        }else if(action==="reject"){
          const reason=prompt("Reason for rejecting this proposal:")||"";
          if(reason.trim().length<8){button.disabled=false;return;}
          await apiPost("/admin/api/database/proposals/"+id+"/reject",{reason});
        }
        await Promise.all([loadDatabase(),loadDatabaseSummary(),loadDatabaseProposals()]);
      }catch(error){alert(error.message);button.disabled=false;}
    }));
  }catch(error){
    root.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
  }
}


async function ensureArtAssetsManifest(){
  if(state.artAssetsManifest)return state.artAssetsManifest;
  state.artAssetsManifest=await api("/admin/api/art-assets");
  return state.artAssetsManifest;
}

function atlasGateClass(value){
  const gate=String(value||"HIDDEN").toUpperCase();
  if(["MASTERED","ANALYZED"].includes(gate))return "final";
  if(["DISCOVERED","ENCOUNTERED"].includes(gate))return "published";
  return "review";
}

function visualAssetPublicReady(asset){
  const approval=String(asset?.approval_status||"").toUpperCase();
  const cdn=String(asset?.cdn_status||"").toUpperCase();
  const visibility=String(asset?.public_visibility||"HIDDEN").toUpperCase();
  return ["APPROVED","WEB_EXPORTED","PUBLISHED"].includes(approval)
    && asset?.reader_safe===true
    && asset?.public_eligible===true
    && visibility!=="HIDDEN"
    && cdn!=="NOT_EXPORTED";
}

function renderGateSteps(atlas){
  const current=String(atlas?.current_gate||"HIDDEN").toUpperCase();
  const gates=Array.isArray(atlas?.gates)?atlas.gates:[];
  return '<div class="table-scroll"><table><thead><tr><th>Gate</th><th>Reader surface</th><th>Promotion evidence</th><th>Mode</th></tr></thead><tbody>'+
    gates.map(g=>
      '<tr>'+
        '<td><span class="status '+atlasGateClass(g.gate)+'">'+escapeHtml(g.gate)+'</span>'+(String(g.gate).toUpperCase()===current?'<br><small>CURRENT</small>':'')+'</td>'+
        '<td>'+escapeHtml(g.reader_surface||"—")+'</td>'+
        '<td class="meta-text">'+escapeHtml(g.promotion_evidence||"—")+'</td>'+
        '<td>'+escapeHtml(g.automatic?"evidence-driven":"explicit only")+'</td>'+
      '</tr>'
    ).join("")+
    '</tbody></table></div>';
}


function detailValue(value){
  if(value===undefined||value===null||value==="")return "—";
  if(typeof value==="boolean")return value?"YES":"NO";
  if(typeof value==="object")return JSON.stringify(value);
  return String(value);
}

function detailJson(label,value){
  if(value===undefined||value===null)return "";
  return '<div class="detail-json-card"><small>'+escapeHtml(label)+'</small><pre>'+escapeHtml(JSON.stringify(value,null,2))+'</pre></div>';
}

function detailCards(pairs){
  return '<div class="runtime">'+pairs.map(([label,value])=>
    '<div><small>'+escapeHtml(label)+'</small><strong>'+escapeHtml(detailValue(value))+'</strong></div>'
  ).join("")+'</div>';
}

function detailEmpty(message){
  return '<div class="empty">'+escapeHtml(message)+'</div>';
}

function dropRateText(value){
  if(value===undefined||value===null||value==="")return "—";
  const n=Number(value);
  if(!Number.isFinite(n))return String(value);
  return (n*100).toFixed(n<0.01?3:2)+"%";
}

function renderMonsterProtectedDetail(payload){
  const d=payload?.detail||{};
  const m=d.master||{};
  const counts=d.counts||{};
  const runtime=d.runtime_profiles||{};
  const derived=runtime.derived||{};
  const skills=Array.isArray(d.skills)?d.skills:[];
  const spawns=Array.isArray(d.spawns)?d.spawns:[];
  const loot=Array.isArray(d.loot)?d.loot:[];

  return '<div class="database-head"><span>Monster Detail</span><small>'+escapeHtml(payload?.contract_version||"")+'</small></div>'+
    '<div class="admin-note compact"><strong>Protected backend facts</strong><p>Exact combat values, spawn populations/timers, private skills and drop rates are Admin-only. They do not become reader-safe merely because they are visible here.</p></div>'+
    detailCards([
      ["Level",m.level_min===m.level_max?m.level_min:(detailValue(m.level_min)+"–"+detailValue(m.level_max))],
      ["Rank / Rarity",(m.rank||"—")+" / "+(m.rarity_class||"—")],
      ["Race",m.race_key],
      ["Species",m.species],
      ["Family",m.family],
      ["Property",m.property_key||m.element],
      ["HP / SP",detailValue(m.max_hp)+" / "+detailValue(m.max_sp)],
      ["ATK",m.attack_power],
      ["P.DEF / M.DEF",detailValue(m.physical_def)+" / "+detailValue(m.magic_def)],
      ["Base EXP",m.base_exp],
      ["Skills",counts.skills??skills.length],
      ["Spawn profiles",counts.spawn_profiles??spawns.length],
      ["Loot entries",counts.loot_entries??loot.length],
      ["Natural spawn",m.natural_spawn],
      ["Backend",m.backend_status]
    ])+
    '<div class="detail-subhead">Derived combat profile</div>'+
    (Object.keys(derived).length
      ?'<div class="table-scroll"><table><thead><tr><th>STR</th><th>AGI</th><th>VIT</th><th>FOC</th><th>INS</th><th>DEX</th><th>WIL</th><th>LUK</th><th>Accuracy</th><th>Evasion</th><th>Ranges</th><th>Speed / Delay</th></tr></thead><tbody><tr>'+
        '<td>'+escapeHtml(detailValue(derived.str_value))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.agi_value))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.vit_value))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.foc_value))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.ins_value))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.dex_value))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.wil_value))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.luk_value))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.accuracy))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.evasion))+'</td>'+
        '<td>'+escapeHtml("ATK "+detailValue(derived.attack_range_cells)+" · spell "+detailValue(derived.spell_range_cells)+" · sight "+detailValue(derived.sight_range_cells))+'</td>'+
        '<td>'+escapeHtml(detailValue(derived.move_speed_class)+" · "+detailValue(derived.attack_delay_ms)+" ms")+'</td>'+
        '</tr></tbody></table></div>'
      :detailEmpty("No derived combat profile registered."))+
    '<div class="detail-subhead">Skills</div>'+
    (skills.length
      ?'<div class="table-scroll"><table><thead><tr><th>Skill</th><th>Assignment</th><th>Rank</th><th>SP</th><th>Power</th><th>Cooldown</th><th>Visibility</th><th>Private description</th></tr></thead><tbody>'+
       skills.map(s=>{
         const a=s.assignment||{};
         return '<tr>'+
           '<td><strong>'+escapeHtml(s.skill_name||"—")+'</strong><br><code>'+escapeHtml(s.skill_code||"—")+'</code></td>'+
           '<td>'+escapeHtml(detailValue(a.assignment_kind))+'<br><small>'+escapeHtml(detailValue(a.slot_key))+'</small></td>'+
           '<td>'+escapeHtml(detailValue(a.rank_min))+'–'+escapeHtml(detailValue(a.rank_max??s.rank_max))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.sp_cost))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.power_coefficient))+'× + '+escapeHtml(detailValue(s.flat_power))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.cooldown_seconds))+'s</td>'+
           '<td>'+escapeHtml(detailValue(s.visibility))+'</td>'+
           '<td class="meta-text">'+escapeHtml(detailValue(s.description_private))+'</td>'+
         '</tr>';
       }).join("")+
       '</tbody></table></div>'
      :detailEmpty("No skill assignments registered."))+
    '<div class="detail-subhead">Spawn / ecology placement</div>'+
    (spawns.length
      ?'<div class="table-scroll"><table><thead><tr><th>Map</th><th>Class</th><th>Target population</th><th>Hard cap</th><th>Respawn</th><th>Pattern</th><th>Aggression</th><th>Active</th></tr></thead><tbody>'+
       spawns.map(x=>{
         const s=x.spawn||{};
         return '<tr>'+
           '<td><strong>'+escapeHtml(x.map_name||"—")+'</strong><br><code>'+escapeHtml(x.map_code||"—")+'</code><br><small>'+escapeHtml(x.zone_name||"No zone")+'</small></td>'+
           '<td>'+escapeHtml(detailValue(s.spawn_class))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.target_active_min))+'–'+escapeHtml(detailValue(s.target_active_max))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.hard_active_cap))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.respawn_min_seconds))+'–'+escapeHtml(detailValue(s.respawn_max_seconds))+'s</td>'+
           '<td>'+escapeHtml(detailValue(s.spawn_pattern))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.aggression_type))+'<br><small>radius '+escapeHtml(detailValue(s.aggro_radius))+'</small></td>'+
           '<td>'+escapeHtml(detailValue(s.is_active))+'</td>'+
         '</tr>';
       }).join("")+
       '</tbody></table></div>'
      :detailEmpty("No spawn profiles registered."))+
    '<div class="detail-subhead">Loot</div>'+
    (loot.length
      ?'<div class="table-scroll"><table><thead><tr><th>Item</th><th>Drop class</th><th>Qty</th><th>Exact rate</th><th>Item type</th><th>Conditions</th></tr></thead><tbody>'+
       loot.map(x=>
         '<tr>'+
           '<td><strong>'+escapeHtml(x.item_name||"—")+'</strong><br><code>'+escapeHtml(x.item_code||"—")+'</code></td>'+
           '<td>'+escapeHtml(detailValue(x.drop_class))+'</td>'+
           '<td>'+escapeHtml(detailValue(x.quantity_min))+'–'+escapeHtml(detailValue(x.quantity_max))+'</td>'+
           '<td>'+escapeHtml(dropRateText(x.drop_rate))+'</td>'+
           '<td>'+escapeHtml(detailValue(x.item_category))+' · '+escapeHtml(detailValue(x.item_subtype))+'<br><small>'+escapeHtml(detailValue(x.item_rarity))+'</small></td>'+
           '<td class="meta-text">'+escapeHtml(detailValue(x.conditions))+'</td>'+
         '</tr>'
       ).join("")+
       '</tbody></table></div>'
      :detailEmpty("No loot entries registered."))+
    '<div class="detail-subhead">Taxonomy & system profiles</div>'+
    '<div class="detail-json-grid">'+
      detailJson("Weaknesses",m.weaknesses)+
      detailJson("Resistances",m.resistances)+
      detailJson("Immunities",m.immunities)+
      detailJson("Behavior flags",m.behavior_flags)+
      detailJson("Race profile",d.taxonomy?.race)+
      detailJson("Property profile",d.taxonomy?.property)+
      detailJson("Rank profile",d.taxonomy?.rank)+
      detailJson("Cognition",runtime.cognition)+
      detailJson("Taming",runtime.taming)+
      detailJson("Spawn rarity",runtime.spawn_rarity)+
      detailJson("Identification visibility",runtime.identification)+
      detailJson("Loot table",d.loot_table)+
    '</div>';
}

function renderMapProtectedDetail(payload){
  const d=payload?.detail||{};
  const m=d.master||{};
  const e=d.ecology||{};
  const c=d.counts||{};
  const spawns=Array.isArray(d.spawns)?d.spawns:[];
  const routes=Array.isArray(d.routes)?d.routes:[];
  const zones=Array.isArray(d.zones)?d.zones:[];
  const landmarks=Array.isArray(d.landmarks)?d.landmarks:[];
  const npcs=Array.isArray(d.npcs)?d.npcs:[];
  const shops=Array.isArray(d.shops)?d.shops:[];

  return '<div class="database-head"><span>Map Detail</span><small>'+escapeHtml(payload?.contract_version||"")+'</small></div>'+
    '<div class="admin-note compact"><strong>Protected world structure</strong><p>Routes, ecology, spawn populations and hidden navigation facts are Admin-only until their separate reader-safe discovery/reveal gates allow them.</p></div>'+
    detailCards([
      ["Region",m.region],["Map type",m.map_type],
      ["Level range",detailValue(m.level_min)+"–"+detailValue(m.level_max)],
      ["Danger",m.danger_rating],["Scale",m.scale_class],
      ["Safe area",m.is_safe_area],["Instanced",m.is_instanced],
      ["Discovery",m.default_discovery_mode],
      ["Ecology",e.ecology_mode||"—"],
      ["Species",c.monster_species??0],["Spawn profiles",c.spawn_profiles??0],
      ["Routes",c.routes??0],["Zones",c.zones??0],["Landmarks",c.landmarks??0],
      ["NPCs",c.npcs??0],["Shops",c.shops??0]
    ])+
    '<div class="detail-subhead">Monster ecology / spawn registry</div>'+
    (spawns.length
      ?'<div class="table-scroll"><table><thead><tr><th>Monster</th><th>Rank / Level</th><th>Spawn class</th><th>Population</th><th>Respawn</th><th>Pattern</th><th>Aggression</th><th>Zone</th></tr></thead><tbody>'+
       spawns.map(x=>{
         const s=x.spawn||{};
         return '<tr>'+
           '<td><strong>'+escapeHtml(x.monster_name||"—")+'</strong><br><code>'+escapeHtml(x.monster_code||"—")+'</code></td>'+
           '<td>'+escapeHtml(detailValue(x.monster_rank))+'<br><small>'+escapeHtml(detailValue(x.monster_level_min))+'–'+escapeHtml(detailValue(x.monster_level_max))+' · '+escapeHtml(detailValue(x.monster_rarity))+'</small></td>'+
           '<td>'+escapeHtml(detailValue(s.spawn_class))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.target_active_min))+'–'+escapeHtml(detailValue(s.target_active_max))+' / cap '+escapeHtml(detailValue(s.hard_active_cap))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.respawn_min_seconds))+'–'+escapeHtml(detailValue(s.respawn_max_seconds))+'s</td>'+
           '<td>'+escapeHtml(detailValue(s.spawn_pattern))+'</td>'+
           '<td>'+escapeHtml(detailValue(s.aggression_type))+'</td>'+
           '<td>'+escapeHtml(x.zone_name||"—")+'</td>'+
         '</tr>';
       }).join("")+
       '</tbody></table></div>'
      :detailEmpty("No spawn profiles registered for this map."))+
    '<div class="detail-subhead">Routes</div>'+
    (routes.length
      ?'<div class="table-scroll"><table><thead><tr><th>Route</th><th>Origin → Destination</th><th>Direction</th><th>Distance / Time</th><th>Terrain</th><th>Danger</th><th>Encounter</th><th>Active</th></tr></thead><tbody>'+
       routes.map(x=>{
         const r=x.route||{};
         return '<tr>'+
           '<td><strong>'+escapeHtml(r.canonical_name||"—")+'</strong><br><code>'+escapeHtml(r.route_key||"—")+'</code></td>'+
           '<td>'+escapeHtml(x.origin_name||"—")+' → '+escapeHtml(x.destination_name||"—")+'</td>'+
           '<td>'+escapeHtml(detailValue(r.direction_label))+'</td>'+
           '<td>'+escapeHtml(detailValue(r.distance_units))+' · '+escapeHtml(detailValue(r.base_travel_seconds))+'s</td>'+
           '<td>'+escapeHtml(detailValue(r.terrain_type))+' / '+escapeHtml(detailValue(r.road_quality))+'</td>'+
           '<td>'+escapeHtml(detailValue(r.danger_rating))+'</td>'+
           '<td>'+escapeHtml(detailValue(r.encounter_policy))+'</td>'+
           '<td>'+escapeHtml(detailValue(r.is_active))+'</td>'+
         '</tr>';
       }).join("")+
       '</tbody></table></div>'
      :detailEmpty("No routes registered."))+
    '<div class="detail-subhead">Zones & landmarks</div>'+
    ((zones.length||landmarks.length)
      ?'<div class="detail-json-grid">'+
        detailJson("Zones",zones)+detailJson("Landmarks",landmarks)+
       '</div>'
      :detailEmpty("No zones or landmarks registered."))+
    '<div class="detail-subhead">NPCs & shops</div>'+
    ((npcs.length||shops.length)
      ?'<div class="detail-json-grid">'+detailJson("NPCs",npcs)+detailJson("Shops",shops)+'</div>'
      :detailEmpty("No normalized NPC or shop rows registered."))+
    '<div class="detail-subhead">World policy</div>'+
    '<div class="detail-json-grid">'+
      detailJson("Ecology policy",e)+
      detailJson("Terrain profile",m.terrain_profile)+
      detailJson("Entry requirements",m.entry_requirements)+
      detailJson("Travel notes",m.travel_notes)+
      detailJson("Legacy connections",m.connections)+
      detailJson("Legacy resources",m.resources)+
    '</div>';
}

function renderItemProtectedDetail(payload){
  const d=payload?.detail||{};
  const m=d.master||{};
  const c=d.counts||{};
  const eq=d.equipment||{};
  const life=d.lifecycle||{};
  const drops=Array.isArray(d.drop_sources)?d.drop_sources:[];
  const shops=Array.isArray(d.shops)?d.shops:[];
  const overrides=Array.isArray(d.vendor_overrides)?d.vendor_overrides:[];
  const distribution=Array.isArray(d.world_distribution)?d.world_distribution:[];

  const equipmentProfile=eq.weapon||eq.armor||eq.accessory||null;
  const equipmentKind=eq.weapon?"Weapon":(eq.armor?"Armor":(eq.accessory?"Accessory":"General item"));

  return '<div class="database-head"><span>Item Detail</span><small>'+escapeHtml(payload?.contract_version||"")+'</small></div>'+
    '<div class="admin-note compact"><strong>Protected economy / equipment facts</strong><p>Exact drop rates, hidden shop inventory, requirements, enhancement rules and identification masks remain Admin-only unless separately revealed.</p></div>'+
    detailCards([
      ["Category",m.category],["Subtype",m.subtype],["Rarity",m.rarity],
      ["Weight",m.weight],["Stack",m.stack_limit],
      ["Equipment kind",equipmentKind],
      ["Tradable",m.tradable],["Auctionable",m.auctionable],
      ["Vendor sellable",m.vendor_sellable],["Craftable",m.craftable],
      ["Consumable",m.consumable],["Repairable",m.repairable],
      ["Quest bound",m.quest_bound],["Durability",m.base_durability],
      ["Drop sources",c.drop_sources??drops.length],["Shop listings",c.shop_listings??shops.length],
      ["Backend",m.backend_status]
    ])+
    '<div class="detail-subhead">Equipment / use profile</div>'+
    '<div class="detail-json-grid">'+
      detailJson(equipmentKind+" profile",equipmentProfile)+
      detailJson("Use profile",eq.use_profile)+
    '</div>'+
    '<div class="detail-subhead">Identification, enhancement & sockets</div>'+
    '<div class="detail-json-grid">'+
      detailJson("Identification",life.identification)+
      detailJson("Enhancement",life.enhancement)+
      detailJson("Sockets",life.sockets)+
    '</div>'+
    '<div class="detail-subhead">Drop sources</div>'+
    (drops.length
      ?'<div class="table-scroll"><table><thead><tr><th>Source</th><th>Type</th><th>Drop class</th><th>Qty</th><th>Exact rate</th><th>Conditions</th></tr></thead><tbody>'+
       drops.map(x=>
         '<tr>'+
           '<td><strong>'+escapeHtml(x.source_name||"—")+'</strong><br><code>'+escapeHtml(x.source_code||"—")+'</code></td>'+
           '<td>'+escapeHtml(detailValue(x.source_type))+'</td>'+
           '<td>'+escapeHtml(detailValue(x.drop_class))+'</td>'+
           '<td>'+escapeHtml(detailValue(x.quantity_min))+'–'+escapeHtml(detailValue(x.quantity_max))+'</td>'+
           '<td>'+escapeHtml(dropRateText(x.drop_rate))+'</td>'+
           '<td class="meta-text">'+escapeHtml(detailValue(x.conditions))+'</td>'+
         '</tr>'
       ).join("")+
       '</tbody></table></div>'
      :detailEmpty("No loot-source rows registered."))+
    '<div class="detail-subhead">Shop / vendor availability</div>'+
    ((shops.length||overrides.length)
      ?'<div class="detail-json-grid">'+detailJson("Shop inventory",shops)+detailJson("Vendor overrides",overrides)+'</div>'
      :detailEmpty("No shop inventory or vendor override rows registered."))+
    '<div class="detail-subhead">World distribution</div>'+
    ((distribution.length||d.world_presence)
      ?'<div class="detail-json-grid">'+detailJson("Map distribution",distribution)+detailJson("World presence",d.world_presence)+'</div>'
      :detailEmpty("No equipment distribution rows registered."))+
    '<div class="detail-subhead">Private description</div>'+
    '<div class="detail-copy">'+escapeHtml(m.description_private||"—")+'</div>';
}

function renderProtectedEntityDetail(domain,payload,error){
  if(error)return '<div class="database-head"><span>Expanded Detail</span><small>protected</small></div><div class="error">'+escapeHtml(error)+'</div>';
  if(!payload)return "";
  if(domain==="monsters")return renderMonsterProtectedDetail(payload);
  if(domain==="maps")return renderMapProtectedDetail(payload);
  if(domain==="items")return renderItemProtectedDetail(payload);
  return "";
}

async function renderDatabaseStaging(domain,record){
  state.activeDatabaseRecord={domain,record};
  const root=$("#database-staging");
  const allowed=state.databaseAllowedFields?.[domain]||[];

  if(record?._readOnly){
    root.innerHTML=
      '<div class="database-head"><span>Protected Design Registry · '+escapeHtml(record.name||record.code||domain)+'</span><small>READ-ONLY · '+escapeHtml(record._layer||"EXPANDED_DESIGN_REGISTRY")+'</small></div>'+
      '<div class="admin-note compact"><strong>Dormant/design data does not equal runtime or public canon.</strong><p>This expanded record is exposed to Admin for database alignment only. This screen cannot stage edits, activate runtime behavior, change story production, or publish the record to readers.</p></div>'+
      '<div class="runtime">'+
        '<div><small>Domain</small><strong>'+escapeHtml(domain)+'</strong></div>'+
        '<div><small>Status</small><strong>'+escapeHtml(record.status||"—")+'</strong></div>'+
        '<div><small>Code / key</small><strong><code>'+escapeHtml(record.code||"—")+'</code></strong></div>'+
        '<div><small>Runtime</small><strong>'+escapeHtml(record.meta?.runtime_enabled===true||record.meta?.runtime_authorized===true?"AUTHORIZED / ENABLED":"NOT AUTHORIZED")+'</strong></div>'+
      '</div>'+
      '<div class="db-stage-body"><div><small>Curated protected metadata</small><pre class="db-json-preview">'+escapeHtml(JSON.stringify(record.meta||{},null,2))+'</pre></div></div>';
    return;
  }

  root.innerHTML='<div class="empty">Loading protected detail, Atlas gates and Visual Status…</div>';

  let atlas=null;
  let manifest=null;
  let protectedDetail=null;
  let atlasError="";
  let artError="";
  let protectedDetailError="";
  const entityBacked=!["loot","crafting"].includes(domain);
  if(["monsters","maps","items"].includes(domain)){
    try{protectedDetail=await api("/admin/api/database/detail/"+encodeURIComponent(domain)+"/"+encodeURIComponent(record.id));}
    catch(error){protectedDetailError=error.message;}
  }
  if(entityBacked){
    try{atlas=await api("/admin/api/atlas-gates/"+encodeURIComponent(record.id));}
    catch(error){atlasError=error.message;}
  }else{
    atlasError="Atlas gate is not applicable to this non-entity database domain.";
  }
  try{manifest=await ensureArtAssetsManifest();}
  catch(error){artError=error.message;}

  const protectedPanel=renderProtectedEntityDetail(domain,protectedDetail,protectedDetailError);
  const assets=(manifest?.items||[]).filter(x=>String(x.supabase_entity_id||"")===String(record.id||""));
  const publicReadyAssets=assets.filter(visualAssetPublicReady);
  const firstPlan=atlas?.active_reveal_plan||atlas?.latest_approved_reveal_plan||null;
  const fields=atlas?.reader_fields||{};
  const projection=atlas?.projection||{};

  const atlasPanel=atlasError
    ?'<div class="error">'+escapeHtml(atlasError)+'</div>'
    :'<div class="database-head"><span>Reader-safe Atlas Gate</span><small>'+escapeHtml(atlas?.contract_version||"")+'</small></div>'+
      '<div class="runtime">'+
        '<div><small>Current gate</small><strong><span class="status '+atlasGateClass(atlas?.current_gate)+'">'+escapeHtml(atlas?.current_gate||"HIDDEN")+'</span></strong></div>'+
        '<div><small>Projection gate</small><strong>'+escapeHtml(atlas?.projection_gate||"HIDDEN")+'</strong></div>'+
        '<div><small>Website status</small><strong>'+escapeHtml(projection.website_status||"NOT_REGISTERED")+'</strong></div>'+
        '<div><small>FIRST_PUBLIC executed</small><strong>'+escapeHtml(atlas?.first_public_executed?"YES":"NO")+'</strong></div>'+
        '<div><small>Reveal plan</small><strong>'+escapeHtml(firstPlan?((firstPlan.roadmap_status||"—")+" · "+(firstPlan.part_key||"—")):"NONE")+'</strong></div>'+
        '<div><small>Executed reveal fields</small><strong>'+escapeHtml((fields.executed_revealed_fields||[]).length)+'</strong></div>'+
      '</div>'+
      '<div class="admin-note compact"><strong>Reader-safe rule</strong><p>Fail closed. Art, backend completeness, private roadmap presence and monster roster registration never promote the Atlas gate. Hidden-field denylist remains binding even at MASTERED.</p></div>'+
      '<div class="db-stage-body">'+
        '<div><small>Projection-safe fields</small><p class="db-allowed-fields">'+escapeHtml((fields.projection_safe_fields||[]).join(", ")||"None registered")+'</p></div>'+
        '<div><small>Hidden fields</small><p class="db-allowed-fields">'+escapeHtml((fields.hidden_fields||[]).join(", ")||"None registered")+'</p></div>'+
      '</div>'+
      renderGateSteps(atlas);

  const artPanel=artError
    ?'<div class="error">'+escapeHtml(artError)+'</div>'
    :'<div class="database-head"><span>Visual Status</span><small>'+escapeHtml(assets.length)+' linked asset(s) by Supabase entity UUID</small></div>'+
      '<div class="runtime">'+
        '<div><small>Manifest assets</small><strong>'+escapeHtml(assets.length)+'</strong></div>'+
        '<div><small>Public-ready visuals</small><strong>'+escapeHtml(publicReadyAssets.length)+'</strong></div>'+
        '<div><small>Link key</small><strong><code>'+escapeHtml(record.id||"—")+'</code></strong></div>'+
      '</div>'+
      (assets.length
        ?'<div class="table-scroll"><table><thead><tr><th>Asset</th><th>Approval</th><th>Review</th><th>Web/CDN</th><th>Visibility</th><th>Reader gate</th><th>Drive</th></tr></thead><tbody>'+
          assets.map(a=>
            '<tr>'+
              '<td><strong>'+escapeHtml(a.display_name||"—")+'</strong><br><code>'+escapeHtml(a.asset_id||"—")+'</code><br><small>'+escapeHtml((a.asset_role||"—")+" · "+(a.variant_key||"—"))+'</small></td>'+
              '<td><span class="status '+artAssetStatusClass(a.approval_status)+'">'+escapeHtml(a.approval_status||"—")+'</span></td>'+
              '<td>'+escapeHtml(a.review_status||"NOT_REVIEWED")+'</td>'+
              '<td>'+escapeHtml(a.cdn_status||"—")+'<br><small>'+escapeHtml(a.web_path||"No web export")+'</small></td>'+
              '<td>'+escapeHtml(a.public_visibility||"HIDDEN")+'</td>'+
              '<td>'+escapeHtml(visualAssetPublicReady(a)?"PUBLIC-READY":"BLOCKED")+'<br><small>safe '+escapeHtml(a.reader_safe?"YES":"NO")+' · eligible '+escapeHtml(a.public_eligible?"YES":"NO")+'</small></td>'+
              '<td><code>'+escapeHtml(a.drive_file_id||a.master_drive_file_id||a.drive_folder_id||"—")+'</code></td>'+
            '</tr>'
          ).join("")+
          '</tbody></table></div>'
        :'<div class="empty">No art asset is linked to this entity UUID. This does not affect canon or Atlas visibility.</div>');

  root.innerHTML=
    '<div class="database-head"><span>Entity Detail · '+escapeHtml(record.name||record.code)+'</span><small>'+escapeHtml(domain)+' · '+escapeHtml(record.code)+'</small></div>'+
    '<div class="db-stage-body">'+
      '<div class="admin-note compact"><strong>Protected detail</strong><p>Read-only identity, reader-safe Atlas state and Visual Status are linked by the authoritative Supabase entity UUID. No detail shown here can publish the entity.</p></div>'+
      '<div><small>Current database snapshot</small><pre class="db-json-preview">'+escapeHtml(JSON.stringify({id:record.id,code:record.code,name:record.name,status:record.status,meta:record.meta},null,2))+'</pre></div>'+
    '</div>'+
    (protectedPanel?'<div class="db-detail-section">'+protectedPanel+'</div>':'')+
    '<div class="db-detail-section">'+atlasPanel+'</div>'+
    '<div class="db-detail-section">'+artPanel+'</div>'+
    '<div class="db-stage-body">'+
      '<div><small>Allowed staged-edit fields</small><p class="db-allowed-fields">'+escapeHtml(allowed.join(", ")||"Loading allowlist…")+'</p></div>'+
      (hasPermission("DATABASE_EDIT")
        ?'<form id="database-proposal-form" class="admin-control-form">'+
           '<strong>Create staged patch</strong>'+
           '<textarea name="patch" rows="7">{}</textarea>'+
           '<input name="reason" placeholder="Why this canonical database change is needed" required>'+
           '<button type="submit">Validate & Stage Proposal</button>'+
         '</form>'
        :'<div class="empty">DATABASE_EDIT is required to stage changes. Detail, Atlas and Visual Status remain view-only.</div>')+
    '</div>';

  const form=$("#database-proposal-form");
  if(form)form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const fd=new FormData(form);
    let patch={};
    try{patch=JSON.parse(String(fd.get("patch")||"{}"));}catch{alert("Patch must be valid JSON.");return;}
    const reason=String(fd.get("reason")||"");
    if(reason.trim().length<8)return;
    const button=form.querySelector("button");
    button.disabled=true;
    try{
      const result=await apiPost("/admin/api/database/proposals",{
        domain,target_code:String(record.code||""),patch,reason
      });
      alert("Proposal "+result.status+"\n"+result.proposal_id);
      state.activeDatabaseRecord=null;
      $("#database-staging").innerHTML='<div class="empty">Proposal staged. Select another database record to open its detail.</div>';
      await loadDatabaseProposals();
    }catch(error){alert(error.message);}
    finally{button.disabled=false;}
  });
}



function artAssetStatusClass(value){
  if(["APPROVED","WEB_EXPORTED","PUBLISHED"].includes(String(value||"").toUpperCase()))return "final";
  return "review";
}

function renderArtAssets(){
  const root=$("#art-assets-table");
  const summary=$("#art-assets-summary");
  const manifest=state.artAssetsManifest;
  if(!manifest){
    summary.innerHTML="";
    root.innerHTML='<div class="empty">No art manifest snapshot loaded.</div>';
    return;
  }

  const type=String($("#art-assets-type")?.value||"").trim().toUpperCase();
  const status=String($("#art-assets-status")?.value||"").trim().toUpperCase();
  const query=String($("#art-assets-search")?.value||"").trim().toLowerCase();
  const all=Array.isArray(manifest.items)?manifest.items:[];
  const rows=all.filter(x=>{
    if(type&&String(x.entity_type||"").toUpperCase()!==type)return false;
    if(status&&String(x.approval_status||"").toUpperCase()!==status)return false;
    if(query){
      const hay=[
        x.asset_id,x.entity_type,x.entity_key,x.display_name,x.supabase_entity_id,
        x.supabase_entity_table,x.approval_status,x.review_status,x.cdn_status
      ].join(" ").toLowerCase();
      if(!hay.includes(query))return false;
    }
    return true;
  });

  const visible=all.filter(x=>x.public_visibility&&x.public_visibility!=="HIDDEN").length;
  const safe=all.filter(x=>x.reader_safe===true).length;
  const exported=all.filter(x=>x.cdn_status&&x.cdn_status!=="NOT_EXPORTED").length;
  const approved=all.filter(x=>["APPROVED","WEB_EXPORTED","PUBLISHED"].includes(String(x.approval_status||"").toUpperCase())).length;
  summary.innerHTML=
    '<div class="card"><span>Manifest assets</span><strong>'+escapeHtml(all.length)+'</strong></div>'+
    '<div class="card"><span>Approved+</span><strong>'+escapeHtml(approved)+'</strong></div>'+
    '<div class="card"><span>Web exported</span><strong>'+escapeHtml(exported)+'</strong></div>'+
    '<div class="card"><span>Reader-safe</span><strong>'+escapeHtml(safe)+'</strong></div>'+
    '<div class="card"><span>Public-visible</span><strong>'+escapeHtml(visible)+'</strong></div>'+
    '<div class="card"><span>Filtered</span><strong>'+escapeHtml(rows.length)+'</strong></div>';

  const source=manifest.source||{};
  const safety=manifest.safety||{};
  root.innerHTML=
    '<div class="database-head"><span>Visual Asset Register</span><small>'+escapeHtml(source.manifest_title||"GENESIS Art Manifest")+' · '+escapeHtml(rows.length)+' shown</small></div>'+
    '<div class="admin-note compact"><strong>Fail-closed publication rule</strong><p>'+
      escapeHtml(safety.public_visibility_rule||"Artwork existence never grants reader visibility.")+
      ' Source modified: '+escapeHtml(source.source_modified_at||"—")+
    '</p></div>'+
    (rows.length
      ?'<div class="table-scroll"><table><thead><tr>'+
        '<th>Asset / Entity</th><th>Art status</th><th>Master</th><th>Review</th><th>Web export</th><th>Visibility</th><th>Authoritative link</th><th>Drive source</th><th>History</th>'+
        '</tr></thead><tbody>'+
        rows.map(x=>{
          const driveRef=x.drive_file_id||x.master_drive_file_id||x.drive_folder_id||"—";
          const lastReview=x.reviewed_at
            ?String(x.reviewed_at)+(x.reviewer?" · "+x.reviewer:"")
            :(x.review_status||"NOT_REVIEWED");
          const history=[
            x.replaces_asset_id?"replaces "+x.replaces_asset_id:"",
            x.replaced_by_asset_id?"replaced by "+x.replaced_by_asset_id:"",
            x.retired_at?"retired "+x.retired_at:""
          ].filter(Boolean).join(" · ")||"—";
          const route=x.profile_route||x.atlas_route||x.item_route||"";
          return '<tr>'+
            '<td><strong>'+escapeHtml(x.display_name||"—")+'</strong><br><code>'+escapeHtml(x.asset_id||"—")+'</code><br><small>'+escapeHtml(x.entity_key||"—")+'</small></td>'+
            '<td><span class="status '+artAssetStatusClass(x.approval_status)+'">'+escapeHtml(x.approval_status||"—")+'</span><br><small>'+escapeHtml(x.asset_role||"—")+' · '+escapeHtml(x.variant_key||"—")+'</small></td>'+
            '<td>'+escapeHtml(x.version||"—")+'<br><small>'+escapeHtml(x.final_approver||"No final approver")+'</small></td>'+
            '<td>'+escapeHtml(lastReview)+'</td>'+
            '<td>'+escapeHtml(x.cdn_status||"—")+'<br><small>'+escapeHtml(x.web_path||"No web path")+'</small></td>'+
            '<td>'+escapeHtml(x.public_visibility||"—")+'<br><small>reader-safe: '+escapeHtml(x.reader_safe?"YES":"NO")+' · eligible: '+escapeHtml(x.public_eligible?"YES":"NO")+'</small></td>'+
            '<td><code>'+escapeHtml(x.supabase_entity_table||"—")+'</code><br><small>'+escapeHtml(x.supabase_entity_id||"—")+'</small>'+(route?'<br><small>'+escapeHtml(route)+'</small>':'')+'</td>'+
            '<td><code>'+escapeHtml(driveRef)+'</code></td>'+
            '<td>'+escapeHtml(history)+'</td>'+
          '</tr>';
        }).join("")+
        '</tbody></table></div>'
      :'<div class="empty">No art assets match this filter.</div>');
}

async function loadArtAssets(){
  const root=$("#art-assets-table");
  const summary=$("#art-assets-summary");
  root.innerHTML='<div class="empty">Loading protected art manifest snapshot…</div>';
  summary.innerHTML='<div class="card"><span>Art manifest</span><strong>Loading…</strong></div>';
  try{
    await ensureArtAssetsManifest();
    renderArtAssets();
  }catch(error){
    state.artAssetsManifest=null;
    summary.innerHTML="";
    root.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
  }
}

function adminBadge(badge){
  if(!badge)return "";
  return '<span class="status '+(badge==="VIP"?"final":"review")+'">'+escapeHtml(badge)+'</span>';
}


async function loadCodex(){
  const summary=$("#codex-summary");
  const create=$("#codex-create");
  const root=$("#codex-reveals");
  summary.innerHTML='<div class="card"><span>Codex reveals</span><strong>Loading…</strong></div>';
  create.innerHTML='<div class="empty">Loading reveal editor…</div>';
  root.innerHTML='<div class="empty">Loading reveal plans…</div>';
  try{
    const d=await api("/admin/api/codex/reveals?limit=200");
    const items=d.items||[];
    const counts={};
    for(const x of items)counts[x.status]=(counts[x.status]||0)+1;
    summary.innerHTML=
      '<div class="card"><span>Total plans</span><strong>'+escapeHtml(d.total??items.length)+'</strong></div>'+
      '<div class="card"><span>Approved</span><strong>'+escapeHtml(counts.APPROVED??0)+'</strong></div>'+
      '<div class="card"><span>Draft</span><strong>'+escapeHtml(counts.DRAFT??0)+'</strong></div>'+
      '<div class="card"><span>Retired</span><strong>'+escapeHtml(counts.RETIRED??0)+'</strong></div>';

    if(hasPermission("CODEX_EDIT")){
      create.innerHTML=
        '<div class="database-head"><span>Create reveal draft</span><small>No direct public DB write</small></div>'+
        '<form id="codex-create-form" class="codex-form">'+
          '<input name="entity_code" placeholder="Entity code, e.g. MON-000001" required>'+
          '<input name="part_key" placeholder="Part key, e.g. E003-P04" required>'+
          '<select name="reveal_kind"><option value="FIRST_PUBLIC">FIRST_PUBLIC</option><option value="EXPAND_FIELDS">EXPAND_FIELDS</option></select>'+
          '<textarea name="public_fields" rows="4" placeholder=\'JSON public fields, e.g. {"rank":"Common"}\'>{}</textarea>'+
          '<input name="notes" placeholder="Notes">'+
          '<input name="reason" placeholder="Change reason" required>'+
          '<button type="submit">Create Draft</button>'+
        '</form>'+
        '<p class="muted codex-allowlist">Allowed public field keys: '+escapeHtml((d.allowed_public_fields||[]).join(", "))+'</p>';
      $("#codex-create-form").addEventListener("submit",async(e)=>{
        e.preventDefault();
        const form=e.currentTarget;
        const fd=new FormData(form);
        let public_fields={};
        try{public_fields=JSON.parse(String(fd.get("public_fields")||"{}"));}catch{alert("public_fields must be valid JSON.");return;}
        const button=form.querySelector("button");
        button.disabled=true;
        try{
          await apiPost("/admin/api/codex/reveals",{
            entity_code:String(fd.get("entity_code")||""),
            part_key:String(fd.get("part_key")||""),
            reveal_kind:String(fd.get("reveal_kind")||""),
            public_fields,
            notes:String(fd.get("notes")||""),
            reason:String(fd.get("reason")||"")
          });
          form.reset();
          form.querySelector("[name=public_fields]").value="{}";
          await loadCodex();
        }catch(error){alert(error.message);}
        finally{button.disabled=false;}
      });
    }else{
      create.innerHTML='<div class="empty">CODEX_EDIT is required to create reveal drafts.</div>';
    }

    root.innerHTML=
      '<div class="database-head"><span>Reveal Plans</span><small>'+escapeHtml(items.length)+' shown</small></div>'+
      (items.length
        ?'<div class="table-scroll"><table><thead><tr><th>Entity</th><th>Part</th><th>Kind</th><th>Status</th><th>Public fields</th><th>First-use evidence</th><th>Actions</th></tr></thead><tbody>'+
          items.map(x=>{
            const first=x.first_use||{};
            const actions=[];
            if(x.status==="DRAFT"&&hasPermission("CODEX_EDIT"))actions.push('<button data-codex="update" data-id="'+escapeHtml(x.id)+'">Edit</button>');
            if(x.status==="DRAFT"&&hasPermission("CODEX_APPROVE"))actions.push('<button data-codex="approve" data-id="'+escapeHtml(x.id)+'">Approve</button>');
            if(["DRAFT","APPROVED"].includes(x.status)&&hasPermission("CODEX_APPROVE")&&!x.executed)actions.push('<button data-codex="retire" data-id="'+escapeHtml(x.id)+'" class="danger-mini">Retire</button>');
            return '<tr>'+
              '<td><strong>'+escapeHtml(x.public_name||x.canonical_name||"—")+'</strong><br><code>'+escapeHtml(x.entity_code||"—")+'</code></td>'+
              '<td><code>'+escapeHtml(x.part_key||"—")+'</code><br><small>'+escapeHtml(x.part_title||"")+'</small></td>'+
              '<td>'+escapeHtml(x.reveal_kind||"—")+'</td>'+
              '<td><span class="status '+(x.status==="APPROVED"?"final":"review")+'">'+escapeHtml(x.status||"—")+'</span>'+(x.executed?'<br><small>EXECUTED</small>':'')+'</td>'+
              '<td><code class="json-cell">'+escapeHtml(JSON.stringify(x.public_fields||{}))+'</code></td>'+
              '<td>'+escapeHtml((first.reveal_mode||"—")+" · "+(first.kind||"—"))+'<br><small>'+escapeHtml(first.part_key||"")+'</small></td>'+
              '<td><div class="release-row-actions">'+(actions.join("")||'<span class="muted">No action</span>')+'</div></td>'+
              '</tr>';
          }).join("")+
          '</tbody></table></div>'
        :'<div class="empty">No reveal plans.</div>');

    root.querySelectorAll("[data-codex]").forEach(button=>button.addEventListener("click",async()=>{
      const id=button.dataset.id;
      const action=button.dataset.codex;
      let payload={};
      if(action==="update"){
        const row=items.find(x=>x.id===id);
        const raw=prompt("Public fields JSON:",JSON.stringify(row?.public_fields||{}));
        if(raw===null)return;
        let public_fields={};
        try{public_fields=JSON.parse(raw);}catch{alert("Invalid JSON.");return;}
        const notes=prompt("Notes:",row?.notes||"")??row?.notes??"";
        const reason=prompt("Reason for editing this reveal draft:")||"";
        if(reason.trim().length<6)return;
        payload={public_fields,notes,reason};
      }else{
        const reason=prompt("Reason to "+action+" this reveal plan:")||"";
        if(reason.trim().length<8)return;
        payload={reason};
      }
      button.disabled=true;
      try{await apiPost("/admin/api/codex/reveals/"+id+"/"+action,payload);await loadCodex();}
      catch(error){alert(error.message);button.disabled=false;}
    }));
  }catch(error){
    summary.innerHTML="";
    create.innerHTML="";
    root.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
  }
}

async function loadSupport(){
  const root=$("#support-summary");
  root.innerHTML='<div class="card"><span>Support</span><strong>Loading…</strong></div>';
  try{
    const d=await api("/admin/api/support/summary");
    const rows=[
      ["Payments",d.payments_enabled?"ENABLED":"OFF"],
      ["Pure support",d.pure_support_enabled?"ENABLED":"OFF"],
      ["Share rewards",d.share_rewards_enabled?"ENABLED":"OFF"],
      ["Fan posting",d.fan_posting_enabled?"ENABLED":"OFF"],
      ["Open messages",d.open_messages??0],
      ["Pending shares",d.pending_share_claims??0],
      ["Pending fan posts",d.pending_fan_posts??0],
      ["Active VIPs",d.active_vips??0]
    ];
    root.innerHTML=rows.map(([k,v])=>'<div class="card"><span>'+escapeHtml(k)+'</span><strong>'+escapeHtml(v)+'</strong></div>').join("");
  }catch(error){
    root.innerHTML='<div class="panel"><div class="error">'+escapeHtml(error.message)+'</div></div>';
  }
}

async function loadMessages(){
  const root=$("#message-inbox");
  root.innerHTML='<div class="panel"><div class="empty">Loading reader messages…</div></div>';
  try{
    const rows=await api("/admin/api/messages");
    if(!Array.isArray(rows)||!rows.length){
      root.innerHTML='<div class="panel"><div class="empty"><strong>No reader messages yet.</strong><br>Support → Contact Us conversations will appear here.</div></div>';
      return;
    }
    root.innerHTML=rows.map(x=>
      '<details class="message-thread" '+((x.unread_count||0)>0?'open':'')+'>'+
        '<summary><span><strong>'+escapeHtml(x.subject||"No subject")+'</strong><small>'+escapeHtml(x.display_name||"Reader")+' '+adminBadge(x.badge)+'</small></span><span>'+escapeHtml(x.unread_count||0)+' unread</span></summary>'+
        '<div class="message-transcript">'+(x.messages||[]).map(m=>
          '<article class="message-bubble '+(m.sender_type==="ADMIN"?"admin":"reader")+'"><div><strong>'+escapeHtml(m.sender_label||m.sender_type)+'</strong><small>'+escapeHtml(m.created_at||"")+'</small></div><p>'+escapeHtml(m.body||"")+'</p></article>'
        ).join("")+
        '<form class="admin-reply-form" data-conversation="'+escapeHtml(x.conversation_id)+'">'+
          '<textarea rows="3" maxlength="5000" placeholder="Reply to this reader…" required></textarea>'+
          '<button type="submit">Send reply</button>'+
          '<span class="reply-status"></span>'+
        '</form>'+
        '</div></details>'
    ).join("");
    root.querySelectorAll(".admin-reply-form").forEach(form=>form.addEventListener("submit",(e)=>{
      e.preventDefault();
      sendAdminReply(form);
    }));
  }catch(error){
    root.innerHTML='<div class="panel"><div class="error">'+escapeHtml(error.message)+'</div></div>';
  }
}

async function sendAdminReply(form){
  const conversation=form.dataset.conversation;
  const textarea=form.querySelector("textarea");
  const button=form.querySelector("button");
  const status=form.querySelector(".reply-status");
  const body=textarea.value.trim();
  if(!body)return;
  button.disabled=true;
  status.textContent="Sending…";
  try{
    await apiPost("/admin/api/messages/"+conversation+"/reply",{body});
    textarea.value="";
    status.textContent="Reply sent.";
    await loadMessages();
  }catch(error){
    status.textContent=error.message;
  }finally{
    button.disabled=false;
  }
}


async function loadReaders(){
  const summary=$("#readers-summary");
  const list=$("#readers-list");
  const detail=$("#reader-detail");
  summary.innerHTML='<div class="card"><span>Readers</span><strong>Loading…</strong></div>';
  list.innerHTML='<div class="empty">Loading reader accounts…</div>';
  if(!state.activeReader)detail.innerHTML='<div class="empty">Select a reader to inspect progress and access.</div>';
  const q=($("#reader-search")?.value||"").trim();
  try{
    const params=new URLSearchParams({limit:"200"});
    if(q)params.set("q",q);
    const d=await api("/admin/api/readers?"+params.toString());
    const readers=d.readers||[];
    state.readerEligibleParts=d.eligible_advance_parts||[];
    const suspended=readers.filter(r=>r.comments_suspended).length;
    const vip=readers.filter(r=>r.active_vip).length;
    const supporters=readers.filter(r=>Number(r.confirmed_support_php||0)>0).length;
    summary.innerHTML=
      '<div class="card"><span>Total readers</span><strong>'+escapeHtml(d.total??readers.length)+'</strong></div>'+
      '<div class="card"><span>Comment suspended</span><strong>'+escapeHtml(suspended)+'</strong></div>'+
      '<div class="card"><span>Active VIP</span><strong>'+escapeHtml(vip)+'</strong></div>'+
      '<div class="card"><span>Confirmed supporters</span><strong>'+escapeHtml(supporters)+'</strong></div>';

    list.innerHTML=
      '<div class="database-head"><span>Reader Accounts</span><small>'+escapeHtml(readers.length)+' shown</small></div>'+
      (readers.length?readers.map(r=>
        '<button class="reader-row '+(state.activeReader===r.user_id?"active":"")+'" data-reader-id="'+escapeHtml(r.user_id)+'">'+
          '<div><strong>'+escapeHtml(r.display_name||"Reader")+'</strong><small>'+escapeHtml(r.email||"")+'</small></div>'+
          '<div class="reader-row-meta">'+
            (r.badge?'<span class="status final">'+escapeHtml(r.badge)+'</span>':'')+
            (r.comments_suspended?'<span class="status review">COMMENTS SUSPENDED</span>':'')+
            '<span>Ep '+escapeHtml(r.highest_episode_read??0)+'</span>'+
          '</div>'+
        '</button>'
      ).join(""):'<div class="empty">No reader accounts match this search.</div>');

    list.querySelectorAll("[data-reader-id]").forEach(button=>button.addEventListener("click",async()=>{
      state.activeReader=button.dataset.readerId;
      await loadReaderDetail(state.activeReader);
      list.querySelectorAll(".reader-row").forEach(x=>x.classList.toggle("active",x.dataset.readerId===state.activeReader));
    }));

    if(state.activeReader){
      const stillVisible=readers.some(r=>r.user_id===state.activeReader);
      if(stillVisible)await loadReaderDetail(state.activeReader);
      else{state.activeReader=null;detail.innerHTML='<div class="empty">Select a reader to inspect progress and access.</div>';}
    }
  }catch(error){
    summary.innerHTML="";
    list.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
  }
}

async function loadReaderDetail(userId){
  const root=$("#reader-detail");
  root.innerHTML='<div class="empty">Loading reader detail…</div>';
  try{
    const d=await api("/admin/api/readers/"+userId);
    const u=d.user||{};
    const m=d.moderation||{};
    const grants=d.advance_grants||[];
    const progress=d.recent_progress||[];
    const support=d.support_summary||{};
    const activeAdminGrants=grants.filter(g=>g.source_type==="ADMIN"&&!g.revoked_at);

    root.innerHTML=
      '<div class="database-head"><span>'+escapeHtml(u.display_name||"Reader")+'</span><small>'+escapeHtml(u.email||"")+'</small></div>'+
      '<div class="reader-detail-body">'+
        '<div class="runtime">'+
          '<div><small>Highest Episode</small><strong>'+escapeHtml(u.highest_episode_read??0)+'</strong></div>'+
          '<div><small>Highest Part</small><strong>'+escapeHtml(u.highest_part_key||"—")+'</strong></div>'+
          '<div><small>Badge</small><strong>'+escapeHtml(u.badge||"NONE")+'</strong></div>'+
          '<div><small>Advance credits</small><strong>'+escapeHtml(d.credit_balance??0)+'</strong></div>'+
          '<div><small>Confirmed support</small><strong>₱'+escapeHtml(support.confirmed_total_php??0)+'</strong></div>'+
          '<div><small>Active VIP</small><strong>'+escapeHtml(support.active_vip?"YES":"NO")+'</strong></div>'+
        '</div>'+
        '<div class="admin-note compact"><strong>Comment privilege</strong><p>'+
          (m.comments_suspended
            ?'Suspended until '+escapeHtml(m.comments_suspended_until||"—")
            :'Commenting is currently allowed.')+
        '</p></div>'+
        '<div class="cutover-actions">'+
          (hasPermission("READER_MODERATE")
            ?(m.comments_suspended
              ?'<button id="reader-clear-suspension">Clear comment suspension</button>'
              :'<button id="reader-suspend-comments" class="danger-action">Suspend comments</button>')
            :'')+
        '</div>'+
        '<div class="reader-access-section">'+
          '<div class="database-head"><span>Advance Access</span><small>'+escapeHtml(grants.length)+' grant record(s)</small></div>'+
          (hasPermission("READER_ENTITLEMENT_ADMIN")&&state.readerEligibleParts.length
            ?'<form id="reader-advance-grant-form" class="admin-control-form">'+
              '<strong>Grant scheduled Part access</strong>'+
              '<select name="part_id">'+state.readerEligibleParts.map(p=>'<option value="'+escapeHtml(p.part_id)+'">'+escapeHtml(p.part_key+" · "+p.title+" · "+p.publish_at)+'</option>').join("")+'</select>'+
              '<input name="reason" placeholder="Grant reason" required>'+
              '<button type="submit">Grant Advance Part</button>'+
             '</form>'
            :'<div class="empty">'+(state.readerEligibleParts.length?'No entitlement permission.':'No future scheduled Final Canon Parts are eligible right now.')+'</div>')+
          (grants.length
            ?'<div class="table-scroll"><table><thead><tr><th>Part</th><th>Source</th><th>Granted</th><th>Revoked</th><th>Action</th></tr></thead><tbody>'+
              grants.map(g=>'<tr><td>'+escapeHtml(g.part_key||"—")+'<br><small>'+escapeHtml(g.title||"")+'</small></td><td>'+escapeHtml(g.source_type||"—")+'</td><td>'+escapeHtml(g.granted_at||"—")+'</td><td>'+escapeHtml(g.revoked_at||"—")+'</td><td>'+
                (hasPermission("READER_ENTITLEMENT_ADMIN")&&g.source_type==="ADMIN"&&!g.revoked_at
                  ?'<button data-revoke-access="'+escapeHtml(g.id)+'" class="danger-mini">Revoke</button>'
                  :'<span class="muted">—</span>')+
              '</td></tr>').join("")+
              '</tbody></table></div>'
            :'')+
        '</div>'+
        '<div class="reader-progress-section">'+
          '<div class="database-head"><span>Recent Reading Progress</span><small>'+escapeHtml(progress.length)+' row(s)</small></div>'+
          (progress.length
            ?'<div class="table-scroll"><table><thead><tr><th>Part</th><th>Progress</th><th>Completed</th><th>Active time</th></tr></thead><tbody>'+
              progress.map(p=>'<tr><td>'+escapeHtml(p.part_key||"—")+'<br><small>'+escapeHtml(p.title||"")+'</small></td><td>'+escapeHtml(p.progress_percent??0)+'%</td><td>'+escapeHtml(p.completed?"YES":"NO")+'</td><td>'+escapeHtml(p.active_seconds??0)+'s</td></tr>').join("")+
              '</tbody></table></div>'
            :'<div class="empty">No reading-progress records yet.</div>')+
        '</div>'+
      '</div>';

    const suspend=$("#reader-suspend-comments");
    if(suspend)suspend.addEventListener("click",async()=>{
      const days=Number(prompt("Suspend commenting for how many days?","7"));
      if(!Number.isFinite(days)||days<=0)return;
      const reason=prompt("Reason for comment suspension:")||"";
      if(reason.trim().length<6)return;
      const until=new Date(Date.now()+days*86400000).toISOString();
      suspend.disabled=true;
      try{
        await apiPost("/admin/api/readers/"+userId+"/comment-suspension",{suspended_until:until,reason});
        await loadReaders();
      }catch(error){alert(error.message);suspend.disabled=false;}
    });

    const clear=$("#reader-clear-suspension");
    if(clear)clear.addEventListener("click",async()=>{
      const reason=prompt("Reason for clearing comment suspension:")||"";
      if(reason.trim().length<6)return;
      clear.disabled=true;
      try{
        await apiPost("/admin/api/readers/"+userId+"/comment-suspension",{suspended_until:null,reason});
        await loadReaders();
      }catch(error){alert(error.message);clear.disabled=false;}
    });

    const grantForm=$("#reader-advance-grant-form");
    if(grantForm)grantForm.addEventListener("submit",async(e)=>{
      e.preventDefault();
      const fd=new FormData(grantForm);
      const button=grantForm.querySelector("button");
      button.disabled=true;
      try{
        await apiPost("/admin/api/readers/"+userId+"/advance-grants",{
          part_id:String(fd.get("part_id")||""),
          reason:String(fd.get("reason")||"")
        });
        await loadReaders();
      }catch(error){alert(error.message);}
      finally{button.disabled=false;}
    });

    root.querySelectorAll("[data-revoke-access]").forEach(button=>button.addEventListener("click",async()=>{
      const reason=prompt("Reason for revoking this Admin advance grant:")||"";
      if(reason.trim().length<8)return;
      button.disabled=true;
      try{
        await apiPost("/admin/api/readers/advance-grants/"+button.dataset.revokeAccess+"/revoke",{reason});
        await loadReaders();
      }catch(error){alert(error.message);button.disabled=false;}
    }));
  }catch(error){
    root.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
  }
}

async function loadCommunity(){
  const fan=$("#pending-fan-posts");
  const reports=$("#community-reports");
  const summary=$("#community-summary");
  fan.innerHTML='<div class="empty">Loading Fan Page moderation…</div>';
  reports.innerHTML='<div class="empty">Loading reports…</div>';
  try{
    const queue=await api("/admin/api/community?limit=200");
    const counts=queue.counts||{};
    const canModerate=hasPermission("COMMUNITY_MODERATE");

    summary.innerHTML=
      '<div class="card"><span>Pending fan posts</span><strong>'+escapeHtml(counts.pending_fan_posts??0)+'</strong></div>'+
      '<div class="card"><span>Visible fan posts</span><strong>'+escapeHtml(counts.visible_fan_posts??0)+'</strong></div>'+
      '<div class="card"><span>Open reports</span><strong>'+escapeHtml(counts.open_reports??0)+'</strong></div>'+
      '<div class="card"><span>Hidden comments</span><strong>'+escapeHtml((counts.hidden_part_comments??0)+(counts.hidden_fan_comments??0))+'</strong></div>';

    const posts=queue.fan_posts||[];
    fan.innerHTML=
      '<div class="database-head"><span>Fan Page Posts</span><small>'+escapeHtml(posts.length)+' shown</small></div>'+
      (posts.length?posts.map(p=>{
        const actions=[];
        if(canModerate){
          if(p.status==="PENDING")actions.push('<button data-fan-action="approve" data-id="'+escapeHtml(p.id)+'">Approve</button>');
          if(p.status==="VISIBLE")actions.push('<button data-fan-action="hide" data-id="'+escapeHtml(p.id)+'">Hide</button>');
          if(["HIDDEN","REMOVED"].includes(p.status))actions.push('<button data-fan-action="restore" data-id="'+escapeHtml(p.id)+'">Restore</button>');
          if(p.status!=="REMOVED")actions.push('<button data-fan-action="remove" data-id="'+escapeHtml(p.id)+'" class="danger-mini">Remove</button>');
          actions.push('<button data-fan-lock="'+(p.comments_locked?"unlock":"lock")+'" data-id="'+escapeHtml(p.id)+'">'+(p.comments_locked?"Unlock comments":"Lock comments")+'</button>');
        }
        return '<div class="moderation-card">'+
          '<div class="moderation-card-head"><div><strong>'+escapeHtml(p.author_label||"Reader")+'</strong>'+adminBadge(p.badge)+'<small>'+escapeHtml(p.created_at||"")+'</small></div><span class="status '+(p.status==="VISIBLE"?"final":"review")+'">'+escapeHtml(p.status||"—")+'</span></div>'+
          '<p>'+escapeHtml(p.caption||"No caption")+'</p>'+
          '<code>'+escapeHtml(p.media_object_path||"")+'</code>'+
          '<div class="moderation-meta"><span>Comments: '+escapeHtml(p.comments_locked?"LOCKED":"OPEN")+'</span>'+(p.spoiler_part_id?'<span>Spoiler-tagged</span>':'')+'</div>'+
          '<div class="release-row-actions">'+(actions.join("")||'<span class="muted">No moderation permission</span>')+'</div>'+
        '</div>';
      }).join(""):'<div class="empty">No Fan Page posts yet.</div>');

    const rs=queue.reports||[];
    reports.innerHTML=
      '<div class="database-head"><span>Community Reports</span><small>'+escapeHtml(rs.length)+' shown</small></div>'+
      (rs.length?rs.map(r=>{
        const target=r.target_snapshot||{};
        const targetActions=[];
        if(canModerate&&r.status==="OPEN"){
          if(r.target_type==="FAN_POST"){
            if(target.status==="VISIBLE")targetActions.push('<button data-report-target-action="hide" data-report-target-type="fan-post" data-target-id="'+escapeHtml(r.target_id)+'">Hide target</button>');
            if(["HIDDEN","REMOVED"].includes(target.status))targetActions.push('<button data-report-target-action="restore" data-report-target-type="fan-post" data-target-id="'+escapeHtml(r.target_id)+'">Restore target</button>');
            if(target.status!=="REMOVED")targetActions.push('<button data-report-target-action="remove" data-report-target-type="fan-post" data-target-id="'+escapeHtml(r.target_id)+'" class="danger-mini">Remove target</button>');
          }else if(r.target_type==="PART_COMMENT"||r.target_type==="FAN_COMMENT"){
            const type=r.target_type==="PART_COMMENT"?"part":"fan";
            if(target.status==="VISIBLE")targetActions.push('<button data-report-target-action="hide" data-report-target-type="'+type+'" data-target-id="'+escapeHtml(r.target_id)+'">Hide comment</button>');
            if(["HIDDEN","REMOVED"].includes(target.status))targetActions.push('<button data-report-target-action="restore" data-report-target-type="'+type+'" data-target-id="'+escapeHtml(r.target_id)+'">Restore comment</button>');
            if(target.status!=="REMOVED")targetActions.push('<button data-report-target-action="remove" data-report-target-type="'+type+'" data-target-id="'+escapeHtml(r.target_id)+'" class="danger-mini">Remove comment</button>');
          }
        }
        return '<div class="moderation-card report-card">'+
          '<div class="moderation-card-head"><div><strong>'+escapeHtml(r.target_type||"REPORT")+'</strong><small>'+escapeHtml(r.created_at||"")+'</small></div><span class="status '+(r.status==="OPEN"?"review":"final")+'">'+escapeHtml(r.status||"—")+'</span></div>'+
          '<p><strong>Report:</strong> '+escapeHtml(r.reason||"")+'</p>'+
          '<p class="target-preview"><strong>Target:</strong> '+escapeHtml(target.body||target.caption||"No text preview")+'</p>'+
          '<code>'+escapeHtml(r.target_id||"")+'</code>'+
          '<div class="release-row-actions">'+targetActions.join("")+
            (canModerate&&r.status==="OPEN"
              ?'<button data-report-action="resolve" data-id="'+escapeHtml(r.id)+'">Resolve report</button><button data-report-action="dismiss" data-id="'+escapeHtml(r.id)+'">Dismiss report</button>'
              :'')+
          '</div>'+
        '</div>';
      }).join(""):'<div class="empty">No community reports.</div>');

    fan.querySelectorAll("[data-fan-action]").forEach(button=>button.addEventListener("click",async()=>{
      const action=button.dataset.fanAction;
      const reason=prompt("Reason to "+action+" this Fan Page post:")||"";
      if(reason.trim().length<4)return;
      button.disabled=true;
      try{
        await apiPost("/admin/api/community/fan-posts/"+button.dataset.id+"/"+action,{reason});
        await loadCommunity();
      }catch(error){alert(error.message);button.disabled=false;}
    }));

    fan.querySelectorAll("[data-fan-lock]").forEach(button=>button.addEventListener("click",async()=>{
      const action=button.dataset.fanLock;
      const reason=prompt("Reason to "+action+" comments on this Fan Page post:")||"";
      if(reason.trim().length<4)return;
      button.disabled=true;
      try{
        await apiPost("/admin/api/community/fan-posts/"+button.dataset.id+"/comments-"+action,{reason});
        await loadCommunity();
      }catch(error){alert(error.message);button.disabled=false;}
    }));

    reports.querySelectorAll("[data-report-action]").forEach(button=>button.addEventListener("click",async()=>{
      const action=button.dataset.reportAction;
      const reason=prompt("Reason to "+action+" this report:")||"";
      if(reason.trim().length<4)return;
      button.disabled=true;
      try{
        await apiPost("/admin/api/community/reports/"+button.dataset.id+"/"+action,{reason});
        await loadCommunity();
      }catch(error){alert(error.message);button.disabled=false;}
    }));

    reports.querySelectorAll("[data-report-target-action]").forEach(button=>button.addEventListener("click",async()=>{
      const action=button.dataset.reportTargetAction;
      const type=button.dataset.reportTargetType;
      const reason=prompt("Reason to "+action+" this reported target:")||"";
      if(reason.trim().length<4)return;
      button.disabled=true;
      try{
        if(type==="fan-post"){
          await apiPost("/admin/api/community/fan-posts/"+button.dataset.targetId+"/"+action,{reason});
        }else{
          await apiPost("/admin/api/community/comments/"+type+"/"+button.dataset.targetId+"/"+action,{reason});
        }
        await loadCommunity();
      }catch(error){alert(error.message);button.disabled=false;}
    }));
  }catch(error){
    summary.innerHTML='';
    fan.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
    reports.innerHTML='';
  }
}


function hasPermission(key){
  return Boolean(state.rbac?.is_owner||(state.rbac?.permissions||[]).includes(key));
}

function permissionOptions(){
  const rows=state.rbac?.permission_catalog||[];
  return rows.map(p=>'<option value="'+escapeHtml(p.permission_key)+'">'+escapeHtml(p.category+" · "+p.permission_key+" · "+p.risk_level)+'</option>').join("");
}

async function loadAccess(){
  const cards=$("#access-summary");
  const bootstrap=$("#access-bootstrap");
  const management=$("#access-management");
  const principals=$("#access-principals");
  const controls=$("#access-controls");
  const audit=$("#access-audit");

  cards.innerHTML='<div class="card"><span>RBAC</span><strong>Loading…</strong></div>';
  bootstrap.classList.add("hidden");
  management.classList.add("hidden");
  principals.innerHTML="";
  controls.innerHTML="";
  audit.innerHTML='<div class="empty">Loading Admin security state…</div>';

  try{
    const rbac=await api("/admin/api/rbac");
    state.rbac=rbac;
    const perms=rbac.permissions||[];
    cards.innerHTML=
      '<div class="card"><span>Actor</span><strong class="small-strong">'+escapeHtml(rbac.actor||"—")+'</strong></div>'+
      '<div class="card"><span>Principal</span><strong>'+escapeHtml(rbac.principal_status||"—")+'</strong></div>'+
      '<div class="card"><span>Owner</span><strong>'+escapeHtml(rbac.is_owner?"YES":"NO")+'</strong></div>'+
      '<div class="card"><span>Permissions</span><strong>'+escapeHtml(perms.length)+'</strong></div>';

    if(rbac.bootstrap_required){
      bootstrap.classList.remove("hidden");
      bootstrap.innerHTML=
        '<strong>One-time Owner bootstrap required</strong>'+
        '<p>Your Cloudflare Access identity is authenticated, but Supabase RBAC has no enabled Admin principal yet. Bootstrap can succeed only once.</p>'+
        '<button id="bootstrap-owner" class="danger-action">Initialize this Access identity as GENESIS Owner</button>'+
        '<p class="muted">You will be required to type: <code>BOOTSTRAP GENESIS OWNER</code></p>';
      $("#bootstrap-owner").addEventListener("click",async()=>{
        const confirmation=prompt('Type exactly: BOOTSTRAP GENESIS OWNER')||"";
        if(confirmation!=="BOOTSTRAP GENESIS OWNER")return;
        const button=$("#bootstrap-owner");
        button.disabled=true;
        try{
          await apiPost("/admin/api/rbac/bootstrap",{confirmation});
          await loadAccess();
          switchView("production");
        }catch(error){
          alert(error.message);
          button.disabled=false;
        }
      });
      audit.innerHTML='<div class="empty">Audit history starts when the Owner bootstrap succeeds.</div>';
      $("#release-badge").textContent="RBAC SETUP";
      $("#release-badge").className="badge danger";
      return;
    }

    if(!rbac.principal_exists||rbac.principal_status!=="ENABLED"){
      bootstrap.classList.remove("hidden");
      bootstrap.innerHTML=
        '<strong>Access not provisioned</strong>'+
        '<p>This Cloudflare Access identity is not an enabled Supabase Admin principal. An Owner must add or enable this email.</p>';
      audit.innerHTML='<div class="empty">Audit visibility requires ADMIN_ACCESS_VIEW.</div>';
      $("#release-badge").textContent="RBAC DENIED";
      $("#release-badge").className="badge danger";
      return;
    }

    if(hasPermission("ADMIN_ACCESS_VIEW")){
      const [principalData,auditData]=await Promise.all([
        api("/admin/api/rbac/principals"),
        api("/admin/api/rbac/audit?limit=100")
      ]);
      management.classList.remove("hidden");
      const rows=principalData.principals||[];
      principals.innerHTML=rows.length
        ?'<div class="table-scroll"><table><thead><tr><th>Email</th><th>Status</th><th>Owner</th><th>Permissions</th></tr></thead><tbody>'+
          rows.map(p=>'<tr><td>'+escapeHtml(p.email)+'</td><td>'+escapeHtml(p.status)+'</td><td>'+escapeHtml(p.is_owner?"YES":"NO")+'</td><td class="meta-text">'+escapeHtml(p.is_owner?"ALL (implicit)":(p.permissions||[]).join(", ")||"—")+'</td></tr>').join("")+
          '</tbody></table></div>'
        :'<div class="empty">No Admin principals.</div>';

      const auditRows=auditData.rows||[];
      audit.innerHTML=auditRows.length
        ?'<div class="table-scroll"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Permission</th><th>Target</th><th>Reason</th></tr></thead><tbody>'+
          auditRows.map(a=>'<tr><td>'+escapeHtml(a.created_at||"—")+'</td><td>'+escapeHtml(a.actor_email||"—")+'</td><td>'+escapeHtml(a.action_key||"—")+'</td><td><code>'+escapeHtml(a.permission_key||"—")+'</code></td><td>'+escapeHtml((a.target_type||"—")+(a.target_id?" · "+a.target_id:""))+'</td><td class="meta-text">'+escapeHtml(a.reason||"—")+'</td></tr>').join("")+
          '</tbody></table></div>'
        :'<div class="empty">No Admin mutation audit rows yet.</div>';

      if(hasPermission("ADMIN_ACCESS_MANAGE")){
        controls.innerHTML=
          '<form id="principal-form" class="admin-control-form">'+
            '<strong>Add / update non-owner Admin</strong>'+
            '<input name="email" type="email" placeholder="admin@example.com" required>'+
            '<input name="display_name" placeholder="Display name">'+
            '<select name="enabled"><option value="true">Enabled</option><option value="false">Disabled</option></select>'+
            '<input name="reason" placeholder="Reason" required>'+
            '<button type="submit">Save Admin</button>'+
          '</form>'+
          '<form id="permission-form" class="admin-control-form">'+
            '<strong>Grant / revoke permission</strong>'+
            '<input name="email" type="email" placeholder="admin@example.com" required>'+
            '<select name="permission">'+permissionOptions()+'</select>'+
            '<select name="granted"><option value="true">Grant</option><option value="false">Revoke</option></select>'+
            '<input name="reason" placeholder="Reason" required>'+
            '<button type="submit">Apply Permission</button>'+
          '</form>';

        $("#principal-form").addEventListener("submit",async(e)=>{
          e.preventDefault();
          const form=e.currentTarget;
          const fd=new FormData(form);
          const button=form.querySelector("button");
          button.disabled=true;
          try{
            await apiPost("/admin/api/rbac/principals",{
              email:String(fd.get("email")||""),
              display_name:String(fd.get("display_name")||""),
              enabled:String(fd.get("enabled"))==="true",
              reason:String(fd.get("reason")||"")
            });
            form.reset();
            await loadAccess();
          }catch(error){alert(error.message);}
          finally{button.disabled=false;}
        });

        $("#permission-form").addEventListener("submit",async(e)=>{
          e.preventDefault();
          const form=e.currentTarget;
          const fd=new FormData(form);
          const button=form.querySelector("button");
          button.disabled=true;
          try{
            await apiPost("/admin/api/rbac/permissions",{
              email:String(fd.get("email")||""),
              permission:String(fd.get("permission")||""),
              granted:String(fd.get("granted"))==="true",
              reason:String(fd.get("reason")||"")
            });
            await loadAccess();
          }catch(error){alert(error.message);}
          finally{button.disabled=false;}
        });
      }else{
        controls.innerHTML='<div class="empty">You can view Admin access, but ADMIN_ACCESS_MANAGE is required to change it.</div>';
      }
    }else{
      management.classList.add("hidden");
      audit.innerHTML='<div class="empty">ADMIN_ACCESS_VIEW is required to view principals or the audit trail.</div>';
    }
  }catch(error){
    cards.innerHTML='<div class="panel"><div class="error">'+escapeHtml(error.message)+'</div></div>';
    audit.innerHTML="";
  }
}


async function loadSettings(){
  const summary=$("#settings-summary");
  const features=$("#settings-features");
  const payments=$("#settings-payments");
  summary.innerHTML='<div class="card"><span>Settings</span><strong>Loading…</strong></div>';
  features.innerHTML='<div class="empty">Loading feature flags…</div>';
  payments.innerHTML='<div class="empty">Loading payment provider…</div>';
  try{
    const d=await api("/admin/api/settings/features");
    const s=d.support_settings||{};
    const p=d.payment_provider||{};
    const r=d.release_settings||{};
    const v=d.latest_live_verification||{};
    summary.innerHTML=
      '<div class="card"><span>Launch authorized</span><strong>'+escapeHtml(r.launch_authorized?"YES":"NO")+'</strong></div>'+
      '<div class="card"><span>Comments</span><strong>'+escapeHtml(s.comments_enabled?"ON":"OFF")+'</strong></div>'+
      '<div class="card"><span>Fan posting</span><strong>'+escapeHtml(s.fan_posting_enabled?"ON":"OFF")+'</strong></div>'+
      '<div class="card"><span>Payments</span><strong>'+escapeHtml(s.payments_enabled?"ON":"OFF")+'</strong></div>'+
      '<div class="card"><span>PayMongo</span><strong>'+escapeHtml((p.mode||"—")+" / "+(p.provider_enabled?"ENABLED":"OFF"))+'</strong></div>'+
      '<div class="card"><span>Live verification</span><strong>'+escapeHtml(v.status||"NONE")+'</strong></div>';

    const flags=[
      ["comments","Comments",Boolean(s.comments_enabled),false],
      ["fan-posting","Fan Page posting",Boolean(s.fan_posting_enabled),true],
      ["share-rewards","Share rewards",Boolean(s.share_rewards_enabled),true],
      ["pure-support","Pure support / donation",Boolean(s.pure_support_enabled),true]
    ];
    features.innerHTML=
      '<div class="database-head"><span>Website Feature Flags</span><small>Allowlisted controls</small></div>'+
      '<div class="feature-list">'+
      flags.map(([key,label,on,launchRequired])=>
        '<div class="feature-row"><div><strong>'+escapeHtml(label)+'</strong><small>'+(launchRequired?'Requires public launch authorization':'May be changed prelaunch')+'</small></div>'+
        '<span class="status '+(on?'final':'review')+'">'+(on?'ON':'OFF')+'</span>'+
        (hasPermission("FEATURE_FLAGS")?'<button data-feature="'+key+'" data-enabled="'+(!on)+'">'+(on?'Disable':'Enable')+'</button>':'')+
        '</div>'
      ).join("")+
      '</div>';

    features.querySelectorAll("[data-feature]").forEach(button=>button.addEventListener("click",async()=>{
      const key=button.dataset.feature;
      const enabled=button.dataset.enabled==="true";
      const reason=prompt("Reason for "+(enabled?"enabling ":"disabling ")+key+":")||"";
      if(reason.trim().length<6)return;
      button.disabled=true;
      try{await apiPost("/admin/api/settings/features/"+key,{enabled,reason});await loadSettings();}
      catch(error){alert(error.message);button.disabled=false;}
    }));

    payments.innerHTML=
      '<div class="database-head"><span>PayMongo / Payments</span><small>High-risk controls</small></div>'+
      '<div class="settings-payment-grid">'+
        '<div><small>Provider mode</small><strong>'+escapeHtml(p.mode||"—")+'</strong></div>'+
        '<div><small>Provider enabled</small><strong>'+escapeHtml(p.provider_enabled?"YES":"NO")+'</strong></div>'+
        '<div><small>Reader payments</small><strong>'+escapeHtml(s.payments_enabled?"ENABLED":"OFF")+'</strong></div>'+
        '<div><small>Method</small><strong>'+escapeHtml(Array.isArray(p.payment_method_types)?p.payment_method_types.join(", "):"—")+'</strong></div>'+
      '</div>'+
      (hasPermission("PAYMENTS_ENABLE")
        ?'<div class="admin-control-form inline-controls">'+
           '<strong>Payment provider control</strong>'+
           '<select id="payment-provider-mode"><option value="TEST" '+(p.mode==="TEST"?"selected":"")+'>TEST</option><option value="LIVE" '+(p.mode==="LIVE"?"selected":"")+'>LIVE</option></select>'+
           '<button id="payment-provider-toggle">'+(p.provider_enabled?"Disable provider":"Enable provider")+'</button>'+
           '<button id="reader-payments-toggle" class="'+(s.payments_enabled?"danger-action":"")+'">'+(s.payments_enabled?"Disable reader payments":"Enable reader payments")+'</button>'+
         '</div>'
        :'<div class="empty">PAYMENTS_ENABLE is required to change payment settings.</div>');

    const providerButton=$("#payment-provider-toggle");
    if(providerButton)providerButton.addEventListener("click",async()=>{
      const enabled=!Boolean(p.provider_enabled);
      const mode=$("#payment-provider-mode").value;
      const reason=prompt("Reason for changing PayMongo provider state:")||"";
      if(reason.trim().length<8)return;
      providerButton.disabled=true;
      try{await apiPost("/admin/api/settings/payment-provider",{enabled,mode,reason});await loadSettings();}
      catch(error){alert(error.message);providerButton.disabled=false;}
    });

    const payButton=$("#reader-payments-toggle");
    if(payButton)payButton.addEventListener("click",async()=>{
      const enabled=!Boolean(s.payments_enabled);
      const reason=prompt("Reason for "+(enabled?"enabling":"disabling")+" reader payments:")||"";
      if(reason.trim().length<8)return;
      payButton.disabled=true;
      try{await apiPost("/admin/api/settings/payments",{enabled,reason});await loadSettings();}
      catch(error){alert(error.message);payButton.disabled=false;}
    });
  }catch(error){
    summary.innerHTML="";
    features.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
    payments.innerHTML="";
  }
}

async function initializeAdmin(){
  try{
    const rbac=await api("/admin/api/rbac");
    state.rbac=rbac;
    if(rbac.bootstrap_required||!rbac.principal_exists||rbac.principal_status!=="ENABLED"){
      switchView("access");
      return;
    }
    switchView("overview");
  }catch(error){
    // Phase 1 isolation rule: a legacy Core/Admin API failure must not erase the shell.
    state.rbac=null;
    switchView("overview");
    const root=$("#overview-view");
    if(root){
      const warning=document.createElement("div");
      warning.className="panel admin-note compact";
      warning.innerHTML='<div class="database-head"><span>LEGACY ADMIN PATH</span><small>UNAVAILABLE</small></div><p>'+escapeHtml(error.message)+' Platform-native navigation remains available while Core-dependent screens migrate to the read-only bridge.</p>';
      root.prepend(warning);
    }
  }
}

function gateCard(label,gate){
  const status=gate?.status||"UNKNOWN";
  return '<div class="card"><span>'+escapeHtml(label)+'</span><strong class="'+(status==="PASS"?"good-text":"danger-text")+'">'+escapeHtml(status)+'</strong></div>';
}

async function loadRoadmap(){
  const cards=$("#roadmap-summary");
  const details=$("#roadmap-details");
  const cutover=$("#cutover-control");
  cards.innerHTML='';
  details.innerHTML='<div class="empty">Loading Roadmap through the Core bridge…</div>';
  cutover.innerHTML='';

  if(!platformSession()){
    details.innerHTML=bridgeLoginPanel("Roadmap is now a Core read-only surface. Connect GENESIS PLATFORM to load it.");
    bindBridgeLogin(loadRoadmap);
    return;
  }

  try{
    const envelope=await platformFunction("genesis-roadmap");
    const rows=Array.isArray(envelope?.data)?envelope.data:[];
    if(!rows.length)throw new Error("The roadmap bridge returned no rows.");

    const active=rows.find((row)=>String(row.status||row.roadmap_status||"").toUpperCase()==="ACTIVE")||rows[0];
    cards.innerHTML=
      '<div class="card"><span>Bridge rows</span><strong>'+escapeHtml(envelope.row_count??rows.length)+'</strong></div>'+
      '<div class="card"><span>Active version</span><strong>'+escapeHtml(active.version_number??active.version??"—")+'</strong></div>'+
      '<div class="card"><span>Status</span><strong>'+escapeHtml(active.status||active.roadmap_status||"—")+'</strong></div>'+
      '<div class="card"><span>Source</span><strong>CORE</strong></div>';

    details.innerHTML=
      '<div class="database-head"><span>CORE ROADMAPS</span><small>READ ONLY · '+escapeHtml(rows.length)+' ROWS</small></div>'+
      bridgeRecordTable(rows);

    cutover.innerHTML=
      '<div class="database-head"><span>MIGRATION GATES</span><small>ROADMAP · PASS</small></div>'+
      '<div class="admin-note compact"><p><strong>Data parity:</strong> raw bridge rows retained · <strong>Auth/RBAC:</strong> Platform admin required · <strong>Boundary:</strong> no roadmap mutation controls · <strong>UI:</strong> active/history visible · <strong>Failure isolation:</strong> bridge failure is local to this screen.</p></div>';
  }catch(error){
    cards.innerHTML='';
    details.innerHTML=bridgeFailurePanel(error);
    cutover.innerHTML='';
  }
}

async function loadContinuity(){
  const cards=$("#continuity-summary");
  const details=$("#continuity-details");
  cards.innerHTML='';
  details.innerHTML='<div class="empty">Loading Continuity through the Core bridge…</div>';

  if(!platformSession()){
    details.innerHTML=bridgeLoginPanel("Continuity is now a Core read-only surface. Connect GENESIS PLATFORM to load it.");
    bindBridgeLogin(loadContinuity);
    return;
  }

  try{
    const envelope=await platformFunction("genesis-continuity");
    const rows=Array.isArray(envelope?.data)?envelope.data:[];
    if(!rows.length)throw new Error("The continuity bridge returned no rows.");

    cards.innerHTML=
      '<div class="card"><span>Continuity rows</span><strong>'+escapeHtml(envelope.row_count??rows.length)+'</strong></div>'+
      '<div class="card"><span>Mode</span><strong>READ ONLY</strong></div>'+
      '<div class="card"><span>Authority</span><strong>CORE</strong></div>'+
      '<div class="card"><span>Bridge</span><strong>CONNECTED</strong></div>';

    details.innerHTML=
      '<div class="database-head"><span>CORE CONTINUITY</span><small>CURATED BRIDGE VIEW</small></div>'+
      (rows.length===1?bridgeKeyValueGrid(rows[0]):bridgeRecordTable(rows))+
      '<div class="admin-note compact"><div class="database-head"><span>MIGRATION GATES</span><small>CONTINUITY · PASS</small></div><p><strong>Data parity:</strong> complete bridge payload displayed · <strong>Auth/RBAC:</strong> Platform admin required · <strong>Boundary:</strong> SELECT-only · <strong>UI:</strong> continuity fields preserved · <strong>Failure isolation:</strong> local error state only.</p></div>';
  }catch(error){
    cards.innerHTML='';
    details.innerHTML=bridgeFailurePanel(error);
  }
}

async function loadAuthority(){
  const root=$("#authority-table");
  root.innerHTML='<div class="empty">Loading Authorities through the Core bridge…</div>';

  if(!platformSession()){
    root.innerHTML=bridgeLoginPanel("Authorities are now a Core read-only surface. Connect GENESIS PLATFORM to load them.");
    bindBridgeLogin(loadAuthority);
    return;
  }

  try{
    const envelope=await platformFunction("genesis-authorities");
    const rows=Array.isArray(envelope?.data)?envelope.data:[];
    root.innerHTML=
      '<div class="database-head"><span>CORE AUTHORITIES</span><small>READ ONLY · '+escapeHtml(envelope.row_count??rows.length)+' ROWS</small></div>'+
      bridgeRecordTable(rows)+
      '<div class="admin-note compact"><div class="database-head"><span>MIGRATION GATES</span><small>AUTHORITIES · PASS</small></div><p><strong>Data parity:</strong> complete authority index returned · <strong>Auth/RBAC:</strong> Platform admin required · <strong>Boundary:</strong> no authority mutation · <strong>UI:</strong> all returned fields visible · <strong>Failure isolation:</strong> local error state only.</p></div>';
  }catch(error){
    root.innerHTML=bridgeFailurePanel(error);
  }
}

function renderMeta(v){
  const rows=[
    ["Stage",v.stage],["Version",v.version_number],["Words",v.word_count],
    ["Hash",v.content_hash?(v.content_hash.slice(0,14)+"…"):"—"],
    ["Source",v.source_system],["Engine",v.created_by_engine],
    ["Continuity",v.continuity_verified?"Verified":"No"],["QA",v.qa_verified?"Verified":"No"]
  ];
  $("#viewer-meta").innerHTML=rows.map(([k,val])=>
    '<div><small>'+escapeHtml(k)+'</small><strong>'+escapeHtml(val)+'</strong></div>'
  ).join("");
}

async function showVersion(stage){
  if(!state.activePart)return;
  state.activeStage=stage;
  const body=$("#manuscript-body");
  body.textContent="Loading manuscript…";
  $$(".tabs [data-stage]").forEach((b)=>b.classList.toggle("active",b.dataset.stage===stage));

  try{
    const envelope=await platformFunction("genesis-manuscript-version",{
      part_id:state.activePart.production_part_id,
      stage
    });
    const data=Array.isArray(envelope?.data)?envelope.data[0]:null;
    if(!data)throw new Error("Version not available.");
    renderMeta(data);
    body.textContent=data.body_text||"";
  }catch(error){
    renderMeta({stage,version_number:"—",word_count:"—",content_hash:null,source_system:"—",created_by_engine:"—"});
    if(String(error.message).includes("manuscript_version_not_found")){
      body.textContent=stage==="final"
        ?"Final Canon is not available yet."
        :(stage==="stage2"?"Stage 2 is not available yet.":"Version not available.");
    }else{
      body.textContent=error.message;
    }
  }
}

async function openPart(partId){
  const p=state.manuscripts.find((x)=>x.production_part_id===partId);
  if(!p)return;
  state.activePart=p;
  $("#viewer-key").textContent=p.part_key;
  $("#viewer-title").textContent=p.title;
  $("#viewer").showModal();

  const preferred=p.final_canon_available?"final":(p.stage2_available?"stage2":"stage1");
  await showVersion(preferred);
}

async function compareCurrent(){
  if(!state.activePart)return;
  const body=$("#manuscript-body");

  if(!state.activePart.stage1_available||!state.activePart.stage2_available){
    body.textContent="Comparison requires both Stage 1 and Stage 2. Stage 2 is not available for this Part yet.";
    return;
  }

  body.textContent="Loading comparison…";
  try{
    const data=await platformFunction("genesis-manuscript-compare",{
      part_id:state.activePart.production_part_id,
      from:"stage1",
      to:"stage2"
    });
    const a=(data.from?.body_text||"").split(/\n\s*\n/);
    const b=(data.to?.body_text||"").split(/\n\s*\n/);
    const max=Math.max(a.length,b.length);
    const lines=[];
    for(let i=0;i<max;i++){
      const left=a[i]||"";
      const right=b[i]||"";
      if(left!==right){
        lines.push("¶ "+(i+1)+"\n− "+left+"\n+ "+right);
      }
    }
    $("#viewer-meta").innerHTML=
      '<div><small>From</small><strong>Stage 1</strong></div>'+
      '<div><small>Words</small><strong>'+escapeHtml(data.from?.word_count??"—")+'</strong></div>'+
      '<div><small>To</small><strong>Stage 2</strong></div>'+
      '<div><small>Words</small><strong>'+escapeHtml(data.to?.word_count??"—")+'</strong></div>';
    body.textContent=lines.length?lines.join("\n\n"):"No paragraph-level differences detected.";
  }catch(error){
    body.textContent=error.message;
  }
}

async function previewCurrent(){
  if(!state.activePart)return;
  try{
    const envelope=await platformFunction("genesis-manuscript-version",{
      part_id:state.activePart.production_part_id,
      stage:state.activeStage
    });
    const data=Array.isArray(envelope?.data)?envelope.data[0]:null;
    if(!data)throw new Error("This version is not available for preview.");
    $("#preview-body").textContent=data.body_text||"";
    $("#preview").showModal();
  }catch(error){
    alert(error.message);
  }
}

function switchView(name){
  $$(".view").forEach((x)=>x.classList.add("hidden"));
  $$(".nav").forEach((x)=>x.classList.toggle("active",x.dataset.view===name));
  const target=$("#"+name+"-view");
  if(!target)return;
  target.classList.remove("hidden");

  const screens={
    overview:{title:"Command Overview",source:"PLATFORM · CONTROL PLANE",kind:"platform"},
    production:{title:"Production",source:"CORE · READ ONLY",kind:"core"},
    releases:{title:"Releases",source:"PLATFORM · MANAGED HERE",kind:"platform"},
    manuscripts:{title:"Manuscripts",source:"CORE · READ ONLY",kind:"core"},
    roadmap:{title:"Roadmap",source:"CORE · READ ONLY",kind:"core"},
    continuity:{title:"Continuity",source:"CORE · READ ONLY",kind:"core"},
    authority:{title:"Authorities",source:"CORE · READ ONLY",kind:"core"},
    database:{title:"World Database",source:"CORE · READ ONLY",kind:"core"},
    codex:{title:"Codex",source:"CORE DATA · PLATFORM PROJECTION",kind:"hybrid"},
    "art-assets":{title:"Art Assets",source:"PLATFORM · MANAGED HERE",kind:"platform"},
    readers:{title:"Readers",source:"PLATFORM · MANAGED HERE",kind:"platform"},
    community:{title:"Community",source:"PLATFORM · MANAGED HERE",kind:"platform"},
    messages:{title:"Messages",source:"PLATFORM · MANAGED HERE",kind:"platform"},
    support:{title:"Support",source:"PLATFORM · MANAGED HERE",kind:"platform"},
    "website-ops":{title:"Website",source:"PLATFORM · MANAGED HERE",kind:"platform"},
    access:{title:"Administrators & Audit",source:"PLATFORM · MANAGED HERE",kind:"platform"},
    "bridge-health":{title:"Bridge Health",source:"CORE → PLATFORM · READ ONLY",kind:"bridge"},
    settings:{title:"Settings",source:"PLATFORM · MANAGED HERE",kind:"platform"}
  };
  const screen=screens[name]||{title:"Control Center",source:"PLATFORM",kind:"platform"};
  $("#page-title").textContent=screen.title;
  const source=$("#source-badge");
  if(source){
    source.textContent=screen.source;
    source.className="source-badge "+screen.kind;
  }

  // Keep top-right status contextual without coupling the shell to Core.
  const status=$("#release-badge");
  if(status&&name==="overview"){
    status.textContent="ADMIN ONLINE";
    status.className="badge neutral";
  }else if(status&&name==="bridge-health"){
    status.textContent="4/4 VERIFIED";
    status.className="badge good";
  }

  if(name==="production")loadProduction();
  if(name==="website-ops")loadWebsiteOps();
  if(name==="manuscripts")loadManuscripts();
  if(name==="releases")loadReleases();
  if(name==="roadmap")loadRoadmap();
  if(name==="continuity")loadContinuity();
  if(name==="authority")loadAuthority();
  if(name==="access")loadAccess();
  if(name==="database"){loadDatabaseSummary();loadDatabase();loadDatabaseProposals();}
  if(name==="art-assets")loadArtAssets();
  if(name==="codex")loadCodex();
  if(name==="support")loadSupport();
  if(name==="messages")loadMessages();
  if(name==="readers")loadReaders();
  if(name==="community")loadCommunity();
  if(name==="settings")loadSettings();
  if(name==="bridge-health")bindManuscriptBridgeDiagnostics();
}
async function runManuscriptBridgeDiagnostics(){
  const out=$("#manuscript-bridge-test-result");
  const button=$("#run-manuscript-bridge-tests");
  if(!out||!button)return;
  button.disabled=true;
  out.textContent="Running Manuscripts bridge gates…";

  const results=[];
  try{
    const noAuth=await fetch(PLATFORM_URL+"/functions/v1/genesis-manuscripts-index",{
      method:"GET",
      headers:{apikey:PLATFORM_PUBLISHABLE_KEY}
    });
    results.push({
      gate:"missing_auth",
      expected:401,
      actual:noAuth.status,
      pass:noAuth.status===401
    });

    const session=platformSession();
    if(!session){
      results.push({gate:"platform_admin_session",pass:false,error:"Connect GENESIS PLATFORM from Production first."});
      out.textContent=JSON.stringify(results,null,2);
      return;
    }

    const indexResp=await fetch(PLATFORM_URL+"/functions/v1/genesis-manuscripts-index?limit=200&offset=0",{
      headers:{
        Authorization:"Bearer "+session.access_token,
        apikey:PLATFORM_PUBLISHABLE_KEY
      }
    });
    const indexData=await indexResp.json().catch(()=>null);
    const rows=Array.isArray(indexData?.data)?indexData.data:[];
    results.push({
      gate:"index_read",
      expected:200,
      actual:indexResp.status,
      row_count:indexData?.row_count,
      total:indexData?.total,
      pass:indexResp.status===200&&rows.length>0
    });

    const sample=rows[0]||null;
    if(sample?.production_part_id){
      const versionUrl=PLATFORM_URL+"/functions/v1/genesis-manuscript-version?part_id="+encodeURIComponent(sample.production_part_id)+"&stage=stage1";
      const versionResp=await fetch(versionUrl,{
        headers:{
          Authorization:"Bearer "+session.access_token,
          apikey:PLATFORM_PUBLISHABLE_KEY
        }
      });
      const versionData=await versionResp.json().catch(()=>null);
      results.push({
        gate:"stage1_version_read",
        part_key:sample.part_key,
        expected:200,
        actual:versionResp.status,
        word_count:versionData?.data?.[0]?.word_count,
        content_hash:versionData?.data?.[0]?.content_hash||null,
        pass:versionResp.status===200&&Boolean(versionData?.data?.[0]?.body_text)
      });

      const compareUrl=PLATFORM_URL+"/functions/v1/genesis-manuscript-compare?part_id="+encodeURIComponent(sample.production_part_id)+"&from=stage1&to=stage2";
      const compareResp=await fetch(compareUrl,{
        headers:{
          Authorization:"Bearer "+session.access_token,
          apikey:PLATFORM_PUBLISHABLE_KEY
        }
      });
      const compareData=await compareResp.json().catch(()=>null);
      results.push({
        gate:"stage2_absence_handled",
        current_core_state:"Stage 2 count is 0",
        expected:404,
        actual:compareResp.status,
        error:compareData?.error||null,
        pass:compareResp.status===404&&compareData?.error==="manuscript_version_not_found"
      });
    }

    const invalidResp=await fetch(PLATFORM_URL+"/functions/v1/genesis-manuscript-version?part_id=not-a-uuid&stage=stage1",{
      headers:{
        Authorization:"Bearer "+session.access_token,
        apikey:PLATFORM_PUBLISHABLE_KEY
      }
    });
    results.push({
      gate:"input_validation",
      expected:422,
      actual:invalidResp.status,
      pass:invalidResp.status===422
    });

    const passed=results.filter((x)=>x.pass).length;
    out.textContent="Passed "+passed+"/"+results.length+" live checks\n\n"+JSON.stringify(results,null,2);
  }catch(error){
    results.push({gate:"diagnostic_runtime",pass:false,error:String(error?.message||error)});
    out.textContent=JSON.stringify(results,null,2);
  }finally{
    button.disabled=false;
  }
}

function bindManuscriptBridgeDiagnostics(){
  const button=$("#run-manuscript-bridge-tests");
  if(!button||button.dataset.bound==="1")return;
  button.dataset.bound="1";
  button.addEventListener("click",runManuscriptBridgeDiagnostics);
}


$$(".nav").forEach((b)=>b.addEventListener("click",()=>switchView(b.dataset.view)));
$("#refresh-manuscripts").addEventListener("click",loadManuscripts);
$("#search").addEventListener("keydown",(e)=>{if(e.key==="Enter")loadManuscripts();});
$("#episode-filter").addEventListener("change",loadManuscripts);
$("#close-viewer").addEventListener("click",()=>$("#viewer").close());
$("#close-preview").addEventListener("click",()=>$("#preview").close());
$$(".tabs [data-stage]").forEach((b)=>b.addEventListener("click",()=>showVersion(b.dataset.stage)));
$("#compare-button").addEventListener("click",compareCurrent);
$("#preview-button").addEventListener("click",previewCurrent);
$("#refresh-database").addEventListener("click",loadDatabase);
$("#database-domain").addEventListener("change",loadDatabase);
$("#database-search").addEventListener("keydown",(e)=>{if(e.key==="Enter")loadDatabase();});
$("#refresh-art-assets").addEventListener("click",loadArtAssets);
$("#art-assets-type").addEventListener("change",renderArtAssets);
$("#art-assets-status").addEventListener("change",renderArtAssets);
$("#art-assets-search").addEventListener("input",renderArtAssets);

// GENESIS mobile admin nav — reconciled from protected Admin branch.
(function(){
  const menu=document.querySelector("#mobile-menu-button");
  const backdrop=document.querySelector("#mobile-nav-backdrop");
  const closeMenu=()=>{
    document.body.classList.remove("mobile-nav-open");
    menu?.setAttribute("aria-expanded","false");
  };
  const openMenu=()=>{
    document.body.classList.add("mobile-nav-open");
    menu?.setAttribute("aria-expanded","true");
  };
  menu?.addEventListener("click",()=>{
    document.body.classList.contains("mobile-nav-open")?closeMenu():openMenu();
  });
  backdrop?.addEventListener("click",closeMenu);
  document.querySelectorAll(".sidebar .nav").forEach(button=>button.addEventListener("click",closeMenu));
  window.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu();});
})();

initializeAdmin();
