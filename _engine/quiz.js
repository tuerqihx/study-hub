/* ============================================================
   桃桃闯关 · 通用游戏引擎  quiz.js
   每个App的内联脚本里先定义全局：STORE_KEY、MODULES，(可选)PER_ROUND
   依赖 DOM id：menu card prog tip q answerArea fb nextBtn done doneMsg doneGot starNow
   规则：每题"第一次就答对"才给 ⭐；选错先打 ✗、记进错题，之后试对不给星。
   ============================================================ */
(function(){
  "use strict";
  const PR = (typeof PER_ROUND!=="undefined") ? PER_ROUND : 5;

  /* ---- 存储 ---- */
  function loadStore(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY))||{days:{},review:[]}; }catch(e){ return {days:{},review:[]}; } }
  function saveStore(){ try{ localStorage.setItem(STORE_KEY,JSON.stringify(STORE)); }catch(e){} }
  const STORE = loadStore(); if(!STORE.review) STORE.review=[]; if(!STORE.mastery) STORE.mastery={}; if(!STORE.done) STORE.done={}; if(!STORE.last) STORE.last={};
  const MASTER = 2;  // 一道题"第一次就答对" 2 次 → 算掌握，之后淡出，把没掌握的顶上来多练
  function qkey(it){ return (it.q||"").replace(/<[^>]+>/g,"").trim(); }
  function dkey(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function todayRec(){ const k=dkey(new Date()); if(!STORE.days[k]) STORE.days[k]={stars:0,correct:0,guessed:0}; return STORE.days[k]; }
  function showStarNow(){ const el=document.getElementById("starNow"); if(el) el.textContent="今天 ⭐ "+todayRec().stars; }
  showStarNow();

  /* ---- 每天时间额度（制造稀缺感，非无限刷）：0 = 不限时 ---- */
  const LIMIT_MIN = (typeof TIME_LIMIT_MIN!=="undefined") ? TIME_LIMIT_MIN : 0;
  function timeRec(){ const r=todayRec(); if(!r.timeSec) r.timeSec=0; return r; }
  function usedSec(){ return timeRec().timeSec; }
  function remainSec(){ return LIMIT_MIN ? Math.max(0, LIMIT_MIN*60 - usedSec()) : Infinity; }
  let sessionStart=null;
  function tickTime(){ if(!LIMIT_MIN || !sessionStart) return; const now=Date.now();
    // 每次只计入最多 180 秒：防止锁屏/挂机/走神把大段真实时间灌进用时统计
    const d=Math.min((now-sessionStart)/1000, 180);
    const r=timeRec(); r.timeSec=(r.timeSec||0)+d; sessionStart=now; saveStore(); }
  function ensureTimeBanner(){ if(!LIMIT_MIN) return null; let b=document.getElementById("timeBanner");
    if(!b){ const menu=document.getElementById("menu"); b=document.createElement("div"); b.id="timeBanner";
      b.style.cssText="text-align:center;font-size:15px;font-weight:bold;color:#999;margin:0 0 10px;"; menu.parentNode.insertBefore(b, menu); }
    return b; }
  function renderTimeBanner(){ if(!LIMIT_MIN) return; const b=ensureTimeBanner();
    const r=Math.ceil(remainSec()/60);
    b.textContent = r>0 ? ("⏳ 今天这一科还能玩 "+r+" 分钟") : "⏰ 今天这一科的时间用完啦，明天再来玩～"; }

  function rnd(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  /* ---- 音效（Web Audio，离线、无文件） ---- */
  let AC=null;
  function actx(){ try{ if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==="suspended") AC.resume(); return AC; }catch(e){ return null; } }
  function tone(freq,dur,type,when,gain){ const c=actx(); if(!c) return; const t=c.currentTime+(when||0);
    const o=c.createOscillator(), g=c.createGain(); o.type=type||"sine"; o.frequency.value=freq;
    g.gain.setValueAtTime(gain||0.12,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur); }
  function sndRight(){ tone(660,0.12,"triangle",0); tone(990,0.16,"triangle",0.1); }
  function sndWrong(){ tone(170,0.2,"sawtooth",0,0.07); }
  function sndCombo(){ tone(780,0.1,"triangle",0); tone(1040,0.1,"triangle",0.08); tone(1320,0.14,"triangle",0.16); }
  function sndFinish(){ [523,659,784,1047].forEach((f,i)=>tone(f,0.18,"triangle",i*0.12)); }

  /* ---- 撒花 / +1⭐ 动画 ---- */
  function burst(emojis){ const arr=emojis||["⭐","🌟","🎉","✨"];
    for(let i=0;i<14;i++){ const s=document.createElement("span"); s.textContent=arr[i%arr.length];
      s.style.cssText="position:fixed;left:"+rnd(8,92)+"%;top:"+rnd(12,42)+"%;font-size:"+rnd(20,38)+"px;pointer-events:none;z-index:9999;transition:all 1.1s ease-out;opacity:1;";
      document.body.appendChild(s);
      requestAnimationFrame(()=>{ s.style.top=rnd(72,100)+"%"; s.style.opacity="0"; });
      setTimeout(()=>s.remove(),1200); } }
  function floatPlus(){ const star=document.getElementById("starNow");
    const p=document.createElement("span"); p.textContent="+1⭐";
    p.style.cssText="position:fixed;font-size:22px;font-weight:bold;color:#ff8c42;pointer-events:none;z-index:9999;transition:all .9s ease-out;";
    const r=star?star.getBoundingClientRect():{left:innerWidth/2,top:60}; p.style.left=r.left+"px"; p.style.top=r.top+"px";
    document.body.appendChild(p); requestAnimationFrame(()=>{ p.style.top=(r.top-42)+"px"; p.style.opacity="0"; }); setTimeout(()=>p.remove(),950); }

  /* ---- 进度条（动态注入，不改各App的HTML） ---- */
  let barWrap=null;
  function ensureBar(){ if(barWrap) return; const prog=document.getElementById("prog"); if(!prog) return;
    barWrap=document.createElement("div"); barWrap.style.cssText="height:14px;background:#eef0f3;border-radius:10px;overflow:hidden;margin:4px 0 12px;";
    barWrap.innerHTML='<div id="bar" style="height:100%;width:0;border-radius:10px;background:linear-gradient(90deg,#56d6a0,#1fae8c);transition:width .3s;"></div>';
    prog.parentNode.insertBefore(barWrap, prog.nextSibling); }
  function setBar(done,total){ ensureBar(); const b=document.getElementById("bar"); if(b) b.style.width=Math.round(done/total*100)+"%"; }

  /* ---- 出题 ---- */
  function buildRound(mod){
    if(mod.gen){ const out=[]; const seen=new Set(); let guard=0;
      while(out.length<PR && guard<80){ const it=mod.gen(); if(!seen.has(it.q)){ seen.add(it.q); out.push(it); } guard++; } return out; }
    // 固定题库：没掌握的优先出，已掌握的淡到后面（不够才补出来复习）
    const pool = (mod.bank || mod.questions || []).slice();
    const weak=[], strong=[];
    pool.forEach(it=>{ ((STORE.mastery[qkey(it)]||0) >= MASTER ? strong : weak).push(it); });
    const ordered = shuffle(weak).concat(shuffle(strong));
    return ordered.slice(0, Math.min(PR, ordered.length));
  }

  let curMod=null,curKey=null,qList=[],qi=0,answered=false,typed="",firstWrong=false,combo=0,roundStars=0,roundGuessed=0,bestCombo=0;

  const NUM=["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳"];

  function ensureContinueBar(){ let bar=document.getElementById("continueBar");
    if(!bar){ bar=document.createElement("div"); bar.id="continueBar"; bar.style.cssText="text-align:center;margin:0 0 16px;";
      const menu=document.getElementById("menu"); menu.parentNode.insertBefore(bar, menu); }
    return bar; }
  function renderContinueBar(keys, curIdx, timeUp, picks){ const bar=ensureContinueBar();
    if(timeUp){ bar.innerHTML=""; return; }
    let key=null, label="▶️ 接着闯关：";
    if(curIdx>=0){ key=keys[curIdx]; }
    else if(picks && picks.length){
      const todo=picks.filter(k=>!playedToday(k));
      if(todo.length){ key=todo[0]; label="📅 今天复习："; }
    }
    if(!key){
      bar.innerHTML = (picks&&picks.length)
        ? '<div style="font-size:17px;font-weight:bold;color:#2a9d5c;padding:6px;">🎉 今天这一科的任务全做完啦！想多玩，从下面随便挑～</div>' : "";
      return;
    }
    const mod=MODULES[key];
    bar.innerHTML='<button id="continueBtn" style="background:linear-gradient(140deg,#ff9a56,#ff6b6b);color:#fff;border:none;'+
      'border-radius:18px;font-size:19px;font-weight:bold;padding:15px 28px;cursor:pointer;font-family:inherit;'+
      'box-shadow:0 6px 16px rgba(255,120,90,.32);">'+label+mod.icon+' '+mod.name+'</button>';
    document.getElementById("continueBtn").onclick=()=>startMod(key); }

  /* ---- 今日复习关：通关后的关卡每天自动指定 1–2 关复习，孩子不用自己挑 ----
     第1关 = 最需要的（没掌握的题最多，其次最久没复习）；第2关 = 按日期轮换，保证每关都轮到。
     同一天怎么刷新都不变，第二天自动换。还有新关没通时只安排 1 关复习，新关优先。 */
  function playedToday(key){ const r=STORE.days[dkey(new Date())]; return !!(r&&r.mods&&r.mods[key]); }
  function weakCount(key){ const mod=MODULES[key], pool=mod.bank||mod.questions||[]; let n=0;
    pool.forEach(it=>{ if((STORE.mastery[qkey(it)]||0)<MASTER) n++; }); return n; }
  function todayPicks(keys){
    const done=keys.filter(k=>STORE.done[k]);
    if(!done.length) return [];
    const hasNew=keys.some(k=>!STORE.done[k]);
    const need=done.slice().sort((a,b)=> weakCount(b)-weakCount(a)
      || String(STORE.last[a]||"").localeCompare(String(STORE.last[b]||""))
      || done.indexOf(a)-done.indexOf(b));
    const picks=[need[0]];
    if(!hasNew && done.length>1){
      const t=new Date(), dayNum=t.getFullYear()*372+t.getMonth()*31+t.getDate();
      let i=dayNum%done.length; if(done[i]===picks[0]) i=(i+1)%done.length;
      picks.push(done[i]);
    }
    return picks;
  }

  function makeCard(key,i,keys,curIdx,timeUp,isPick){ const mod=MODULES[key]; const b=document.createElement("button");
    const prevDone=(i===0)||!!STORE.done[keys[i-1]];
    const done=!!STORE.done[key], locked=timeUp||!prevDone, isCur=(i===curIdx)&&!timeUp;
    const num=NUM[i]||((i+1)+".");
    const reviewedToday = isPick && playedToday(key);
    let st = timeUp ? '⏰ 今天时间用完啦'
           : isPick ? (reviewedToday ? '🎉 今天复习完啦' : '📅 今天复习这一关')
           : done ? '✓ 学过啦（可复习）' : locked ? '🔒 先过上一关' : isCur ? '👉 现在学这个' : (mod.grade||mod.sub||'去闯关');
    b.className="lv "+(mod.cls||"");
    b.innerHTML='<span class="i">'+mod.icon+'</span><span class="n">'+num+' '+mod.name+'</span><span class="d">'+st+'</span>';
    if(locked){ b.style.opacity="0.45"; b.style.filter="grayscale(0.6)";
      b.onclick=()=>alert(timeUp?"今天这一科的时间用完啦，明天再来挑战！":"先把前面的关卡过了，再来这一关哦 😊"); }
    else { b.onclick=()=>startMod(key); }
    if(isCur) b.style.boxShadow="0 0 0 4px #ffd34d, 0 8px 20px rgba(0,0,0,.18)";
    else if(isPick && !reviewedToday && !timeUp) b.style.boxShadow="0 0 0 4px #9fd0ff, 0 8px 20px rgba(0,0,0,.14)";
    else if(done) b.style.outline="3px solid #9fe6c8";
    return b; }

  function renderMenu(){ const m=document.getElementById("menu"); m.innerHTML="";
    renderTimeBanner();
    const timeUp = LIMIT_MIN && remainSec()<=0;
    const keys=Object.keys(MODULES);
    // 找出"现在该学的那一关"：前一关已通关、自己还没通关的第一个
    let curIdx=-1;
    for(let i=0;i<keys.length;i++){ const prevDone=(i===0)||!!STORE.done[keys[i-1]]; if(prevDone && !STORE.done[keys[i]]){ curIdx=i; break; } }
    const picks=todayPicks(keys);
    renderContinueBar(keys, curIdx, timeUp, picks);

    // 错题答疑入口
    { const n=reviewList().length; const rb=document.createElement("div"); rb.style.cssText="grid-column:1/-1;text-align:center;margin:0 0 8px;";
      rb.innerHTML='<button onclick="openReview()" style="border:2px solid #ffcf87;background:#fff8ec;color:#b8600b;border-radius:14px;padding:10px 20px;font-size:16px;font-weight:bold;cursor:pointer;font-family:inherit;">📕 错题答疑'+(n?'（'+n+'）':'')+'</button>';
      m.appendChild(rb); }

    // 没学完的关卡正常铺开；已经学过的关卡折叠进"复习"区，别把该做的新内容淹没了
    const activeIdx=[], doneIdxArr=[];
    keys.forEach((key,i)=>{ (STORE.done[key] ? doneIdxArr : activeIdx).push(i); });
    activeIdx.forEach(i=>{ m.appendChild(makeCard(keys[i], i, keys, curIdx, timeUp)); });

    // 今天的复习关：单独亮出来，不埋进折叠区
    if(picks.length){
      const head=document.createElement("div");
      head.style.cssText="grid-column:1/-1;text-align:center;font-size:15px;font-weight:bold;color:#3b82f6;margin-top:14px;";
      head.textContent="📅 今天的复习关";
      m.appendChild(head);
      picks.forEach(k=>{ m.appendChild(makeCard(k, keys.indexOf(k), keys, curIdx, timeUp, true)); });
    }

    const restIdx=doneIdxArr.filter(i=>picks.indexOf(keys[i])<0);
    if(restIdx.length){
      const wrap=document.createElement("div"); wrap.style.cssText="grid-column:1/-1;text-align:center;margin-top:14px;";
      const toggle=document.createElement("button");
      toggle.textContent="✓ 其他已学过的 "+restIdx.length+" 关（想多玩点这里）";
      toggle.style.cssText="background:none;border:2px dashed #ccc;color:#999;padding:8px 18px;border-radius:12px;font-size:14px;cursor:pointer;font-family:inherit;";
      const doneGrid=document.createElement("div");
      doneGrid.className="menu"; doneGrid.style.cssText="display:none;margin-top:12px;";
      restIdx.forEach(i=>{ doneGrid.appendChild(makeCard(keys[i], i, keys, curIdx, timeUp)); });
      toggle.onclick=()=>{ doneGrid.style.display = doneGrid.style.display==="none" ? "grid":"none"; };
      wrap.appendChild(toggle); m.appendChild(wrap); m.appendChild(doneGrid);
    }
  }

  function startMod(key){
    if(LIMIT_MIN && remainSec()<=0){ alert("今天这一科的时间用完啦，明天再来挑战！"); return; }
    curKey=key; curMod=MODULES[key]; qList=buildRound(curMod); qi=0; combo=0; roundStars=0; roundGuessed=0; bestCombo=0;
    sessionStart=Date.now();
    document.getElementById("menu").style.display="none"; document.getElementById("done").style.display="none";
    document.getElementById("card").style.display="block"; document.getElementById("tip").textContent=curMod.tip||""; showQ(); }

  function showQ(){ answered=false; typed=""; firstWrong=false;
    const total=qList.length, item=qList[qi];
    document.getElementById("prog").textContent=(curMod.icon||"")+" "+curMod.name+"　第 "+(qi+1)+" / "+total+" 题"+(combo>=2?"　🔥连对"+combo:"");
    setBar(qi,total);
    document.getElementById("q").innerHTML=item.q;
    const fb=document.getElementById("fb"); fb.textContent=""; fb.className="feedback";
    document.getElementById("nextBtn").style.display="none";
    const area=document.getElementById("answerArea");
    if(item.type==="choice"){ let html='<div class="opts">';
      shuffle(item.options).forEach(o=>{ html+='<button class="opt" data-v="'+String(o).replace(/"/g,'&quot;')+'">'+o+'</button>'; });
      html+='</div>'; area.innerHTML=html;
      area.querySelectorAll(".opt").forEach(btn=>{ btn.onclick=()=>pickOpt(btn, btn.getAttribute("data-v")); });
    } else {
      area.innerHTML='<div class="answbox"><span class="answ" id="answ">_</span></div>'+
        '<div class="pad">'+[1,2,3,4,5,6,7,8,9].map(n=>'<button class="key" data-k="'+n+'">'+n+'</button>').join('')+
        '<button class="key del" data-k="del">⌫</button><button class="key" data-k="0">0</button>'+
        '<button class="key go" data-k="go">确定</button></div>';
      area.querySelectorAll(".key").forEach(btn=>{ const k=btn.getAttribute("data-k");
        btn.onclick=()=>{ if(k==="go") checkNum(); else press(k); }; });
    }
    resetHint();
  }
  function press(k){ if(answered)return; if(k==="del")typed=typed.slice(0,-1); else if(typed.length<4)typed+=k;
    const a=document.getElementById("answ"); if(a) a.textContent=typed===""?"_":typed; }

  const PRAISE=["太棒了！","对啦！","完全正确！","厉害！","就是这样！","你真行！"];
  function pickOpt(el,val){ if(answered)return; const item=qList[qi];
    if(val===String(item.answer)){ el.classList.add("right"); good(); }
    else { el.classList.add("wrong"); el.innerHTML="✗ "+el.innerHTML; el.onclick=null; bad(item); } }
  function checkNum(){ if(answered)return; const item=qList[qi]; if(typed==="")return;
    if(Number(typed)===Number(item.answer)){ good(); }
    else { bad(item); typed=""; const a=document.getElementById("answ"); if(a)a.textContent="_"; } }

  function good(){ answered=true; clearTimeout(stuckTimer);
    const hb=document.getElementById("hintBtn"); if(hb) hb.style.display="none";
    const fb=document.getElementById("fb");
    const k=qkey(qList[qi]); const r=todayRec(); if(!r.awarded) r.awarded={};
    if(!firstWrong){
      STORE.mastery[k]=(STORE.mastery[k]||0)+1;       // 学会进度照常累积
      if(r.awarded[k]){ // 这道题今天已经拿过星了 → 不再给星（防止重复刷奖励）
        saveStore(); sndRight();
        fb.className="feedback ok"; fb.textContent="✅ 对啦！不过这题今天已经拿过 ⭐ 了——做没做过的新题才加星哦";
      } else { // 今天第一次做对这道题 → 给星
        r.awarded[k]=true; r.stars++; r.correct++; saveStore(); showStarNow(); floatPlus(); roundStars++;
        combo++; if(combo>bestCombo) bestCombo=combo; sndRight();
        let msg=PRAISE[Math.floor(Math.random()*PRAISE.length)]+" ⭐";
        if(combo>=3){ msg="🔥 连对 "+combo+" 个！ "+msg; sndCombo(); burst(["🔥","⭐","🌟"]); }
        fb.className="feedback ok"; fb.textContent=msg;
      }
    } else { // 试出来的/蒙的 → 不给星
      r.guessed=(r.guessed||0)+1; saveStore(); roundGuessed++; combo=0;
      fb.className="feedback ok"; fb.textContent="答对了！这题先记下来，下次争取一次就对 ✊（这题不加星）";
    }
    setBar(qi+1,qList.length);
    document.getElementById("nextBtn").style.display="block";
  }
  function bad(item){ if(!firstWrong){ firstWrong=true; STORE.mastery[qkey(item)]=0; recordMiss(item); } combo=0; sndWrong();
    const fb=document.getElementById("fb"); fb.className="feedback no";
    fb.textContent="✗ 不对哦，再想想～ 提示："+(item.hint||"慢慢来，你可以的");
    // 错过一次后，提示按钮直接升级成"详细讲讲"，别让她在原地转圈
    const hb=document.getElementById("hintBtn");
    if(hb && hintLevel<1){ hintLevel=1; hb.textContent=HINT_LABELS[1]; } }
  function recordMiss(item){ try{ STORE.review.push({
      d:dkey(new Date()), m:curMod.name, icon:curMod.icon||"",
      q:(item.q||"").replace(/<[^>]+>/g," ").trim(),
      a:item.answer,                         // 正确答案
      exp:item.exp||"",                      // 这道题的讲解（数学多为"结合现实"的详细讲解）
      teach:curMod.teach||"",                // 这一关的基础讲解（从头讲起）
      hint:item.hint||"" });
    if(STORE.review.length>60) STORE.review=STORE.review.slice(-60); saveStore(); }catch(e){} }

  /* ---- 错题答疑板块：把做错的题＋正确答案＋讲解收起来，随时点开复习 ---- */
  function reviewList(){ const seen=new Set(), out=[];
    for(let i=STORE.review.length-1;i>=0;i--){ const r=STORE.review[i]; if(!r||!r.q||seen.has(r.q)) continue; seen.add(r.q); out.push(r); }
    return out; }
  function openReview(){ const list=reviewList();
    let ov=document.getElementById("reviewOverlay");
    if(!ov){ ov=document.createElement("div"); ov.id="reviewOverlay";
      ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;overflow-y:auto;padding:16px;"; document.body.appendChild(ov); }
    let h='<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:18px;padding:18px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
      + '<span style="font-size:20px;font-weight:bold;">📕 错题答疑</span>'
      + '<button onclick="closeReview()" style="border:none;background:#eee;border-radius:10px;padding:8px 14px;font-size:15px;cursor:pointer;font-family:inherit;">✕ 关闭</button></div>';
    if(!list.length){ h+='<div style="text-align:center;color:#999;padding:30px 0;font-size:16px;">还没有错题～<br>做错的题会自动收进这里，配上正确答案和讲解。</div>'; }
    else { h+='<div style="color:#888;font-size:14px;margin-bottom:12px;">这里是最近做错的题（每题只留最近一次）。点开看讲解，弄懂了再回去闯关，一次做对照样得 ⭐。</div>';
      list.forEach((r,i)=>{ const exp=r.exp||"", teach=r.teach||"", tip=r.hint||"";
        h+='<div style="border:2px solid #ffe0b3;border-radius:14px;padding:12px 14px;margin-bottom:12px;">'
          + '<div style="font-size:13px;color:#b8860b;margin-bottom:4px;">'+(r.icon||"")+' '+(r.m||"")+'　·　'+(r.d||"")+'</div>'
          + '<div style="font-size:17px;font-weight:bold;margin-bottom:6px;">'+(i+1)+'. '+r.q+'</div>'
          + '<div style="font-size:16px;color:#2a9d5c;margin-bottom:8px;">✅ 正确答案：<b>'+(r.a!==undefined&&r.a!==null?r.a:"")+'</b></div>'
          + '<button onclick="var d=this.nextElementSibling;d.style.display=d.style.display===\'block\'?\'none\':\'block\';" style="border:2px solid #ffd34d;background:#fff8e6;color:#b8860b;border-radius:10px;padding:8px 14px;font-size:15px;font-weight:bold;cursor:pointer;font-family:inherit;">💡 为什么？点我看讲解</button>'
          + '<div style="display:none;margin-top:8px;background:#fff8e6;border-radius:12px;padding:12px 14px;font-size:16px;line-height:1.9;">'
          +   (exp?('<div style="margin-bottom:'+((teach)?'10px':'0')+'">'+exp+'</div>'):'')
          +   (teach?('<div style="border-top:1px dashed #ecd8a0;padding-top:8px;"><b>📖 先弄懂这一类：</b><br>'+teach+'</div>'):'')
          +   ((!exp&&!teach)?('💡 '+ (tip||"再读读题目，想想它在问什么。")):'')
          + '</div></div>';
      });
      h+='<div style="text-align:center;margin-top:6px;"><button onclick="clearReview()" style="border:2px dashed #ccc;background:none;color:#999;border-radius:10px;padding:8px 16px;font-size:14px;cursor:pointer;font-family:inherit;">🗑 清空错题本</button></div>';
    }
    h+='</div>'; ov.innerHTML=h; ov.style.display="block"; }
  function closeReview(){ const ov=document.getElementById("reviewOverlay"); if(ov) ov.style.display="none"; }
  function clearReview(){ if(confirm("确定清空错题本吗？清了就看不到之前的错题啦。")){ STORE.review=[]; saveStore(); openReview(); } }
  window.openReview=openReview; window.closeReview=closeReview; window.clearReview=clearReview;

  /* ---- 不会做？分级帮助：思路 → 详细讲解 → 看答案。专治"卡在一道题上不动" ----
     第1、2级不影响得星（学方法不丢星）；第3级直接看答案，这题不给星、记进复习本 */
  let hintLevel=0, stuckTimer=null;
  const HINT_LABELS=["💡 不会做？看看思路","🧑‍🏫 还是不会？详细讲讲","🔍 实在不会，看答案（这题不算星）"];
  function hintUI(){
    let box=document.getElementById("hintBox");
    if(!box){
      const area=document.getElementById("answerArea"); if(!area) return null;
      box=document.createElement("div"); box.id="hintBox";
      box.style.cssText="margin-top:12px;text-align:center;";
      box.innerHTML='<div id="hintText" style="display:none;text-align:left;background:#fff8e6;border:2px solid #ffd34d;border-radius:14px;padding:12px 14px;font-size:16px;line-height:1.8;margin-bottom:10px;"></div>'+
        '<button id="hintBtn" style="background:#fff;border:2px solid #ffd34d;color:#b8860b;border-radius:14px;padding:10px 18px;font-size:15px;font-weight:bold;cursor:pointer;font-family:inherit;"></button>';
      area.parentNode.insertBefore(box, area.nextSibling);
      document.getElementById("hintBtn").onclick=moreHelp;
    }
    return box;
  }
  function showHintText(html){ const t=document.getElementById("hintText"); if(t){ t.innerHTML=html; t.style.display="block"; } }
  function resetHint(){
    if(!hintUI()) return;
    hintLevel=0;
    document.getElementById("hintText").style.display="none";
    const b=document.getElementById("hintBtn");
    b.style.display=""; b.textContent=HINT_LABELS[0]; b.style.boxShadow="";
    clearTimeout(stuckTimer);
    // 40 秒没动静 → 轻轻提醒她提示按钮在这，别一个人干瞪眼
    stuckTimer=setTimeout(function(){
      if(answered) return;
      const fb=document.getElementById("fb");
      if(fb && !fb.textContent){ fb.className="feedback"; fb.textContent="🤔 卡住了吗？点下面的黄色按钮看看思路，看提示不算错哦～"; }
      const btn=document.getElementById("hintBtn"); if(btn) btn.style.boxShadow="0 0 0 5px #ffd34d88";
    }, 40000);
  }
  function moreHelp(){
    if(answered) return;
    const item=qList[qi], b=document.getElementById("hintBtn");
    if(hintLevel===0){ hintLevel=1;
      showHintText("💡 <b>思路：</b>"+(item.hint||curMod.tip||"把题目再小声读一遍，圈出问的是什么～"));
      b.textContent=HINT_LABELS[1];
    } else if(hintLevel===1){ hintLevel=2;
      const teach=item.exp||curMod.teach;
      showHintText(teach ? "🧑‍🏫 <b>老师详细讲：</b><br>"+teach
                         : "💡 <b>思路：</b>"+(item.hint||"")+"<br>照着思路在纸上一步一步写出来试试～");
      b.textContent=HINT_LABELS[2];
    } else { hintLevel=3;
      if(!firstWrong){ firstWrong=true; STORE.mastery[qkey(item)]=0; recordMiss(item); saveStore(); }
      showHintText("🔍 答案是 <b style='font-size:1.25em;color:#e8590c;'>"+item.answer+"</b>。<br>对照上面的讲解想一想它是怎么来的，再把答案填进去/选出来。这题记到复习本里了，下次再考你，那时一次做对照样有星 ✊");
      b.style.display="none";
    }
  }

  function nextQ(){ qi++; tickTime();
    // 时间额度只卡"要不要开始下一关"，正在做的这一关(已固定题量)不会中途被打断
    if(qi>=qList.length) finish(); else showQ(); }
  function finish(){ document.getElementById("card").style.display="none";
    if(curKey){ STORE.done[curKey]=true;                  // 完成这一关 → 解锁下一关
      STORE.last[curKey]=dkey(new Date());                // 记录"最近一次玩"→ 复习轮换按它挑最久没玩的
      const r=todayRec(); if(!r.mods) r.mods={}; r.mods[curKey]=true;   // 今天玩过 → 复习关打勾
      saveStore(); }
    const d=document.getElementById("done"); d.style.display="block";
    const perfect=(roundStars===qList.length);
    document.getElementById("doneMsg").textContent = perfect ? "🏆 完美通关！全部一次答对！" : "「"+curMod.name+"」闯关完成！";
    document.getElementById("doneGot").innerHTML = "这一关：一次答对 <b>"+roundStars+"</b> 题（得 "+roundStars+" ⭐）"+
      (roundGuessed?("，试出来 "+roundGuessed+" 题（不加星）"):"")+(bestCombo>=3?("<br>最高连对 🔥"+bestCombo):"")+
      "<br>今天一共 ⭐ "+todayRec().stars+" 颗（每 5 颗 ⭐ 在学习台换 1 朵 🌸！）";
    sndFinish(); burst(perfect?["🏆","🎉","⭐","🌟","✨"]:null);
    // 在结算页加一个"选别的关卡"按钮（回到刷新后的菜单，能看到刚解锁的下一关）
    if(!document.getElementById("toMenuBtn")){ const bt=document.createElement("button");
      bt.id="toMenuBtn"; bt.className="ghost"; bt.textContent="📋 选别的关卡"; bt.onclick=backToMenu; d.appendChild(bt); }
  }
  function backToMenu(){ tickTime(); sessionStart=null;
    document.getElementById("done").style.display="none";
    document.getElementById("card").style.display="none";
    document.getElementById("menu").style.display=""; renderMenu(); }

  /* ---- 暴露给 HTML 内联按钮 ---- */
  window.nextQ=nextQ;
  window.restart=function(){ if(curKey) startMod(curKey); };
  window.backToMenu=backToMenu;
  window.goHome=function(){ tickTime(); location.href="../index.html"; };

  renderMenu();
})();
