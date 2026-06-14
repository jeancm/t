'use strict';
//==================================================================== utils
const TILE=32, VW=15, VH=11, MW=40, MH=30;
const cv=document.getElementById('cv'), g=cv.getContext('2d');
g.imageSmoothingEnabled=false;
let NOW=performance.now();
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const cheb=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

window.addEventListener('error',e=>{ try{log('[erro] '+e.message,'#f66');}catch(_){} });
