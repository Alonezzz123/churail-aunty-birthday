const scenes=[...document.querySelectorAll('.scene')];let current=0,locked=false,touchY=0;const progress=document.querySelector('.progress span');

// v2.17 — fail-safe cinematic boot. JS drives the progress, while CSS provides
// a second escape path so a desktop browser can never leave the project black forever.
(function bootSequence(){
  const splash=document.getElementById('bootSplash');
  const percent=document.getElementById('bootPercent');
  const ready=document.getElementById('bootReady');
  const frame=document.querySelector('.hero-frame');
  if(!splash||!percent||!ready||!frame)return;

  document.body.classList.add('booting');
  frame.classList.add('booting');
  let finished=false;
  let timer=null;

  const cleanup=()=>{
    splash.classList.add('done');
    frame.classList.remove('booting');
    document.body.classList.remove('booting');
    document.body.classList.add('boot-complete');
    document.querySelector('.hero-frame .typing')?.classList.add('boot-finished');
    if(navigator.vibrate) navigator.vibrate([12,8,22]);
    window.setTimeout(()=>splash.remove(),900);
  };

  const finish=()=>{
    if(finished)return;
    finished=true;
    if(timer)window.clearInterval(timer);
    percent.textContent='100%';
    ready.classList.add('show');
    window.setTimeout(cleanup,360);
  };

  const started=Date.now(), duration=5600;
  timer=window.setInterval(()=>{
    const t=Math.min(1,(Date.now()-started)/duration);
    const eased=1-Math.pow(1-t,3);
    percent.textContent=Math.round(eased*100)+'%';
    if(t>=1)finish();
  },50);

  // JS failsafe. CSS has its own independent escape path as well.
  window.setTimeout(finish,7200);
})();
function showScene(n){
  n=Math.max(0,Math.min(scenes.length-1,n));
  if(n===current)return;

  const oldScene=scenes[current];
  const nextScene=scenes[n];
  const forward=n>current;

  // Keep only one scene visible. This is the key desktop fix: no translated
  // old scene remains underneath the new one.
  oldScene.classList.remove('active','enter-right','enter-left','page-enter');
  oldScene.classList.add('scene-hidden');

  nextScene.classList.remove('scene-hidden','leaving','leave-left','leave-right','page-enter');
  nextScene.classList.add('active');
  current=n;

  const nextFrame=nextScene.querySelector('.frame');
  if(nextFrame){
    nextFrame.classList.remove('page-enter-forward','page-enter-back');
    void nextFrame.offsetWidth;
    nextFrame.classList.add(forward?'page-enter-forward':'page-enter-back');
    window.setTimeout(()=>nextFrame.classList.remove('page-enter-forward','page-enter-back'),760);
  }

  progress.style.width=((current+1)/scenes.length*100)+'%';
  if(current===scenes.length-1)document.querySelector('.final').scrollTop=0;
}



// v2.25 — desktop depth: the card follows the cursor by only a few pixels.
// Uses CSS individual translate so it never fights the page-enter transform.
(function desktopDepth(){
  if(!window.matchMedia('(min-width:800px) and (pointer:fine)').matches) return;
  let raf=0, px=0, py=0;
  document.addEventListener('pointermove',e=>{
    if(e.pointerType && e.pointerType!=='mouse') return;
    if(document.body.classList.contains('booting')) return;
    px=((e.clientX/window.innerWidth)-.5)*4;
    py=((e.clientY/window.innerHeight)-.5)*3;
    if(raf)return;
    raf=requestAnimationFrame(()=>{
      const frame=document.querySelector('.scene.active .frame');
      if(frame){frame.style.setProperty('--mx',px.toFixed(2)+'px');frame.style.setProperty('--my',py.toFixed(2)+'px');}
      raf=0;
    });
  },{passive:true});
  document.addEventListener('pointerleave',()=>{
    const frame=document.querySelector('.scene.active .frame');
    if(frame){frame.style.setProperty('--mx','0px');frame.style.setProperty('--my','0px');}
  },{passive:true});
})();

