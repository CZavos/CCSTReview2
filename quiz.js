const $=s=>document.querySelector(s),main=$('#main');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let order=[],n=0,score=0,res={},st,done;
const Q=()=>QUESTIONS[order[n]];

function intro(){
  main.innerHTML=`<section class="card"><h2>Ready to practice?</h2><p>${QUESTIONS.length} questions on Cisco CCST Networking. After you check each answer, you'll see which choices were right or wrong and why, so you can take notes as you go.</p><div class="act"><button id="go">Start quiz</button></div></section>`;
  $('#go').onclick=()=>begin(QUESTIONS.map((_,k)=>k));
}
function begin(list){order=list;n=0;score=0;res={};render();}

function render(){
  const q=Q();done=false;st={sel:[],pl:{},yn:{},dd:{},pick:null};
  let h=`<section class="card"><div class="meta"><span>Question ${n+1} of ${order.length}</span><span id="sc">Score: ${score}</span></div><div class="bar"><i style="width:${n/order.length*100}%"></i></div><h2>${esc(q.q)}</h2>`;
  if(q.code)h+=`<pre>${esc(q.code)}</pre>`;
  if(q.t=='single'||q.t=='multi')h+=`<div class="opts">${q.o.map((o,k)=>`<button class="opt" data-k="${k}"><span>${esc(o)}</span><b class="tag"></b></button>`).join('')}</div>`;
  if(q.t=='match')h+=`<p class="hint">Drag each term onto its description, or tap a term and then tap a box.</p><div id="mz"></div>`;
  if(q.t=='yesno')h+=`<div class="rows">${q.rows.map((r,k)=>`<div class="row"><p>${esc(r[0])}</p><div class="yn"><label><input type="radio" name="r${k}" data-r="${k}" value="1">Yes</label><label><input type="radio" name="r${k}" data-r="${k}" value="0">No</label></div><div class="rf" id="rf${k}"></div></div>`).join('')}</div>`;
  if(q.t=='drop')h+=`<div class="rows">${q.rows.map((r,k)=>`<div class="row"><p>${esc(r[0])}</p><select data-r="${k}" aria-label="${esc(r[0])}"><option value="">Choose one...</option>${r[1].map((o,j)=>`<option value="${j}">${esc(o)}</option>`).join('')}</select><div class="rf" id="rf${k}"></div></div>`).join('')}</div>`;
  h+=`<div id="fb" aria-live="polite"></div><div class="act"><button id="go" disabled>Check answer</button></div></section>`;
  main.innerHTML=h;
  $('#go').onclick=check;
  const opts=main.querySelectorAll('.opt');
  opts.forEach(b=>b.onclick=()=>{
    if(done)return;const k=+b.dataset.k;
    st.sel=q.t=='single'?[k]:st.sel.includes(k)?st.sel.filter(x=>x!=k):[...st.sel,k];
    opts.forEach((x,i)=>x.classList.toggle('on',st.sel.includes(i)));ready();
  });
  main.querySelectorAll('input[type=radio]').forEach(r=>r.onchange=()=>{st.yn[r.dataset.r]=r.value=='1';ready();});
  main.querySelectorAll('select').forEach(s=>s.onchange=()=>{s.value===''?delete st.dd[s.dataset.r]:st.dd[s.dataset.r]=+s.value;ready();});
  if(q.t=='match')drawMatch();
  window.scrollTo(0,0);
}

function ready(){
  const q=Q(),L=q.rows?q.rows.length:0;
  $('#go').disabled=!{single:st.sel.length==1,multi:st.sel.length==(q.a||[]).length,match:Object.keys(st.pl).length==L,yesno:Object.keys(st.yn).length==L,drop:Object.keys(st.dd).length==L}[q.t];
}

