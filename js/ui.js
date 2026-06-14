'use strict';
//==================================================================== textos
const logEl=document.getElementById('log');
function log(msg,color){
  const d=document.createElement('div');
  d.textContent=msg; if(color)d.style.color=color;
  logEl.appendChild(d);
  while(logEl.children.length>80)logEl.removeChild(logEl.firstChild);
  logEl.scrollTop=logEl.scrollHeight;
}
const art=def=>def.g==='f'?'uma':'um';
function itemLabel(it){
  const d=IDEFS[it.id];
  if(d.tiered)return `${art(d)} ${d.name} tier ${it.tier||1}`;
  return it.count>1?`${it.count} ${d.plural||d.name+'s'}`:`${art(d)} ${d.name}`;
}
function itemTitle(it){
  const d=IDEFS[it.id];let s=d.name;
  if(d.tiered){
    s+=` tier ${it.tier||1}`;
    if(d.atk)s+=` (Atk +${itemAtk(it)})`;
    if(d.def)s+=` (Def +${itemDef(it)})`;
    return s;
  }
  if(d.use)s+=d.use==='hp'?` (cura ~${d.power})`:` (mana ~${d.power})`;
  if(it.count>1)s+=` x${it.count}`;
  return s;
}

//==================================================================== stats
const expNeed=l=>l*l*60;
const playerAtk=()=>4+player.level+player.bonusAtk+(equip.weapon?itemAtk(equip.weapon):1);
const playerDef=()=>{
  let d=1+Math.floor(player.level/3)+player.bonusDef;
  for(const s in equip)if(equip[s])d+=itemDef(equip[s]);
  return d;
};
function gainExp(n,wx,wy){
  player.exp+=n;
  floatText(wx,wy,'+'+n+' xp','#c8c8ff');
  let leveled=false;
  while(player.exp>=expNeed(player.level)){
    player.level++;player.points++;leveled=true;
    player.maxhp+=10;player.maxmp+=5;
    player.hp=player.maxhp;player.mp=player.maxmp;
    log(`Você avançou para o level ${player.level}! (+10 HP máx., +5 MP máx.)`,'#fff');
    floatText(player.x*TILE,player.y*TILE,'LEVEL UP!','#ffd24a');
  }
  updateUI();
  if(leveled)openLvlUp();
}
function rollDmg(atk,def){
  const a=atk*(0.4+Math.random()*0.6), d=def*Math.random()*0.8;
  return Math.max(0,Math.round(a-d));
}

//==================================================================== level up
let paused=false,pauseStart=0;
const lvlupEl=document.getElementById('lvlup');
function openLvlUp(){
  if(!paused){paused=true;pauseStart=performance.now();}
  document.getElementById('lvlupnum').textContent=player.level;
  document.getElementById('lvlpts').textContent=player.points>1?`Pontos disponíveis: ${player.points}`:'';
  lvlupEl.style.display='flex';
}
function resume(){
  // compensa o tempo pausado para não estourar cooldowns ao voltar
  const dt=performance.now()-pauseStart;
  player.moveT+=dt;player.lastAtk+=dt;lastRegen+=dt;
  for(const m of monsters){m.moveT+=dt;m.lastAtk+=dt;m.nextThink+=dt;m.respawnAt+=dt;}
  for(const f of fx)f.t0+=dt;
  paused=false;
}
const ATTRS={
  hp:{label:'Vida',msg:'+25 de HP máximo',apply(){player.maxhp+=25;player.hp=player.maxhp;}},
  mp:{label:'Mana',msg:'+15 de MP máximo',apply(){player.maxmp+=15;player.mp=player.maxmp;}},
  atk:{label:'Ataque',msg:'+2 de ataque',apply(){player.bonusAtk+=2;}},
  def:{label:'Defesa',msg:'+2 de defesa',apply(){player.bonusDef+=2;}},
};
for(const b of document.querySelectorAll('#lvlup button')){
  b.addEventListener('click',()=>{
    if(player.points<=0)return;
    const a=ATTRS[b.dataset.attr];
    a.apply();player.points--;
    log(`Atributo aumentado: ${a.label} (${a.msg}).`,'#ffd24a');
    updateUI();
    if(player.points>0)openLvlUp();
    else{lvlupEl.style.display='none';resume();}
  });
}

