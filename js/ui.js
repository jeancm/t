'use strict';
// ===================================================================== textos

const logEl = document.getElementById('log');

// adiciona uma linha colorida ao log da tela, limitando o histórico a 80 linhas
function log(msg, color) {
  const d = document.createElement('div');
  d.textContent = msg;
  if (color) d.style.color = color;
  logEl.appendChild(d);
  while (logEl.children.length > 80) logEl.removeChild(logEl.firstChild);
  logEl.scrollTop = logEl.scrollHeight;
}

// artigo indefinido conforme o gênero do item/monstro ('uma' p/ feminino, 'um' p/ masculino)
const art = def => def.g === 'f' ? 'uma' : 'um';

// rótulo curto de um item (com artigo e quantidade), usado nas mensagens do log
function itemLabel(it) {
  const d = IDEFS[it.id];
  if (d.tiered) return `${art(d)} ${d.name} tier ${it.tier || 1}`;
  return it.count > 1 ? `${it.count} ${d.plural || d.name + 's'}` : `${art(d)} ${d.name}`;
}

// texto detalhado de um item (com atributos), usado no tooltip dos slots
function itemTitle(it) {
  const d = IDEFS[it.id];
  let s = d.name;
  if (d.tiered) {
    s += ` tier ${it.tier || 1}`;
    if (d.atk) s += ` (Atk +${itemAtk(it)})`;
    if (d.def) s += ` (Def +${itemDef(it)})`;
    return s;
  }
  if (d.use) s += d.use === 'hp' ? ` (cura ~${d.power})` : ` (mana ~${d.power})`;
  if (it.count > 1) s += ` x${it.count}`;
  return s;
}

// ===================================================================== stats

const expNeed = l => l * l * 60;   // experiência necessária para passar do level l

// ataque e defesa efetivos do jogador (base + level + bônus de pontos + equipamento)
const playerAtk = () => 4 + player.level + player.bonusAtk + (equip.weapon ? itemAtk(equip.weapon) : 1);
const playerDef = () => {
  let d = 1 + Math.floor(player.level / 3) + player.bonusDef;
  for (const s in equip) if (equip[s]) d += itemDef(equip[s]);
  return d;
};

// concede experiência e processa um ou mais level ups (cada um restaura HP/MP)
function gainExp(n, wx, wy) {
  player.exp += n;
  floatText(wx, wy, '+' + n + ' xp', '#c8c8ff');
  let leveled = false;
  while (player.exp >= expNeed(player.level)) {
    player.level++; player.points++; leveled = true;
    player.maxhp += 10; player.maxmp += 5;
    player.hp = player.maxhp; player.mp = player.maxmp;
    log(`Você avançou para o level ${player.level}! (+10 HP máx., +5 MP máx.)`, '#fff');
    floatText(player.x * TILE, player.y * TILE, 'LEVEL UP!', '#ffd24a');
  }
  updateUI();
  if (leveled) openLvlUp();
}

// dano de um golpe: ataque com variação (40%-100%) menos parte aleatória da defesa
function rollDmg(atk, def) {
  const a = atk * (0.4 + Math.random() * 0.6), d = def * Math.random() * 0.8;
  return Math.max(0, Math.round(a - d));
}

// ===================================================================== level up

let paused = false, pauseStart = 0;
const lvlupEl = document.getElementById('lvlup');

// abre o painel de level up (pausando o jogo) para escolher um atributo
function openLvlUp() {
  if (!paused) { paused = true; pauseStart = performance.now(); }
  document.getElementById('lvlupnum').textContent = player.level;
  document.getElementById('lvlpts').textContent =
    player.points > 1 ? `Pontos disponíveis: ${player.points}` : '';
  lvlupEl.style.display = 'flex';
}

// retoma o jogo após a pausa, compensando o tempo parado para não estourar cooldowns
function resume() {
  const dt = performance.now() - pauseStart;
  player.moveT += dt; player.lastAtk += dt; lastRegen += dt;
  for (const m of monsters) { m.moveT += dt; m.lastAtk += dt; m.nextThink += dt; m.respawnAt += dt; }
  for (const f of fx) f.t0 += dt;
  paused = false;
}