function drawMatch(){
  const q=Q(),used=Object.values(st.pl);
  const chip=t=>`<span class="chip${st.pick==t?' sel':''}" ${done?'':'draggable="true" tabindex="0"'} data-t="${esc(t)}">${esc(t)}</span>`;
  $('#mz').innerHTML=(done?'':`<div class="bank">${q.terms.filter(t=>!used.includes(t)).map(t=>chip(t)).join('')||'<em>All terms placed</em>'}</div>`)+
    q.rows.map((r,k)=>{const p=st.pl[k],ok=p==r[1];
      return `<div class="mrow"><div class="slot${done?(ok?' right':' wrong'):''}" data-r="${k}" ${done?'':'tabindex="0"'}>${p?chip(p):'Drop here'}</div><div class="desc">${esc(r[0])}${done?`<div class="rf">${ok?'✓ Correct':'✗ Incorrect. Correct answer: '+esc(r[1])}</div>`:''}</div></div>`;}).join('');
  if(done)return;
  const put=(k,t)=>{for(const j in st.pl)if(st.pl[j]==t)delete st.pl[j];st.pl[k]=t;st.pick=null;drawMatch();ready();};
  const mz=$('#mz');
  mz.querySelectorAll('.chip').forEach(c=>{
    c.ondragstart=e=>e.dataTransfer.setData('text/plain',c.dataset.t);
    c.onclick=e=>{e.stopPropagation();const t=c.dataset.t,s=c.closest('.slot');
      if(s){delete st.pl[s.dataset.r];st.pick=null;}else st.pick=st.pick==t?null:t;drawMatch();ready();};
    c.onkeydown=e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();c.click();}};
  });
  mz.querySelectorAll('.slot').forEach(s=>{
    s.ondragover=e=>e.preventDefault();
    s.ondrop=e=>{e.preventDefault();put(s.dataset.r,e.dataTransfer.getData('text/plain'));};
    s.onclick=()=>{if(st.pick)put(s.dataset.r,st.pick);};
    s.onkeydown=e=>{if((e.key=='Enter'||e.key==' ')&&st.pick){e.preventDefault();put(s.dataset.r,st.pick);}};
  });
}

function check(){
  const q=Q();let ok;done=true;
  if(q.t=='single'||q.t=='multi'){
    const A=[].concat(q.a);
    ok=st.sel.length==A.length&&A.every(k=>st.sel.includes(k));
    main.querySelectorAll('.opt').forEach((b,k)=>{
      const c=A.includes(k),p=st.sel.includes(k);
      b.disabled=true;b.classList.add(c?'right':p?'wrong':'plain');
      b.querySelector('.tag').textContent=c&&p?'✓ Correct':c?'Correct answer (you missed this)':p?'✗ Incorrect':'Not correct';
    });
  }else if(q.t=='match'){
    ok=q.rows.every((r,k)=>st.pl[k]==r[1]);drawMatch();
  }else{
    ok=true;
    q.rows.forEach((r,k)=>{
      const yn=q.t=='yesno',pick=yn?st.yn[k]:st.dd[k],good=yn?r[1]:r[2],lab=v=>yn?(v?'Yes':'No'):r[1][v],hit=pick===good;
      if(!hit)ok=false;
      const f=$('#rf'+k);f.className='rf '+(hit?'right':'wrong');
      f.textContent=hit?'✓ Correct: '+lab(good):`✗ You chose ${lab(pick)}. Correct answer: ${lab(good)}`;
    });
    main.querySelectorAll('input,select').forEach(e=>e.disabled=true);
  }
  if(ok)score++;res[order[n]]=ok;
  $('#sc').textContent='Score: '+score;
  $('#fb').innerHTML=`<div class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</div><div class="ex"><h3>Explanation</h3>${q.x.map(p=>`<p>${p}</p>`).join('')}</div>`;
  const g=$('#go');g.disabled=false;g.textContent=n+1<order.length?'Next question':'See results';
  g.onclick=()=>{n++;n<order.length?render():finish();};
  $('#fb').scrollIntoView({block:'nearest'});
}

function finish(){
  const miss=order.filter(k=>!res[k]);
  main.innerHTML=`<section class="card"><h2>You scored ${score} of ${order.length} (${Math.round(score/order.length*100)}%)</h2><ul class="rev">${order.map(k=>`<li class="${res[k]?'good':'bad'}"><b>${res[k]?'Correct':'Missed'}</b> ${esc(QUESTIONS[k].q)}</li>`).join('')}</ul><div class="act">${miss.length?'<button id="rm">Retry missed questions</button>':''}<button id="ra" class="alt">Start over</button></div></section>`;
  if(miss.length)$('#rm').onclick=()=>begin(miss);
  $('#ra').onclick=()=>begin(QUESTIONS.map((_,k)=>k));
  window.scrollTo(0,0);
}
intro();