//==================================================================== UI lateral
const eqgrid=document.getElementById('eqgrid'), bagEl=document.getElementById('bag');
const EQLAYOUT=[[null,'head',null],['weapon','body','shield'],[null,'legs',null],[null,'feet',null]];
const EQLABEL={head:'Elmo',body:'Peito',legs:'Pernas',feet:'Botas',weapon:'Arma',shield:'Escudo'};
for(const row of EQLAYOUT)for(const cell of row){
  if(!cell){const d=document.createElement('div');d.className='cell-empty';eqgrid.appendChild(d);continue;}
  const d=document.createElement('div');d.className='slot';
  d.dataset.t='eq';d.dataset.slot=cell;
  d.innerHTML=`<span class="lab">${EQLABEL[cell]}</span><span class="cnt"></span>`;
  eqgrid.appendChild(d);
}
for(let i=0;i<bag.length;i++){
  const d=document.createElement('div');d.className='slot';
  d.dataset.t='bag';d.dataset.i=i;
  d.innerHTML='<span class="cnt"></span>';
  bagEl.appendChild(d);
}
const slotEls=[...document.querySelectorAll('.slot')];
function slotDesc(el){
  return el.dataset.t==='bag'?{t:'bag',i:+el.dataset.i}:{t:'eq',slot:el.dataset.slot};
}
function renderSlots(){
  for(const el of slotEls){
    const s=slotDesc(el);
    const it=s.t==='bag'?bag[s.i]:equip[s.slot];
    el.style.backgroundImage=it?`url(${IURL[sprKey(it)]})`:'none';
    el.querySelector('.cnt').textContent=it&&it.count>1?it.count:'';
    const lab=el.querySelector('.lab');
    if(lab)lab.style.display=it?'none':'';
    el.title=it?itemTitle(it):(lab?EQLABEL[s.slot]:'');
  }
}
const $=id=>document.getElementById(id);
function updateUI(){
  $('lvl').textContent=player.level;
  $('hpfill').style.width=(100*player.hp/player.maxhp)+'%';
  $('mpfill').style.width=(100*player.mp/player.maxmp)+'%';
  $('hptxt').textContent=`HP ${player.hp} / ${player.maxhp}`;
  $('mptxt').textContent=`MP ${player.mp} / ${player.maxmp}`;
  $('exptxt').textContent=`Exp: ${player.exp}  (próx. level: ${expNeed(player.level)})`;
  $('atktxt').textContent=`Ataque: ${playerAtk()}   Defesa: ${playerDef()}`;
}

//==================================================================== inventário / itens
function addToBag(item){
  const d=IDEFS[item.id];
  if(d.stack)for(const it of bag)if(it&&it.id===item.id){it.count+=item.count;return true;}
  const i=bag.indexOf(null);
  if(i<0)return false;
  bag[i]=item;return true;
}
function consumeOne(s){ // remove 1 unidade do slot da mochila
  const it=bag[s.i];
  if(it.count>1)it.count--;else bag[s.i]=null;
}
function useItem(s){
  const it=bag[s.i];if(!it)return;
  const d=IDEFS[it.id];
  if(d.use==='hp'){
    const v=Math.round(d.power*0.7+Math.random()*d.power*0.5);
    player.hp=Math.min(player.maxhp,player.hp+v);
    consumeOne(s);log(it.id==='meat'?'Munch.':'Aaaah...','#7ad87a');
    floatText(player.x*TILE,player.y*TILE,'+'+v,'#4ad14a');
  }else if(d.use==='mp'){
    const v=Math.round(d.power*0.7+Math.random()*d.power*0.5);
    player.mp=Math.min(player.maxmp,player.mp+v);
    consumeOne(s);log('Mmmh...','#7a9ad8');
    floatText(player.x*TILE,player.y*TILE,'+'+v,'#5a7ae8');
  }else if(d.slot){ // clique direito em equipamento = equipar
    const cur=equip[d.slot];
    equip[d.slot]=it;bag[s.i]=cur||null;
    log(`Você equipou ${art(IDEFS[it.id])} ${IDEFS[it.id].name}.`);
  }else{log('Você não pode usar este item.');return;}
  autoFuse();
}
function unequip(slot){
  const it=equip[slot];if(!it)return;
  if(!addToBag(it)){log('Sua mochila está cheia.');return;}
  equip[slot]=null;autoFuse();
}
function tryPickup(x,y){
  if(cheb(player,{x,y})>1){log('Muito longe.');return;}
  const it=topGround(x,y);if(!it)return;
  if(!addToBag(it)){log('Sua mochila está cheia.');return;}
  takeTopGround(x,y);
  log(`Você pegou ${itemLabel(it)}.`);
  autoFuse();
}

