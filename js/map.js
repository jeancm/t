'use strict';
//==================================================================== mapa
function genMap(seed){
  const map=[];
  const rng=mulberry32(seed);
  for(let y=0;y<MH;y++){const row=[];for(let x=0;x<MW;x++)
    row.push(x===0||y===0||x===MW-1||y===MH-1?'T':'.');map.push(row);}
  // árvores e rochas espalhadas
  for(let y=2;y<MH-2;y++)for(let x=2;x<MW-2;x++){
    const r=rng(); if(r<.07)map[y][x]='T'; else if(r<.085)map[y][x]='R';}
  // aglomerado de rochas (área dos trolls, sudoeste)
  for(let y=21;y<=26;y++)for(let x=3;x<=11;x++)if(rng()<.25)map[y][x]='R';
  // lago (sudeste)
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const dx=(x-29)/6.5, dy=(y-21)/4.5; if(dx*dx+dy*dy<1)map[y][x]='~';}
  // templo (spawn do jogador)
  for(let y=4;y<=9;y++)for(let x=4;x<=9;x++)
    map[y][x]=(y===4||y===9||x===4||x===9)?'w':'s';
  map[6][9]='s'; map[7][9]='s';            // porta leste
  for(let x=10;x<=22;x++)map[6][x]=',';    // caminho de terra
  for(let y=7;y<=14;y++)map[y][22]=',';
  // garante tiles livres em spawns, itens iniciais e arredores
  const clearTiles=[[6,6],[10,6],[10,7],[11,6],[11,7],[8,5],[5,5],[8,8],[5,8],[12,6]];
  for(const [,sx,sy] of SPAWNS)
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)clearTiles.push([sx+dx,sy+dy]);
  for(const [cx,cy] of clearTiles){
    if(cx<1||cy<1||cx>=MW-1||cy>=MH-1)continue;
    if(map[cy][cx]==='T'||map[cy][cx]==='R')map[cy][cx]='.';
  }
  return map;
}
const walkable=(x,y)=>x>=0&&y>=0&&x<MW&&y<MH&&!'TwR~'.includes(map[y][x]);
// zona de proteção: todo o piso de pedra do templo
const isPZ=(x,y)=>x>=0&&y>=0&&x<MW&&y<MH&&map[y][x]==='s';
