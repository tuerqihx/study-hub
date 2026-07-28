/* 桃桃学习台 · AI思维教练与开放题思考门槛 */
(function(){
  "use strict";
  let openReadyAt=0, thinkWay="", recorder=null, chunks=[], stream=null;
  const API_DEFAULT="http://127.0.0.1:8778";

  function addStyle(){
    if(document.getElementById("taoCoachStyle"))return;
    const s=document.createElement("style");s.id="taoCoachStyle";s.textContent=`
      .tao-think-box{background:#f7f3ff;border:2px solid #d7c9ed;border-radius:15px;padding:12px;text-align:left}
      .tao-think-step{font-weight:800;color:#654d8a;margin:2px 0 7px}.tao-think-help{font-size:13px;color:#887a98;line-height:1.55}
      .tao-think-box textarea{box-sizing:border-box;width:100%;resize:vertical;border:2px solid #c9b8e8;border-radius:11px;padding:9px 10px;font:16px/1.6 inherit;user-select:text;-webkit-user-select:text;background:#fff}
      .tao-think-ways{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 11px}.tao-think-way{border:2px solid #d9cdec;background:#fff;color:#6e5a84;border-radius:10px;padding:7px 9px;font:700 13px/1 inherit}
      .tao-think-way.on{background:#e7dcfa;border-color:#7958b0}.tao-open-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:10px}
      .tao-open-clear{border:2px solid #c9b8e8;border-radius:12px;background:#fff;color:#6e5a84;padding:9px 17px;font:700 15px/1 inherit}
      .tao-open-submit{border:0;border-radius:12px;background:#7c5cff;color:#fff;padding:10px 22px;font:700 16px/1 inherit}.tao-open-submit:disabled{opacity:.48}
      #taoCoachFab{position:fixed;right:14px;bottom:18px;z-index:950;border:0;border-radius:24px;background:linear-gradient(135deg,#7152b5,#3f86e8);color:#fff;padding:12px 16px;font:800 15px/1 inherit;box-shadow:0 6px 20px #53428355}
      #taoCoachPanel{display:none;position:fixed;right:12px;bottom:72px;z-index:951;width:min(390px,calc(100vw - 24px));max-height:72vh;overflow:auto;background:#fff;border:3px solid #8b6bc4;border-radius:20px;padding:14px;box-shadow:0 12px 35px #36245b44;text-align:left}
      #taoCoachPanel.open{display:block}.tao-coach-head{display:flex;justify-content:space-between;align-items:center;font-weight:900;color:#5f438e;font-size:18px}
      .tao-coach-close{border:0;background:#f1ebfa;border-radius:9px;font-size:18px}.tao-coach-msg{margin:10px 0;padding:10px 12px;border-radius:13px;background:#f5f0ff;color:#4e4160;line-height:1.65;white-space:pre-wrap}
      .tao-coach-actions{display:flex;gap:7px;flex-wrap:wrap}.tao-coach-btn{border:2px solid #8b6bc4;background:#fff;color:#65468e;border-radius:12px;padding:9px 11px;font:800 14px/1 inherit}
      .tao-coach-talk{background:#7652b4;color:#fff;touch-action:none}.tao-coach-talk.recording{background:#d94b67;transform:scale(.98)}
      .tao-coach-status{min-height:20px;margin-top:8px;color:#8a7e96;font-size:13px}.tao-coach-setup{float:right;border:0;background:none;color:#aaa;font-size:13px}
    `;document.head.appendChild(s);
  }

  function openMarkup(opts){
    const evidence=(opts&&opts.evidence)||"理由、例子、计算过程或检查办法";
    return `<div class="tao-think-box">
      <div class="tao-think-step">① 先不动笔，安静想一小会儿</div>
      <div class="tao-think-help">想清楚题目在问什么。可以在思考纸上圈线索、画关系，不比谁写得快。</div>
      <div class="tao-think-ways">
        <button type="button" class="tao-think-way" data-way="圈了线索">🔎 圈了线索</button>
        <button type="button" class="tao-think-way" data-way="画了关系">✏️ 画了关系</button>
        <button type="button" class="tao-think-way" data-way="试了例子">🧪 试了例子</button>
        <button type="button" class="tao-think-way" data-way="在脑中检查">🧠 在脑中检查</button>
      </div>
      <div class="tao-think-step">② 我的判断或办法</div>
      <textarea id="openIdea" rows="2" placeholder="我认为…… / 我的办法是……"></textarea>
      <div class="tao-think-step" style="margin-top:10px">③ 我为什么这样想</div>
      <textarea id="openReason" rows="3" placeholder="请写下${evidence}"></textarea>
      <div class="tao-open-actions"><button type="button" id="openClear" class="tao-open-clear">清空重写</button>
      <button type="button" id="openGo" class="tao-open-submit" disabled>先想 12 秒</button></div>
      <div id="openThinkNote" class="tao-think-help" style="text-align:center;margin-top:7px">认真想过的答案不一定长，但一定能说出一点理由。</div>
    </div>`;
  }
  function mountOpen(opts){
    const area=document.getElementById("answerArea");if(!area)return;
    area.innerHTML=openMarkup(opts);openReadyAt=Date.now()+12000;thinkWay="";
    area.querySelectorAll(".tao-think-way").forEach(b=>b.onclick=()=>{thinkWay=b.dataset.way;
      area.querySelectorAll(".tao-think-way").forEach(x=>x.classList.toggle("on",x===b));});
    const submit=document.getElementById("openGo"),tick=()=>{
      if(!submit||document.body.contains(submit)===false)return;
      const left=Math.max(0,Math.ceil((openReadyAt-Date.now())/1000));
      if(left){submit.disabled=true;submit.textContent="先想 "+left+" 秒";setTimeout(tick,500);}
      else{submit.disabled=false;submit.textContent=(opts&&opts.editing)?"保存修改":"提交我的想法";}
    };tick();
    document.getElementById("openClear").onclick=()=>{["openIdea","openReason"].forEach(id=>{const x=document.getElementById(id);if(x)x.value="";});
      thinkWay="";area.querySelectorAll(".tao-think-way").forEach(x=>x.classList.remove("on"));document.getElementById("openIdea").focus();};
    submit.onclick=opts&&opts.onSubmit;
  }
  function compact(s){return String(s||"").replace(/\s+/g,"").replace(/[，。！？、；：,.!?;:'"“”‘’（）()]/g,"");}
  function careless(s){
    const x=compact(s);if(!x)return true;
    if(/^(不知道|不会|随便|乱写|没有|不想|不知道为什么|不清楚|略)+$/.test(x))return true;
    if(/(.)\1{3,}/.test(x))return true;
    const uniq=new Set(x.split(""));return x.length>=6&&uniq.size/Math.max(x.length,1)<0.28;
  }
  function readOpen(){
    const idea=(document.getElementById("openIdea")||{}).value||"",reason=(document.getElementById("openReason")||{}).value||"";
    return {idea:idea.trim(),reason:reason.trim(),way:thinkWay,
      combined:idea.trim()+"\n我的理由/证据："+reason.trim()+(thinkWay?"\n我先这样想过："+thinkWay:"")};
  }
  function validateOpen(){
    const a=readOpen(),note=document.getElementById("openThinkNote");
    const fail=msg=>{if(note){note.style.color="#c14c67";note.textContent=msg;}return {ok:false,msg};};
    if(Date.now()<openReadyAt)return fail("先给脑袋一点安静时间，不着急提交。");
    if(compact(a.idea).length<4||careless(a.idea))return fail("先写清楚你的判断或办法。写“不知道”不会扣分，可以点思维教练要一小步提示。");
    if(compact(a.reason).length<6||careless(a.reason))return fail("还缺少“为什么”。请补一条线索、一个例子、一步计算或检查办法。");
    if(compact(a.idea)===compact(a.reason))return fail("理由不能只是把判断再抄一遍。试着回答：我根据什么这样判断？");
    if(note){note.style.color="#2d9b66";note.textContent="✓ 看得出你认真留下了判断和理由。";}
    return {ok:true,value:a.combined,parts:a};
  }

  function currentContext(){
    const q=document.getElementById("q"),prog=document.getElementById("prog"),tip=document.getElementById("tip"),tag=document.getElementById("qtag");
    const oa=readOpen();return {page:document.title,progress:prog&&prog.textContent||"",tag:tag&&tag.textContent||"",
      question:q&&q.innerText||"",tip:tip&&tip.textContent||"",idea:oa.idea,reason:oa.reason,
      drawing:window.TaoPaper&&TaoPaper.snapshot?TaoPaper.snapshot():""};
  }
  function endpoint(){return (localStorage.getItem("tao_coach_endpoint")||API_DEFAULT).replace(/\/$/,"");}
  function token(){return localStorage.getItem("tao_coach_family_key")||"";}
  async function sendCoach(payload){
    const r=await fetch(endpoint()+"/api/coach",{method:"POST",headers:{"Content-Type":"application/json","X-Tao-Family":token()},body:JSON.stringify(payload)});
    const d=await r.json();if(!r.ok)throw new Error(d.msg||d.error||"老师暂时没有连上");return d;
  }
  function saveCoach(rec){try{const k="tao_coach_journal_v1",a=JSON.parse(localStorage.getItem(k))||[];a.push(rec);localStorage.setItem(k,JSON.stringify(a.slice(-80)));}catch(e){}}
  function say(text){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="zh-CN";u.rate=.93;speechSynthesis.speak(u);}catch(e){}}
  function showReply(text){
    const m=document.getElementById("taoCoachMsg");if(m)m.textContent=text;say(text);
    saveCoach({at:new Date().toISOString(),question:currentContext().question,reply:text});
  }
  async function askText(text){
    const st=document.getElementById("taoCoachStatus");if(st)st.textContent="月光老师正在看你的题和笔迹……";
    try{const d=await sendCoach({text,context:currentContext()});showReply(d.reply||"我听到了。先说说你已经知道哪条线索？");if(st)st.textContent="你可以继续说。";}
    catch(e){if(st)st.textContent="连接失败："+e.message+"。请让爸爸检查Mac上的思维教练。";}
  }
  async function startRecord(){
    if(recorder&&recorder.state==="recording")return;
    const st=document.getElementById("taoCoachStatus"),btn=document.getElementById("taoCoachTalk");
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());if(st)st.textContent="老师正在听……";
        const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"}),reader=new FileReader();
        reader.onload=async()=>{try{const d=await sendCoach({audio:reader.result,context:currentContext()});showReply(d.reply);if(st)st.textContent=d.heard?"我听到："+d.heard:"你可以继续说。";}
          catch(e){if(st)st.textContent="连接失败："+e.message;}};reader.readAsDataURL(blob);};
      recorder.start();btn.classList.add("recording");btn.textContent="松开发给老师";if(st)st.textContent="我在听，慢慢说……";
    }catch(e){if(st)st.textContent="请在iPad设置中允许ChatGPT学习台使用麦克风。";}
  }
  function stopRecord(){const btn=document.getElementById("taoCoachTalk");if(btn){btn.classList.remove("recording");btn.textContent="按住说话";}
    if(recorder&&recorder.state==="recording")recorder.stop();}
  function setup(){
    const ep=prompt("思维教练地址：",endpoint());if(ep===null)return;const key=prompt("家庭连接密码（只存在这台设备）：",token());if(key===null)return;
    localStorage.setItem("tao_coach_endpoint",ep.trim());localStorage.setItem("tao_coach_family_key",key.trim());
    document.getElementById("taoCoachStatus").textContent="设置已保存，点“给我一点提示”测试连接。";
  }
  function mountCoach(){
    if(document.getElementById("taoCoachFab"))return;addStyle();
    const fab=document.createElement("button");fab.id="taoCoachFab";fab.type="button";fab.textContent="🎧 思维教练";
    const panel=document.createElement("section");panel.id="taoCoachPanel";panel.innerHTML=`<div class="tao-coach-head"><span>🌙 AI思维教练</span><button class="tao-coach-close">×</button></div>
      <button class="tao-coach-setup">家长设置</button><div id="taoCoachMsg" class="tao-coach-msg">我不会替你报答案。先告诉我：你已经发现了哪条线索？</div>
      <div class="tao-coach-actions"><button id="taoCoachTalk" class="tao-coach-btn tao-coach-talk">按住说话</button>
      <button id="taoCoachHint" class="tao-coach-btn">给一点提示</button><button id="taoCoachLook" class="tao-coach-btn">看看我的笔迹</button></div>
      <div id="taoCoachStatus" class="tao-coach-status">需要Mac上的思维教练正在运行。</div>`;
    document.body.append(fab,panel);fab.onclick=()=>panel.classList.toggle("open");panel.querySelector(".tao-coach-close").onclick=()=>panel.classList.remove("open");
    panel.querySelector(".tao-coach-setup").onclick=setup;document.getElementById("taoCoachHint").onclick=()=>askText("请只给我一小步提示，不要说答案。");
    document.getElementById("taoCoachLook").onclick=()=>askText("请看看我的笔迹和当前想法，先肯定我已经做的，再问一个能让我继续想的问题。");
    const talk=document.getElementById("taoCoachTalk");["pointerdown","touchstart"].forEach(n=>talk.addEventListener(n,e=>{e.preventDefault();startRecord();},{passive:false}));
    ["pointerup","pointercancel","touchend","touchcancel"].forEach(n=>talk.addEventListener(n,e=>{e.preventDefault();stopRecord();},{passive:false}));
  }
  window.TaoCoach={mountOpen,readOpen,validateOpen,currentContext,askText};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountCoach);else mountCoach();
})();