// atributos escolhíveis ao subir de level (cada botão #lvlup tem data-attr)
const ATTRS = {
  hp:  {label: 'Vida',   msg: '+25 de HP máximo', apply() { player.maxhp += 25; player.hp = player.maxhp; }},
  mp:  {label: 'Mana',   msg: '+15 de MP máximo', apply() { player.maxmp += 15; player.mp = player.maxmp; }},
  atk: {label: 'Ataque', msg: '+2 de ataque',     apply() { player.bonusAtk += 2; }},
  def: {label: 'Defesa', msg: '+2 de defesa',     apply() { player.bonusDef += 2; }},
};
for (const btn of document.querySelectorAll('#lvlup button')) {
  btn.addEventListener('click', () => {
    if (player.points <= 0) return;
    const a = ATTRS[btn.dataset.attr];
    a.apply(); player.points--;
    log(`Atributo aumentado: ${a.label} (${a.msg}).`, '#ffd24a');
    updateUI();
    if (player.points > 0) openLvlUp();              // ainda há pontos: reabre o painel
    else { lvlupEl.style.display = 'none'; resume(); }
  });
}

// ===================================================================== UI lateral

const eqgrid = document.getElementById('eqgrid'), bagEl = document.getElementById('bag');
// disposição dos slots de equipamento (null = célula vazia para alinhar a grade)
const EQLAYOUT = [[null, 'head', null], ['weapon', 'body', 'shield'], [null, 'legs', null], [null, 'feet', null]];
const EQLABEL = {head: 'Elmo', body: 'Peito', legs: 'Pernas', feet: 'Botas', weapon: 'Arma', shield: 'Escudo'};

// monta a grade de equipamento no DOM
for (const row of EQLAYOUT) for (const cell of row) {
  if (!cell) {
    const d = document.createElement('div');
    d.className = 'cell-empty';
    eqgrid.appendChild(d);
    continue;
  }
  const d = document.createElement('div');
  d.className = 'slot';
  d.dataset.t = 'eq'; d.dataset.slot = cell;
  d.innerHTML = `<span class="lab">${EQLABEL[cell]}</span><span class="cnt"></span>`;
  eqgrid.appendChild(d);
}
// monta os slots da mochila no DOM
for (let i = 0; i < bag.length; i++) {
  const d = document.createElement('div');
  d.className = 'slot';
  d.dataset.t = 'bag'; d.dataset.i = i;
  d.innerHTML = '<span class="cnt"></span>';
  bagEl.appendChild(d);
}

const slotEls = [...document.querySelectorAll('.slot')];

// descreve o que um elemento-slot representa: {t:'bag', i} ou {t:'eq', slot}
function slotDesc(el) {
  return el.dataset.t === 'bag' ? {t: 'bag', i: +el.dataset.i} : {t: 'eq', slot: el.dataset.slot};
}

// redesenha todos os slots (sprite, contador e tooltip) a partir do estado
function renderSlots() {
  for (const el of slotEls) {
    const s = slotDesc(el);
    const it = s.t === 'bag' ? bag[s.i] : equip[s.slot];
    el.style.backgroundImage = it ? `url(${IURL[sprKey(it)]})` : 'none';
    el.querySelector('.cnt').textContent = it && it.count > 1 ? it.count : '';
    const lab = el.querySelector('.lab');
    if (lab) lab.style.display = it ? 'none' : '';
    el.title = it ? itemTitle(it) : (lab ? EQLABEL[s.slot] : '');
  }
}

const $ = id => document.getElementById(id);

// atualiza os números do painel de status (level, barras de HP/MP, exp, atk/def)
function updateUI() {
  $('lvl').textContent = player.level;
  $('hpfill').style.width = (100 * player.hp / player.maxhp) + '%';
  $('mpfill').style.width = (100 * player.mp / player.maxmp) + '%';
  $('hptxt').textContent = `HP ${player.hp} / ${player.maxhp}`;
  $('mptxt').textContent = `MP ${player.mp} / ${player.maxmp}`;
  $('exptxt').textContent = `Exp: ${player.exp}  (próx. level: ${expNeed(player.level)})`;
  $('atktxt').textContent = `Ataque: ${playerAtk()}   Defesa: ${playerDef()}`;
}

// ===================================================================== inventário / itens

// adiciona um item à mochila (empilhando quando possível); false se estiver cheia
function addToBag(item) {
  const d = IDEFS[item.id];
  if (d.stack) for (const it of bag) if (it && it.id === item.id) { it.count += item.count; return true; }
  const i = bag.indexOf(null);
  if (i < 0) return false;
  bag[i] = item;
  return true;
}

// remove 1 unidade do slot indicado da mochila
function consumeOne(s) {
  const it = bag[s.i];
  if (it.count > 1) it.count--;
  else bag[s.i] = null;
}

