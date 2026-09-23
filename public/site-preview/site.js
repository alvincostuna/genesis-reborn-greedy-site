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

function firstRow(x){return Array.isArray(x)?x[0]:x}
function fmtTime(ts){if(!ts)return null;return new Intl.DateTimeFormat("en-PH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Manila"}).format(new Date(ts))}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

async function loadBrand(){
  try{
    const b=firstRow(await rpc("api_brand_identity"));
    if(!b)return;
    document.querySelector("#master-tagline").textContent=b.master_tagline;
    document.querySelector("#about-tagline").textContent=b.master_tagline;
  }catch(e){console.warn("brand",e)}
}

let timer=null;
function startCountdown(ts,paused){
  const el=document.querySelector("#countdown");
  if(timer)clearInterval(timer);
  if(paused||!ts){el.textContent=paused?"PAUSED":"—";return}
  const target=new Date(ts).getTime();
  const tick=()=>{
    const d=Math.max(0,target-Date.now());
    const h=Math.floor(d/36e5),m=Math.floor((d%36e5)/6e4),s=Math.floor((d%6e4)/1000);
    el.textContent=String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  };
  tick();timer=setInterval(tick,1000);
}

async function loadRelease(){
  try{
    const [pRaw,cRaw]=await Promise.all([rpc("api_release_policy"),rpc("api_release_clock")]);
    const p=firstRow(pRaw),c=firstRow(cRaw);
    const paused=!!p?.releases_paused;
    document.querySelector("#release-state").textContent=paused?"RELEASES PAUSED":"RELEASES ACTIVE";
    document.querySelector("#release-heading").textContent=p?.launch_authorized?"Release schedule":"Launch preparation";
    document.querySelector("#release-copy").textContent=
      "Episodes 1–"+(p?.launch_episode_count??10)+" launch together. After launch: one "+(p?.ongoing_release_unit??"Part")+" every "+(p?.cycle_hours??8)+" hours.";
    const next=c?.next_publish_at;
    document.querySelector("#next-release").textContent=next?"Next scheduled: "+fmtTime(next):"Launch time not set";
    startCountdown(next,paused);
  }catch(e){console.warn("release",e)}
}

async function loadEpisodes(){
  try{
    const rows=await rpc("api_episode_library");
    if(!Array.isArray(rows)||!rows.length)return;
    document.querySelector("#episode-grid").innerHTML=rows.slice(0,10).map(x=>
      '<article class="story-card"><small>EPISODE '+esc(x.episode_number)+'</small><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary_public||"Released story episode.")+'</p><p>'+esc(x.released_parts)+' released Parts</p></article>'
    ).join("");
  }catch(e){console.warn("episodes",e)}
}

async function loadCodex(){
  try{
    const rows=await rpc("api_entity_search",{p_type:null,p_query:null,p_limit:6});
    if(!Array.isArray(rows)||!rows.length)return;
    document.querySelector("#codex-grid").innerHTML=rows.map(x=>
      '<article class="codex-card"><small>'+esc(String(x.entity_type||"CODEX").toUpperCase())+'</small><h3>'+esc(x.public_name)+'</h3><p>'+esc(x.short_description||"Revealed GENESIS knowledge.")+'</p></article>'
    ).join("");
  }catch(e){console.warn("codex",e)}
}

const hero=document.querySelector("#hero-image");
hero.addEventListener("error",()=>{hero.style.display="none"});

await Promise.all([loadBrand(),loadRelease(),loadEpisodes(),loadCodex()]);