//==================================================================== NPCs: loja e Oracle
function npcAt(x,y){for(const n of npcs)if(n.x===x&&n.y===y)return n;return null;}
const npcdlg=document.getElementById('npcdlg');
let npcOpen=null; // npc com o diálogo aberto (ou null)
function countInBag(id,tier){
  let n=0;
  for(const it of bag)
    if(it&&it.id===id&&(tier===undefined||(it.tier||1)===tier))n+=it.count;
  return n;
}
function removeFromBag(id,n,tier){
  for(let i=0;i<bag.length&&n>0;i++){
    const it=bag[i];
    if(!it||it.id!==id||(tier!==undefined&&(it.tier||1)!==tier))continue;
    const take=Math.min(n,it.count);
    it.count-=take;n-=take;
    if(it.count<=0)bag[i]=null;
  }
}
function statText(it){
  const d=IDEFS[it.id];
  if(d.tiered)return d.atk?`Atk +${itemAtk(it)}`:`Def +${itemDef(it)}`;
  if(d.use)return (d.use==='hp'?'cura':'mana')+` ~${d.power}`;
  return '';
}
const noArt=s=>s.replace(/^uma? /,'');
// fusão automática: 3 itens iguais do mesmo tier na mochila viram 1 do tier seguinte (cascata)
function autoFuse(){
  let fused=true;
  while(fused){
    fused=false;
    const groups=new Map();
    for(const it of bag){
      if(!it||!IDEFS[it.id].tiered)continue;
      const k=it.id+'@'+(it.tier||1);
      groups.set(k,(groups.get(k)||0)+1);
    }
    for(const [k,n] of groups){
      const [id,ts]=k.split('@'),t=+ts;
      if(n<3||t>=MAXTIER)continue;
      removeFromBag(id,3,t);
      const res={id,tier:t+1,count:1};
      if(!addToBag(res))addToGround(player.x,player.y,res);
      log(`Fusão automática: 3x ${IDEFS[id].name} tier ${t} → ${noArt(itemLabel(res))}!`,'#ffd24a');
      floatText(player.x*TILE,player.y*TILE,'★ fusão','#ffd24a');
      fused=true;
    }
    for(const id in FUSE)while(countInBag(id)>=3){
      removeFromBag(id,3);
      const res={id:FUSE[id],count:1};
      if(!addToBag(res))addToGround(player.x,player.y,res);
      log(`Fusão automática: 3x ${IDEFS[id].name} → ${noArt(itemLabel(res))}!`,'#ffd24a');
      floatText(player.x*TILE,player.y*TILE,'★ fusão','#ffd24a');
      fused=true;
    }
  }
  renderSlots();updateUI();
  if(npcOpen&&npcOpen.id==='smith')buildShopList();
}
// loja do ferreiro
const SHOP=[
  {id:'hpot',price:40},{id:'mpot',price:35},{id:'meat',price:8},
  {id:'sword',tier:1,price:60},{id:'shield',tier:1,price:50},{id:'helmet',tier:1,price:45},
  {id:'armor',tier:1,price:70},{id:'legs',tier:1,price:45},{id:'boots',tier:1,price:35},
];
const shopItem=o=>o.tier?{id:o.id,tier:o.tier,count:1}:{id:o.id,count:1};
function buildShopList(){
  const gold=countInBag('gold');
  $('npcsub').innerHTML='"Bem-vindo à minha loja! O que deseja comprar?"<br>'+
    `<small>Seu ouro: <b style="color:#ffd24a">${gold}</b></small>`;
  const list=$('npclist');list.innerHTML='';
  for(const o of SHOP){
    const it=shopItem(o);
    const row=document.createElement('div');row.className='shoprow';
    row.innerHTML=
      `<img src="${IURL[sprKey(it)]}" alt=""><div class="fname">${noArt(itemLabel(it))}`+
      `<small>${statText(it)}</small></div>`+
      `<img src="${IURL.gold}" alt=""><div class="fname">${o.price} de ouro</div>`;
    const b=document.createElement('button');
    b.textContent='Comprar';b.disabled=gold<o.price;
    b.addEventListener('click',()=>buy(o));
    row.appendChild(b);list.appendChild(row);
  }
}
function buy(o){
  if(countInBag('gold')<o.price)return;
  removeFromBag('gold',o.price);
  const it=shopItem(o);
  if(!addToBag(it)){addToGround(player.x,player.y,it);log('Sua mochila está cheia — a compra ficou no chão.','#e88');}
  log(`Você comprou ${itemLabel(it)} por ${o.price} de ouro.`,'#ffd24a');
  autoFuse(); // também re-renderiza a loja e a mochila
}
function openSmith(n){
  npcOpen=n;
  $('npctitle').textContent=n.name.toUpperCase();
  buildShopList();
  npcdlg.style.display='flex';
  log(`${n.name}: "Bem-vindo! Dê uma olhada nas minhas mercadorias."`,'#7ad8d8');
}
// Oracle: viagem entre os mundos (level 8+)
function openOracle(n){
  if(worldIdx===0&&player.level<8){
    log(`${n.name}: "Volte quando alcançar o level 8, jovem aventureiro."`,'#d8a4ff');
    return;
  }
  npcOpen=n;
  $('npctitle').textContent=n.name.toUpperCase();
  const dest=worldIdx===0?1:0;
  $('npcsub').innerHTML=worldIdx===0
    ?'"Você provou o seu valor. Posso levá-lo às <b>Terras Sombrias</b>, onde os monstros são um tier acima — assim como o loot."'
    :'"Deseja voltar à Ilha Inicial?"';
  const list=$('npclist');list.innerHTML='';
  const b=document.createElement('button');b.className='travelbtn';
  b.textContent=dest===1?'Viajar para as Terras Sombrias':'Voltar para a Ilha Inicial';
  b.addEventListener('click',()=>setWorld(dest));
  list.appendChild(b);
  npcdlg.style.display='flex';
}
function closeNpc(){npcOpen=null;npcdlg.style.display='none';}
document.getElementById('npcclose').addEventListener('click',closeNpc);