// usa o item de um slot da mochila: poção (HP/MP), comida ou equipar (botão direito)
function useItem(s) {
  const it = bag[s.i];
  if (!it) return;
  const d = IDEFS[it.id];
  if (d.use === 'hp') {
    const v = Math.round(d.power * 0.7 + Math.random() * d.power * 0.5);
    player.hp = Math.min(player.maxhp, player.hp + v);
    consumeOne(s); log(it.id === 'meat' ? 'Munch.' : 'Aaaah...', '#7ad87a');
    floatText(player.x * TILE, player.y * TILE, '+' + v, '#4ad14a');
  } else if (d.use === 'mp') {
    const v = Math.round(d.power * 0.7 + Math.random() * d.power * 0.5);
    player.mp = Math.min(player.maxmp, player.mp + v);
    consumeOne(s); log('Mmmh...', '#7a9ad8');
    floatText(player.x * TILE, player.y * TILE, '+' + v, '#5a7ae8');
  } else if (d.slot) {           // clique direito em equipamento = equipar (troca com o atual)
    const cur = equip[d.slot];
    equip[d.slot] = it; bag[s.i] = cur || null;
    log(`Você equipou ${art(IDEFS[it.id])} ${IDEFS[it.id].name}.`);
  } else { log('Você não pode usar este item.'); return; }
  autoFuse();
}

// desequipa o slot indicado, devolvendo a peça para a mochila
function unequip(slot) {
  const it = equip[slot];
  if (!it) return;
  if (!addToBag(it)) { log('Sua mochila está cheia.'); return; }
  equip[slot] = null;
  autoFuse();
}

// pega o item do topo da pilha em (x,y), se o jogador estiver adjacente
function tryPickup(x, y) {
  if (cheb(player, {x, y}) > 1) { log('Muito longe.'); return; }
  const it = topGround(x, y);
  if (!it) return;
  if (!addToBag(it)) { log('Sua mochila está cheia.'); return; }
  takeTopGround(x, y);
  log(`Você pegou ${itemLabel(it)}.`);
  autoFuse();
}

// ===================================================================== NPCs: loja e Oracle

function npcAt(x, y) { for (const n of npcs) if (n.x === x && n.y === y) return n; return null; }

const npcdlg = document.getElementById('npcdlg');
let npcOpen = null;   // npc com o diálogo aberto (ou null)

// conta unidades de um item na mochila (opcionalmente de um tier específico)
function countInBag(id, tier) {
  let n = 0;
  for (const it of bag)
    if (it && it.id === id && (tier === undefined || (it.tier || 1) === tier)) n += it.count;
  return n;
}

// remove n unidades de um item da mochila (opcionalmente de um tier específico)
function removeFromBag(id, n, tier) {
  for (let i = 0; i < bag.length && n > 0; i++) {
    const it = bag[i];
    if (!it || it.id !== id || (tier !== undefined && (it.tier || 1) !== tier)) continue;
    const take = Math.min(n, it.count);
    it.count -= take; n -= take;
    if (it.count <= 0) bag[i] = null;
  }
}

// resumo de atributo de um item, exibido na loja
function statText(it) {
  const d = IDEFS[it.id];
  if (d.tiered) return d.atk ? `Atk +${itemAtk(it)}` : `Def +${itemDef(it)}`;
  if (d.use) return (d.use === 'hp' ? 'cura' : 'mana') + ` ~${d.power}`;
  return '';
}

const noArt = s => s.replace(/^uma? /, '');   // remove o artigo "um/uma" do início

// Fusão automática: 3 itens iguais e do mesmo tier na mochila viram 1 do tier seguinte,
// em cascata (a fusão pode gerar um trio do tier acima). Também funde poções via FUSE.
function autoFuse() {
  let fused = true;
  while (fused) {
    fused = false;

    // equipamentos com tier: agrupa por id@tier e funde trios em tier+1
    const groups = new Map();
    for (const it of bag) {
      if (!it || !IDEFS[it.id].tiered) continue;
      const k = it.id + '@' + (it.tier || 1);
      groups.set(k, (groups.get(k) || 0) + 1);
    }
    for (const [k, n] of groups) {
      const [id, ts] = k.split('@'), t = +ts;
      if (n < 3 || t >= MAXTIER) continue;
      removeFromBag(id, 3, t);
      const res = {id, tier: t + 1, count: 1};
      if (!addToBag(res)) addToGround(player.x, player.y, res);
      log(`Fusão automática: 3x ${IDEFS[id].name} tier ${t} → ${noArt(itemLabel(res))}!`, '#ffd24a');
      floatText(player.x * TILE, player.y * TILE, '★ fusão', '#ffd24a');
      fused = true;
    }

    // poções sem tier: 3x viram a versão grande (FUSE)
    for (const id in FUSE) while (countInBag(id) >= 3) {
      removeFromBag(id, 3);
      const res = {id: FUSE[id], count: 1};
      if (!addToBag(res)) addToGround(player.x, player.y, res);
      log(`Fusão automática: 3x ${IDEFS[id].name} → ${noArt(itemLabel(res))}!`, '#ffd24a');
      floatText(player.x * TILE, player.y * TILE, '★ fusão', '#ffd24a');
      fused = true;
    }
  }
  renderSlots(); updateUI();
  if (npcOpen && npcOpen.id === 'smith') buildShopList();   // mantém a loja em dia
}

