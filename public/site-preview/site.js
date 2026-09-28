const SUPABASE_URL="https://lyhrwymhzhhxszquxnke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_rCJL18_zLNtWH-ON1DTnDA_3quoGH3Q";

const SESSION_KEY="genesis_reader_session_v1";
const TIER_EXP_THRESHOLD=1000;

function accountPath(){
  return location.pathname.startsWith("/site-preview/")?"/site-preview/account/":"/account/";
}
function accountUrl(){return location.origin+accountPath()}
function readStoredSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}
}
function saveSession(s){
  if(!s){localStorage.removeItem(SESSION_KEY);return null}
  const expiresAt=s.expires_at||Math.floor(Date.now()/1000)+(Number(s.expires_in)||3600);
  const value={...s,expires_at:expiresAt};
  localStorage.setItem(SESSION_KEY,JSON.stringify(value));
  return value;
}
function captureAuthHash(){
  const raw=location.hash.startsWith("#")?location.hash.slice(1):"";
  if(!raw)return null;
  const p=new URLSearchParams(raw);
  const access_token=p.get("access_token");
  const refresh_token=p.get("refresh_token");
  if(!access_token||!refresh_token)return null;
  const session=saveSession({
    access_token,refresh_token,
    expires_in:Number(p.get("expires_in")||3600),
    token_type:p.get("token_type")||"bearer",
    type:p.get("type")||null
  });
  history.replaceState({},document.title,location.pathname+location.search);
  return session;
}
async function authRequest(path,{method="POST",body=null,token=null}={}){
  const headers={"apikey":SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json","Accept":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  const r=await fetch(SUPABASE_URL+"/auth/v1/"+path,{method,headers,body:body===null?null:JSON.stringify(body)});
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(!r.ok)throw new Error(data.msg||data.message||data.error_description||data.error||"Authentication request failed");
  return data;
}
async function refreshSession(session){
  if(!session?.refresh_token)return null;
  try{
    const next=await authRequest("token?grant_type=refresh_token",{body:{refresh_token:session.refresh_token}});
    return saveSession(next);
  }catch{
    saveSession(null);
    return null;
  }
}
async function getSession(){
  const fromHash=captureAuthHash();
  let s=fromHash||readStoredSession();
  if(!s)return null;
  if((Number(s.expires_at)||0)-60<=Math.floor(Date.now()/1000))s=await refreshSession(s);
  return s;
}
async function getAuthUser(session){
  if(!session?.access_token)return null;
  try{return await authRequest("user",{method:"GET",token:session.access_token})}catch{return null}
}
async function rpc(name,params={},accessToken=null){
  const bearer=accessToken||SUPABASE_PUBLISHABLE_KEY;
  const r=await fetch(SUPABASE_URL+"/rest/v1/rpc/"+name,{
    method:"POST",
    headers:{
      "apikey":SUPABASE_PUBLISHABLE_KEY,
      "Authorization":"Bearer "+bearer,
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
async function loadRewardManifest(){
  try{
    const r=await fetch("/assets/v27/rewards/reward-manifest.json",{cache:"no-store"});
    if(!r.ok)throw new Error("manifest unavailable");
    const data=await r.json();
    return Array.isArray(data?.first_upload_batch)?data.first_upload_batch:[];
  }catch{return []}
}
function rewardTypeLabel(v){return String(v||"PICTURE_CARD").replaceAll("_"," ")}
function rewardCardHtml(item,{owned=false,quantity=0,eligible=true,compact=false}={}){
  const file=item?.filename||(item?.image_url||item?.preview_url||"").split("/").pop();
  const src=item?.preview_url||item?.image_url||(file?"/assets/v27/rewards/"+file:"");
  const title=item?.title||"GENESIS Reward";
  const rarity=item?.rarity||"REWARD";
  const type=item?.type||item?.asset_type||"PICTURE_CARD";
  const state=owned?"earned":(eligible?"available":"locked");
  const portrait=/CHARACTER_PICTURE|MOBILE_WALLPAPER/.test(String(type||""));
  return '<article class="reward-state-card '+state+(portrait?" portrait":"")+(compact?" compact":"")+'">'+
    '<div class="reward-state-art">'+(src?'<img src="'+esc(src)+'" alt="'+esc(title)+'">':'')+
    (!owned?'<span class="reward-lock">'+(eligible?"◇":"🔒")+'</span>':'')+'</div>'+
    '<div class="reward-state-copy"><small>'+esc(rarity)+' · '+esc(rewardTypeLabel(type))+'</small>'+
    '<strong>'+esc(title)+'</strong>'+
    '<span>'+(owned?("Earned"+(quantity>1?" ×"+quantity:"")):(eligible?"Available in random draw":"Locked by story progress"))+'</span></div>'+
    '</article>';
}
async function edgeFunction(name,body,accessToken){
  const r=await fetch(SUPABASE_URL+"/functions/v1/"+name,{
    method:"POST",
    headers:{
      "apikey":SUPABASE_PUBLISHABLE_KEY,
      "Authorization":"Bearer "+accessToken,
      "Content-Type":"application/json",
      "Accept":"application/json"
    },
    body:JSON.stringify(body||{})
  });
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(!r.ok)throw new Error(data.detail||data.error||data.message||"Request failed");
  return data;
}

function entityCard(x,kind="codex"){
  const fields=x?.revealed_fields&&typeof x.revealed_fields==="object"?Object.keys(x.revealed_fields):[];
  return '<article class="'+kind+'-card"><small>'+esc(x.entity_type||"CODEX")+'</small><h2>'+esc(x.public_name||x.entity_code||"Revealed entry")+'</h2><p>'+esc(x.short_description||"Revealed GENESIS knowledge.")+'</p>'+(fields.length?'<div class="reveal-fields">Revealed fields: '+esc(fields.slice(0,6).join(", "))+'</div>':"")+'</article>';
}


async function initAuthChrome(){
  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  document.querySelectorAll("[data-auth-link]").forEach(link=>{
    link.href=accountPath();
    link.textContent=user?"Account":"Sign in";
    link.classList.toggle("signed-in",!!user);
  });
  return {session,user};
}

function showAuthMessage(message,kind="info"){
  const box=document.querySelector("#auth-message");
  if(!box)return;
  box.textContent=message;
  box.className="account-message "+kind;
}

async function initAccount(){
  const guest=document.querySelector("#auth-guest");
  const reader=document.querySelector("#auth-reader");
  const recovery=document.querySelector("#recovery-panel");
  let session=await getSession();
  let user=session?await getAuthUser(session):null;

  const hashType=new URLSearchParams((location.hash||"").replace(/^#/,"")).get("type");
  if(hashType==="recovery"&&session){
    guest?.classList.add("hidden");
    reader?.classList.add("hidden");
    recovery?.classList.remove("hidden");
  }

  const render=async()=>{
    session=await getSession();
    user=session?await getAuthUser(session):null;
    if(!user){
      guest?.classList.remove("hidden");
      reader?.classList.add("hidden");
      recovery?.classList.add("hidden");
      return;
    }
    guest?.classList.add("hidden");
    reader?.classList.remove("hidden");
    document.querySelector("#account-email").textContent=user.email||"";
    try{
      const data=await rpc("api_reader_account",{},session.access_token);
      document.querySelector("#account-display-name").textContent=data?.display_name||"Reader";
      document.querySelector("#profile-display-name").value=data?.display_name||"Reader";
      document.querySelector("#account-credits").textContent=String(data?.support?.credit_balance??0)+" Parts";
      document.querySelector("#account-vip").textContent=data?.support?.vip_active?"Active":"Inactive";
      document.querySelector("#account-badge").textContent=data?.support?.public_badge||"None";
      document.querySelector("#badge-supporter").checked=!!data?.show_supporter_badge;
      document.querySelector("#badge-vip").checked=!!data?.show_vip_badge;
      const totalExp=Number(data?.reader_exp??data?.total_exp??0),tier=Math.floor(totalExp/TIER_EXP_THRESHOLD)+1,within=totalExp%TIER_EXP_THRESHOLD;
      document.querySelector("#profile-tier-badge").textContent="Tier "+tier;
      document.querySelector("#profile-exp-total").textContent=totalExp.toLocaleString()+" EXP";
      document.querySelector("#profile-next-tier").textContent=(TIER_EXP_THRESHOLD-within).toLocaleString()+" to next Tier";
      document.querySelector("#profile-exp-bar").style.width=Math.min(100,within/TIER_EXP_THRESHOLD*100)+"%";
      document.querySelector("#profile-title-badge").textContent=data?.reader_title||data?.support?.public_badge||"GENESIS Adventurer";
      document.querySelector("#profile-latest-read").textContent=data?.latest_read_label||data?.reading_progress?.latest_label||"Not started";
      document.querySelector("#profile-parts-read").textContent=String(data?.parts_read??data?.reading_progress?.parts_read??0);
      document.querySelector("#profile-episodes-complete").textContent=String(data?.episodes_completed??data?.reading_progress?.episodes_completed??0);
      document.querySelector("#profile-joined").textContent=data?.created_at?new Date(data.created_at).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"}):"—";
      document.querySelector("#profile-collection-count").textContent=String(data?.collection_count??0)+" Unlocked";
      const collectionGrid=document.querySelector("#profile-collection-grid");
      if(collectionGrid){
        let rewards=[];
        try{
          const collection=await rpc("api_reader_collectibles_v1",{},session.access_token);
          rewards=Array.isArray(collection)?collection:(Array.isArray(collection?.items)?collection.items:[]);
        }catch{}
        if(!rewards.length){
          const manifest=await loadRewardManifest();
          rewards=manifest.map((x,i)=>({...x,owned:i<Math.min(Number(data?.collection_count??0),manifest.length),quantity:i<Number(data?.collection_count??0)?1:0,eligible:true}));
        }
        collectionGrid.innerHTML=rewards.slice(0,10).map(x=>rewardCardHtml(x,{
          owned:!!(x.owned||Number(x.quantity)>0),
          quantity:Number(x.quantity||0),
          eligible:x.eligible!==false,
          compact:true
        })).join("")||'<div class="reward-vault-empty">No collectible rewards available yet.</div>';
      }
      const pendingDraws=Number(data?.pending_reward_draws??0);
      const pendingEl=document.querySelector("#profile-pending-draws");
      if(pendingEl)pendingEl.textContent=pendingDraws+" Reward Draw"+(pendingDraws===1?"":"s")+" Ready";
    }catch(e){
      showAuthMessage("Signed in, but account status could not be loaded yet.","error");
    }
  };

  document.querySelector("#signin-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      const email=document.querySelector("#signin-email").value.trim();
      const password=document.querySelector("#signin-password").value;
      const data=await authRequest("token?grant_type=password",{body:{email,password}});
      saveSession(data);
      showAuthMessage("Signed in successfully.","success");
      await render();
      await initAuthChrome();
    }catch(err){showAuthMessage(err.message,"error")}
  });

  document.querySelector("#signup-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      const display_name=document.querySelector("#signup-name").value.trim();
      const email=document.querySelector("#signup-email").value.trim();
      const password=document.querySelector("#signup-password").value;
      const data=await authRequest("signup?redirect_to="+encodeURIComponent(accountUrl()),{
        body:{email,password,data:{display_name}}
      });
      if(data.access_token){
        saveSession(data);
        showAuthMessage("Account created and signed in.","success");
        await render();
        await initAuthChrome();
      }else{
        showAuthMessage("Account created. Check your email to confirm your address, then return here to sign in.","success");
      }
    }catch(err){showAuthMessage(err.message,"error")}
  });

  document.querySelector("#forgot-password")?.addEventListener("click",async()=>{
    const email=(document.querySelector("#signin-email")?.value||"").trim();
    if(!email){showAuthMessage("Enter your email in the Sign in box first.","error");return}
    try{
      await authRequest("recover?redirect_to="+encodeURIComponent(accountUrl()),{body:{email}});
      showAuthMessage("If that email is registered, a password-recovery message has been sent.","success");
    }catch(err){showAuthMessage(err.message,"error")}
  });

  document.querySelector("#recovery-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    session=await getSession();
    if(!session){showAuthMessage("Recovery session expired. Request a new password-recovery email.","error");return}
    try{
      const password=document.querySelector("#recovery-password").value;
      await authRequest("user",{method:"PUT",token:session.access_token,body:{password}});
      showAuthMessage("Password updated. Your reader account is ready.","success");
      recovery?.classList.add("hidden");
      await render();
    }catch(err){showAuthMessage(err.message,"error")}
  });

  document.querySelector("#profile-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    session=await getSession();
    if(!session)return;
    try{
      const p_display_name=document.querySelector("#profile-display-name").value.trim();
      await rpc("reader_update_display_name",{p_display_name},session.access_token);
      showAuthMessage("Display name saved.","success");
      await render();
    }catch(err){showAuthMessage("Could not save display name.","error")}
  });

  document.querySelector("#save-badges")?.addEventListener("click",async()=>{
    session=await getSession();
    if(!session)return;
    try{
      await rpc("reader_set_badge_preferences",{
        p_show_supporter:document.querySelector("#badge-supporter").checked,
        p_show_vip:document.querySelector("#badge-vip").checked
      },session.access_token);
      showAuthMessage("Badge preferences saved.","success");
      await render();
    }catch{showAuthMessage("Could not save badge preferences.","error")}
  });

  document.querySelector("#signout-button")?.addEventListener("click",async()=>{
    session=await getSession();
    try{if(session?.access_token)await authRequest("logout",{token:session.access_token})}catch{}
    saveSession(null);
    showAuthMessage("Signed out.","success");
    await render();
    await initAuthChrome();
  });

  await render();
}

async function renderPartCommentComposer(partId,reload){
  const box=document.querySelector("#comment-composer");
  if(!box)return;
  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  if(!user){
    box.className="comment-composer disabled-box";
    box.innerHTML='<strong>Reader account required to comment</strong><span><a class="inline-link" href="'+accountPath()+'">Sign in or create an account</a> to post reactions, theories, predictions, praise, or criticism.</span>';
    return;
  }
  box.className="comment-composer active-composer";
  box.innerHTML='<textarea id="comment-body" rows="4" maxlength="3000" placeholder="Share a reaction, theory, or prediction…"></textarea><button id="comment-submit" type="button">Post comment</button><small id="comment-status"></small>';
  document.querySelector("#comment-submit").addEventListener("click",async()=>{
    const body=document.querySelector("#comment-body").value.trim();
    const status=document.querySelector("#comment-status");
    if(!body){status.textContent="Write a comment first.";return}
    try{
      document.querySelector("#comment-submit").disabled=true;
      await rpc("reader_post_part_comment",{p_part_id:partId,p_body:body},session.access_token);
      status.textContent="Posted.";
      await reload();
    }catch{status.textContent="Could not post comment."}
    finally{document.querySelector("#comment-submit").disabled=false}
  });
}

async function activateSupportContact(){
  const form=document.querySelector("#contact-form");
  if(!form)return;
  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  const subject=document.querySelector("#contact-subject");
  const body=document.querySelector("#contact-body");
  const button=document.querySelector("#contact-submit");
  if(!user){
    subject.disabled=true;body.disabled=true;button.disabled=true;
    button.textContent="Reader sign-in required";
    return;
  }
  subject.disabled=false;body.disabled=false;button.disabled=false;
  button.textContent="Send message to Admin";
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const s=subject.value.trim(),b=body.value.trim();
    if(!s||!b)return;
    button.disabled=true;button.textContent="Sending…";
    try{
      await rpc("reader_contact_admin",{p_subject:s,p_body:b},session.access_token);
      subject.value="";body.value="";button.textContent="Message sent";
    }catch{button.textContent="Could not send — try again"}
    finally{setTimeout(()=>{button.disabled=false;button.textContent="Send message to Admin"},1500)}
  },{once:true});
}

