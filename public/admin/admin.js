const state={manuscripts:[],activePart:null,activeStage:"stage2",rbac:null};
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
      '<th>Part</th><th>Title</th><th>State</th><th>S1</th><th>S2</th><th>Final</th><th>Words (S2)</th>'+
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

    $("#manuscript-table tbody tr").forEach((row)=>row.addEventListener("click",()=>openPart(row.dataset.part)));
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
      '<div class="table-scroll"><table><thead><tr><th>Name</th><th>Code</th><th>Status</th><th>Key metadata</th></tr></thead><tbody>'+
      items.map((x)=>
        '<tr><td><strong>'+escapeHtml(x.name||"—")+'</strong></td>'+
        '<td><code>'+escapeHtml(x.code||"—")+'</code></td>'+
        '<td><span class="status review">'+escapeHtml(x.status||"—")+'</span></td>'+
        '<td class="meta-text">'+escapeHtml(compactMeta(x.meta))+'</td></tr>'
      ).join("")+
      '</tbody></table></div>';
  }catch(error){
    table.innerHTML='<div class="error">'+escapeHtml(error.message)+'</div>';
  }
}



function adminBadge(badge){
  if(!badge)return "";
  return '<span class="status '+(badge==="VIP"?"final":"review")+'">'+escapeHtml(badge)+'</span>';
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

async function loadCommunity(){
  const fan=$("#pending-fan-posts");
  const reports=$("#community-reports");
  const summary=$("#community-summary");
  fan.innerHTML='<div class="empty">Loading fan moderation queue…</div>';
  reports.innerHTML='<div class="empty">Loading reports…</div>';
  try{
    const [queue,support]=await Promise.all([api("/admin/api/community"),api("/admin/api/support/summary")]);
    summary.innerHTML=
      '<div class="card"><span>Pending fan posts</span><strong>'+escapeHtml(support.pending_fan_posts??0)+'</strong></div>'+
      '<div class="card"><span>Open reports</span><strong>'+escapeHtml(support.open_reports??0)+'</strong></div>'+
      '<div class="card"><span>Comments</span><strong>ENABLED</strong></div>'+
      '<div class="card"><span>Reader uploads</span><strong>'+escapeHtml(support.fan_posting_enabled?"ENABLED":"OFF")+'</strong></div>';

    const posts=queue.pending_fan_posts||[];
    fan.innerHTML=posts.length?posts.map(p=>
      '<div class="moderation-row"><div><strong>'+escapeHtml(p.display_name||"Reader")+'</strong>'+adminBadge(p.badge)+'<p>'+escapeHtml(p.caption||"No caption")+'</p></div><code>'+escapeHtml(p.media_object_path||"")+'</code></div>'
    ).join(""):'<div class="empty">No pending Fan Page posts.</div>';

    const rs=queue.reports||[];
    reports.innerHTML=rs.length?rs.map(r=>
      '<div class="moderation-row"><div><strong>'+escapeHtml(r.target_type)+'</strong><p>'+escapeHtml(r.reason||"")+'</p></div><code>'+escapeHtml(r.target_id)+'</code></div>'
    ).join(""):'<div class="empty">No open community reports.</div>';
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
  const titles={production:"Production Dashboard",manuscripts:"Manuscript Library",releases:"Release Queue",roadmap:"Roadmap",continuity:"Continuity",authority:"Authority",access:"Access & Audit",database:"Game Database",support:"Support",messages:"Reader Messages",community:"Community"};
  $("#page-title").textContent=titles[name]||"Control Center";
  if(name==="manuscripts")loadManuscripts();
  if(name==="releases")loadReleases();
  if(name==="roadmap")loadRoadmap();
  if(name==="continuity")loadContinuity();
  if(name==="authority")loadAuthority();
  if(name==="access")loadAccess();
  if(name==="database"){loadDatabaseSummary();loadDatabase();}
  if(name==="support")loadSupport();
  if(name==="messages")loadMessages();
  if(name==="community")loadCommunity();
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
