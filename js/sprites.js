'use strict';
//==================================================================== sprites
function spr(draw){
  const c=document.createElement('canvas');c.width=c.height=32;
  const ctx=c.getContext('2d');
  const P=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(x*2,y*2,w*2,h*2);};
  draw(P,ctx);return c;
}
function paintGrass(P,v){
  P(0,0,16,16,'#3e6b34');
  const dark=v?[[2,3],[9,1],[13,6],[5,9],[11,12],[1,13],[7,14]]:[[4,2],[12,4],[1,7],[8,8],[14,11],[3,12],[10,15]];
  const lite=v?[[6,1],[1,5],[10,7],[14,3],[4,13],[12,14]]:[[2,1],[8,4],[13,9],[5,6],[11,11],[0,10]];
  for(const[x,y]of dark)P(x,y,1,1,'#34592b');
  for(const[x,y]of lite)P(x,y,2,1,'#4b7c3f');
}
const S={};
S.grass1=spr(P=>paintGrass(P,0));
S.grass2=spr(P=>paintGrass(P,1));
S.dirt=spr(P=>{P(0,0,16,16,'#7a5a3c');
  for(const[x,y]of[[3,2],[10,4],[6,7],[13,9],[2,11],[9,13],[14,1],[1,6]])P(x,y,2,1,'#6a4a30');
  for(const[x,y]of[[7,3],[12,6],[4,9],[11,12],[1,14],[14,14]])P(x,y,1,1,'#8c6a48');});
S.stone=spr(P=>{P(0,0,16,16,'#8e8e96');
  P(0,7,16,1,'#76767e');P(7,0,1,7,'#76767e');P(3,8,1,8,'#76767e');P(11,8,1,8,'#76767e');
  for(const[x,y]of[[2,3],[12,4],[5,11],[14,12],[9,10]])P(x,y,1,1,'#9c9ca4');});
S.wall=spr(P=>{P(0,0,16,16,'#55555e');P(0,0,16,1,'#6c6c76');
  P(0,3,16,1,'#36363e');P(0,7,16,1,'#36363e');P(0,11,16,1,'#36363e');
  P(5,0,1,3,'#36363e');P(11,0,1,3,'#36363e');P(2,4,1,3,'#36363e');P(8,4,1,3,'#36363e');
  P(14,4,1,3,'#36363e');P(5,8,1,3,'#36363e');P(11,8,1,3,'#36363e');
  P(2,12,1,4,'#36363e');P(8,12,1,4,'#36363e');P(14,12,1,4,'#36363e');});
function paintWater(P,f){
  P(0,0,16,16,'#2a5a9a');
  const w=f?[[1,2,5],[9,4,5],[3,8,6],[10,11,4],[1,13,5]]:[[4,1,5],[11,3,4],[1,6,5],[8,9,6],[4,13,5]];
  for(const[x,y,len]of w){P(x,y,len,1,'#3f74b4');P(x+1,y+1,2,1,'#22497e');}
}
S.water1=spr(P=>paintWater(P,0));
S.water2=spr(P=>paintWater(P,1));
S.tree=spr(P=>{paintGrass(P,0);
  P(7,9,2,5,'#5a3a22');P(6,12,1,1,'#4a2e1a');
  P(5,0,6,2,'#2c5a26');P(3,2,10,4,'#2c5a26');P(2,4,12,4,'#2c5a26');P(4,8,8,2,'#2c5a26');
  P(4,2,3,2,'#3a7330');P(9,4,3,2,'#3a7330');P(5,7,2,1,'#3a7330');P(6,1,3,1,'#3a7330');
  P(3,5,1,2,'#224a1e');P(11,6,2,2,'#224a1e');P(7,3,2,1,'#224a1e');});
S.rock=spr(P=>{paintGrass(P,1);
  P(4,12,9,2,'#2e2e34');P(4,6,9,7,'#7d7d84');P(5,4,7,3,'#8d8d94');
  P(6,5,3,1,'#a2a2aa');P(10,8,2,2,'#6c6c72');P(5,9,2,1,'#6c6c72');});

