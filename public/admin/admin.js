const state={manuscripts:[],activePart:null,activeStage:"stage2"};
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
    const payload=await api("/admin/api/production");
    const runtime=payload.runtime||{};
    const dash=payload.dashboard||{};
    const metrics=dash.metrics||{};
    const paused=metrics.releases_paused!==false;

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
        '<div><small>AI-2 gate</small><strong>'+escapeHtml(runtime.ai2_gate||"—")+'</strong></div>'+
      '</div>';
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
  const table=$("#release-table");
  cards.innerHTML='<div class="card"><span>Release policy</span><strong>Loading…</strong></div>';
  table.innerHTML='<div class="empty">Loading release queue…</div>';
  try{
    const [data,envelope]=await Promise.all([
      api("/admin/api/releases"),
      api("/admin/api/release-policy")
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

    const items=data.items||[];
    if(!items.length){
      table.innerHTML='<div class="empty"><strong>No release items yet.</strong><br>Correct for pre-launch: the fresh E001–E010 Final Canon launch batch has not been created.</div>';
      return;
    }
    table.innerHTML=
      '<table><thead><tr><th>Part</th><th>Title</th><th>Status</th><th>Mode</th><th>Publish at</th></tr></thead><tbody>'+
      items.map((x)=>
        '<tr><td>'+escapeHtml(x.part_key)+'</td><td>'+escapeHtml(x.title)+'</td><td>'+escapeHtml(x.release_status)+'</td><td>'+escapeHtml(x.release_mode)+'</td><td>'+escapeHtml(x.publish_at||"—")+'</td></tr>'
      ).join("")+
      '</tbody></table>';
  }catch(error){
    cards.innerHTML='';
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
  const titles={production:"Production Dashboard",manuscripts:"Manuscript Library",releases:"Release Queue",database:"Game Database"};
  $("#page-title").textContent=titles[name]||"Control Center";
  if(name==="manuscripts")loadManuscripts();
  if(name==="releases")loadReleases();
  if(name==="database"){loadDatabaseSummary();loadDatabase();}
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

loadProduction();
