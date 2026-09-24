const state={manuscripts:[],activePart:null,activeStage:"stage2",rbac:null,activeReader:null,readerEligibleParts:[],activeDatabaseRecord:null,databaseAllowedFields:{}};
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];

async function api(path){
  const response=await fetch(path,{credentials:"same-origin",headers:{Accept:"application/json"}});
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

async function loadProduction(){
  const root=$("#production-view");
  root.innerHTML='<div class="panel"><div class="empty">Loading production state…</div></div>';
  try{
    const [payload,control]=await Promise.all([
      api("/admin/api/production"),
      api("/admin/api/production/control")
    ]);
    const runtime=payload.runtime||control.runtime||{};
    const dash=payload.dashboard||{};
    const metrics=dash.metrics||{};
    const paused=metrics.releases_paused!==false;
    const caps=control.capabilities||{};
    const hold=control.open_hold||null;
    const packets=control.active_packets||[];

    $("#release-badge").textContent=paused?"RELEASES PAUSED":"RELEASES ACTIVE";
    $("#release-badge").className="badge "+(paused?"danger":"good");

    root.innerHTML=
      '<div class="cards">'+
        '<div class="card"><span>Stage 1 verified</span><strong>'+escapeHtml(runtime.stage1_verified_count??"—")+' / '+escapeHtml(runtime.expected_part_count??"—")+'</strong></div>'+
        '<div class="card"><span>Stage 2 verified</span><strong>'+escapeHtml(runtime.stage2_verified_count??"—")+' / '+escapeHtml(runtime.expected_part_count??"—")+'</strong></div>'+
        '<div class="card"><span>103 closeout</span><strong>'+escapeHtml(runtime.closeout_103_status||"—")+'</strong></div>'+
        '<div class="card"><span>Release buffer</span><strong>'+escapeHtml(metrics.production_buffer??0)+'</strong></div>'+
      '</div>'+
      '<div class="panel runtime">'+
        '<div><small>Branch</small><strong>'+escapeHtml(runtime.branch_key||"—")+'</strong></div>'+
        '<div><small>Batch</small><strong>'+escapeHtml(runtime.batch_key||"—")+'</strong></div>'+
        '<div><small>Router</small><strong>'+escapeHtml(runtime.router_state||"—")+'</strong></div>'+
        '<div><small>Active role</small><strong>'+escapeHtml(runtime.active_role||"—")+'</strong></div>'+
        '<div><small>Engine / mode</small><strong>'+escapeHtml(runtime.active_engine||"—")+' / '+escapeHtml(runtime.run_mode||"—")+'</strong></div>'+
        '<div><small>Next action</small><strong>'+escapeHtml(runtime.next_action_code||"—")+'</strong></div>'+
      '</div>'+
      '<div class="panel production-controls">'+
        '<div class="database-head"><span>Production Routing Controls</span><small>014-safe operator intervention</small></div>'+
        '<div class="production-control-body">'+
          '<div class="admin-note compact"><strong>Normal role routing stays automatic.</strong><p>These controls do not execute 202/203/103/102. Hold and Resume operate only at safe READY states; Emergency Stop interrupts the current run and requires Builder recovery.</p></div>'+
          (hold
            ?'<div class="hold-banner"><strong>ADMIN HOLD ACTIVE</strong><span>'+escapeHtml(hold.hold_reason||"")+'</span><small>'+escapeHtml(hold.id||"")+'</small></div>'
            :'')+
          '<div class="cutover-actions">'+
            (hasPermission("PRODUCTION_CONTROL")
              ?'<button id="production-hold" '+(caps.can_hold?"":"disabled")+'>Hold at current READY state</button>'+
               '<button id="production-resume" '+(caps.can_resume?"":"disabled")+'>Resume stored route</button>'
              :'')+
            (hasPermission("PRODUCTION_AUTHORIZE")
              ?'<button id="production-emergency-stop" class="danger-action" '+(caps.can_emergency_stop?"":"disabled")+'>Emergency Stop</button>'
              :'')+
          '</div>'+
          '<div class="packet-list">'+
            '<div class="database-head"><span>Active Runtime Packets</span><small>'+escapeHtml(packets.length)+' active</small></div>'+
            (packets.length
              ?packets.map(p=>
                '<div class="packet-row"><div><strong>'+escapeHtml(p.role)+' · '+escapeHtml(p.packet_kind)+'</strong><small>'+escapeHtml(p.id)+'</small><code>'+escapeHtml(p.packet_hash?String(p.packet_hash).slice(0,18)+"…":"—")+'</code></div>'+
                (hasPermission("PRODUCTION_CONTROL")?'<button data-packet="'+escapeHtml(p.id)+'">Invalidate</button>':'')+
                '</div>'
              ).join("")
              :'<div class="empty">No active runtime packets.</div>')+
          '</div>'+
        '</div>'+
      '</div>';

    const holdButton=$("#production-hold");
    if(holdButton)holdButton.addEventListener("click",async()=>{
      const reason=prompt("Reason for holding production (minimum 8 characters):")||"";
      if(reason.trim().length<8)return;
      holdButton.disabled=true;
      try{await apiPost("/admin/api/production/hold",{reason});await loadProduction();}
      catch(error){alert(error.message);holdButton.disabled=false;}
    });

    const resumeButton=$("#production-resume");
    if(resumeButton)resumeButton.addEventListener("click",async()=>{
      if(!hold?.id)return;
      const reason=prompt("Reason for resuming production (minimum 8 characters):")||"";
      if(reason.trim().length<8)return;
      resumeButton.disabled=true;
      try{await apiPost("/admin/api/production/resume",{hold_id:hold.id,reason});await loadProduction();}
      catch(error){alert(error.message);resumeButton.disabled=false;}
    });

    const stopButton=$("#production-emergency-stop");
    if(stopButton)stopButton.addEventListener("click",async()=>{
      const confirmation=prompt("Type exactly:\nEMERGENCY STOP PRODUCTION")||"";
      if(confirmation!=="EMERGENCY STOP PRODUCTION")return;
      const reason=prompt("Emergency stop reason (minimum 12 characters):")||"";
      if(reason.trim().length<12)return;
      stopButton.disabled=true;
      try{
        const result=await apiPost("/admin/api/production/emergency-stop",{confirmation,reason});
        alert("Production stopped. Next required action: "+(result.next_required_action||"BUILDER_RECOVERY"));
        await loadProduction();
      }catch(error){alert(error.message);stopButton.disabled=false;}
    });

    root.querySelectorAll("[data-packet]").forEach(button=>button.addEventListener("click",async()=>{
      const id=button.dataset.packet;
      const reason=prompt("Reason for invalidating this runtime packet:")||"";
      if(reason.trim().length<8)return;
      button.disabled=true;
      try{await apiPost("/admin/api/production/packets/"+id+"/invalidate",{reason});await loadProduction();}
      catch(error){alert(error.message);button.disabled=false;}
    }));
  }catch(error){
    root.innerHTML='<div class="panel"><div class="error">'+escapeHtml(error.message)+'</div></div>';
  }
}

async function loadManuscripts(){
  const table=$("#manuscript-table");
  table.innerHTML='<div class="empty">Loading manuscripts…</div>';
  const q=new URLSearchParams();
  const search=$("#search").value.trim();
  const episode=$("#episode-filter").value;
  if(search)q.set("q",search);
  if(episode)q.set("episode",episode);

  try{
    const data=await api("/admin/api/manuscripts?"+q.toString());
    state.manuscripts=data.items||[];
    if(!state.manuscripts.length){
      table.innerHTML='<div class="empty">No manuscripts match this filter.</div>';
      return;
    }
    table.innerHTML=
      '<table><thead><tr>'+
      '<th>Part</th><th>Title</th><th>Status</th><th>AI-2 Stage 1</th><th>AI-1 Final</th><th>Compare</th>'+
      '</tr></thead><tbody>'+
      state.manuscripts.map((p)=>
        '<tr data-part="'+escapeHtml(p.production_part_id)+'">'+
        '<td>'+escapeHtml(p.part_key)+'</td>'+
        '<td>'+escapeHtml(p.title)+'</td>'+
        '<td><span class="status '+statusClass(p.dashboard_state)+'">'+escapeHtml(p.dashboard_state)+'</span></td>'+
        '<td>'+(p.stage1_available?"✓":"—")+'</td>'+
        '<td>'+(p.stage2_available?"✓":"—")+'</td>'+
        '<td>'+(p.final_canon_available?"✓":"—")+'</td>'+
        '<td>'+escapeHtml(p.stage2_word_count??"—")+'</td>'+
        '</tr>'
      ).join("")+
      '</tbody></table>';

    document.querySelectorAll("#manuscript-table tbody tr").forEach((row)=>row.addEventListener("click",()=>openPart(row.dataset.part)));
  }catch(error){
    table.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
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
  const preferred=["family","species","rank","tier","role","type","region","map_type","category","subtype","rarity","quest_type","source_name","visibility","mode","first_roadmap_use"];
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
    const counts=data.counts||{};
    const groups=[
      ["Monsters",counts.monsters??0],["Classes",counts.classes??0],
      ["Professions",counts.professions??0],["Skills",counts.skills??0],
      ["Maps",counts.maps??0],["Items",counts.items??0],
      ["NPCs",counts.npcs??0],["Recipes",counts.recipes??0]
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
    if(!items.length){
      table.innerHTML='<div class="empty"><strong>No records.</strong><br>'+escapeHtml(domain)+' returned no matching rows.</div>';
      return;
    }
    table.innerHTML=
      '<div class="database-head"><span>'+escapeHtml(domain.toUpperCase())+'</span><small>'+escapeHtml(data.total??items.length)+' total records</small></div>'+
      '<div class="table-scroll"><table><thead><tr><th>Name</th><th>Code</th><th>Status</th><th>Key metadata</th><th>Staged edit</th></tr></thead><tbody>'+
      items.map((x)=>
        '<tr><td><strong>'+escapeHtml(x.name||"—")+'</strong></td>'+
        '<td><code>'+escapeHtml(x.code||"—")+'</code></td>'+
        '<td><span class="status review">'+escapeHtml(x.status||"—")+'</span></td>'+
        '<td class="meta-text">'+escapeHtml(compactMeta(x.meta))+'</td>'+
        '<td>'+(hasPermission("DATABASE_EDIT")?'<button class="db-stage-button" data-db-code="'+escapeHtml(x.code||"")+'">Stage change</button>':'<span class="muted">View only</span>')+'</td></tr>'
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
  if(!state.activeDatabaseRecord)staging.innerHTML='<div class="empty">Select “Stage change” on a database record. Direct table editing is disabled.</div>';
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

function renderDatabaseStaging(domain,record){
  state.activeDatabaseRecord={domain,record};
  const root=$("#database-staging");
  const allowed=state.databaseAllowedFields?.[domain]||[];
  root.innerHTML=
    '<div class="database-head"><span>Stage Change · '+escapeHtml(record.name||record.code)+'</span><small>'+escapeHtml(domain)+' · '+escapeHtml(record.code)+'</small></div>'+
    '<div class="db-stage-body">'+
      '<div class="admin-note compact"><strong>Staged-only editor</strong><p>IDs, codes, relationships, first-use anchors and other continuity pointers cannot be changed here. The proposal must validate before a separate approver can apply it.</p></div>'+
      '<div><small>Allowed fields</small><p class="db-allowed-fields">'+escapeHtml(allowed.join(", ")||"Loading allowlist…")+'</p></div>'+
      '<div><small>Current browser snapshot</small><pre class="db-json-preview">'+escapeHtml(JSON.stringify({name:record.name,status:record.status,meta:record.meta},null,2))+'</pre></div>'+
      (hasPermission("DATABASE_EDIT")
        ?'<form id="database-proposal-form" class="admin-control-form">'+
           '<strong>Create staged patch</strong>'+
           '<textarea name="patch" rows="7">{}</textarea>'+
           '<input name="reason" placeholder="Why this canonical database change is needed" required>'+
           '<button type="submit">Validate & Stage Proposal</button>'+
         '</form>'
        :'<div class="empty">DATABASE_EDIT is required to stage changes.</div>')+
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
      $("#database-staging").innerHTML='<div class="empty">Proposal staged. Select another database record to create a new change.</div>';
      await loadDatabaseProposals();
    }catch(error){alert(error.message);}
    finally{button.disabled=false;}
  });
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
    loadProduction();
  }catch(error){
    $("#production-view").innerHTML='<div class="panel"><div class="error">'+escapeHtml(error.message)+'</div></div>';
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
  cards.innerHTML='<div class="card"><span>Roadmap</span><strong>Loading…</strong></div>';
  details.innerHTML='<div class="empty">Loading roadmap authority…</div>';
  cutover.innerHTML='<div class="empty">Loading V2 cutover preflight…</div>';
  try{
    const [d,preflight]=await Promise.all([
      api("/admin/api/roadmap"),
      api("/admin/api/roadmap/cutover-preview")
    ]);
    const roads=d.roadmaps||[];
    const gates=d.gates||{};
    cards.innerHTML=
      roads.map(r=>'<div class="card"><span>Roadmap V'+escapeHtml(r.version_number)+'</span><strong>'+escapeHtml(r.status)+'</strong><small>'+escapeHtml(r.episodes)+' Episodes · '+escapeHtml(r.parts)+' Parts</small></div>').join("")+
      gateCard("Database gate",gates.database)+
      gateCard("Title gate",gates.titles)+
      gateCard("Registry consistency",gates.registry_consistency)+
      gateCard("First-use gate",gates.first_use);

    const snap=d.latest_pre_cutover_snapshot||{};
    details.innerHTML=
      '<div class="runtime">'+
        '<div><small>Target roadmap</small><strong>'+escapeHtml(d.target_roadmap_version_id||"—")+'</strong></div>'+
        '<div><small>Episode range</small><strong>'+escapeHtml((d.target_episode_range?.start??"—")+"–"+(d.target_episode_range?.end??"—"))+'</strong></div>'+
        '<div><small>Latest stored snapshot</small><strong>'+escapeHtml(snap.status||"—")+'</strong></div>'+
        '<div><small>Snapshot hash</small><strong><code>'+escapeHtml(snap.payload_hash?String(snap.payload_hash).slice(0,18)+"…":"—")+'</code></strong></div>'+
      '</div>';

    const blockers=preflight.blockers||[];
    const latest=preflight.latest_snapshot||{};
    const ready=preflight.status==="READY"&&(preflight.blocking_requirements||0)===0;
    const canActivate=hasPermission("ROADMAP_ACTIVATE");

    cutover.innerHTML=
      '<div class="database-head"><span>V2 Clean-Restart Cutover</span><small>'+escapeHtml(preflight.contract_version||"")+'</small></div>'+
      '<div class="cutover-body">'+
        '<div class="cutover-status '+(ready?"ready":"blocked")+'">'+
          '<strong>'+escapeHtml(ready?"READY":"BLOCKED")+'</strong>'+
          '<span>'+escapeHtml((preflight.blocking_requirements??0)+" blocker(s)")+'</span>'+
        '</div>'+
        '<div class="runtime">'+
          '<div><small>Source</small><strong>V'+escapeHtml(preflight.source_roadmap?.version??"—")+' · '+escapeHtml(preflight.source_roadmap?.status||"—")+'</strong></div>'+
          '<div><small>Target</small><strong>V'+escapeHtml(preflight.target_roadmap?.version??"—")+' · '+escapeHtml(preflight.target_roadmap?.status||"—")+'</strong></div>'+
          '<div><small>Snapshot</small><strong>'+escapeHtml(latest.status||"MISSING")+'</strong></div>'+
          '<div><small>Authority current</small><strong>'+escapeHtml(latest.authority_current?"YES":"NO")+'</strong></div>'+
          '<div><small>Historical V1 release items</small><strong>'+escapeHtml(preflight.historical_v1_release_items??0)+'</strong></div>'+
          '<div><small>Execute permission</small><strong>'+escapeHtml(canActivate?"ROADMAP_ACTIVATE":"NOT GRANTED")+'</strong></div>'+
        '</div>'+
        (blockers.length
          ?'<div class="cutover-blockers"><strong>Blocking conditions</strong><ul>'+blockers.map(b=>'<li><code>'+escapeHtml(b.code||"UNKNOWN")+'</code>'+(b.detail?' — '+escapeHtml(b.detail):'')+(b.batch_key?' — '+escapeHtml(b.batch_key):'')+'</li>').join("")+'</ul></div>'
          :'<div class="admin-note compact"><strong>All cutover preconditions pass.</strong><p>Execution will supersede V1 production authority, withdraw historical V1 release items, invalidate stale runtime packets, create fresh V2 E001–E005, and reset 014 to READY_FOR_AI2 / 202. It will not start AI2 and will not unpause releases.</p></div>')+
        (canActivate
          ?'<div class="cutover-actions">'+
             '<button id="refresh-cutover-snapshot">Create fresh pre-cutover snapshot</button>'+
             '<button id="activate-v2-cutover" class="danger-action" '+(ready?"":"disabled")+'>Activate V2 and restart E001</button>'+
           '</div>'
          :'<div class="empty">ROADMAP_ACTIVATE is required for snapshot creation and activation.</div>')+
      '</div>';

    if(canActivate){
      const refresh=$("#refresh-cutover-snapshot");
      if(refresh)refresh.addEventListener("click",async()=>{
        const reason=prompt("Reason for creating a fresh pre-cutover snapshot:")||"";
        if(!reason.trim())return;
        refresh.disabled=true;
        try{
          const result=await apiPost("/admin/api/roadmap/cutover-snapshot",{reason});
          alert("Snapshot "+result.status+"\n"+result.snapshot_id+"\n"+result.payload_hash);
          await loadRoadmap();
        }catch(error){alert(error.message);}
        finally{refresh.disabled=false;}
      });

      const activate=$("#activate-v2-cutover");
      if(activate)activate.addEventListener("click",async()=>{
        if(!ready)return;
        const confirmation=prompt("Type exactly:\nACTIVATE V2 AND RESTART E001")||"";
        if(confirmation!=="ACTIVATE V2 AND RESTART E001")return;
        const reason=prompt("Reason for activating Roadmap V2:")||"";
        if(!reason.trim())return;
        if(!latest.id||!latest.hash){
          alert("A current PASS pre-cutover snapshot is required.");
          return;
        }
        activate.disabled=true;
        try{
          const result=await apiPost("/admin/api/roadmap/activate-v2",{
            snapshot_id:latest.id,
            snapshot_hash:latest.hash,
            confirmation,
            reason
          });
          alert("V2 CUTOVER PASS\nBatch: "+(result.new_batch_key||"—")+"\nNext: "+(result.next_action_code||"—"));
          await loadRoadmap();
          await loadProduction();
        }catch(error){alert(error.message);}
        finally{activate.disabled=false;}
      });
    }
  }catch(error){
    cards.innerHTML="";
    details.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
    cutover.innerHTML="";
  }
}

async function loadContinuity(){
  const cards=$("#continuity-summary");
  const details=$("#continuity-details");
  cards.innerHTML='<div class="card"><span>Continuity</span><strong>Loading…</strong></div>';
  details.innerHTML='<div class="empty">Loading continuity state…</div>';
  try{
    const d=await api("/admin/api/continuity");
    const r=d.registry_requirements||{},p=d.progression||{},b=d.bindings||{},rel=d.release_safety||{},run=d.runtime||{};
    cards.innerHTML=
      '<div class="card"><span>Registry READY</span><strong>'+escapeHtml((r.ready??0)+" / "+(r.total??0))+'</strong></div>'+
      '<div class="card"><span>Registry blocked</span><strong>'+escapeHtml(r.blocked??0)+'</strong></div>'+
      '<div class="card"><span>Required progression gaps</span><strong>'+escapeHtml(p.required_incomplete??0)+'</strong></div>'+
      '<div class="card"><span>Optional branch warnings</span><strong>'+escapeHtml(p.optional_profession_incomplete??0)+'</strong></div>'+
      '<div class="card"><span>First-use exact</span><strong>'+escapeHtml((b.first_use_exact??0)+" / "+(b.first_use_rows??0))+'</strong></div>'+
      '<div class="card"><span>Public reveal plans</span><strong>'+escapeHtml(b.approved_public_reveals??0)+'</strong></div>'+
      '<div class="card"><span>Runtime skill grants</span><strong>'+escapeHtml(run.character_skill_state??0)+'</strong></div>'+
      '<div class="card"><span>Release safety</span><strong>'+escapeHtml(rel.paused&&!rel.launch_authorized?"PAUSED / SAFE":"CHECK")+'</strong></div>';
    const warnings=d.warnings||[];
    details.innerHTML=
      '<div class="database-head"><span>Continuity bindings</span><small>read-only</small></div>'+
      '<div class="runtime">'+
        '<div><small>Class gate plans</small><strong>'+escapeHtml(b.class_gate_plans??0)+'</strong></div>'+
        '<div><small>Profession gate plans</small><strong>'+escapeHtml(b.profession_gate_plans??0)+'</strong></div>'+
        '<div><small>Skill unlock rows</small><strong>'+escapeHtml(b.skill_unlock_rows??0)+'</strong></div>'+
        '<div><small>Temporal rows</small><strong>'+escapeHtml(b.temporal_rows??0)+'</strong></div>'+
      '</div>'+
      (warnings.length?'<div class="admin-note"><strong>Non-blocking warnings</strong><p>'+warnings.map(w=>escapeHtml(w.code)+": "+escapeHtml(w.count)).join(" · ")+'</p></div>':'');
  }catch(error){
    cards.innerHTML="";
    details.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
  }
}

async function loadAuthority(){
  const root=$("#authority-table");
  root.innerHTML='<div class="empty">Loading active authority index…</div>';
  try{
    const d=await api("/admin/api/authority");
    const rows=d.authorities||[];
    root.innerHTML=rows.length
      ?'<div class="table-scroll"><table><thead><tr><th>Key</th><th>Title</th><th>Type</th><th>Version</th><th>Hash</th></tr></thead><tbody>'+
        rows.map(a=>'<tr><td><code>'+escapeHtml(a.authority_key)+'</code></td><td>'+escapeHtml(a.title||"—")+'</td><td>'+escapeHtml(a.authority_type||"—")+'</td><td>'+escapeHtml(a.active_version??"—")+'</td><td><code>'+escapeHtml(a.content_hash?String(a.content_hash).slice(0,16)+"…":"—")+'</code></td></tr>').join("")+
        '</tbody></table></div>'
      :'<div class="empty">No active authority documents found.</div>';
  }catch(error){
    root.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
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
    const data=await api("/admin/api/manuscripts/"+state.activePart.production_part_id+"/versions/"+stage);
    if(data.status&&data.status!=="OK"){
      renderMeta({stage,version_number:"—",word_count:"—",content_hash:null,source_system:"—",created_by_engine:"—"});
      body.textContent=stage==="final"
        ?"Final Canon is not available yet. The real 103 closeout has not run."
        :"Version not available.";
      return;
    }
    renderMeta(data);
    body.textContent=data.body_text||"";
  }catch(error){
    body.textContent=error.message;
  }
}

async function openPart(partId){
  const p=state.manuscripts.find((x)=>x.production_part_id===partId);
  if(!p)return;
  state.activePart=p;
  $("#viewer-key").textContent=p.part_key;
  $("#viewer-title").textContent=p.title;
  $("#viewer").showModal();
  await showVersion("stage2");
}

async function compareCurrent(){
  if(!state.activePart)return;
  const body=$("#manuscript-body");
  body.textContent="Loading comparison…";
  try{
    const data=await api("/admin/api/manuscripts/"+state.activePart.production_part_id+"/compare?from=stage1&to=stage2");
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
    const data=await api("/admin/api/manuscripts/"+state.activePart.production_part_id+"/preview?stage="+state.activeStage);
    if(data.status&&data.status!=="OK")throw new Error("This version is not available for preview.");
    $("#preview-body").textContent=data.body_text||"";
    $("#preview").showModal();
  }catch(error){
    alert(error.message);
  }
}

function switchView(name){
  $$(".view").forEach((x)=>x.classList.add("hidden"));
  $$(".nav").forEach((x)=>x.classList.toggle("active",x.dataset.view===name));
  $("#"+name+"-view").classList.remove("hidden");
  const titles={production:"Production Dashboard",manuscripts:"Manuscript Library",releases:"Release Queue",roadmap:"Roadmap",continuity:"Continuity",authority:"Authority",access:"Access & Audit",database:"Game Database",codex:"Codex",support:"Support",messages:"Reader Messages",readers:"Readers",community:"Community",settings:"Settings"};
  $("#page-title").textContent=titles[name]||"Control Center";
  if(name==="manuscripts")loadManuscripts();
  if(name==="releases")loadReleases();
  if(name==="roadmap")loadRoadmap();
  if(name==="continuity")loadContinuity();
  if(name==="authority")loadAuthority();
  if(name==="access")loadAccess();
  if(name==="database"){loadDatabaseSummary();loadDatabase();loadDatabaseProposals();}
  if(name==="codex")loadCodex();
  if(name==="support")loadSupport();
  if(name==="messages")loadMessages();
  if(name==="readers")loadReaders();
  if(name==="community")loadCommunity();
  if(name==="settings")loadSettings();
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

initializeAdmin();
