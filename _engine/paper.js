/* 桃桃学习台 · 通用纸笔层
   Apple Pencil/鼠标书写；手指保持页面滚动。每道题自动保存自己的笔迹。 */
(function(){
  "use strict";
  let host=null, canvas=null, ctx=null, strokes=[], active=null, drawing=false, tool="pen", itemKey="";
  let pageLocked=false, lockY=0, oldBodyStyle=null;

  function addStyle(){
    if(document.getElementById("taoPaperStyle")) return;
    const s=document.createElement("style"); s.id="taoPaperStyle";
    s.textContent=`
      .tao-paper{margin:12px 0;border:2px solid #c9b8e8;border-radius:16px;background:#fff;overflow:hidden;text-align:left}
      .tao-paper-head{width:100%;border:0;background:#f4efff;color:#5d4784;padding:10px 12px;font:700 15px/1.3 inherit;text-align:left;cursor:pointer}
      .tao-paper-body{display:none;padding:9px;background:#fff}
      .tao-paper.open .tao-paper-body{display:block}.tao-paper.open .tao-paper-head{border-bottom:1px solid #ded4ee}
      .tao-paper-canvas-wrap{position:relative;height:230px;border:2px solid #ded8e8;border-radius:12px;overflow:hidden;
        background-color:#fff;background-image:linear-gradient(#dce8f5 1px,transparent 1px),linear-gradient(90deg,#dce8f5 1px,transparent 1px);
        background-size:24px 24px}
      .tao-paper canvas{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair}
      .tao-paper-tools{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:8px}
      .tao-paper-tool{border:2px solid #d9cdec;background:#fff;color:#5a4773;border-radius:10px;padding:7px 10px;font:700 13px/1 inherit;cursor:pointer}
      .tao-paper-tool.active{background:#e9ddff;border-color:#8c67d8}
      .tao-paper-tool.locked{background:#5f45a2;border-color:#5f45a2;color:#fff}
      .tao-paper-note{flex:1 1 190px;color:#82778e;font-size:12px;line-height:1.45}
      @media(max-width:900px){.tao-paper-canvas-wrap{height:210px}.tao-paper-head{font-size:14px}}
    `;
    document.head.appendChild(s);
  }
  function safeKey(v){ let h=2166136261; const s=String(v||"");
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0).toString(36); }
  function storageKey(){ return "tao_paper_"+safeKey(location.pathname+"|"+itemKey); }
  function load(){ strokes=[]; try{ const v=JSON.parse(localStorage.getItem(storageKey())); if(Array.isArray(v))strokes=v; }catch(e){} }
  function save(){ try{ localStorage.setItem(storageKey(),JSON.stringify(strokes.slice(-100))); }catch(e){} }
  function redraw(){
    if(!ctx||!canvas)return; const w=canvas.clientWidth,h=canvas.clientHeight; ctx.clearRect(0,0,w,h);
    strokes.forEach(s=>{ if(!s.points||s.points.length<2)return; ctx.save(); ctx.lineCap="round";ctx.lineJoin="round";
      ctx.globalCompositeOperation=s.tool==="eraser"?"destination-out":"source-over";ctx.strokeStyle=s.color||"#d72f64";ctx.lineWidth=s.tool==="eraser"?24:4.5;
      ctx.beginPath();s.points.forEach((p,i)=>{const x=p.x*w,y=p.y*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.restore(); });
  }
  function resize(){ if(!canvas)return; const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);redraw(); }
  function pt(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
  function drawable(e){return e.pointerType==="pen"||e.pointerType==="mouse";}
  function setPageLock(on){
    if(on===pageLocked)return; pageLocked=on;
    if(on){
      lockY=window.scrollY||document.documentElement.scrollTop||0;
      oldBodyStyle={position:document.body.style.position,top:document.body.style.top,left:document.body.style.left,
        right:document.body.style.right,width:document.body.style.width,overflow:document.body.style.overflow};
      document.body.style.position="fixed";document.body.style.top=(-lockY)+"px";document.body.style.left="0";
      document.body.style.right="0";document.body.style.width="100%";document.body.style.overflow="hidden";
    }else{
      const s=oldBodyStyle||{};document.body.style.position=s.position||"";document.body.style.top=s.top||"";
      document.body.style.left=s.left||"";document.body.style.right=s.right||"";document.body.style.width=s.width||"";
      document.body.style.overflow=s.overflow||"";window.scrollTo(0,lockY);oldBodyStyle=null;
    }
    if(host){const b=host.querySelector("[data-paper-action=lock]");if(b){b.classList.toggle("locked",on);b.textContent=on?"🔒 页面已定住":"🔓 定住页面";}}
  }
  function bindCanvas(){
    canvas.addEventListener("pointerdown",e=>{if(!drawable(e))return;e.preventDefault();canvas.setPointerCapture(e.pointerId);
      drawing=true;active={tool,color:"#d72f64",points:[pt(e)]};strokes.push(active);});
    canvas.addEventListener("pointermove",e=>{if(!drawing||!active||!drawable(e))return;e.preventDefault();
      const es=e.getCoalescedEvents?e.getCoalescedEvents():[e];es.forEach(x=>active.points.push(pt(x)));redraw();});
    const end=e=>{if(!drawing)return;if(drawable(e))e.preventDefault();drawing=false;active=null;save();};
    canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
  }
  function mount(item,options){
    addStyle(); if(pageLocked)setPageLock(false); const old=document.getElementById("taoThinkingPaper"); if(old)old.remove();
    const answer=document.getElementById("answerArea"); if(!answer)return;
    itemKey=(item&&((item.id||item.q||item.question)))||Date.now(); load();
    host=document.createElement("section");host.id="taoThinkingPaper";host.className="tao-paper"+((options&&options.open)||(item&&item.paperOpen)?" open":"");
    host.innerHTML=`<button type="button" class="tao-paper-head">✏️ 我的思考纸 <span style="font-weight:400">— 圈线索、画关系、写算式（不要求漂亮）</span></button>
      <div class="tao-paper-body"><div class="tao-paper-canvas-wrap"><canvas></canvas></div>
      <div class="tao-paper-tools"><button type="button" class="tao-paper-tool active" data-paper-tool="pen">圈画笔</button>
      <button type="button" class="tao-paper-tool" data-paper-tool="eraser">橡皮</button>
      <button type="button" class="tao-paper-tool" data-paper-action="lock">🔓 定住页面</button>
      <button type="button" class="tao-paper-tool" data-paper-action="undo">↶ 撤销</button>
      <button type="button" class="tao-paper-tool" data-paper-action="clear">清空</button>
      <span class="tao-paper-note">Apple Pencil 直接写；手指仍然滚动页面。不会做时先随便画一笔，也算开始。</span></div></div>`;
    answer.parentNode.insertBefore(host,answer);canvas=host.querySelector("canvas");ctx=canvas.getContext("2d");bindCanvas();
    host.querySelector(".tao-paper-head").onclick=()=>{host.classList.toggle("open");
      if(host.classList.contains("open"))requestAnimationFrame(resize);else if(pageLocked)setPageLock(false);};
    host.querySelectorAll("[data-paper-tool]").forEach(b=>b.onclick=()=>{tool=b.dataset.paperTool;host.querySelectorAll("[data-paper-tool]").forEach(x=>x.classList.toggle("active",x===b));});
    host.querySelector("[data-paper-action=undo]").onclick=()=>{strokes.pop();save();redraw();};
    host.querySelector("[data-paper-action=clear]").onclick=()=>{strokes=[];save();redraw();};
    host.querySelector("[data-paper-action=lock]").onclick=()=>setPageLock(!pageLocked);
    requestAnimationFrame(resize);
  }
  function hasInk(){return strokes.some(s=>s.points&&s.points.length>3&&s.tool!=="eraser");}
  window.addEventListener("resize",()=>{if(host&&host.classList.contains("open"))resize();});
  window.TaoPaper={mount,hasInk,unlock:()=>setPageLock(false)};
})();