async function initRead(){
  const releaseMini=document.querySelector("#release-mini");
  try{
    const clock=firstRow(await rpc("api_release_clock"));
    paintReleaseState(document.querySelector("#reader-release-state"),clock);
  }catch{}
  try{
    const p=firstRow(await rpc("api_release_policy"));
    releaseMini.textContent=(p?.releases_paused?"PAUSED · ":"")+"2 Parts daily · 8:00 AM / 8:00 PM PHT";
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
        const reloadComments=async()=>{
          try{
            const comments=await rpc("api_part_comments",{p_part_id:part.part_id});
            list.innerHTML=!Array.isArray(comments)||!comments.length
              ?'<div class="empty-state">No comments yet. Be the first to share a reaction or prediction.</div>'
              :comments.map(c=>'<article class="comment-card"><div class="comment-meta"><strong>'+esc(c.display_name||"Reader")+'</strong>'+(c.badge?'<span class="reader-badge '+(c.badge==="VIP"?"vip":"")+'">'+esc(c.badge)+'</span>':'')+'<small>'+esc(new Date(c.created_at).toLocaleString())+'</small></div><div>'+esc(c.body)+'</div></article>').join("");
          }catch{list.innerHTML='<div class="empty-state">Comments are temporarily unavailable.</div>'}
        };
        await renderPartCommentComposer(part.part_id,reloadComments);
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
  document.querySelector("#codex-search-button")?.addEventListener("click",loadCodex);
  document.querySelector("#codex-type")?.addEventListener("change",loadCodex);
  document.querySelector("#codex-search")?.addEventListener("keydown",e=>{if(e.key==="Enter")loadCodex()});
  document.querySelectorAll("[data-codex-chip]").forEach(button=>button.addEventListener("click",()=>{
    document.querySelectorAll("[data-codex-chip]").forEach(x=>x.classList.toggle("active",x===button));
    const select=document.querySelector("#codex-type"); if(select)select.value=button.dataset.codexChip||"";
    loadCodex();
  }));
  document.querySelector("[data-codex-chip='']")?.classList.add("active");
  loadCodex();
}




function releaseStateFromClock(clock){
  const now=Date.now();
  const paused=!!clock?.releases_paused;
  const publishAt=clock?.next_publish_at?new Date(clock.next_publish_at):null;
  const cycleAt=clock?.next_cycle_at?new Date(clock.next_cycle_at):null;
  if(paused)return {code:"PAUSED",className:"paused",detail:"Public releases are temporarily paused"};
  if(publishAt&&publishAt.getTime()<now-60000)return {code:"DELAYED",className:"delayed",detail:"Next canonical Part is delayed — later Parts will not skip it"};
  if(!publishAt&&cycleAt)return {code:"AWAITING VERIFIED PART",className:"awaiting",detail:"Waiting for the next verified canonical Part"};
  if(publishAt)return {code:"SCHEDULED",className:"scheduled",detail:"Next canonical Part is queued"};
  return {code:"AWAITING",className:"awaiting",detail:"Release queue is waiting for verified content"};
}
function paintReleaseState(el,clock){
  if(!el)return;
  const state=releaseStateFromClock(clock);
  el.className="release-state-banner"+(el.classList.contains("compact")?" compact":"")+" "+state.className;
  el.innerHTML='<span class="state-dot"></span><strong>'+esc(state.code)+'</strong><small>'+esc(state.detail)+'</small>';
}

async function initHome(){
  const timeEl=document.querySelector("#home-release-time");
  const partEl=document.querySelector("#home-release-part");
  const hEl=document.querySelector("#cd-hours");
  const mEl=document.querySelector("#cd-minutes");
  const sEl=document.querySelector("#cd-seconds");
  let nextAt=null;

  function nextManilaSlot(){
    const now=new Date();
    const parts=new Intl.DateTimeFormat("en-US",{
      timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false
    }).formatToParts(now).reduce((o,p)=>(o[p.type]=p.value,o),{});
    const ph=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour)-8,Number(parts.minute),Number(parts.second)));
    const hour=Number(parts.hour);
    const targetHour=hour<8?8:(hour<20?20:8);
    const addDay=hour>=20?1:0;
    const target=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)+addDay,targetHour-8,0,0));
    return {date:target,label:targetHour===8?"8:00 AM PHT":"8:00 PM PHT"};
  }
  function tick(){
    if(!nextAt)return;
    const ms=Math.max(0,nextAt.getTime()-Date.now());
    const t=Math.floor(ms/1000);
    if(hEl)hEl.textContent=String(Math.floor(t/3600)).padStart(2,"0");
    if(mEl)mEl.textContent=String(Math.floor((t%3600)/60)).padStart(2,"0");
    if(sEl)sEl.textContent=String(t%60).padStart(2,"0");
    if(ms<=0)setTimeout(()=>{const n=nextManilaSlot();nextAt=n.date;if(timeEl)timeEl.textContent=n.label},1100);
  }
  try{
    const clock=firstRow(await rpc("api_release_clock"));
    paintReleaseState(document.querySelector("#home-release-state"),clock);
  }catch{}
  const slot=nextManilaSlot(); nextAt=slot.date;
  if(timeEl)timeEl.textContent=slot.label;
  tick(); setInterval(tick,1000);

  try{
    const episodes=await rpc("api_episode_library");
    if(Array.isArray(episodes)&&episodes.length){
      const latest=episodes[0];
      document.querySelector("#home-current-episode").textContent="Episode "+esc(latest.episode_number);
      document.querySelector("#home-current-title").textContent=latest.title||"Continue Your Journey";
      document.querySelector("#home-current-summary").textContent=latest.summary_public||"Continue the latest released Final Canon.";
      let cards=[];
      for(const [index,ep] of episodes.slice(0,3).entries()){
        const artClass="release-art-"+(index+1);
        cards.push('<a class="release-tile v2-release-tile '+artClass+'" href="/site-preview/read/"><div class="release-thumb"></div><div class="release-info"><small>EPISODE '+esc(ep.episode_number)+'</small><strong>'+esc(ep.title||"GENESIS")+'</strong><span>Released Final Canon</span></div></a>');
      }
      const box=document.querySelector("#home-latest-releases"); if(box)box.innerHTML=cards.join("");
      if(partEl)partEl.textContent="Episode "+esc(latest.episode_number)+" · next scheduled Part";
    }
  }catch{}

  try{
    const session=await getSession();
    const user=session?await getAuthUser(session):null;
    if(user){
      const data=await rpc("api_reader_account",{},session.access_token);
      const name=data?.display_name||user?.user_metadata?.display_name||"Reader";
      document.querySelector("#home-reader-name").textContent=name;
      const totalExp=Number(data?.reader_exp??data?.total_exp??0);
      const tier=Math.floor(totalExp/TIER_EXP_THRESHOLD)+1;
      const within=totalExp%TIER_EXP_THRESHOLD;
      document.querySelector("#home-reader-tier").textContent="Tier "+tier;
      document.querySelector("#home-exp-progress").textContent=within.toLocaleString()+" / "+TIER_EXP_THRESHOLD.toLocaleString()+" EXP";
      document.querySelector("#home-exp-total").textContent="Total EXP: "+totalExp.toLocaleString();
      document.querySelector("#home-exp-bar").style.width=Math.min(100,within/TIER_EXP_THRESHOLD*100)+"%";
      const nextTierEl=document.querySelector("#home-tier-next");
      if(nextTierEl)nextTierEl.textContent="Next reward in "+(TIER_EXP_THRESHOLD-within).toLocaleString()+" EXP";
      const support=Number(data?.support?.advance_parts??data?.support?.credit_balance??0);
      document.querySelector("#home-support-unlocks").textContent="+"+support;
      document.querySelector("#home-access-total").textContent="+"+support+" Parts Ahead";
      document.querySelector("#home-reader-title").textContent=data?.reader_title||"GENESIS Adventurer";
    }
  }catch{}
}


