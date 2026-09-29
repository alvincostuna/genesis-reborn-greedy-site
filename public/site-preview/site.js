const SUPABASE_URL="https://lyhrwymhzhhxszquxnke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_rCJL18_zLNtWH-ON1DTnDA_3quoGH3Q";

const SESSION_KEY="genesis_reader_session_v1";
const TIER_EXP_THRESHOLD=2000;

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

function stableEntityHash(value){
  let h=2166136261;
  for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return Math.abs(h>>>0);
}
function safeLocalAsset(value){
  const s=String(value||"");
  return /^\/assets\/[A-Za-z0-9_./-]+$/.test(s)?s:null;
}
function entityVisual(type,entity=null){
  const t=String(type||"").toLowerCase();
  const explicit=safeLocalAsset(
    entity?.public_image_url||
    entity?.image_url||
    entity?.revealed_fields?.public_image_url||
    entity?.revealed_fields?.image_url
  );
  const key=entity?.entity_code||entity?.public_name||t;
  const pick=(arr)=>arr[stableEntityHash(key)%arr.length];
  if(t==="monster")return {label:"BESTIARY",art:explicit||pick([
    "/assets/v27/rewards/young-gnawer.webp",
    "/assets/v25/releases/release-duel.png",
    "/assets/v27/rewards/genesis-awakening.webp"
  ]),icon:"✦"};
  if(t==="map"||t==="region"||t==="location")return {label:"ATLAS",art:explicit||pick([
    "/assets/v27/rewards/early-genesis-world-panorama.webp",
    "/assets/v25/releases/release-city.png",
    "/assets/v25/hero-home-desktop.webp"
  ]),icon:"◎"};
  if(t==="weapon"||t==="armor"||t==="equipment")return {label:"ARMORY",art:explicit||pick([
    "/assets/v25/releases/release-duel.png",
    "/assets/v27/rewards/genesis-awakening.webp",
    "/assets/v25/destinations/destination-codex.png"
  ]),icon:"⚔"};
  if(t==="class"||t==="profession"||t==="skill")return {label:"PATH",art:explicit||pick([
    "/assets/v25/destinations/destination-codex.png",
    "/assets/v27/rewards/genesis-awakening.webp",
    "/assets/v25/releases/release-city.png"
  ]),icon:"✧"};
  if(t==="quest")return {label:"QUEST",art:explicit||pick([
    "/assets/v25/releases/release-city.png",
    "/assets/v25/destinations/destination-world.png",
    "/assets/v27/rewards/early-genesis-world-panorama.webp"
  ]),icon:"◇"};
  if(t==="npc")return {label:"PEOPLE",art:explicit||pick([
    "/assets/v25/destinations/destination-fanpage.png",
    "/assets/v25/releases/release-city.png",
    "/assets/v27/rewards/genesis-awakening.webp"
  ]),icon:"♙"};
  if(t==="shop")return {label:"TRADE",art:explicit||pick([
    "/assets/v25/destinations/destination-support.png",
    "/assets/v25/releases/release-city.png",
    "/assets/v25/destinations/destination-codex.png"
  ]),icon:"¤"};
  return {label:"ARCHIVE",art:explicit||pick([
    "/assets/v27/rewards/genesis-awakening.webp",
    "/assets/v25/destinations/destination-codex.png",
    "/assets/v25/releases/release-city.png"
  ]),icon:"▣"};
}
function entityCard(x,kind="codex"){
  const fields=x?.revealed_fields&&typeof x.revealed_fields==="object"?Object.keys(x.revealed_fields):[];
  const type=String(x?.entity_type||"codex");
  const v=entityVisual(type,x);
  const title=x?.public_name||x?.entity_code||"Revealed entry";
  const desc=x?.short_description||"Revealed GENESIS knowledge.";
  const fieldChips=fields.filter(f=>!["image_url","public_image_url"].includes(f)).slice(0,4).map(f=>'<span>'+esc(f.replaceAll("_"," "))+'</span>').join("");
  return '<article class="'+kind+'-card v28-entity-card" data-entity-type="'+esc(type.toLowerCase())+'">'+
    '<div class="entity-art" style="background-image:linear-gradient(180deg,rgba(2,8,14,.04),rgba(2,8,14,.82)),url(\''+esc(v.art)+'\')">'+
      '<span class="entity-symbol">'+esc(v.icon)+'</span><span class="entity-category">'+esc(v.label)+'</span>'+
    '</div>'+
    '<div class="entity-copy"><small>'+esc(type.toUpperCase())+'</small><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p>'+
    (fieldChips?'<div class="reveal-fields">'+fieldChips+'</div>':'<div class="entity-safe-note">Reader-safe revealed record</div>')+
    '</div></article>';
}


