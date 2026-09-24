const SUPABASE_URL="https://lyhrwymhzhhxszquxnke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_rCJL18_zLNtWH-ON1DTnDA_3quoGH3Q";

async function rpc(name,params={}){
  const r=await fetch(SUPABASE_URL+"/rest/v1/rpc/"+name,{
    method:"POST",
    headers:{
      "apikey":SUPABASE_PUBLISHABLE_KEY,
      "Authorization":"Bearer "+SUPABASE_PUBLISHABLE_KEY,
      "Content-Type":"application/json",
      "Accept":"application/json"
    },
    body:JSON.stringify(params)
  });
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function firstRow(v){return Array.isArray(v)?v[0]:v}
function textParagraphs(v){
  const parts=String(v||"").trim().split(/\n\s*\n/).filter(Boolean);
  return parts.map(p=>"<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("");
}
function entityCard(x,kind="codex"){
  const fields=x?.revealed_fields&&typeof x.revealed_fields==="object"?Object.keys(x.revealed_fields):[];
  return '<article class="'+kind+'-card"><small>'+esc(x.entity_type||"CODEX")+'</small><h2>'+esc(x.public_name||x.entity_code||"Revealed entry")+'</h2><p>'+esc(x.short_description||"Revealed GENESIS knowledge.")+'</p>'+(fields.length?'<div class="reveal-fields">Revealed fields: '+esc(fields.slice(0,6).join(", "))+'</div>':"")+'</article>';
}

async function initRead(){
  const releaseMini=document.querySelector("#release-mini");
  try{
    const p=firstRow(await rpc("api_release_policy"));
    releaseMini.textContent=(p?.releases_paused?"PAUSED · ":"")+"Episodes 1–"+(p?.launch_episode_count??10)+" · then 1 "+(p?.ongoing_release_unit??"Part")+" every "+(p?.cycle_hours??8)+" hours";
  }catch{}
  let episodes=[];
  try{episodes=await rpc("api_episode_library")}catch{}
  if(!Array.isArray(episodes)||!episodes.length)return;
  const list=document.querySelector("#episode-list");
  document.querySelector("#episode-count").textContent=episodes.length+" released";
  list.innerHTML=episodes.map((e,i)=>
    '<button class="episode-button" data-episode="'+esc(e.episode_number)+'"><small>EPISODE '+esc(e.episode_number)+'</small><strong>'+esc(e.title)+'</strong></button>'
  ).join("");
  async function openEpisode(number){
    document.querySelectorAll(".episode-button").forEach(b=>b.classList.toggle("active",b.dataset.episode===String(number)));
    const episode=episodes.find(e=>String(e.episode_number)===String(number));
    const head=document.querySelector("#novel-head");
    head.innerHTML='<p class="eyebrow">EPISODE '+esc(number)+'</p><h2>'+esc(episode?.title||"GENESIS")+'</h2><p>'+esc(episode?.summary_public||"Released Final Canon.")+'</p>';
    let parts=[];
    try{parts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(number)})}catch{}
    const tabs=document.querySelector("#part-tabs");
    const body=document.querySelector("#novel-body");
    if(!Array.isArray(parts)||!parts.length){
      tabs.innerHTML="";
      body.innerHTML='<div class="empty-state large">No released Parts are available for this Episode yet.</div>';
      return;
    }
    tabs.innerHTML=parts.map((p,i)=>'<button data-part="'+i+'" class="'+(i===0?"active":"")+'">Part '+esc(p.part_number)+'</button>').join("");
    const openPart=async(idx)=>{
      const part=parts[idx];
      tabs.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("active",i===idx));
      const access=part.access_mode&&part.access_mode!=="PUBLIC"?' · '+part.access_mode+' EARLY ACCESS':'';
      body.innerHTML='<div class="status-chip">Part '+esc(part.part_number)+' · '+esc(part.title||"")+esc(access)+'</div>'+textParagraphs(part.body_text||"");
      const panel=document.querySelector("#comments-panel");
      const list=document.querySelector("#part-comments");
      panel?.classList.remove("hidden");
      if(list&&part.part_id){
        list.innerHTML='<div class="empty-state">Loading comments…</div>';
        try{
          const comments=await rpc("api_part_comments",{p_part_id:part.part_id});
          if(!Array.isArray(comments)||!comments.length){
            list.innerHTML='<div class="empty-state">No comments yet. Be the first to share a reaction or prediction when reader accounts open.</div>';
          }else{
            list.innerHTML=comments.map(c=>'<article class="comment-card"><div class="comment-meta"><strong>'+esc(c.display_name||"Reader")+'</strong>'+(c.badge?'<span class="reader-badge '+(c.badge==="VIP"?"vip":"")+'">'+esc(c.badge)+'</span>':'')+'<small>'+esc(new Date(c.created_at).toLocaleString())+'</small></div><div>'+esc(c.body)+'</div></article>').join("");
          }
        }catch{
          list.innerHTML='<div class="empty-state">Comments are temporarily unavailable.</div>';
        }
      }
      window.scrollTo({top:0,behavior:"smooth"});
    };
    tabs.querySelectorAll("button").forEach((b,i)=>b.addEventListener("click",()=>openPart(i)));
    openPart(0);
  }
  list.querySelectorAll(".episode-button").forEach(b=>b.addEventListener("click",()=>openEpisode(b.dataset.episode)));
  openEpisode(episodes[0].episode_number);
}