function drawHuman(P,dir,o){
  o=o||{};
  const skin=o.skin||'#e0b48a',shirt=o.shirt||'#a32f2f',pants=o.pants||'#4a3320',hair=o.hair||'#5d3a1a';
  P(4,14,8,2,'rgba(0,0,0,0.25)');
  P(5,11,2,3,pants);P(9,11,2,3,pants);
  P(5,13,2,1,'#26201a');P(9,13,2,1,'#26201a');
  P(4,6,8,5,shirt);P(3,6,1,4,shirt);P(12,6,1,4,shirt);
  P(3,10,1,1,skin);P(12,10,1,1,skin);
  P(5,1,6,5,skin);
  P(5,0,6,2,hair);P(4,1,1,2,hair);P(11,1,1,2,hair);
  const eye=o.eye||'#1a1a2a';
  if(dir===0){P(5,1,6,4,hair);}
  else if(dir===1){P(7,3,1,1,eye);P(10,3,1,1,eye);}
  else if(dir===3){P(5,3,1,1,eye);P(8,3,1,1,eye);}
  else {P(6,3,1,1,eye);P(9,3,1,1,eye);}
}
S.player=[0,1,2,3].map(d=>spr(P=>drawHuman(P,d)));
S.rat=spr(P=>{P(2,12,12,2,'rgba(0,0,0,0.25)');
  P(0,7,3,1,'#caa090');P(2,6,1,1,'#caa090');
  P(3,6,8,6,'#7d5a3c');P(4,9,6,2,'#9a7a58');
  P(10,5,4,5,'#8a6a48');P(10,3,2,2,'#7d5a3c');P(12,3,2,2,'#7d5a3c');
  P(11,4,1,1,'#d09a9a');P(13,4,1,1,'#d09a9a');
  P(12,6,1,1,'#c23030');P(14,8,1,1,'#d09a9a');
  P(4,12,2,1,'#5a3a24');P(8,12,2,1,'#5a3a24');});
S.snake=spr(P=>{P(3,12,11,2,'rgba(0,0,0,0.25)');
  P(4,3,8,2,'#3e8e41');P(10,5,2,2,'#3e8e41');P(5,7,7,2,'#3e8e41');
  P(4,9,2,2,'#3e8e41');P(5,4,6,1,'#55a858');P(6,8,5,1,'#55a858');
  P(4,11,5,3,'#4ea052');P(5,12,1,1,'#c22020');P(7,12,1,1,'#c22020');
  P(9,12,2,1,'#d04040');});
S.orc=spr(P=>{drawHuman(P,2,{skin:'#5e8f3e',shirt:'#4a4a52',pants:'#33331f',hair:'#2e4a1e',eye:'#c23030'});
  P(6,5,1,1,'#e8e8da');P(9,5,1,1,'#e8e8da');P(4,6,8,1,'#5a5a64');});
S.troll=spr(P=>{P(3,14,10,2,'rgba(0,0,0,0.3)');
  P(4,11,3,3,'#4a5544');P(9,11,3,3,'#4a5544');
  P(3,5,10,7,'#6c7d5e');P(5,7,6,4,'#8a9b78');
  P(2,5,1,6,'#6c7d5e');P(13,5,1,6,'#6c7d5e');
  P(13,1,2,5,'#7a5230');P(13,0,3,2,'#8a6240');
  P(5,1,6,4,'#6c7d5e');P(6,2,1,1,'#c23030');P(9,2,1,1,'#c23030');
  P(7,3,2,2,'#5a6b4e');P(6,0,4,1,'#3e4a36');});
S.npc=spr(P=>{drawHuman(P,2,{skin:'#e0b48a',shirt:'#7a5230',pants:'#3a3a3a',hair:'#b8b8b8'});
  P(5,8,6,4,'#5a4020');                          // avental
  P(11,2,3,2,'#9aa0a8');P(12,4,1,5,'#6a4528');}); // martelo
S.oracle=spr(P=>{drawHuman(P,2,{skin:'#e8d2c2',shirt:'#cfcfe6',pants:'#a8a8c8',hair:'#ececf6'});
  P(4,7,8,7,'#cfcfe6');P(4,13,8,1,'#9a9ac2');P(7,8,2,5,'#b8b8d8'); // túnica longa
  P(12,3,1,9,'#8a6a3a');P(11,2,3,1,'#b89a5a');});                  // cajado
const MSPR={rat:S.rat,snake:S.snake,orc:S.orc,troll:S.troll};

const ISPR={}, IURL={};
function isp(id,draw){ISPR[id]=spr(draw);IURL[id]=ISPR[id].toDataURL();}
isp('gold',P=>{P(6,5,5,4,'#e0bb45');P(7,6,1,1,'#f2d878');
  P(4,8,5,4,'#d4af37');P(5,9,1,1,'#f0d96a');P(4,11,5,1,'#9a7d20');
  P(8,9,5,4,'#d4af37');P(9,10,1,1,'#f0d96a');P(8,12,5,1,'#9a7d20');});