// v2.12 — tiny cyber details, purely visual.
(function cyberFlavor(){
  const hero=document.querySelector('.hero-frame');
  if(!hero)return;
  setTimeout(()=>hero.classList.add('cyber-ready'),3300);
})();

document.getElementById('start').onclick=()=>showScene(1);document.querySelectorAll('.next').forEach(b=>b.onclick=()=>showScene(current+1));
document.addEventListener('touchstart',e=>touchY=e.changedTouches[0].clientY,{passive:true});
document.addEventListener('touchend',e=>{let dy=touchY-e.changedTouches[0].clientY;if(Math.abs(dy)>55&&!locked){locked=true;showScene(current+(dy>0?1:-1));setTimeout(()=>locked=false,650)}},{passive:true});
document.addEventListener('keydown',e=>{if(['ArrowDown','ArrowRight',' '].includes(e.key)){e.preventDefault();showScene(current+1)}if(['ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();showScene(current-1)}});



// v1.0 — touch interaction: every tap/drag leaves a tiny pastel burst.
const touchLayer=document.createElement('div');
touchLayer.className='touch-layer';
document.body.appendChild(touchLayer);
let lastTouchGlow=0;
function makeTouchEffect(x,y){
  const now=performance.now();
  if(now-lastTouchGlow<55)return;
  lastTouchGlow=now;
  const orb=document.createElement('span');
  orb.className='touch-orb';
  orb.style.left=x+'px'; orb.style.top=y+'px';
  touchLayer.appendChild(orb);
  const count=6;
  for(let i=0;i<count;i++){
    const s=document.createElement('span'); s.className='touch-spark';
    const a=(Math.PI*2*i/count)+(Math.random()*.35);
    const d=16+Math.random()*18;
    s.style.left=x+'px'; s.style.top=y+'px';
    s.style.setProperty('--sx',Math.cos(a)*d+'px');
    s.style.setProperty('--sy',Math.sin(a)*d+'px');
    s.style.animationDelay=(Math.random()*.05)+'s';
    touchLayer.appendChild(s);
    setTimeout(()=>s.remove(),700);
  }
  setTimeout(()=>orb.remove(),800);
}
document.addEventListener('pointerdown',e=>{
  if(document.body.classList.contains('booting')) return;
  makeTouchEffect(e.clientX,e.clientY);
  if(e.pointerType==='touch' && navigator.vibrate) navigator.vibrate(12);
},{passive:true});
document.addEventListener('pointermove',e=>{
  if(document.body.classList.contains('booting')) return;
  if(e.pointerType==='touch' || e.buttons) makeTouchEffect(e.clientX,e.clientY);
},{passive:true});


// v1.3 — light/dark theme toggle + phone haptic feedback when supported.
const themeToggle=document.getElementById('themeToggle');
const savedTheme=localStorage.getItem('churail-theme');
if(savedTheme!=='light') document.body.classList.add('dark-mode');
function updateThemeButton(){
  const dark=document.body.classList.contains('dark-mode');
  themeToggle.innerHTML=dark?'<span class="theme-icon moon-icon" aria-hidden="true"></span><span class="theme-label">LIGHT</span>':'<span class="theme-icon sun-icon" aria-hidden="true"></span><span class="theme-label">DARK</span>';
  themeToggle.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
}
updateThemeButton();
themeToggle.addEventListener('click',()=>{
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('churail-theme',document.body.classList.contains('dark-mode')?'dark':'light');
  updateThemeButton();
},{passive:true});


// v1.8 — interactive surprises: reliable taps + real fireworks.
const toast=document.createElement('div');
toast.className='secret-toast';
document.body.appendChild(toast);
let toastTimer;
function showToast(text){
  toast.textContent=text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'),1700);
}

function fireworkAt(x,y,kind='cake'){
  const layer=document.createElement('div');
  layer.className='firework-layer';
  layer.style.left=x+'px'; layer.style.top=y+'px';
  const boom=document.createElement('img');
  boom.className='firework-boom-png';
  boom.src='assets/firework_boom.png';
  boom.alt='';
  layer.appendChild(boom);
  document.body.appendChild(layer);
  setTimeout(()=>layer.remove(),900);
}


// v2.33 — cinematic launch fireworks: rocket rises from the bottom, then explodes at altitude.
function launchFireworkAt(x,y,kind='cake',delay=0){
  window.setTimeout(()=>{
    const rocket=document.createElement('div');
    rocket.className='firework-rocket';
    rocket.style.left=x+'px';
    rocket.style.setProperty('--rise',-(window.innerHeight-y-18)+'px');
    rocket.innerHTML='<img src="assets/firework_rocket.png" alt="">';
    document.body.appendChild(rocket);
    const boom=()=>{
      rocket.remove();
      fireworkAt(x,y,kind);
    };
    rocket.addEventListener('animationend',boom,{once:true});
    // Safety fallback in case an animation is interrupted.
    window.setTimeout(boom,1150);
  },delay);
}

function burstAt(el,kind='small'){
  const r=el.getBoundingClientRect();
  fireworkAt(r.left+r.width/2,r.top+r.height*.45,kind);
}

function catEffectAt(el,type){
  const r=el.getBoundingClientRect();
  const x=r.left+r.width/2, y=r.top+r.height/2;
  const layer=document.createElement('div');
  layer.className='cat-effect-layer';
  layer.style.left=x+'px'; layer.style.top=y+'px';
  if(type==='boop'){
    for(let i=0;i<7;i++){
      const paw=document.createElement('span'); paw.className='paw-pop';
      paw.textContent='•';
      const a=(Math.PI*2*i/7)-Math.PI/2, d=25+Math.random()*28;
      paw.style.setProperty('--px',Math.cos(a)*d+'px'); paw.style.setProperty('--py',Math.sin(a)*d+'px');
      paw.style.animationDelay=(i*.025)+'s'; layer.appendChild(paw);
    }
    const tag=document.createElement('span'); tag.className='meow-pop'; tag.textContent='boop!'; layer.appendChild(tag);
  }else{
    const tag=document.createElement('span'); tag.className='meow-pop hi'; tag.textContent='meow!'; layer.appendChild(tag);
    for(let i=0;i<5;i++){
      const s=document.createElement('span'); s.className='cat-star';
      const a=(Math.PI*2*i/5), d=34+Math.random()*20;
      s.style.setProperty('--px',Math.cos(a)*d+'px'); s.style.setProperty('--py',Math.sin(a)*d+'px');
      s.style.animationDelay=(i*.04)+'s'; layer.appendChild(s);
    }
  }
  document.body.appendChild(layer); setTimeout(()=>layer.remove(),1000);
}

function reactObject(el,text,kind='small'){
  const target=el.querySelector('img') || el;
  target.classList.remove('interactive-pop');
  void target.offsetWidth;
  target.classList.add('interactive-pop');
  if(kind==='cat-boop') catEffectAt(el,'boop');
  else if(kind==='cat-hi') catEffectAt(el,'hi');
  else burstAt(el,kind);
  showToast(text);
  if(navigator.vibrate) navigator.vibrate(kind==='cake'?[18,10,28]:[12,8,18]);
}

function bindInteractive(el,text,kind='small'){
  if(!el)return;
  const run=(e)=>{
    e.preventDefault();
    e.stopPropagation();
    reactObject(el,text,kind);
  };
  el.addEventListener('pointerdown',run,{passive:false});
  el.addEventListener('click',e=>e.stopPropagation(),{passive:true});
}

bindInteractive(document.getElementById('cakeObject'),'YOU FOUND THE BIRTHDAY FIREWORKS!', 'cake');
document.getElementById('cakeObject')?.addEventListener('pointerdown',()=>registerSecret('cake'),{passive:true});

document.querySelectorAll('.sticker-object').forEach(el=>{
  const type=el.dataset.reaction;
  const messages={bow:'the bow was suspicious for a reason',cat:'meow! CAT DETECTED. obviously. 🐱',flower:'you found a tiny secret'};
  bindInteractive(el,messages[type]||'secret found','small');
});

document.querySelectorAll('.cat-object').forEach(el=>bindInteractive(el,'BOOP! the cat noticed you','cat-boop'));
document.querySelectorAll('.cat-big-object').forEach(el=>bindInteractive(el,'the cat says hi back','cat-hi'));


// v2.1 — final birthday message reveal.
const revealBox=document.getElementById('finalReveal');
const revealButton=document.getElementById('revealMessage');
const cardMessage=document.getElementById('cardMessage');
if(revealBox && revealButton && cardMessage){
  const messageParts=[...cardMessage.querySelectorAll('p')];
  messageParts.forEach(p=>p.classList.add('message-hidden'));
  cardMessage.classList.add('message-locked');
  revealButton.addEventListener('click',e=>{
    e.preventDefault(); e.stopPropagation();
    revealBox.classList.add('opened');
    document.querySelector('.final-frame')?.classList.add('flowers-blooming');
    revealButton.disabled=true;
    revealButton.innerHTML='READ IT ↓';
    cardMessage.classList.remove('message-locked');
    const revealStep=220;
    messageParts.forEach((p,i)=>setTimeout(()=>p.classList.add('message-show'),220+i*revealStep));
    if(navigator.vibrate) navigator.vibrate([18,10,28]);
    setTimeout(()=>cardMessage.scrollIntoView({behavior:'smooth',block:'start'}),620);

    // v2.32 — final cinematic payoff. Let the message breathe, then celebrate.
    const finishDelay=280+messageParts.length*revealStep;
    setTimeout(()=>{
      const finalFrame=document.querySelector('.final-frame');
      finalFrame?.classList.add('final-finished');
      finalFrame?.classList.add('flowers-bloomed');
      const ps=cardMessage.querySelector('.ps');
      ps?.classList.add('ps-finale');
      if(finalFrame){
        const r=finalFrame.getBoundingClientRect();
        const y=Math.max(90,Math.min(window.innerHeight-130,r.top+r.height*.34));
        launchFireworkAt(window.innerWidth*.22,y,'small',0);
        launchFireworkAt(window.innerWidth*.78,Math.max(90,y*.92),'cake',420);
        launchFireworkAt(window.innerWidth*.5,Math.max(80,Math.min(window.innerHeight-120,r.top+r.height*.18)),'small',850);
      }
      if(navigator.vibrate) navigator.vibrate([14,8,24,8,34]);
      setTimeout(()=>{
        if(!document.querySelector('.final-complete-note')){
          const note=document.createElement('div');
          note.className='final-complete-note';
          note.textContent='BIRTHDAY PROTOCOL // COMPLETE';
          finalFrame?.appendChild(note);
        }
      },850);
    },finishDelay);
  },{passive:false});
}


// v2.2 — hidden discoveries. No labels; tiny visual reactions reward exploration.
const secretMessages={
  cloud:'meow',
  rainbow:'meow',
  rainbow2:'meow',
  catfinal:'meow',
  catfinal2:'meow',
  cake:'meow'
};
const secretUsed=new Set();
const SECRET_TOTAL=6;
const SECRET_UNLOCK_COUNT=5;
function registerSecret(type){
  if(secretUsed.has(type)) return;
  secretUsed.add(type);
  try{sessionStorage.setItem('noor-secret-'+type,'1')}catch(e){}
  if(secretUsed.size>=SECRET_UNLOCK_COUNT) unlockPrivateArchive();
}
function unlockPrivateArchive(){
  const btn=document.getElementById('archiveUnlock');
  if(!btn||btn.classList.contains('unlocked')) return;
  btn.classList.add('unlocked');
  btn.setAttribute('aria-hidden','false');
  showToast('PRIVATE ARCHIVE // ENTRY 01 UNLOCKED');
  if(navigator.vibrate) navigator.vibrate([18,10,28]);
}
try{
  ['cloud','rainbow','rainbow2','catfinal','catfinal2','cake'].forEach(k=>{if(sessionStorage.getItem('noor-secret-'+k))secretUsed.add(k)});
}catch(e){}
function secretEffect(el,type){
  const r=el.getBoundingClientRect();
  const x=r.left+r.width/2,y=r.top+r.height/2;
  const layer=document.createElement('div');
  layer.className='secret-burst'; layer.style.left=x+'px'; layer.style.top=y+'px';
  const count=type.startsWith('cat')?9:12;
  for(let i=0;i<count;i++){
    const s=document.createElement('span'); s.className='secret-bit';
    const a=Math.PI*2*i/count + Math.random()*.3;
    const d=18+Math.random()*38;
    s.style.setProperty('--sx',Math.cos(a)*d+'px');
    s.style.setProperty('--sy',Math.sin(a)*d+'px');
    s.style.setProperty('--delay',(Math.random()*.12)+'s');
    layer.appendChild(s);
  }
  const tag=document.createElement('span'); tag.className='secret-word';
  tag.textContent='meow'; layer.appendChild(tag);
  document.body.appendChild(layer);
  setTimeout(()=>layer.remove(),1050);
  el.classList.remove('secret-pulse'); void el.offsetWidth; el.classList.add('secret-pulse');
}
document.querySelectorAll('.secret-object').forEach(el=>{
  el.addEventListener('pointerdown',e=>{
    e.preventDefault(); e.stopPropagation();
    const type=el.dataset.secret;
    secretEffect(el,type);
    showToast(secretMessages[type]||'you found something hidden');
    if(navigator.vibrate) navigator.vibrate([10,8,18]);
    registerSecret(type);
  },{passive:false});
  el.addEventListener('click',e=>e.stopPropagation(),{passive:true});
});

(function privateArchive(){
  const btn=document.getElementById('archiveUnlock');
  const modal=document.getElementById('archiveModal');
  const close=document.getElementById('archiveClose');
  if(!btn||!modal||!close)return;
  if(secretUsed.size>=SECRET_UNLOCK_COUNT) unlockPrivateArchive();
  const open=()=>{
    if(!btn.classList.contains('unlocked'))return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    if(navigator.vibrate) navigator.vibrate(10);
  };
  const shut=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')};
  btn.addEventListener('click',open);
  close.addEventListener('click',shut);
  modal.addEventListener('click',e=>{if(e.target===modal)shut()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))shut()});
})();


// v2.9 — longer journey: quick choice, mobile mini-game, friendship stats.
const choiceButtons=[...document.querySelectorAll('.choice-card')];
const choiceResult=document.getElementById('choiceResult');
const choiceNext=document.getElementById('choiceNext');
const choiceReplies={
  chaos:'Churail Aunty on fire 💀',
  chill:'chilling as always.',
  cake:'Correct answer. 🎂',
  sleep:'You sleep all day lol thats the only thing you do you should get phd in it'
};
choiceButtons.forEach(btn=>btn.addEventListener('click',()=>{
  choiceButtons.forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  choiceResult.textContent=choiceReplies[btn.dataset.choice];
  choiceNext.disabled=false;
  if(navigator.vibrate) navigator.vibrate([12,8,18]);
}));

const gameArea=document.getElementById('gameArea');
const gameStart=document.getElementById('gameStart');
const gameScore=document.getElementById('gameScore');
const gameTimer=document.getElementById('gameTimer');
const gameMessage=document.getElementById('gameMessage');
const gameNext=document.getElementById('gameNext');
let gameRunning=false,score=0,timeLeft=15,gameClock=null,starClock=null;
function updateGame(){gameScore.textContent=score+' / 10';gameTimer.textContent=timeLeft+'s';}
function spawnStar(){
  if(!gameRunning)return;
  const star=document.createElement('button'); star.className='game-star'; star.type='button'; star.setAttribute('aria-label','Tap star');
  const starImg=document.createElement('img'); starImg.src='assets/'+(Math.random()<0.5?'star.png':'star2.png'); starImg.alt=''; star.appendChild(starImg);
  const maxX=Math.max(20,gameArea.clientWidth-48),maxY=Math.max(20,gameArea.clientHeight-48);
  star.style.left=(10+Math.random()*maxX)+'px'; star.style.top=(10+Math.random()*maxY)+'px';
  star.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(!gameRunning)return;score++;updateGame();star.remove();if(navigator.vibrate)navigator.vibrate(8);if(score>=10)finishGame(true);},{passive:false});
  gameArea.appendChild(star); setTimeout(()=>star.remove(),1300);
}
function finishGame(won){
  if(!gameRunning)return; gameRunning=false; clearInterval(gameClock); clearInterval(starClock); gameArea.querySelectorAll('.game-star').forEach(s=>s.remove());
  gameMessage.textContent=won?'10/10. Okay, you actually cooked. 🔥':'Time! Honestly, respectable effort. 😭';
  gameNext.disabled=false; gameStart.disabled=false; gameStart.textContent='PLAY AGAIN';
  const gameFrame=document.querySelector('.game-frame');
  gameFrame?.classList.toggle('game-complete',won);
  if(navigator.vibrate)navigator.vibrate(won?[18,10,28]:[12,8,18]);
}
function startGame(){
  clearInterval(gameClock);clearInterval(starClock);gameRunning=true;score=0;timeLeft=15;gameNext.disabled=true;gameStart.disabled=true;gameStart.textContent='PLAYING...';gameMessage.textContent='GET 10 STARS!';gameArea.querySelectorAll('.game-star').forEach(s=>s.remove());updateGame();
  spawnStar(); starClock=setInterval(spawnStar,700);
  gameClock=setInterval(()=>{timeLeft--;updateGame();if(timeLeft<=0)finishGame(score>=10);},1000);
}
if(gameStart)gameStart.addEventListener('click',startGame);