function initReaderControls(){
  const shell=document.querySelector(".reader-shell");
  const body=document.querySelector("#novel-body");
  if(!shell||!body)return;
  const bind=(id,fn)=>document.querySelector(id)?.addEventListener("click",fn);
  bind("#reader-library-toggle",()=>{ if(innerWidth<=820){shell.classList.toggle("mobile-library-open")}else shell.classList.toggle("library-collapsed") });
  bind("#reader-tools-toggle",()=>{ if(innerWidth<=820){shell.classList.toggle("mobile-tools-open")}else shell.classList.toggle("tools-collapsed") });
  bind("#reader-fullscreen",async()=>{ shell.classList.toggle("fullscreen-reader"); try{ if(shell.classList.contains("fullscreen-reader")) await document.documentElement.requestFullscreen?.(); else if(document.fullscreenElement) await document.exitFullscreen?.(); }catch{} });
  const fs=document.querySelector("#font-size-range"), ls=document.querySelector("#line-height-range"), rw=document.querySelector("#reader-width-range");
  fs?.addEventListener("input",()=>{body.style.fontSize=fs.value+"px";document.querySelector("#font-size-label").textContent=fs.value+"px"});
  ls?.addEventListener("input",()=>{body.style.lineHeight=ls.value;document.querySelector("#line-height-label").textContent=Number(ls.value).toFixed(2)});
  rw?.addEventListener("input",()=>{body.style.maxWidth=rw.value+"px";document.querySelector("#reader-width-label").textContent=rw.value+"px"});
  const updateProgress=()=>{const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);const pct=Math.min(100,Math.max(0,scrollY/max*100));const fill=document.querySelector("#reader-progress-fill");if(fill)fill.style.width=pct+"%";const pos=document.querySelector("#reader-position");if(pos)pos.textContent=Math.round(pct)+"% read"};
  addEventListener("scroll",updateProgress,{passive:true});updateProgress();
}

