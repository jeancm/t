'use strict';
//==================================================================== dados
const IDEFS={
  gold:  {name:'moeda de ouro', plural:'moedas de ouro', g:'f', stack:true},
  hpot:  {name:'poção de vida', plural:'poções de vida', g:'f', stack:true, use:'hp', power:60},
  mpot:  {name:'poção de mana', plural:'poções de mana', g:'f', stack:true, use:'mp', power:60},
  meat:  {name:'carne', plural:'carnes', g:'f', stack:true, use:'hp', power:14},
  // equipamentos: uma peça por slot, com tiers 1-10 (stats escalam por tier)
  sword: {name:'espada', g:'f', slot:'weapon', atk:5, tiered:true},
  shield:{name:'escudo', g:'m', slot:'shield', def:3, tiered:true},
  helmet:{name:'elmo', g:'m', slot:'head', def:2, tiered:true},
  armor: {name:'armadura', g:'f', slot:'body', def:4, tiered:true},
  legs:  {name:'calças', plural:'calças', g:'f', slot:'legs', def:2, tiered:true},
  boots: {name:'botas', plural:'botas', g:'f', slot:'feet', def:1, tiered:true},
  hpot2:  {name:'poção de vida grande', plural:'poções de vida grandes', g:'f', stack:true, use:'hp', power:150},
  mpot2:  {name:'poção de mana grande', plural:'poções de mana grandes', g:'f', stack:true, use:'mp', power:150},
};
const MAXTIER=10;
const tierMul=t=>Math.pow(2,(t||1)-1); // cada tier dobra os atributos do anterior
const itemAtk=it=>Math.round(IDEFS[it.id].atk*tierMul(it.tier));
const itemDef=it=>Math.round((IDEFS[it.id].def||0)*tierMul(it.tier));
// fusões sem tier (poções): 3x item -> 1x versão maior
const FUSE={hpot:'hpot2',mpot:'mpot2'};
const MTYPES={
  rat:  {name:'Rato', g:'m', hp:25, atk:7, def:1, exp:12, moveMs:380, atkMs:1600, aggro:5,
         loot:[['gold',.7,1,4],['meat',.35],['hpot',.08]]},
  snake:{name:'Cobra', g:'f', hp:45, atk:11, def:2, exp:25, moveMs:430, atkMs:1700, aggro:4,
         loot:[['gold',.6,2,7],['mpot',.15]]},
  // como no Tibia, o orc é mais forte que o troll
  orc:  {name:'Orc', g:'m', hp:150, atk:23, def:7, exp:100, moveMs:460, atkMs:1800, aggro:6,
         loot:[['gold',.9,10,30],['hpot',.2],['armor',.12,1],['legs',.12,1],['boots',.14,1],
               ['shield',.08,1],['sword',.06,2],['helmet',.06,2]]},
  troll:{name:'Troll', g:'m', hp:90, atk:16, def:5, exp:55, moveMs:560, atkMs:2000, aggro:6,
         loot:[['gold',.8,5,18],['meat',.4],['hpot',.12],['sword',.12,1],['helmet',.1,1],['shield',.08,1]]},
};
const SPAWNS=[['rat',14,8],['rat',16,12],['rat',12,14],['rat',9,12],
  ['snake',23,16],['snake',27,15],['snake',24,25],
  ['orc',30,5],['orc',33,8],['orc',28,10],
  ['troll',7,24],['troll',12,25]];
const TERRAIN_NAME={'.':'grama',',':'terra','s':'piso de pedra','w':'uma parede','T':'uma árvore','R':'uma rocha','~':'água'};