// v2.10 — brighter star-game feedback and motion.
const gameProgress=document.getElementById('gameProgress');
function popScore(){
  if(!gameScore)return;
  gameScore.classList.remove('score-pop'); void gameScore.offsetWidth; gameScore.classList.add('score-pop');
}
function starSparks(star){
  const r=star.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
  for(let i=0;i<8;i++){
    const s=document.createElement('span'); s.className='star-pop';
    s.style.left=x+'px'; s.style.top=y+'px';
    const a=Math.PI*2*i/8+Math.random()*.2, d=22+Math.random()*24;
    s.style.setProperty('--sx',Math.cos(a)*d+'px'); s.style.setProperty('--sy',Math.sin(a)*d+'px');
    document.body.appendChild(s); setTimeout(()=>s.remove(),520);
  }
}
function updateGame(){
  gameScore.textContent=score+' / 10'; gameTimer.textContent=timeLeft+'s';
  if(gameProgress)gameProgress.style.width=Math.min(100,score*10)+'%';
}
// Replace the previous spawnStar with a brighter PNG-driven interaction.
function spawnStar(){
  if(!gameRunning)return;
  const star=document.createElement('button'); star.className='game-star'; star.type='button'; star.setAttribute('aria-label','Tap star');
  const starImg=document.createElement('img'); starImg.src='assets/'+(Math.random()<0.5?'star.png':'star2.png'); starImg.alt=''; star.appendChild(starImg);
  const maxX=Math.max(12,gameArea.clientWidth-58), maxY=Math.max(12,gameArea.clientHeight-58);
  star.style.left=(8+Math.random()*maxX)+'px'; star.style.top=(8+Math.random()*maxY)+'px';
  star.addEventListener('pointerdown',e=>{
    e.preventDefault(); e.stopPropagation(); if(!gameRunning)return;
    starSparks(star); star.classList.add('hit'); score++; updateGame(); popScore();
    if(navigator.vibrate)navigator.vibrate(8);
    setTimeout(()=>star.remove(),180);
    if(score>=10)finishGame(true);
  },{passive:false});
  gameArea.appendChild(star); setTimeout(()=>star.remove(),1300);
}