const page=document.body.dataset.page;
await initAuthChrome();
if(page==="home")await initHome();
if(page==="read"){await initRead();initReaderControls();}
if(page==="world")initWorld();
if(page==="codex")initCodex();
if(page==="fan")await initFan();
if(page==="support")await initSupport();
if(page==="account")await initAccount();
if(page==="quests")await initQuests();

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

async function initQuests(){
  const button=document.querySelector("#reward-draw-button");
  const result=document.querySelector("#reward-draw-result");
  const vaultGrid=document.querySelector("#reward-vault-grid");
  if(!button)return;

  const manifest=await loadRewardManifest();
  if(vaultGrid&&manifest.length){
    vaultGrid.innerHTML=manifest.map(x=>rewardCardHtml(x,{owned:false,quantity:0,eligible:true})).join("");
  }

  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  if(!user||!session){
    const cta=document.querySelector("#reward-cta");
    if(cta)cta.classList.add("signed-out");
    button.disabled=false;
    button.textContent="Sign In & Open Reward Vault";
    button.addEventListener("click",()=>{location.href=accountPath()+"?next=quests"});
    return;
  }

  let pending=0;
  let accountData=null;
  try{
    const data=await rpc("api_reader_account_v3",{},session.access_token);
    accountData=data;
    pending=Number(data?.pending_reward_draws??0);
  }catch{
    try{
      const data=await rpc("api_reader_account",{},session.access_token);
      const totalExp=Number(data?.reader_exp??data?.total_exp??0);
      const tier=Math.floor(totalExp/TIER_EXP_THRESHOLD)+1;
      pending=Math.max(0,tier-1-Number(data?.collection_count??0));
    }catch{}
  }

  if(vaultGrid){
    let rewards=[];
    try{
      const collection=await rpc("api_reader_collectibles_v1",{},session.access_token);
      rewards=Array.isArray(collection)?collection:(Array.isArray(collection?.items)?collection.items:[]);
    }catch{}
    if(!rewards.length){
      const manifest=await loadRewardManifest();
      const highest=Number(accountData?.highest_episode_read??999);
      rewards=manifest.map(x=>({...x,owned:false,quantity:0,eligible:Number(x.min_episode??0)<=highest}));
    }
    vaultGrid.innerHTML=rewards.map(x=>rewardCardHtml(x,{
      owned:!!(x.owned||Number(x.quantity)>0),
      quantity:Number(x.quantity||0),
      eligible:x.eligible!==false
    })).join("")||'<div class="reward-vault-empty">Reward pool unavailable.</div>';
  }

  const paint=()=>{
    button.disabled=pending<=0;
    button.textContent=pending>0
      ?("Claim Random Reward · "+pending+" Ready")
      :"No reward draw available yet";
  };
  paint();

  button.addEventListener("click",async()=>{
    if(pending<=0)return;
    const original=button.textContent;
    button.disabled=true;
    button.textContent="Drawing reward…";
    try{
      const draw=await rpc("reader_draw_collectible_v1",{},session.access_token);
      if(draw?.status==="DRAWN"){
        pending=Math.max(0,pending-1);
        if(result){
          result.classList.remove("hidden");
          result.innerHTML=
            '<div class="reward-result-card">'+
            (draw.preview_url||draw.image_url?'<img src="'+esc(draw.preview_url||draw.image_url)+'" alt="">':'')+
            '<div><small>'+esc(draw.rarity||"REWARD")+'</small>'+
            '<strong>'+esc(draw.title||"GENESIS Reward")+'</strong>'+
            '<span>'+esc(String(draw.asset_type||"PICTURE_CARD").replaceAll("_"," "))+'</span></div></div>';
        }
        paint();
      }else{
        pending=0;
        paint();
        if(result){
          result.classList.remove("hidden");
          result.textContent=draw?.status==="NO_ELIGIBLE_COLLECTIBLE"
            ?"Your draw is ready, but no spoiler-safe reward is eligible yet."
            :"No reward draw is currently available.";
        }
      }
    }catch{
      button.disabled=false;
      button.textContent=original;
      if(result){
        result.classList.remove("hidden");
        result.textContent="Reward drawing is not enabled on the live backend yet.";
      }
    }
  });
}