async function initAuthChrome(){
  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  document.querySelectorAll("[data-auth-link]").forEach(link=>{
    link.href=accountPath();
    link.classList.toggle("signed-in",!!user);
    link.dataset.authState=user?"signed-in":"signed-out";
    link.setAttribute("aria-label",user?"Open reader account":"Sign in to GENESIS");
    link.title=user?"Reader account":"Sign in";
    let img=link.querySelector("img");
    if(!img){
      img=document.createElement("img");
      img.src="/assets/genesis-official-logo-64.png";
      img.alt="";
      link.replaceChildren(img);
    }
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
    const verified=!!(user.email_confirmed_at||user.confirmed_at);
    const verifyBadge=document.querySelector("#email-verification-badge");
    const verifyCopy=document.querySelector("#email-verification-copy");
    const resendVerify=document.querySelector("#resend-verification");
    if(verifyBadge){
      verifyBadge.textContent=verified?"Verified":"Verification pending";
      verifyBadge.className="security-status "+(verified?"verified":"pending");
    }
    if(verifyCopy)verifyCopy.textContent=verified
      ?"Your email address is verified for this GENESIS account."
      :"Confirm your email address to fully secure your GENESIS account.";
    if(resendVerify)resendVerify.classList.toggle("hidden",verified);

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

  document.querySelector("#resend-verification")?.addEventListener("click",async()=>{
    session=await getSession();
    user=session?await getAuthUser(session):null;
    const email=(user?.email||"").trim();
    if(!email){showAuthMessage("No account email is available.","error");return}
    const button=document.querySelector("#resend-verification");
    const original=button?.textContent||"Resend verification email";
    try{
      if(button){button.disabled=true;button.textContent="Sending verification…"}
      await authRequest("resend?redirect_to="+encodeURIComponent(accountUrl()),{
        body:{type:"signup",email}
      });
      showAuthMessage("Verification email sent. Check your inbox and spam folder.","success");
    }catch(err){
      showAuthMessage(err.message||"Could not resend the verification email.","error");
    }finally{
      if(button){button.disabled=false;button.textContent=original}
    }
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

  document.querySelector("#change-password-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    session=await getSession();
    if(!session){showAuthMessage("Your session expired. Sign in again before changing your password.","error");return}
    const password=document.querySelector("#change-password")?.value||"";
    const confirm=document.querySelector("#change-password-confirm")?.value||"";
    if(password.length<8){showAuthMessage("Use at least 8 characters for your new password.","error");return}
    if(password!==confirm){showAuthMessage("The two password fields do not match.","error");return}
    const submit=e.currentTarget.querySelector("button[type='submit']");
    try{
      if(submit){submit.disabled=true;submit.textContent="Updating password…"}
      await authRequest("user",{method:"PUT",token:session.access_token,body:{password}});
      e.currentTarget.reset();
      showAuthMessage("Password changed successfully.","success");
    }catch(err){
      showAuthMessage(err.message||"Could not update your password.","error");
    }finally{
      if(submit){submit.disabled=false;submit.textContent="Update password"}
    }
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
    const clock=firstRow(await rpc("api_public_release_state_v1"));
    paintReleaseState(document.querySelector("#reader-release-state"),clock);
  }catch{}
  try{
    const p=firstRow(await rpc("api_release_policy"));
    if(releaseMini)releaseMini.textContent=(p?.releases_paused?"PAUSED · ":"")+"3 Parts · 8:00 AM / 2:00 PM / 8:00 PM · Mon–Sat · Sunday rest";
  }catch{}

  let episodes=[];
  try{episodes=await rpc("api_episode_library")}catch{}
  if(!Array.isArray(episodes)||!episodes.length)return;

  const list=document.querySelector("#episode-list");
  document.querySelector("#episode-count").textContent=episodes.length+" released";
  list.innerHTML=episodes.map(e=>
    '<button class="episode-button" data-episode="'+esc(e.episode_number)+'"><small>EPISODE '+esc(e.episode_number)+'</small><strong>'+esc(e.title)+'</strong></button>'
  ).join("");

  let activeResume=null;
  let scrollSaveTimer=null;
  const saveScroll=()=>{
    if(!activeResume)return;
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    const pct=Math.min(100,Math.max(0,scrollY/max*100));
    activeResume.scroll_percent=Math.round(pct*10)/10;
    saveReaderResume(activeResume);
  };
  addEventListener("scroll",()=>{clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(saveScroll,160)},{passive:true});

  async function openEpisode(number,requestedPart=null){
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
    const targetIndex=Math.max(0,requestedPart==null?0:parts.findIndex(p=>String(p.part_number)===String(requestedPart)||p.part_key===requestedPart));
    tabs.innerHTML=parts.map((p,i)=>'<button data-part="'+i+'" class="'+(i===targetIndex?"active":"")+'">Part '+esc(p.part_number)+'</button>').join("");

    const openPart=async(idx,{restore=true}={})=>{
      const part=parts[idx]||parts[0];
      idx=Math.max(0,parts.indexOf(part));
      tabs.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("active",i===idx));
      const access=part.access_mode&&part.access_mode!=="PUBLIC"?' · '+part.access_mode+' EARLY ACCESS':'';
      body.innerHTML='<div class="status-chip">Part '+esc(part.part_number)+' · '+esc(part.title||"")+esc(access)+'</div>'+textParagraphs(part.body_text||"");

      const oldResume=loadReaderResume();
      const shouldRestore=restore&&oldResume&&Number(oldResume.episode_number)===Number(number)&&Number(oldResume.part_number)===Number(part.part_number);
      activeResume={
        episode_number:Number(number),
        part_number:Number(part.part_number),
        part_key:part.part_key||null,
        part_id:part.part_id||null,
        title:part.title||episode?.title||"GENESIS",
        summary_public:episode?.summary_public||"",
        scroll_percent:shouldRestore?Number(oldResume.scroll_percent||0):0
      };
      saveReaderResume(activeResume);
      const params=new URLSearchParams(location.search);
      params.set("episode",String(number));
      params.set("part",String(part.part_number));
      history.replaceState(null,"",location.pathname+"?"+params.toString());

      const panel=document.querySelector("#comments-panel");
      const commentsList=document.querySelector("#part-comments");
      panel?.classList.remove("hidden");
      if(commentsList&&part.part_id){
        commentsList.innerHTML='<div class="empty-state">Loading comments…</div>';
        try{
          const comments=await rpc("api_part_comments",{p_part_id:part.part_id});
          commentsList.innerHTML=!Array.isArray(comments)||!comments.length
            ?'<div class="empty-state">No comments yet. Be the first to share a reaction or prediction.</div>'
            :comments.map(c=>'<article class="comment-card"><div class="comment-meta"><strong>'+esc(c.display_name||"Reader")+'</strong>'+(c.badge?'<span class="reader-badge '+(c.badge==="VIP"?"vip":"")+'">'+esc(c.badge)+'</span>':'')+'<small>'+esc(new Date(c.created_at).toLocaleString())+'</small></div><div>'+esc(c.body)+'</div></article>').join("");
        }catch{commentsList.innerHTML='<div class="empty-state">Comments are temporarily unavailable.</div>'}
        const reloadComments=async()=>{
          try{
            const comments=await rpc("api_part_comments",{p_part_id:part.part_id});
            commentsList.innerHTML=!Array.isArray(comments)||!comments.length
              ?'<div class="empty-state">No comments yet. Be the first to share a reaction or prediction.</div>'
              :comments.map(c=>'<article class="comment-card"><div class="comment-meta"><strong>'+esc(c.display_name||"Reader")+'</strong>'+(c.badge?'<span class="reader-badge '+(c.badge==="VIP"?"vip":"")+'">'+esc(c.badge)+'</span>':'')+'<small>'+esc(new Date(c.created_at).toLocaleString())+'</small></div><div>'+esc(c.body)+'</div></article>').join("");
          }catch{commentsList.innerHTML='<div class="empty-state">Comments are temporarily unavailable.</div>'}
        };
        await renderPartCommentComposer(part.part_id,reloadComments);
      }

      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(shouldRestore&&activeResume.scroll_percent>0){
          const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
          scrollTo({top:max*(activeResume.scroll_percent/100),behavior:"auto"});
        }else scrollTo({top:0,behavior:"auto"});
      }));
    };

    tabs.querySelectorAll("button").forEach((b,i)=>b.addEventListener("click",()=>openPart(i,{restore:false})));
    await openPart(targetIndex,{restore:true});
  }

  list.querySelectorAll(".episode-button").forEach(b=>b.addEventListener("click",()=>openEpisode(b.dataset.episode,1)));

  const params=new URLSearchParams(location.search);
  const requestedEpisode=Number(params.get("episode")||0);
  const requestedPart=params.get("part");
  const saved=loadReaderResume();
  const episodeToOpen=episodes.some(e=>Number(e.episode_number)===requestedEpisode)
    ?requestedEpisode
    :(saved&&episodes.some(e=>Number(e.episode_number)===Number(saved.episode_number))?Number(saved.episode_number):Number(episodes[0].episode_number));
  const partToOpen=requestedPart||(saved&&Number(saved.episode_number)===episodeToOpen?saved.part_number:null);
  await openEpisode(episodeToOpen,partToOpen);
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
      const v=entityVisual(type);
      grid.innerHTML='<div class="v28-empty-discovery"><div class="empty-art" style="background-image:linear-gradient(180deg,rgba(2,8,14,.08),rgba(2,8,14,.92)),url(\''+esc(v.art)+'\')"></div><div><small>'+esc(v.label)+'</small><strong>Nothing reader-safe has been revealed here yet.</strong><p>Production knowledge remains hidden until a released Part makes it public.</p></div></div>';
      return;
    }
    grid.innerHTML=rows.map(x=>entityCard(x,"world")).join("");
  }catch(e){
    grid.innerHTML='<div class="empty-state large">World preview is temporarily unavailable.</div>';
  }
}
function initWorld(){
  const buttons=[...document.querySelectorAll("[data-world-type]")];
  const jumpButtons=[...document.querySelectorAll("[data-world-jump]")];
  const activate=type=>{
    buttons.forEach(x=>x.classList.toggle("active",x.dataset.worldType===type));
    jumpButtons.forEach(x=>x.classList.toggle("active",x.dataset.worldJump===type));
    loadWorld(type);
    document.querySelector(".world-map-stage")?.scrollIntoView({behavior:"smooth",block:"start"});
  };
  buttons.forEach(b=>b.addEventListener("click",()=>activate(b.dataset.worldType)));
  jumpButtons.forEach(b=>b.addEventListener("click",()=>activate(b.dataset.worldJump)));
  loadWorld("map");
}