// v2.13 — hidden terminal: simple commands, zero coding knowledge required.
(function hiddenTerminal(){
  const modal=document.getElementById('terminalModal'), trigger=document.getElementById('terminalTrigger'), close=document.getElementById('terminalClose');
  const form=document.getElementById('terminalForm'), input=document.getElementById('terminalInput'), screen=document.getElementById('terminalScreen');
  if(!modal||!trigger||!close||!form||!input||!screen)return;
  // v2.23 — rewritten terminal responses: cleaner, more cinematic, less childish.
  const replies={
    help:['AVAILABLE INTERFACES','> churail — open the private profile archive','> status — inspect node status','> birthday — access the birthday protocol'],
    churail:['PROFILE // CHURAIL AUNTY','ROLE: FUTURE DEVELOPER','ACCESS: PRIVATE BIRTHDAY NODE','NOTE: Potential detected. Progress: ongoing.'],
    status:['CHURAIL AUNTY.EXE // SYSTEM STATUS','NODE STATE: SLEEPING 💤','CURRENT ACTIVITY: NAPPING','REST LEVEL: 100%'],
    birthday:['BIRTHDAY PROTOCOL // ACTIVE','ACCESS GRANTED','HAPPY BIRTHDAY, CHURAIL AUNTY.','This node was built for one person.']
  };
  function open(){modal.classList.add('open');modal.setAttribute('aria-hidden','false');setTimeout(()=>input.focus(),180);}
  function closeIt(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}
  function line(text,cls=''){const d=document.createElement('div');d.className='term-line '+cls;d.textContent=text;screen.appendChild(d);screen.scrollTop=screen.scrollHeight;}
  function run(raw){const cmd=raw.trim().toLowerCase(); if(!cmd)return; line('> '+raw,'cmd'); if(cmd==='clear'){screen.innerHTML='';line('PRIVATE NODE // CLEARED','ok');return;} const aliasCmd=(cmd==='noor'||cmd==='churail aunty')?'churail':cmd; const arr=replies[aliasCmd]||['COMMAND NOT RECOGNIZED.',"Type 'help' to view available interfaces."]; arr.forEach((x,i)=>setTimeout(()=>line(x,i===0?'ok':''),i*90)); if(navigator.vibrate)navigator.vibrate([8,5,12]);}
  trigger.addEventListener('click',open); close.addEventListener('click',closeIt); modal.addEventListener('click',e=>{if(e.target===modal)closeIt();});
  form.addEventListener('submit',e=>{e.preventDefault();run(input.value);input.value='';});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeIt();});
})();

