'use strict';
// ===================================================================== estado

// O jogador. (x,y) inteiros em tiles; (fx,fy) é o tile de origem da animação de
// passo; moveT/moveMs/stepMs controlam o tempo do movimento; dir é a direção.
const player = {
  x: 6, y: 6, fx: 6, fy: 6, moveT: 0, moveMs: 280, dir: 2,
  hp: 150, maxhp: 150, mp: 50, maxmp: 50,
  level: 1, exp: 0, lastAtk: 0, lastCast: 0,
  points: 0, bonusAtk: 0, bonusDef: 0,
};

// Equipamento por slot e mochila (40 espaços). Começa com espada e 2 poções.
const equip = {head: null, body: null, legs: null, feet: null, weapon: null, shield: null};
const bag = new Array(40).fill(null);
equip.weapon = {id: 'sword', tier: 1, count: 1};
bag[0] = {id: 'hpot', count: 2};

let target = null;   // monstro sendo atacado (ou null)

// --- mundos ----------------------------------------------------------------
// Cada mundo tem mapa, monstros (com tier), itens no chão e NPCs próprios.

const ROMAN = ['', '', 'II', 'III', 'IV', 'V'];
const mName = m => m.def.name + (m.tier > 1 ? ' ' + ROMAN[m.tier] : '');

// cria os monstros de um mundo, escalando os atributos pelo tier (mtier)
const mkMonsters = mtier => SPAWNS.map(([type, x, y]) => {
  const def = MTYPES[type], mul = tierMul(mtier);
  return {
    type, def, tier: mtier, x, y, fx: x, fy: y, sx: x, sy: y,
    moveT: 0, moveMs: def.moveMs, nextThink: 0, lastAtk: 0, dead: false, respawnAt: 0,
    hp: Math.round(def.hp * mul), maxhp: Math.round(def.hp * mul),
    atkV: Math.round(def.atk * mul), defV: Math.round(def.def * mul), expV: Math.round(def.exp * mul),
  };
});

const mkNpcs = () => [
  {id: 'smith',  name: 'Ferreiro Thorin', label: 'Ferreiro', x: 7, y: 8, fx: 7, fy: 8, moveT: 0, moveMs: 1},
  {id: 'oracle', name: 'The Oracle',      label: 'Oracle',   x: 5, y: 7, fx: 5, fy: 7, moveT: 0, moveMs: 1},
];

const WORLDS = [
  {name: 'Ilha Inicial',    seed: 20260610, mtier: 1},
  {name: 'Terras Sombrias', seed: 20260611, mtier: 2},
].map(w => ({
  ...w,
  map: genMap(w.seed),
  groundItems: new Map(),
  monsters: mkMonsters(w.mtier),
  npcs: mkNpcs(),
}));

let worldIdx = 0;
// "ponteiros" para o mundo atual — reatribuídos por setWorld()
let map = WORLDS[0].map, groundItems = WORLDS[0].groundItems,
    monsters = WORLDS[0].monsters, npcs = WORLDS[0].npcs;

// troca o mundo ativo, reposiciona o jogador no templo e zera o estado de turno
function setWorld(i) {
  worldIdx = i;
  const w = WORLDS[i];
  map = w.map; groundItems = w.groundItems; monsters = w.monsters; npcs = w.npcs;
  player.x = player.fx = 6; player.y = player.fy = 6; player.moveT = 0; player.dir = 2;
  target = null; pressed.length = 0; fx.length = 0; closeNpc();
  inPZ = isPZ(player.x, player.y);
  log(`Você chegou: ${w.name}.`, '#d8a4ff');
  if (w.mtier > 1)
    log('Aqui os monstros são um tier acima — mais fortes, e o loot também sobe um tier!', '#d8a4ff');
}

// --- itens no chão ---------------------------------------------------------
// groundItems: Map de "x,y" -> pilha de itens (o topo é o que aparece e se pega).

const gkey = (x, y) => x + ',' + y;
function groundAt(x, y) { return groundItems.get(gkey(x, y)) || []; }
function topGround(x, y) { const a = groundAt(x, y); return a.length ? a[a.length - 1] : null; }

function addToGround(x, y, item) {
  const k = gkey(x, y);
  let a = groundItems.get(k);
  if (!a) { a = []; groundItems.set(k, a); }
  const top = a[a.length - 1];
  if (top && top.id === item.id && IDEFS[item.id].stack) top.count += item.count; // empilha
  else a.push(item);
}
function takeTopGround(x, y) {
  const k = gkey(x, y), a = groundItems.get(k);
  if (!a || !a.length) return null;
  const it = a.pop();
  if (!a.length) groundItems.delete(k);
  return it;
}

// itens iniciais espalhados pelo templo
addToGround(8, 5, {id: 'sword', tier: 1, count: 1});
addToGround(5, 5, {id: 'shield', tier: 1, count: 1});
addToGround(8, 8, {id: 'hpot', count: 2});
addToGround(5, 8, {id: 'gold', count: 15});
addToGround(12, 6, {id: 'meat', count: 2});

// --- efeitos flutuantes ----------------------------------------------------
// fx: textos de dano/xp e respingos de sangue, desenhados e expirados em render.js
const fx = [];   // {kind:'text'|'splat', wx, wy, txt, color, t0}

// adiciona um texto flutuante; empilha textos próximos no tempo para não se
// sobreporem (ex.: dano + xp na mesma morte)
function floatText(wx, wy, txt, color) {
  let n = 0;
  for (const f of fx)
    if (f.kind === 'text' && Math.abs(f.wx - wx) < 26 && NOW - f.t0 < 500) n++;
  fx.push({kind: 'text', wx, wy: wy - n * 12, txt, color, t0: NOW});
}
function splat(wx, wy) { fx.push({kind: 'splat', wx, wy, t0: NOW}); }