async function loadCodex(){
  const results=document.querySelector("#codex-results");
  const type=document.querySelector("#codex-type").value||null;
  const query=document.querySelector("#codex-search").value.trim()||null;
  results.innerHTML='<div class="empty-state large">Searching revealed database…</div>';
  try{
    const rows=await rpc("api_entity_search",{p_type:type,p_query:query,p_limit:60});
    const count=document.querySelector("#codex-result-count");
    if(!Array.isArray(rows)||!rows.length){
      if(count)count.textContent="0 reader-safe results";
      const v=entityVisual(type||"codex");
      results.innerHTML='<div class="v28-empty-discovery codex-empty"><div class="empty-art" style="background-image:linear-gradient(180deg,rgba(2,8,14,.12),rgba(2,8,14,.94)),url(\''+esc(v.art)+'\')"></div><div><small>READER-SAFE INDEX</small><strong>No revealed Codex records match this search.</strong><p>Try another category or return after more released story content becomes public.</p></div></div>';
      return;
    }
    if(count)count.textContent=rows.length+" reader-safe result"+(rows.length===1?"":"s");
    results.innerHTML=rows.map(x=>entityCard(x,"codex")).join("");
  }catch{
    results.innerHTML='<div class="empty-state large">Codex is temporarily unavailable.</div>';
  }
}
function initCodex(){
  const params=new URLSearchParams(location.search);
  const q=params.get("q");
  const type=params.get("type");
  const search=document.querySelector("#codex-search");
  const select=document.querySelector("#codex-type");
  if(q&&search)search.value=q;
  if(type&&select&&[...select.options].some(o=>o.value===type))select.value=type;
  document.querySelector("#codex-search-button")?.addEventListener("click",loadCodex);
  document.querySelector("#codex-type")?.addEventListener("change",loadCodex);
  document.querySelector("#codex-search")?.addEventListener("keydown",e=>{if(e.key==="Enter")loadCodex()});
  document.querySelectorAll("[data-codex-chip]").forEach(button=>button.addEventListener("click",()=>{
    document.querySelectorAll("[data-codex-chip]").forEach(x=>x.classList.toggle("active",x===button));
    const select=document.querySelector("#codex-type"); if(select)select.value=button.dataset.codexChip||"";
    loadCodex();
  }));
  document.querySelectorAll("[data-codex-jump]").forEach(button=>button.addEventListener("click",()=>{
    const value=button.dataset.codexJump||"";
    const select=document.querySelector("#codex-type"); if(select)select.value=value;
    document.querySelectorAll("[data-codex-chip]").forEach(x=>x.classList.toggle("active",x.dataset.codexChip===value));
    loadCodex();
    document.querySelector(".codex-console")?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  document.querySelector("[data-codex-chip='']")?.classList.add("active");
  loadCodex();
}




function releaseStateFromClock(clock){
  const now=Date.now();
  const paused=!!clock?.releases_paused;
  if(clock?.launch_authorized===false)return {code:"PRE-LAUNCH",className:"awaiting",detail:"Public launch is not authorized yet"};
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

const READER_RESUME_KEY="genesis_reader_resume_v2";
const NOTIFICATION_READ_KEY="genesis_notification_read_v1";

function loadReaderResume(){
  try{
    const value=JSON.parse(localStorage.getItem(READER_RESUME_KEY)||"null");
    return value&&typeof value==="object"?value:null;
  }catch{return null}
}
function saveReaderResume(value){
  try{localStorage.setItem(READER_RESUME_KEY,JSON.stringify({...value,updated_at:new Date().toISOString()}))}catch{}
}
function phtDateTime(value){
  if(!value)return"";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return"";
  return new Intl.DateTimeFormat("en-PH",{
    timeZone:"Asia/Manila",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true
  }).format(d)+" PHT";
}
function readNotificationIds(){
  try{return new Set(JSON.parse(localStorage.getItem(NOTIFICATION_READ_KEY)||"[]"))}catch{return new Set()}
}
function storeNotificationIds(set){
  try{localStorage.setItem(NOTIFICATION_READ_KEY,JSON.stringify([...set].slice(-120)))}catch{}
}
function readerHref({episode_number,part_number}={}){
  const q=new URLSearchParams();
  if(episode_number!=null)q.set("episode",String(episode_number));
  if(part_number!=null)q.set("part",String(part_number));
  return "/site-preview/read/"+(q.toString()?"?"+q.toString():"");
}
async function latestPublicParts(episodes,limit=3){
  const work=(Array.isArray(episodes)?episodes:[]).slice(0,8);
  const groups=await Promise.all(work.map(async ep=>{
    try{
      const parts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(ep.episode_number)});
      return (Array.isArray(parts)?parts:[]).filter(p=>p.access_mode==="PUBLIC").map(p=>({...p,summary_public:ep.summary_public||"",episode_cover:ep.cover_url||null}));
    }catch{return[]}
  }));
  return groups.flat().sort((a,b)=>{
    const at=new Date(a.published_at||a.publish_at||0).getTime();
    const bt=new Date(b.published_at||b.publish_at||0).getTime();
    if(bt!==at)return bt-at;
    if(Number(b.episode_number)!==Number(a.episode_number))return Number(b.episode_number)-Number(a.episode_number);
    return Number(b.part_number)-Number(a.part_number);
  }).slice(0,limit);
}
async function resolveResumeState(episodes,session){
  const local=loadReaderResume();
  if(local?.episode_number&&local?.part_number){
    const ep=(episodes||[]).find(e=>Number(e.episode_number)===Number(local.episode_number));
    if(ep){
      try{
        const parts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(local.episode_number)});
        const match=(Array.isArray(parts)?parts:[]).find(p=>Number(p.part_number)===Number(local.part_number)||p.part_key===local.part_key);
        if(match)return {...local,...match,title:match.title||local.title,summary_public:ep.summary_public||local.summary_public||""};
      }catch{}
    }
  }
  if(session?.access_token){
    try{
      const data=await rpc("api_reader_account_v3",{},session.access_token);
      const epNo=Number(data?.highest_episode_read||0);
      if(epNo>0){
        const ep=(episodes||[]).find(e=>Number(e.episode_number)===epNo);
        const parts=await rpc("api_episode_parts_for_reader",{p_episode_number:epNo},session.access_token);
        const match=(Array.isArray(parts)?parts:[]).find(p=>p.part_key===data?.highest_part_key)||(Array.isArray(parts)?parts.at(-1):null);
        if(match)return {...match,episode_number:epNo,scroll_percent:0,summary_public:ep?.summary_public||""};
      }
    }catch{}
  }
  const latest=(episodes||[])[0];
  if(latest){
    try{
      const parts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(latest.episode_number)});
      const match=Array.isArray(parts)&&parts.length?parts.at(-1):null;
      if(match)return {...match,episode_number:Number(latest.episode_number),scroll_percent:0,summary_public:latest.summary_public||""};
    }catch{}
  }
  return null;
}
async function initGlobalSearch(){
  const input=document.querySelector("#global-search-input");
  const panel=document.querySelector("#global-search-panel");
  const results=document.querySelector("#global-search-results");
  const backdrop=document.querySelector("#global-search-backdrop");
  if(!input||!panel||!results)return;
  input.disabled=false;
  let timer=null,requestId=0;
  const close=()=>{
    panel.classList.add("hidden");
    backdrop?.classList.add("hidden");
    input.setAttribute("aria-expanded","false");
    document.body.classList.remove("global-search-open");
  };
  const open=()=>{
    panel.classList.remove("hidden");
    backdrop?.classList.remove("hidden");
    input.setAttribute("aria-expanded","true");
    document.body.classList.add("global-search-open");
  };
  const run=async()=>{
    const q=input.value.trim();
    if(q.length<2){
      results.innerHTML='<div class="global-search-empty">Type at least 2 characters to search released stories and revealed World/Codex records.</div>';
      return;
    }
    open();
    const id=++requestId;
    results.innerHTML='<div class="global-search-empty">Searching reader-safe GENESIS records…</div>';
    try{
      const [episodes,entities]=await Promise.all([
        rpc("api_episode_library"),
        rpc("api_entity_search",{p_type:null,p_query:q,p_limit:12})
      ]);
      if(id!==requestId)return;
      const needle=q.toLowerCase();
      const storyRows=(Array.isArray(episodes)?episodes:[]).filter(e=>
        String(e.title||"").toLowerCase().includes(needle)||
        String(e.summary_public||"").toLowerCase().includes(needle)||
        String(e.episode_number||"").includes(needle)
      ).slice(0,6);
      const entityRows=Array.isArray(entities)?entities:[];
      const storyHtml=storyRows.map(e=>
        '<a class="global-search-result story" href="'+readerHref({episode_number:e.episode_number})+'"><span class="search-result-icon">▤</span><div><small>EPISODE '+esc(e.episode_number)+'</small><strong>'+esc(e.title||"GENESIS")+'</strong><p>'+esc(e.summary_public||"Released Final Canon.")+'</p></div></a>'
      ).join("");
      const entityHtml=entityRows.map(x=>{
        const type=String(x.entity_type||"codex");
        const v=entityVisual(type,x);
        const href="/site-preview/codex/?type="+encodeURIComponent(type)+"&q="+encodeURIComponent(x.public_name||x.entity_code||q);
        return '<a class="global-search-result entity" href="'+href+'"><span class="search-result-icon">'+esc(v.icon)+'</span><div><small>'+esc(type.toUpperCase())+'</small><strong>'+esc(x.public_name||x.entity_code||"Revealed record")+'</strong><p>'+esc(x.short_description||"Reader-safe Codex record.")+'</p></div></a>';
      }).join("");
      results.innerHTML=(storyHtml?'<div class="global-search-group"><h3>Released Stories</h3>'+storyHtml+'</div>':'')+
        (entityHtml?'<div class="global-search-group"><h3>Revealed World & Codex</h3>'+entityHtml+'</div>':'')||
        '<div class="global-search-empty">No reader-safe results match “'+esc(q)+'”.</div>';
    }catch{
      results.innerHTML='<div class="global-search-empty">Search is temporarily unavailable. No hidden production data was queried.</div>';
    }
  };
  input.addEventListener("focus",()=>{if(input.value.trim().length>=2)run()});
  input.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(run,180)});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();run()}if(e.key==="Escape")close()});
  document.querySelector("#global-search-close")?.addEventListener("click",close);
  backdrop?.addEventListener("click",close);
  addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();input.focus();open()}
    if(e.key==="/"&&!/input|textarea|select/i.test(document.activeElement?.tagName||"")){e.preventDefault();input.focus();open()}
  });
}
async function initNotificationCenter(releaseState=null){
  const button=document.querySelector("#notification-button");
  const panel=document.querySelector("#notification-panel");
  const list=document.querySelector("#notification-list");
  const badge=document.querySelector("#notification-badge");
  if(!button||!panel||!list)return;
  let notices=[];
  try{
    const state=releaseState||firstRow(await rpc("api_public_release_state_v1"));
    if(state?.next_publish_at&&state?.next_part){
      notices.push({
        id:"release:"+state.next_publish_at,
        title:"Next Final Canon Part scheduled",
        body:"Episode "+state.next_part.episode_number+" · Part "+String(state.next_part.part_number).padStart(3,"0")+" · "+phtDateTime(state.next_publish_at),
        href:readerHref({episode_number:state.next_part.episode_number})
      });
    }else if(state?.releases_paused){
      notices.push({id:"release:paused",title:"Release cycle is paused",body:"Public chronology remains protected until releases resume.",href:"/site-preview/read/"});
    }else if(state?.launch_authorized===false){
      notices.push({id:"release:prelaunch",title:"GENESIS is preparing for public release",body:"Production can continue while the public reader waits for verified Final Canon.",href:"/site-preview/read/"});
    }
  }catch{}
  try{
    const episodes=await rpc("api_episode_library");
    const parts=await latestPublicParts(episodes,1);
    const p=parts[0];
    if(p)notices.push({
      id:"published:"+(p.part_id||p.part_key||p.published_at),
      title:"Latest released Part",
      body:"Episode "+p.episode_number+" · Part "+String(p.part_number).padStart(3,"0")+" · "+esc(p.title||"GENESIS"),
      href:readerHref({episode_number:p.episode_number,part_number:p.part_number})
    });
  }catch{}
  try{
    const session=await getSession();
    if(session?.access_token){
      const account=await rpc("api_reader_account_v3",{},session.access_token);
      if(Number(account?.pending_reward_draws||0)>0){
        notices.push({id:"reward:"+account.pending_reward_draws,title:"Reward draw ready",body:String(account.pending_reward_draws)+" collectible draw"+(Number(account.pending_reward_draws)===1?"":"s")+" waiting in your Quest & Rewards vault.",href:"/site-preview/quests/"});
      }
    }
  }catch{}
  const read=readNotificationIds();
  const paint=()=>{
    const unread=notices.filter(n=>!read.has(n.id)).length;
    badge.textContent=String(unread);
    badge.classList.toggle("hidden",unread===0);
    list.innerHTML=notices.length?notices.map(n=>
      '<a class="notification-item '+(read.has(n.id)?"read":"unread")+'" href="'+esc(n.href)+'" data-notice-id="'+esc(n.id)+'"><span class="notification-dot"></span><div><strong>'+esc(n.title)+'</strong><p>'+esc(n.body)+'</p></div></a>'
    ).join(""):'<div class="notification-empty">No current updates. New releases and account activity will appear here.</div>';
    list.querySelectorAll("[data-notice-id]").forEach(a=>a.addEventListener("click",()=>{read.add(a.dataset.noticeId);storeNotificationIds(read)}));
  };
  const close=()=>{panel.classList.add("hidden");button.setAttribute("aria-expanded","false")};
  button.addEventListener("click",()=>{
    const opening=panel.classList.contains("hidden");
    panel.classList.toggle("hidden",!opening);
    button.setAttribute("aria-expanded",String(opening));
    if(opening){document.querySelector("#global-search-panel")?.classList.add("hidden");document.querySelector("#global-search-backdrop")?.classList.add("hidden")}
  });
  document.querySelector("#notification-close")?.addEventListener("click",close);
  document.querySelector("#notification-mark-all")?.addEventListener("click",()=>{notices.forEach(n=>read.add(n.id));storeNotificationIds(read);paint()});
  addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  paint();
}
function renderHomeAnnouncements(releaseState,accountData=null){
  const root=document.querySelector("#home-announcements");
  if(!root)return;
  const state=releaseStateFromClock(releaseState||{});
  const releaseDetail=releaseState?.launch_authorized===false
    ?"Production continues while public launch remains protected."
    :releaseState?.releases_paused
      ?"Public releases are paused; later Parts cannot skip chronology."
      :"8:00 AM · 2:00 PM · 8:00 PM PHT · Monday–Saturday · Sunday rest.";
  const reward=Number(accountData?.pending_reward_draws||0);
  const resume=loadReaderResume();
  root.innerHTML=
    '<div><span class="notice-icon gold"><i class="v25-icon i-release" aria-hidden="true"></i></span><p><strong>'+esc(state.code)+'</strong><small>'+esc(releaseDetail)+'</small></p><time>LIVE</time></div>'+
    '<div><span class="notice-icon cyan"><i class="v25-icon i-read" aria-hidden="true"></i></span><p><strong>'+(resume?"Continue your journey":"Reader progress ready")+'</strong><small>'+(resume?esc("Resume Episode "+resume.episode_number+" · Part "+String(resume.part_number).padStart(3,"0")):"Your device will remember the exact Part and reading position.")+'</small></p><time>READER</time></div>'+
    '<div><span class="notice-icon violet"><i class="v25-icon i-collectible" aria-hidden="true"></i></span><p><strong>'+(reward>0?esc(reward+" reward draw"+(reward===1?"":"s")+" ready"):"Quest & rewards")+'</strong><small>Tier rewards unlock every 2,000 EXP. Support never changes public chronology.</small></p><time>'+(reward>0?"READY":"SAFE")+'</time></div>';
}