isp('hpot',P=>{P(7,1,2,2,'#8a5a30');P(6,3,4,2,'#b8c8d8');
  P(4,5,8,8,'#b8c8d8');P(5,7,6,5,'#cc2233');P(5,6,1,5,'#e8f0f8');});
isp('mpot',P=>{P(7,1,2,2,'#8a5a30');P(6,3,4,2,'#b8c8d8');
  P(4,5,8,8,'#b8c8d8');P(5,7,6,5,'#2244cc');P(5,6,1,5,'#e8f0f8');});
isp('meat',P=>{P(4,5,8,7,'#b3592c');P(5,6,6,5,'#d4854f');P(6,7,2,1,'#e8a06a');
  P(11,9,3,2,'#e8e0d0');P(12,11,2,2,'#e8e0d0');});
// equipamentos: sprite por tier — paleta de raridade + número do tier desenhado
const TIERCOL=[null,
  ['#8a6240','#a87c54','#5a3a22'], // 1 couro
  ['#9aa0a8','#c8ccd8','#6e767e'], // 2 ferro
  ['#b08040','#d8a860','#7a5228'], // 3 bronze
  ['#4a9a4a','#80c880','#2e6e2e'], // 4 verde
  ['#4a78c8','#80a8e8','#2e4a8e'], // 5 azul
  ['#9a5ac8','#c08ae8','#6a3a8e'], // 6 roxo
  ['#d88030','#f0a858','#9a5818'], // 7 laranja
  ['#c83a3a','#e87878','#8e2222'], // 8 vermelho
  ['#4ac8c8','#9ae8e8','#2e8e8e'], // 9 ciano
  ['#e8c84a','#fff0a0','#a8881a'], // 10 dourado
];
const EQDRAW={
  sword(P,[a,b,c]){P(7,1,2,1,b);P(7,2,2,8,a);P(7,2,1,8,b);
    P(5,10,6,1,c);P(7,11,2,3,'#3a2a1a');P(7,14,2,1,c);},
  shield(P,[a,b,c]){P(4,3,8,10,a);P(6,3,1,10,c);P(9,3,1,10,c);
    P(4,2,8,1,b);P(4,13,8,1,b);P(3,3,1,10,b);P(12,3,1,10,b);P(7,7,2,2,b);},
  helmet(P,[a,b,c]){P(5,3,6,2,b);P(4,5,8,4,a);P(3,9,10,1,c);
    P(7,10,2,3,a);P(6,4,2,1,b);},
  armor(P,[a,b,c]){P(3,4,10,2,b);P(4,6,8,7,a);P(7,4,2,1,'#3a3a40');
    P(4,9,8,1,c);P(4,12,8,1,c);P(5,7,1,1,b);},
  legs(P,[a,b,c]){P(5,3,6,2,b);P(5,5,2,8,a);P(9,5,2,8,a);
    P(5,12,2,1,c);P(9,12,2,1,c);},
  boots(P,[a,b,c]){P(3,6,3,5,a);P(3,10,4,2,c);P(3,12,4,1,'#26201a');
    P(9,6,3,5,a);P(9,10,4,2,c);P(9,12,4,1,'#26201a');},
};
for(const eqid in EQDRAW)for(let t=1;t<=MAXTIER;t++){
  const key=eqid+'@'+t;
  ISPR[key]=spr((P,ctx)=>{
    EQDRAW[eqid](P,TIERCOL[t]);
    ctx.font='bold 9px Verdana';ctx.textAlign='right';ctx.lineJoin='round';
    ctx.strokeStyle='#000';ctx.lineWidth=2.5;ctx.strokeText(t,31,31);
    ctx.fillStyle=t===MAXTIER?'#ffd24a':'#fff';ctx.fillText(t,31,31);
  });
  IURL[key]=ISPR[key].toDataURL();
}
const sprKey=it=>IDEFS[it.id].tiered?it.id+'@'+(it.tier||1):it.id;
isp('hpot2',P=>{P(7,0,2,2,'#8a5a30');P(6,2,4,2,'#b8c8d8');
  P(3,4,10,10,'#b8c8d8');P(4,6,8,7,'#a81828');P(4,5,1,7,'#e8f0f8');});
isp('mpot2',P=>{P(7,0,2,2,'#8a5a30');P(6,2,4,2,'#b8c8d8');
  P(3,4,10,10,'#b8c8d8');P(4,6,8,7,'#1830a8');P(4,5,1,7,'#e8f0f8');});
