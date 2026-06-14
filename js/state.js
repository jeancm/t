'use strict';
//==================================================================== estado
const player={x:6,y:6,fx:6,fy:6,moveT:0,moveMs:280,dir:2,
  hp:150,maxhp:150,mp:50,maxmp:50,level:1,exp:0,lastAtk:0,
  points:0,bonusAtk:0,bonusDef:0};
const equip={head:null,body:null,legs:null,feet:null,weapon:null,shield:null};
const bag=new Array(40).fill(null);
equip.weapon={id:'sword',tier:1,count:1};
bag[0]={id:'hpot',count:2};

let target=null;

// mundos: cada um com mapa, monstros (com tier), itens no chão e NPCs próprios
const ROMAN=['','','II','III','IV','V'];
const mName=m=>m.def.name+(m.tier>1?' '+ROMAN[m.tier]:'');
const mkMonsters=mtier=>SPAWNS.map(([t,x,y])=>{
  const d=MTYPES[t],mul=tierMul(mtier);
  return {type:t,def:d,tier:mtier,x,y,fx:x,fy:y,sx:x,sy:y,
    moveT:0,moveMs:d.moveMs,nextThink:0,lastAtk:0,dead:false,respawnAt:0,
    hp:Math.round(d.hp*mul),maxhp:Math.round(d.hp*mul),
    atkV:Math.round(d.atk*mul),defV:Math.round(d.def*mul),expV:Math.round(d.exp*mul)};
});
const mkNpcs=()=>[
  {id:'smith',name:'Ferreiro Thorin',label:'Ferreiro',x:7,y:8,fx:7,fy:8,moveT:0,moveMs:1},
  {id:'oracle',name:'The Oracle',label:'Oracle',x:5,y:7,fx:5,fy:7,moveT:0,moveMs:1},
];
const WORLDS=[
  {name:'Ilha Inicial',seed:20260610,mtier:1},
  {name:'Terras Sombrias',seed:20260611,mtier:2},
].map(w=>({...w,map:genMap(w.seed),groundItems:new Map(),
           monsters:mkMonsters(w.mtier),npcs:mkNpcs()}));
let worldIdx=0;
let map=WORLDS[0].map,groundItems=WORLDS[0].groundItems,
    monsters=WORLDS[0].monsters,npcs=WORLDS[0].npcs;
function setWorld(i){
  worldIdx=i;const w=WORLDS[i];
  map=w.map;groundItems=w.groundItems;monsters=w.monsters;npcs=w.npcs;
  player.x=player.fx=6;player.y=player.fy=6;player.moveT=0;player.dir=2;
  target=null;pressed.length=0;fx.length=0;closeNpc();
  inPZ=isPZ(player.x,player.y);
  log(`Você chegou: ${w.name}.`,'#d8a4ff');
  if(w.mtier>1)log('Aqui os monstros são um tier acima — mais fortes, e o loot também sobe um tier!','#d8a4ff');
}
const gkey=(x,y)=>x+','+y;
function groundAt(x,y){return groundItems.get(gkey(x,y))||[];}
function topGround(x,y){const a=groundAt(x,y);return a.length?a[a.length-1]:null;}
function addToGround(x,y,item){
  const k=gkey(x,y);let a=groundItems.get(k);
  if(!a){a=[];groundItems.set(k,a);}
  const top=a[a.length-1];
  if(top&&top.id===item.id&&IDEFS[item.id].stack)top.count+=item.count;
  else a.push(item);
}
function takeTopGround(x,y){
  const k=gkey(x,y),a=groundItems.get(k);
  if(!a||!a.length)return null;
  const it=a.pop(); if(!a.length)groundItems.delete(k); return it;
}
addToGround(8,5,{id:'sword',tier:1,count:1});
addToGround(5,5,{id:'shield',tier:1,count:1});
addToGround(8,8,{id:'hpot',count:2});
addToGround(5,8,{id:'gold',count:15});
addToGround(12,6,{id:'meat',count:2});

const fx=[]; // efeitos flutuantes: {kind:'text'|'splat', wx, wy, txt, color, t0}
function floatText(wx,wy,txt,color){
  // empilha textos próximos para não se sobreporem (ex.: dano + xp na mesma morte)
  let n=0;
  for(const f of fx)if(f.kind==='text'&&Math.abs(f.wx-wx)<26&&NOW-f.t0<500)n++;
  fx.push({kind:'text',wx,wy:wy-n*12,txt,color,t0:NOW});
}
function splat(wx,wy){fx.push({kind:'splat',wx,wy,t0:NOW});}