async function loadWorld(type){
  const grid=document.querySelector("#world-grid");
  grid.innerHTML='<div class="empty-state large">Loading revealed '+esc(type)+' records…</div>';
  try{
    let rows=[];
    if(type==="equipment"){
      const [w,a]=await Promise.all([
        rpc("api_entity_search",{p_type:"weapon",p_query:null,p_limit:12}),
        rpc("api_entity_search",{p_type:"armor",p_query:null,p_limit:12})
      ]);
      rows=[...(Array.isArray(w)?w:[]),...(Array.isArray(a)?a:[])].slice(0,18);
    }else{
      rows=await rpc("api_entity_search",{p_type:type,p_query:null,p_limit:18});
    }
    if(!Array.isArray(rows)||!rows.length){
      grid.innerHTML='<div class="empty-state large">No '+esc(type)+' records have been revealed by released Parts yet.</div>';
      return;
    }
    grid.innerHTML=rows.map(x=>entityCard(x,"world")).join("");
  }catch(e){
    grid.innerHTML='<div class="empty-state large">World preview is temporarily unavailable.</div>';
  }
}
function initWorld(){
  const buttons=[...document.querySelectorAll("[data-world-type]")];
  buttons.forEach(b=>b.addEventListener("click",()=>{
    buttons.forEach(x=>x.classList.toggle("active",x===b));
    loadWorld(b.dataset.worldType);
  }));
  loadWorld("map");
}

async function loadCodex(){
  const results=document.querySelector("#codex-results");
  const type=document.querySelector("#codex-type").value||null;
  const query=document.querySelector("#codex-search").value.trim()||null;
  results.innerHTML='<div class="empty-state large">Searching revealed database…</div>';
  try{
    const rows=await rpc("api_entity_search",{p_type:type,p_query:query,p_limit:60});
    if(!Array.isArray(rows)||!rows.length){
      results.innerHTML='<div class="empty-state large">No revealed Codex records match this search.</div>';
      return;
    }
    results.innerHTML=rows.map(x=>entityCard(x,"codex")).join("");
  }catch{
    results.innerHTML='<div class="empty-state large">Codex is temporarily unavailable.</div>';
  }
}
function initCodex(){
  document.querySelector("#codex-search-button").addEventListener("click",loadCodex);
  document.querySelector("#codex-type").addEventListener("change",loadCodex);
  document.querySelector("#codex-search").addEventListener("keydown",e=>{if(e.key==="Enter")loadCodex()});
  loadCodex();
}


async function initHome(){
  const countdown=document.querySelector("#cycle-countdown");
  const label=document.querySelector("#cycle-next-time");
  if(!countdown||!label)return;

  let nextAt=null;
  let timer=null;

  const formatNext=(date)=>new Intl.DateTimeFormat("en-PH",{
    timeZone:"Asia/Manila",hour:"numeric",minute:"2-digit",hour12:true,
    month:"short",day:"numeric"
  }).format(date)+" PHT";

  const tick=()=>{
    if(!nextAt)return;
    const ms=nextAt.getTime()-Date.now();
    if(ms<=0){
      clearInterval(timer);
      loadCycle();
      return;
    }
    const total=Math.floor(ms/1000);
    const h=String(Math.floor(total/3600)).padStart(2,"0");
    const m=String(Math.floor((total%3600)/60)).padStart(2,"0");
    const s=String(total%60).padStart(2,"0");
    countdown.textContent=h+":"+m+":"+s;
  };

  const loadCycle=async()=>{
    try{
      const clock=firstRow(await rpc("api_release_clock"));
      const raw=clock?.next_cycle_at;
      if(!raw)throw new Error("No cycle");
      nextAt=new Date(raw);
      label.textContent="Next · "+formatNext(nextAt)+" · 8-hour cycle";
      tick();
      timer=setInterval(tick,1000);
    }catch{
      countdown.textContent="8 HOURS";
      label.textContent="Genesis cycle · Asia/Manila";
    }
  };

  await loadCycle();
}

const page=document.body.dataset.page;
if(page==="home")await initHome();
if(page==="read")await initRead();
if(page==="world")initWorld();
if(page==="codex")initCodex();
if(page==="fan")await initFan();
if(page==="support")await initSupport();

async function initFan(){
  const feed=document.querySelector("#fan-feed");
  try{
    const rows=await rpc("api_fan_feed",{p_limit:30,p_offset:0});
    if(!Array.isArray(rows)||!rows.length){
      feed.innerHTML='<div class="empty-state large">No Fan Page posts yet. Reader uploads are prepared but remain disabled during preview.</div>';
      return;
    }
    feed.innerHTML=rows.map(p=>'<article class="fan-post"><div class="fan-media">Image stored privately</div><div class="fan-copy"><div class="fan-author"><strong>'+esc(p.display_name||"Reader")+'</strong>'+(p.badge?'<span class="reader-badge '+(p.badge==="VIP"?"vip":"")+'">'+esc(p.badge)+'</span>':'')+'</div><p>'+esc(p.caption||"")+'</p></div></article>').join("");
  }catch{
    feed.innerHTML='<div class="empty-state large">Fan Page is temporarily unavailable.</div>';
  }
}

async function initSupport(){
  const notice=document.querySelector("#support-status");
  try{
    const data=await rpc("api_support_catalog");
    const s=data?.settings||{};
    if(notice){
      const enabled=!!s.payments_enabled||!!s.pure_support_enabled||!!s.share_rewards_enabled;
      notice.innerHTML='<strong>'+(enabled?'Support services active':'Preview mode')+'</strong><span>'+
        (enabled?'Available support features follow the limits shown below.':'Payments, pure support, and share rewards are intentionally disabled until final testing and provider setup.')+
        '</span>';
    }
  }catch{}
}