async function initSupport(){
  const notice=document.querySelector("#support-status");
  await activateSupportContact();

  const params=new URLSearchParams(location.search);
  const paymentReturn=params.get("payment");
  if(paymentReturn==="success"&&notice){
    notice.innerHTML='<strong>Payment submitted</strong><span>PayMongo returned you to GENESIS. Advance access is granted only after the signed payment webhook is confirmed.</span>';
  }else if(paymentReturn==="cancelled"&&notice){
    notice.innerHTML='<strong>Checkout cancelled</strong><span>No reward is granted for an incomplete PayMongo checkout.</span>';
  }

  try{
    const data=await rpc("api_support_catalog");
    const s=data?.settings||{};
    const providerReady=!!s.payment_provider_enabled;
    const testMode=String(s.payment_provider_mode||"").toUpperCase()==="TEST";
    const testAllowed=Array.isArray(s.test_allowed_rule_keys)?s.test_allowed_rule_keys:[];
    const session=await getSession();
    const user=session?await getAuthUser(session):null;

    if(notice&&!paymentReturn){
      const enabled=providerReady&&(!!s.payments_enabled||!!s.pure_support_enabled||!!s.share_rewards_enabled);
      notice.innerHTML='<strong>'+(enabled?(testMode?'PayMongo TEST MODE active':'Secure PayMongo checkout ready'):'PayMongo preparation mode')+'</strong><span>'+
        (enabled
          ?(testMode
            ?'Testing only — no GENESIS live entitlement sales are active. Do not scan a QR Ph test code with a real banking or e-wallet app; use PayMongo\'s test simulation controls.'
            :'Payments are verified server-side before credits, VIP, or Supporter eligibility are granted.')
          :'PayMongo is selected and wired, but collection remains disabled until merchant keys, webhook signing, and test-mode verification pass.')+
        '</span>';
    }

    const startCheckout=async(button,ruleKey,amountPhp=null)=>{
      if(!user||!session){
        location.href=accountPath()+"?next=support";
        return;
      }
      const original=button.textContent;
      button.disabled=true;
      button.textContent="Opening secure checkout…";
      try{
        const result=await edgeFunction("paymongo-create-checkout",{
          rule_key:ruleKey,
          amount_php:amountPhp
        },session.access_token);
        if(!result?.checkout_url)throw new Error("Checkout URL missing");
        location.href=result.checkout_url;
      }catch(e){
        button.disabled=false;
        button.textContent=original;
        if(notice)notice.innerHTML='<strong>Checkout unavailable</strong><span>'+esc(String(e.message||e))+'</span>';
      }
    };

    document.querySelectorAll("[data-paymongo-rule]").forEach(button=>{
      const ruleKey=button.dataset.paymongoRule;
      const pure=ruleKey==="PURE_SUPPORT_ANY";
      const featureEnabled=pure?!!s.pure_support_enabled:!!s.payments_enabled;
      const testRuleAllowed=!testMode||testAllowed.includes(ruleKey);
      const ready=providerReady&&featureEnabled&&testRuleAllowed;

      button.disabled=!ready;
      button.textContent=ready
        ?(user
          ?(testMode?(pure?"TEST Give through PayMongo":"TEST Pay with PayMongo"):(pure?"Give through PayMongo":"Pay with PayMongo"))
          :"Sign in to continue")
        :(testMode&&!testRuleAllowed?"Locked until next test phase":"PayMongo not live yet");

      if(pure){
        const amount=document.querySelector("#pure-support-amount");
        if(amount)amount.disabled=!ready;
      }

      if(ready){
        button.addEventListener("click",()=>{
          const amount=pure?Number(document.querySelector("#pure-support-amount")?.value||0):null;
          if(pure&&(!Number.isFinite(amount)||amount<1)){
            if(notice)notice.innerHTML='<strong>Enter an amount</strong><span>Pure support starts at ₱1 and grants no Advance Parts or VIP.</span>';
            return;
          }
          startCheckout(button,ruleKey,amount);
        });
      }
    });
  }catch(e){
    if(notice&&!paymentReturn){
      notice.innerHTML='<strong>Support status unavailable</strong><span>Payment collection remains closed.</span>';
    }
  }
}