// --- loja do ferreiro ---
const SHOP = [
  {id: 'hpot', price: 40}, {id: 'mpot', price: 35}, {id: 'meat', price: 8},
  {id: 'sword', tier: 1, price: 60}, {id: 'shield', tier: 1, price: 50}, {id: 'helmet', tier: 1, price: 45},
  {id: 'armor', tier: 1, price: 70}, {id: 'legs', tier: 1, price: 45}, {id: 'boots', tier: 1, price: 35},
];
const shopItem = o => o.tier ? {id: o.id, tier: o.tier, count: 1} : {id: o.id, count: 1};

// (re)constrói a lista de itens à venda, com botões habilitados conforme o ouro
function buildShopList() {
  const gold = countInBag('gold');
  $('npcsub').innerHTML = '"Bem-vindo à minha loja! O que deseja comprar?"<br>' +
    `<small>Seu ouro: <b style="color:#ffd24a">${gold}</b></small>`;
  const list = $('npclist');
  list.innerHTML = '';
  for (const o of SHOP) {
    const it = shopItem(o);
    const row = document.createElement('div');
    row.className = 'shoprow';
    row.innerHTML =
      `<img src="${IURL[sprKey(it)]}" alt=""><div class="fname">${noArt(itemLabel(it))}` +
      `<small>${statText(it)}</small></div>` +
      `<img src="${IURL.gold}" alt=""><div class="fname">${o.price} de ouro</div>`;
    const b = document.createElement('button');
    b.textContent = 'Comprar';
    b.disabled = gold < o.price;
    b.addEventListener('click', () => buy(o));
    row.appendChild(b);
    list.appendChild(row);
  }
}

// compra um item da loja, descontando o ouro
function buy(o) {
  if (countInBag('gold') < o.price) return;
  removeFromBag('gold', o.price);
  const it = shopItem(o);
  if (!addToBag(it)) { addToGround(player.x, player.y, it); log('Sua mochila está cheia — a compra ficou no chão.', '#e88'); }
  log(`Você comprou ${itemLabel(it)} por ${o.price} de ouro.`, '#ffd24a');
  autoFuse();   // também re-renderiza a loja e a mochila
}

// abre o diálogo da loja do ferreiro
function openSmith(n) {
  npcOpen = n;
  $('npctitle').textContent = n.name.toUpperCase();
  buildShopList();
  npcdlg.style.display = 'flex';
  log(`${n.name}: "Bem-vindo! Dê uma olhada nas minhas mercadorias."`, '#7ad8d8');
}

// abre o diálogo do Oracle: viagem entre os mundos (liberada no level 8+)
function openOracle(n) {
  if (worldIdx === 0 && player.level < 8) {
    log(`${n.name}: "Volte quando alcançar o level 8, jovem aventureiro."`, '#d8a4ff');
    return;
  }
  npcOpen = n;
  $('npctitle').textContent = n.name.toUpperCase();
  const dest = worldIdx === 0 ? 1 : 0;
  $('npcsub').innerHTML = worldIdx === 0
    ? '"Você provou o seu valor. Posso levá-lo às <b>Terras Sombrias</b>, onde os monstros são um tier acima — assim como o loot."'
    : '"Deseja voltar à Ilha Inicial?"';
  const list = $('npclist');
  list.innerHTML = '';
  const b = document.createElement('button');
  b.className = 'travelbtn';
  b.textContent = dest === 1 ? 'Viajar para as Terras Sombrias' : 'Voltar para a Ilha Inicial';
  b.addEventListener('click', () => setWorld(dest));
  list.appendChild(b);
  npcdlg.style.display = 'flex';
}

function closeNpc() { npcOpen = null; npcdlg.style.display = 'none'; }
document.getElementById('npcclose').addEventListener('click', closeNpc);