// v2.13 — subtle card tilt on pointer movement for desktop/tablet, disabled for touch.
(function cardTilt(){
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    const scene=document.querySelector('.scene.active'), frame=scene?.querySelector('.frame');
    if(!frame||frame.classList.contains('final-frame'))return;
    const r=frame.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
    if(x<-0.7||x>0.7||y<-0.7||y>0.7)return;
    frame.style.setProperty('--tilt-x',(-y*1.3)+'deg'); frame.style.setProperty('--tilt-y',(x*1.3)+'deg');
  },{passive:true});
  document.addEventListener('pointerleave',()=>document.querySelectorAll('.frame').forEach(f=>{f.style.removeProperty('--tilt-x');f.style.removeProperty('--tilt-y')}));
})();


// v2.35 — Web Audio API synthesized sound effects + Back button polish
(function audioAndPolish(){
  let audioCtx = null;
  let muted = localStorage.getItem('noor-muted') === '1';
  const soundBtn = document.getElementById('soundToggle');

  function updateSoundBtn(){
    if(!soundBtn) return;
    soundBtn.textContent = muted ? '🔇 MUTE' : '🔊 SFX';
    soundBtn.setAttribute('aria-label', muted ? 'Unmute sound effects' : 'Mute sound effects');
  }
  updateSoundBtn();

  if(soundBtn){
    soundBtn.addEventListener('click', e => {
      e.stopPropagation();
      muted = !muted;
      localStorage.setItem('noor-muted', muted ? '1' : '0');
      updateSoundBtn();
      if(!muted) playSfx('pop');
    });
  }

  function getCtx(){
    if(muted) return null;
    if(!audioCtx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(Ctx) audioCtx = new Ctx();
    }
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playSfx(type){
    const ctx = getCtx();
    if(!ctx) return;
    const now = ctx.currentTime;

    if(type === 'pop'){
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.09);
    }
    else if(type === 'page'){
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.14);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.15);
    }
    else if(type === 'meow'){
      // Layered formant-filtered cat meow ("m-e-o-w")
      const pitchShift = 0.94 + Math.random() * 0.14;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(420 * pitchShift, now);
      osc1.frequency.exponentialRampToValueAtTime(760 * pitchShift, now + 0.11);
      osc1.frequency.exponentialRampToValueAtTime(640 * pitchShift, now + 0.24);
      osc1.frequency.exponentialRampToValueAtTime(360 * pitchShift, now + 0.44);

      osc2.frequency.setValueAtTime(840 * pitchShift, now);
      osc2.frequency.exponentialRampToValueAtTime(1520 * pitchShift, now + 0.11);
      osc2.frequency.exponentialRampToValueAtTime(720 * pitchShift, now + 0.44);

      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3.2, now);
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(1650, now + 0.12);
      filter.frequency.exponentialRampToValueAtTime(820, now + 0.44);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.06);
      gain.gain.setValueAtTime(0.2, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.47);
      osc2.stop(now + 0.47);
    }
    else if(type === 'star'){
      [784, 1046.5, 1318.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.035);
        gain.gain.setValueAtTime(0.14, now + idx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.16);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + idx * 0.035); osc.stop(now + idx * 0.035 + 0.16);
      });
    }
    else if(type === 'chime'){
      [660, 880, 1180].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.1, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + idx * 0.06); osc.stop(now + idx * 0.06 + 0.28);
      });
    }
    else if(type === 'term'){
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(740, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.05);
    }
    else if(type === 'boom'){
      const bufferSize = ctx.sampleRate * 0.45;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.45);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      noise.start(now);
    }
  }

  document.querySelectorAll('.cta, .choice-card, .theme-toggle, .terminal-trigger, .archive-unlock').forEach(el => {
    el.addEventListener('pointerdown', () => playSfx('pop'), {passive:true});
  });
  document.querySelectorAll('.next, #start').forEach(el => {
    el.addEventListener('click', () => playSfx('page'), {passive:true});
  });
  document.querySelectorAll('.cat-object, .cat-big-object, .sticker-object[data-reaction="cat"], .secret-object[data-secret^="cat"]').forEach(el => {
    el.addEventListener('pointerdown', () => {
      playSfx('meow');
    }, {passive:true});
  });
  document.querySelectorAll('.secret-object:not([data-secret^="cat"]), .sticker-object:not([data-reaction="cat"])').forEach(el => {
    el.addEventListener('pointerdown', () => playSfx('chime'), {passive:true});
  });
  document.getElementById('cakeObject')?.addEventListener('pointerdown', () => playSfx('boom'), {passive:true});
  document.getElementById('terminalForm')?.addEventListener('submit', () => playSfx('term'), {passive:true});
  document.getElementById('gameArea')?.addEventListener('pointerdown', e => {
    if(e.target.closest('.game-star')) playSfx('star');
  }, {passive:true});
  document.getElementById('revealMessage')?.addEventListener('click', () => {
    playSfx('chime');
    const msgCount = document.querySelectorAll('#cardMessage p').length;
    const baseDelay = 280 + msgCount * 220;
    setTimeout(() => playSfx('boom'), baseDelay + 1250);
    setTimeout(() => playSfx('boom'), baseDelay + 1670);
    setTimeout(() => playSfx('boom'), baseDelay + 2100);
  }, {passive:true});

  // Add subtle Back buttons to pages 02 through 08
  scenes.forEach((sc, idx) => {
    if(idx === 0) return;
    const frame = sc.querySelector('.frame');
    if(!frame) return;
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'back-btn';
    back.setAttribute('aria-label', 'Previous page');
    back.textContent = '←';
    back.addEventListener('click', e => {
      e.stopPropagation();
      playSfx('page');
      showScene(idx - 1);
    });
    frame.appendChild(back);
  });
})();
