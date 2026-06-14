'use strict';
// ===================================================================== drag & drop
// Uma "fonte" (src) de arraste é descrita por: {t:'bag', i} | {t:'eq', slot} | {t:'ground', x, y}.

const ghost = document.getElementById('ghost');   // sprite que segue o mouse ao arrastar
let drag = null;                                   // {src, started, sx, sy} ou null

// item na fonte
function srcItem(s) {
  return s.t === 'bag' ? bag[s.i] : s.t === 'eq' ? equip[s.slot] : topGround(s.x, s.y);
}
// remove o item da fonte (ao concluir um arraste)
function srcRemove(s) {
  if (s.t === 'bag') bag[s.i] = null;
  else if (s.t === 'eq') equip[s.slot] = null;
  else takeTopGround(s.x, s.y);
}

// solta a fonte `s` no slot `i` da mochila (vazio, empilha, troca ou equipa de volta)
function dropToBag(s, i) {
  const it = srcItem(s);
  if (!it) return;
  if (s.t === 'bag' && s.i === i) return;
  if (s.t === 'ground' && cheb(player, s) > 1) { log('Muito longe.'); return; }
  const cur = bag[i];
  if (!cur) { srcRemove(s); bag[i] = it; }                                  // slot vazio
  else if (cur.id === it.id && IDEFS[it.id].stack) { srcRemove(s); cur.count += it.count; } // empilha
  else if (s.t === 'bag') { bag[s.i] = cur; bag[i] = it; }                  // troca dois slots da mochila
  else if (s.t === 'eq') {
    if (IDEFS[cur.id].slot === s.slot) { equip[s.slot] = cur; bag[i] = it; } // troca com o equipado
    else { log('Esse espaço está ocupado.'); return; }
  } else {   // chão -> slot ocupado: tenta outro lugar qualquer da mochila
    if (addToBag(it)) srcRemove(s);
    else { log('Sua mochila está cheia.'); return; }
  }
  autoFuse();
}

// solta a fonte `s` num slot de equipamento (precisa ser a peça certa para o slot)
function dropToEq(s, slot) {
  const it = srcItem(s);
  if (!it) return;
  if (s.t === 'eq' && s.slot === slot) return;
  if (IDEFS[it.id].slot !== slot) { log('Você não pode equipar isso aí.'); return; }
  if (s.t === 'ground' && cheb(player, s) > 1) { log('Muito longe.'); return; }
  const cur = equip[slot];
  srcRemove(s); equip[slot] = it;
  if (cur) {   // devolve a peça que estava equipada à origem (ou à mochila/chão)
    if (s.t === 'bag') bag[s.i] = cur;
    else if (s.t === 'ground') addToGround(s.x, s.y, cur);
    else if (!addToBag(cur)) addToGround(player.x, player.y, cur);
  }
  log(`Você equipou ${art(IDEFS[it.id])} ${IDEFS[it.id].name}.`);
  autoFuse();
}

// solta a fonte `s` num tile do mapa (no chão), respeitando alcance e terreno
function dropToTile(s, x, y) {
  const it = srcItem(s);
  if (!it) return;
  if (s.t === 'ground' && s.x === x && s.y === y) return;
  if (s.t === 'ground' && cheb(player, s) > 1) { log('Muito longe.'); return; }
  if (cheb(player, {x, y}) > 5) { log('Muito longe.'); return; }
  if (!walkable(x, y)) { log('Você não pode jogar isso aí.'); return; }
  srcRemove(s); addToGround(x, y, it);
  renderSlots(); updateUI();
}

let camX = 0, camY = 0;   // canto superior esquerdo da câmera (px); definido em draw()

// converte as coordenadas de um evento de mouse para o tile do mapa correspondente
function tileFromEvent(e) {
  const r = cv.getBoundingClientRect();
  const px = (e.clientX - r.left) * (cv.width / r.width) + camX;
  const py = (e.clientY - r.top) * (cv.height / r.height) + camY;
  return {x: Math.floor(px / TILE), y: Math.floor(py / TILE)};
}

let justDragged = false;   // evita que o "soltar" dispare também o clique de "olhar"

// inicia um possível arraste (botão esquerdo) a partir de um slot ou de um item no chão
document.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const slotEl = e.target.closest('.slot');
  if (slotEl) {
    const s = slotDesc(slotEl);
    if (srcItem(s)) { drag = {src: s, started: false, sx: e.clientX, sy: e.clientY}; e.preventDefault(); }
  } else if (e.target === cv) {
    const t = tileFromEvent(e);
    if (topGround(t.x, t.y)) drag = {src: {t: 'ground', x: t.x, y: t.y}, started: false, sx: e.clientX, sy: e.clientY};
  }
});

// move o sprite-fantasma com o mouse (só "começa" o arraste após passar de 5px)
document.addEventListener('mousemove', e => {
  if (!drag) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
    const it = srcItem(drag.src);
    if (!it) { drag = null; return; }
    drag.started = true;
    ghost.style.backgroundImage = `url(${IURL[sprKey(it)]})`;
    ghost.style.display = 'block';
  }
  ghost.style.left = (e.clientX - 20) + 'px';
  ghost.style.top = (e.clientY - 20) + 'px';
});