async function initHome(){
  const timeEl=document.querySelector("#home-release-time");
  const partEl=document.querySelector("#home-release-part");
  const hEl=document.querySelector("#cd-hours");
  const mEl=document.querySelector("#cd-minutes");
  const sEl=document.querySelector("#cd-seconds");
  let nextAt=null;
  let releaseState=null;
  let accountData=null;
  let session=null;

  function nextManilaSlot(){
    const now=new Date();
    const parts=new Intl.DateTimeFormat("en-US",{
      timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false
    }).formatToParts(now).reduce((o,p)=>(o[p.type]=p.value,o),{});
    const y=Number(parts.year),m=Number(parts.month)-1,d=Number(parts.day);
    const nowLocalSeconds=Number(parts.hour)*3600+Number(parts.minute)*60+Number(parts.second);
    for(let dayOffset=0;dayOffset<8;dayOffset++){
      const localDate=new Date(Date.UTC(y,m,d+dayOffset));
      if(localDate.getUTCDay()===0)continue;
      for(const hour of [8,14,20]){
        if(dayOffset===0&&hour*3600<=nowLocalSeconds)continue;
        const target=new Date(Date.UTC(localDate.getUTCFullYear(),localDate.getUTCMonth(),localDate.getUTCDate(),hour-8,0,0));
        return {date:target,label:hour===8?"8:00 AM PHT":hour===14?"2:00 PM PHT":"8:00 PM PHT"};
      }
    }
    return {date:new Date(now.getTime()+8*3600*1000),label:"Next scheduled Part"};
  }
  function tick(){
    if(!nextAt)return;
    const ms=Math.max(0,nextAt.getTime()-Date.now());
    const t=Math.floor(ms/1000);
    if(hEl)hEl.textContent=String(Math.floor(t/3600)).padStart(2,"0");
    if(mEl)mEl.textContent=String(Math.floor((t%3600)/60)).padStart(2,"0");
    if(sEl)sEl.textContent=String(t%60).padStart(2,"0");
    if(ms<=0){
      nextAt=null;
      setTimeout(()=>location.reload(),1400);
    }
  }

  try{
    releaseState=firstRow(await rpc("api_public_release_state_v1"));
    paintReleaseState(document.querySelector("#home-release-state"),releaseState);
  }catch{}

  const authoritativeAt=releaseState?.next_publish_at?new Date(releaseState.next_publish_at):null;
  const authoritativeValid=authoritativeAt&&!Number.isNaN(authoritativeAt.getTime())&&authoritativeAt.getTime()>Date.now();
  if(authoritativeValid){
    nextAt=authoritativeAt;
    if(timeEl)timeEl.textContent=new Intl.DateTimeFormat("en-PH",{timeZone:"Asia/Manila",hour:"numeric",minute:"2-digit",hour12:true}).format(authoritativeAt)+" PHT";
    if(partEl&&releaseState?.next_part){
      partEl.textContent="Episode "+releaseState.next_part.episode_number+" · Part "+String(releaseState.next_part.part_number).padStart(3,"0");
    }
  }else if(releaseState?.launch_authorized&&!releaseState?.releases_paused){
    const slot=nextManilaSlot();nextAt=slot.date;if(timeEl)timeEl.textContent=slot.label;
  }else{
    if(timeEl)timeEl.textContent=releaseState?.releases_paused?"RELEASES PAUSED":"COMING SOON";
    if(hEl)hEl.textContent="00";if(mEl)mEl.textContent="00";if(sEl)sEl.textContent="00";
  }
  tick();setInterval(tick,1000);

  try{session=await getSession()}catch{}
  let episodes=[];
  try{episodes=await rpc("api_episode_library")}catch{}

  if(Array.isArray(episodes)&&episodes.length){
    const resume=await resolveResumeState(episodes,session);
    if(resume){
      const ep=episodes.find(e=>Number(e.episode_number)===Number(resume.episode_number));
      const epEl=document.querySelector("#home-current-episode");
      const titleEl=document.querySelector("#home-current-title");
      const summaryEl=document.querySelector("#home-current-summary");
      if(epEl)epEl.textContent="Episode "+resume.episode_number+" · Part "+String(resume.part_number).padStart(3,"0");
      if(titleEl)titleEl.textContent=resume.title||ep?.title||"Continue Your Journey";
      if(summaryEl)summaryEl.textContent=resume.summary_public||ep?.summary_public||"Continue from the exact Part you last opened.";
      const href=readerHref({episode_number:resume.episode_number,part_number:resume.part_number});
      document.querySelectorAll(".v2-reading-panel .reading-actions a,.v2-hero .hero-actions a:nth-child(2)").forEach(a=>a.href=href);
    }

    try{
      const parts=await latestPublicParts(episodes,3);
      const box=document.querySelector("#home-latest-releases");
      if(box&&parts.length){
        box.innerHTML=parts.map((p,index)=>{
          const published=p.published_at||p.publish_at;
          const age=published?Date.now()-new Date(published).getTime():Infinity;
          const fresh=age>=0&&age<36*3600*1000;
          return '<a class="release-tile v2-release-tile release-art-'+(index+1)+'" href="'+readerHref({episode_number:p.episode_number,part_number:p.part_number})+'">'+
            '<div class="release-thumb"></div><div class="release-info"><small>EPISODE '+esc(p.episode_number)+' · PART '+String(p.part_number).padStart(3,"0")+(fresh?' <b class="new-badge">NEW</b>':'')+'</small>'+
            '<strong>'+esc(p.title||p.episode_title||"GENESIS")+'</strong><span>'+esc(phtDateTime(published)||"Released Final Canon")+'</span></div></a>';
        }).join("");
      }
      if(partEl&&!releaseState?.next_part&&parts[0])partEl.textContent="After Episode "+parts[0].episode_number+" · Part "+String(parts[0].part_number).padStart(3,"0");
    }catch{}
  }

  try{
    const user=session?await getAuthUser(session):null;
    if(user){
      try{accountData=await rpc("api_reader_account_v3",{},session.access_token)}
      catch{accountData=await rpc("api_reader_account",{},session.access_token)}
      const name=accountData?.display_name||user?.user_metadata?.display_name||"Reader";
      document.querySelector("#home-reader-name").textContent=name;
      const totalExp=Number(accountData?.reader_exp??accountData?.total_exp??0);
      const tier=Number(accountData?.tier||Math.floor(totalExp/TIER_EXP_THRESHOLD)+1);
      const within=Number(accountData?.exp_into_tier??totalExp%TIER_EXP_THRESHOLD);
      document.querySelector("#home-reader-tier").textContent="Tier "+tier;
      document.querySelector("#home-exp-progress").textContent=within.toLocaleString()+" / "+TIER_EXP_THRESHOLD.toLocaleString()+" EXP";
      document.querySelector("#home-exp-total").textContent="Total EXP: "+totalExp.toLocaleString();
      document.querySelector("#home-exp-bar").style.width=Math.min(100,within/TIER_EXP_THRESHOLD*100)+"%";
      const nextTierEl=document.querySelector("#home-tier-next");
      if(nextTierEl)nextTierEl.textContent="Next reward in "+Number(accountData?.exp_to_next_tier??TIER_EXP_THRESHOLD-within).toLocaleString()+" EXP";
      const support=Number(accountData?.support?.advance_parts??accountData?.support?.credit_balance??0);
      document.querySelector("#home-support-unlocks").textContent="+"+support;
      document.querySelector("#home-access-total").textContent="+"+support+" Parts Ahead";
      document.querySelector("#home-reader-title").textContent=accountData?.reader_title||accountData?.support?.public_badge||"GENESIS Adventurer";
      document.querySelector("#home-collectibles").textContent=String(accountData?.collection_count??0);
      document.querySelector("#home-active-quests").textContent=Number(accountData?.pending_reward_draws||0)>0?String(accountData.pending_reward_draws)+" Reward Ready":"0 Ongoing";
    }
  }catch{}

  renderHomeAnnouncements(releaseState,accountData);
  await initGlobalSearch();
  await initNotificationCenter(releaseState);
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