// conclui o arraste, soltando no destino (slot da mochila, equipamento ou tile)
document.addEventListener('mouseup', e => {
  if (!drag) return;
  const d = drag;
  drag = null;
  ghost.style.display = 'none';
  if (!d.started) return;
  justDragged = true;
  const slotEl = e.target.closest && e.target.closest('.slot');
  if (slotEl) {
    const s = slotDesc(slotEl);
    if (s.t === 'bag') dropToBag(d.src, s.i); else dropToEq(d.src, s.slot);
  } else if (e.target === cv) {
    const t = tileFromEvent(e);
    dropToTile(d.src, t.x, t.y);
  }
});

// clique esquerdo no mapa = "olhar" (descreve o que há no tile)
cv.addEventListener('click', e => {
  if (justDragged) { justDragged = false; return; }   // ignora o clique que encerra um arraste
  const t = tileFromEvent(e);
  if (t.x < 0 || t.y < 0 || t.x >= MW || t.y >= MH) return;
  const n = npcAt(t.x, t.y);
  if (n) {
    log(n.id === 'smith' ? `Você vê ${n.name}. Ele vende itens úteis para caçadores.`
                         : `Você vê ${n.name}. Dizem que leva aventureiros level 8+ a terras distantes.`);
    return;
  }
  const m = monsterAt(t.x, t.y);
  if (m) { log(`Você vê ${art(m.def)} ${mName(m)}. (HP ${m.hp}/${m.maxhp})`); return; }
  const it = topGround(t.x, t.y);
  if (it) { log(`Você vê ${itemLabel(it)}.`); return; }
  if (t.x === player.x && t.y === player.y) { log('Você vê você mesmo.'); return; }
  log(`Você vê ${TERRAIN_NAME[map[t.y][t.x]] || 'algo'}.`);
});

// botão direito = atacar / usar / pegar / falar com NPC (depende de onde clicou)
document.addEventListener('contextmenu', e => {
  if (!e.target.closest('#app') && !e.target.closest('#lvlup') && !e.target.closest('#npcdlg')) return;
  e.preventDefault();
  const slotEl = e.target.closest('.slot');
  if (slotEl) {   // num slot: usa o item da mochila ou desequipa
    const s = slotDesc(slotEl);
    if (s.t === 'bag') { if (bag[s.i]) useItem(s); }
    else unequip(s.slot);
    return;
  }
  if (e.target !== cv) return;
  const t = tileFromEvent(e);
  const n = npcAt(t.x, t.y);
  if (n) {   // num NPC adjacente: abre o diálogo da loja ou do Oracle
    if (cheb(player, n) > 2) log('Muito longe.');
    else if (n.id === 'smith') openSmith(n);
    else openOracle(n);
    return;
  }
  const m = monsterAt(t.x, t.y);
  if (m) {   // num monstro: define/cancela o alvo (proibido dentro de PZ)
    if (isPZ(player.x, player.y)) { log('Você não pode atacar dentro de uma zona de proteção.', '#8ac6ff'); return; }
    if (target === m) { target = null; log('Ataque cancelado.'); }
    else { target = m; log(`Atacando: ${mName(m)}.`, '#e88'); }
    return;
  }
  if (topGround(t.x, t.y)) tryPickup(t.x, t.y);   // num item: pega
});

// ===================================================================== teclado

// 8 direções na ordem horária a partir do norte (usadas pelo pathfinding e pela dança)
const DIRS8 = [[0,-1], [1,-1], [1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1]];

// tecla (e.code) -> vetor de movimento. WASD/setas/numpad; o numpad cobre as diagonais.
const KEYVEC = {
  KeyW: [0,-1], ArrowUp: [0,-1], Numpad8: [0,-1],
  KeyD: [1,0], ArrowRight: [1,0], Numpad6: [1,0],
  KeyS: [0,1], ArrowDown: [0,1], Numpad2: [0,1],
  KeyA: [-1,0], ArrowLeft: [-1,0], Numpad4: [-1,0],
  Numpad7: [-1,-1], Numpad9: [1,-1], Numpad1: [-1,1], Numpad3: [1,1],
};

const pressed = [];   // teclas de movimento ativas, na ordem em que foram pressionadas

// TAB: alterna o alvo entre os monstros próximos, do mais perto para o mais longe
function cycleTarget() {
  if (isPZ(player.x, player.y)) { log('Você não pode atacar dentro de uma zona de proteção.', '#8ac6ff'); return; }
  const cands = monsters.filter(m => !m.dead && Math.abs(m.x - player.x) <= 7 && Math.abs(m.y - player.y) <= 5);
  if (!cands.length) { log('Nenhum alvo à vista.'); return; }
  cands.sort((a, b) => cheb(a, player) - cheb(b, player));
  target = cands[(cands.indexOf(target) + 1) % cands.length];
  log(`Atacando: ${mName(target)}.`, '#e88');
}

window.addEventListener('keydown', e => {
  if (paused) return;
  if (e.code === 'Tab') { e.preventDefault(); cycleTarget(); return; }
  if (KEYVEC[e.code]) { e.preventDefault(); if (!pressed.includes(e.code)) pressed.push(e.code); }
  if (e.code === 'Escape') {
    if (npcOpen) closeNpc();
    else if (target) { target = null; log('Ataque cancelado.'); }
  }
});
window.addEventListener('keyup', e => {
  const i = pressed.indexOf(e.code);
  if (i >= 0) pressed.splice(i, 1);
});
window.addEventListener('blur', () => { pressed.length = 0; });   // perdeu o foco: solta tudo
