'use strict';
// ===================================================================== lógica

function monsterAt(x, y) {
  for (const m of monsters) if (!m.dead && m.x === x && m.y === y) return m;
  return null;
}

// um monstro pode pisar em (x,y)? Terreno livre, fora de PZ, sem NPC/monstro/jogador.
function canStep(x, y) {
  return walkable(x, y) && !isPZ(x, y) && !npcAt(x, y) && !monsterAt(x, y) &&
         !(player.x === x && player.y === y);
}

// move a entidade `e` para (nx,ny), guardando o tile de origem para animar o passo
function moveEnt(e, nx, ny) {
  e.stepMs = e.moveMs * (nx !== e.x && ny !== e.y ? 2 : 1);   // diagonal leva o dobro do tempo
  e.fx = e.x; e.fy = e.y;
  e.x = nx; e.y = ny;
  e.moveT = NOW;
}

// posição renderizada (px) de `e`, interpolando entre o tile de origem e o destino
function rpos(e) {
  const t = Math.min(1, (NOW - e.moveT) / (e.stepMs || e.moveMs));   // progresso 0..1 do passo
  return {x: (e.fx + (e.x - e.fx) * t) * TILE, y: (e.fy + (e.y - e.fy) * t) * TILE};
}

// golpe do jogador no monstro `m`
function hitMonster(m) {
  player.lastAtk = NOW;
  const dmg = rollDmg(playerAtk(), m.defV);
  const p = rpos(m);
  if (dmg <= 0) { floatText(p.x, p.y, 'errou', '#aaa'); return; }
  splat(p.x, p.y);
  floatText(p.x, p.y, '-' + dmg, '#ff5a5a');
  m.hp -= dmg;
  if (m.hp <= 0) killMonster(m);
}

// mata o monstro: agenda respawn, rola o loot e concede experiência
function killMonster(m) {
  m.dead = true; m.hp = 0; m.respawnAt = NOW + 15000;
  if (target === m) target = null;
  const names = [];
  let full = false;
  for (const [id, chance, lo, hi] of m.def.loot) {   // tupla [id, chance, min/tierBase, max]
    if (Math.random() < chance) {
      const d = IDEFS[id];
      let cnt = d.stack ? rnd(lo || 1, hi || lo || 1) : 1;
      if (id === 'gold') cnt = Math.round(cnt * tierMul(m.tier));   // mais ouro em mundos difíceis
      const it = d.tiered ? {id, tier: Math.min(MAXTIER, (lo || 1) + m.tier - 1), count: 1} : {id, count: cnt};
      names.push(itemLabel(it));
      if (!addToBag(it)) { addToGround(m.x, m.y, it); full = true; }   // mochila cheia: cai no chão
    }
  }
  log(`Você matou ${art(m.def)} ${mName(m)}.`, '#fff');
  log(`Loot d${m.def.g === 'f' ? 'a' : 'o'} ${mName(m)}: ${names.length ? names.join(', ') : 'nada'}.`, '#7ad87a');
  if (full) log('Sua mochila está cheia — parte do loot caiu no chão.', '#e88');
  autoFuse();
  gainExp(m.expV, m.x * TILE, m.y * TILE);
}

// golpe do monstro `m` no jogador
function hitPlayer(m) {
  m.lastAtk = NOW;
  const dmg = rollDmg(m.atkV, playerDef());
  const p = rpos(player);
  if (dmg <= 0) { floatText(p.x, p.y, 'errou', '#aaa'); return; }
  splat(p.x, p.y);
  floatText(p.x, p.y, '-' + dmg, '#ff5a5a');
  player.hp -= dmg;
  if (player.hp <= 0) playerDie();
  updateUI();
}

// morte do jogador: perde 10% de exp, restaura status e volta ao templo
function playerDie() {
  log('Você está morto. Perdeu 10% da experiência.', '#f55');
  player.exp = Math.floor(player.exp * 0.9);
  player.hp = player.maxhp; player.mp = player.maxmp;
  player.x = player.fx = 6; player.y = player.fy = 6; player.moveT = 0;
  target = null; pressed.length = 0;
  const el = document.getElementById('dead');
  el.style.display = 'flex';
  setTimeout(() => el.style.display = 'none', 1800);
  updateUI();
}

// Exura: magia de cura leve (gasta mana, com recarga). A cura escala com o level.
function castExura() {
  const COST = 20, CD = 1000;
  if (NOW - player.lastCast < CD) return;   // exausto: silencioso (o key-repeat não spamma)
  if (player.mp < COST) { player.lastCast = NOW; log('Mana insuficiente para Exura.', '#9aa0ff'); return; }
  player.lastCast = NOW;
  player.mp -= COST;
  const heal = Math.round((30 + player.level * 6) * (0.85 + Math.random() * 0.3));
  player.hp = Math.min(player.maxhp, player.hp + heal);
  log('Você conjura Exura e recupera ' + heal + ' de vida.', '#7ad87a');
  floatText(player.x * TILE, player.y * TILE, '+' + heal, '#5ad85a');
  fx.push({kind: 'heal', wx: player.x * TILE, wy: player.y * TILE, t0: NOW});
  updateUI();
}

// Dijkstra em raio limitado, com os custos de rota do Tibia (TFS): 10 reto, 25 diagonal.
// Dois passos retos (20) ganham de uma diagonal (25), então o monstro anda quase sempre
// reto e só corta na diagonal quando isso poupa um desvio de 3+ passos ou as rotas retas
// estão bloqueadas (o tempo real do passo diagonal continua 2x; isso é preferência de rota).
// Devolve o primeiro passo [dx,dy] do caminho mais barato até ficar adjacente (cheb<=1) ao
// alvo, ou null se não há caminho dentro do raio.
function findStep(m, tx, ty) {
  const R = m.def.aggro + 4, W = 2 * R + 1, ox = m.x - R, oy = m.y - R;   // janela quadrada de busca
  const idx = (x, y) => (y - oy) * W + (x - ox);
  const dist = new Int16Array(W * W).fill(-1);   // menor custo conhecido até cada célula
  const fstep = new Int8Array(W * W * 2);        // primeiro passo do caminho até cada célula
  const buckets = [[[m.x, m.y]]];                // fila de baldes indexada pelo custo
  dist[idx(m.x, m.y)] = 0;
  for (let c = 0; c < buckets.length; c++) {
    if (!buckets[c]) continue;
    for (const [x, y] of buckets[c]) {
      const i = idx(x, y);
      if (dist[i] !== c) continue;   // entrada obsoleta (célula já alcançada mais barato)
      if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) <= 1)
        return c === 0 ? null : [fstep[i * 2], fstep[i * 2 + 1]];
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy;
        if (nx < ox || ny < oy || nx >= ox + W || ny >= oy + W) continue;
        const diag = dx && dy;
        // como no Tibia, a diagonal vale se o destino é livre; o custo 25 (vs 10) já desfavorece
        if (!canStep(nx, ny)) continue;
        const nc = c + (diag ? 25 : 10), ni = idx(nx, ny);
        if (dist[ni] >= 0 && dist[ni] <= nc) continue;
        dist[ni] = nc;
        if (c === 0) { fstep[ni * 2] = dx; fstep[ni * 2 + 1] = dy; }
        else { fstep[ni * 2] = fstep[i * 2]; fstep[ni * 2 + 1] = fstep[i * 2 + 1]; }
        (buckets[nc] || (buckets[nc] = [])).push([nx, ny]);
      }
    }
  }
  return null;
}

// "dança" do Tibia: monstro em alcance de ataque às vezes troca de tile com um passo
// ortogonal, mantendo a mesma distância do alvo (como o getDanceStep do TFS).
function danceStep(m) {
  const d0 = cheb(m, player), cands = [];
  for (let i = 0; i < 8; i += 2) {   // só as 4 direções ortogonais
    const [dx, dy] = DIRS8[i], nx = m.x + dx, ny = m.y + dy;
    if (canStep(nx, ny) && cheb({x: nx, y: ny}, player) === d0) cands.push([nx, ny]);
  }
  if (!cands.length) return false;
  const [nx, ny] = cands[rnd(0, cands.length - 1)];
  moveEnt(m, nx, ny);
  return true;
}

// dá um passo de `m` em direção a (tx,ty); usa o pathfinding e, se não houver caminho
// no raio (ex.: alvo do outro lado do lago), cai num guloso que encosta no obstáculo.
function stepToward(m, tx, ty) {
  const s = findStep(m, tx, ty);
  if (s) { moveEnt(m, m.x + s[0], m.y + s[1]); return true; }

  const dx = Math.sign(tx - m.x), dy = Math.sign(ty - m.y);
  const opts = [];
  if (Math.abs(tx - m.x) >= Math.abs(ty - m.y)) { if (dx) opts.push([dx, 0]); if (dy) opts.push([0, dy]); }
  else { if (dy) opts.push([0, dy]); if (dx) opts.push([dx, 0]); }
  if (dx && dy) opts.push([dx, dy]);   // diagonal por último: só quando necessário
  if (!dx) opts.push([1, 0], [-1, 0]);
  if (!dy) opts.push([0, 1], [0, -1]);
  for (const [sx, sy] of opts) {
    if (canStep(m.x + sx, m.y + sy)) {
      moveEnt(m, m.x + sx, m.y + sy);
      return true;
    }
  }
  return false;
}

let lastRegen = 0, inPZ = isPZ(player.x, player.y);

// um tick da simulação: movimento do jogador, ataque, regeneração e IA dos monstros
function update() {
  // movimento do jogador (8 direções; a última tecla pressionada vence por eixo)
  if (pressed.length && NOW - player.moveT >= (player.stepMs || player.moveMs)) {
    let dx = 0, dy = 0;
    for (const code of pressed) { const vec = KEYVEC[code]; if (vec[0]) dx = vec[0]; if (vec[1]) dy = vec[1]; }
    if (dx || dy) {
      player.dir = dx ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      const go = (mx, my) => {
        if (!mx && !my) return false;
        const nx = player.x + mx, ny = player.y + my;
        if (!walkable(nx, ny) || npcAt(nx, ny) || monsterAt(nx, ny)) return false;
        moveEnt(player, nx, ny);   // diagonal permitida se o destino está livre (estilo Tibia)
        return true;
      };
      go(dx, dy) || go(dx, 0) || go(0, dy);   // diagonal bloqueada desliza por um dos eixos
    }
  }

  // aviso ao entrar/sair da zona de proteção
  const pSafe = isPZ(player.x, player.y);
  if (pSafe !== inPZ) {
    inPZ = pSafe;
    log(pSafe ? 'Você entrou em uma zona de proteção.' : 'Você saiu da zona de proteção.', '#8ac6ff');
  }

  // fecha o diálogo do NPC se o jogador se afastar
  if (npcOpen && cheb(player, npcOpen) > 2) closeNpc();

  // ataque do jogador
  if (target) {
    if (target.dead) target = null;
    else if (pSafe) { target = null; log('Ataque cancelado: você está em uma zona de proteção.', '#8ac6ff'); }
    else if (cheb(player, target) <= 1 && NOW - player.lastAtk >= 1800) {
      if (target.x > player.x) player.dir = 1; else if (target.x < player.x) player.dir = 3;
      else if (target.y > player.y) player.dir = 2; else if (target.y < player.y) player.dir = 0;
      hitMonster(target);
    }
  }

  // regeneração de HP/MP
  if (NOW - lastRegen >= 2000) {
    lastRegen = NOW;
    if (player.hp < player.maxhp || player.mp < player.maxmp) {
      player.hp = Math.min(player.maxhp, player.hp + 2 + Math.floor(player.level / 4));
      player.mp = Math.min(player.maxmp, player.mp + 3);
      updateUI();
    }
  }

  // IA dos monstros
  for (const m of monsters) {
    if (m.dead) {
      // respawn no ponto de origem quando o tile estiver livre
      if (NOW >= m.respawnAt && canStep(m.sx, m.sy)) {
        m.dead = false; m.hp = m.maxhp;
        m.x = m.fx = m.sx; m.y = m.fy = m.sy; m.moveT = 0; m.nextThink = NOW + 500;
      }
      continue;
    }
    const dist = cheb(m, player);
    if (dist <= 1 && !pSafe) {
      // adjacente: ataca e, de vez em quando, dança ao redor do alvo sem parar de atacar
      if (NOW - m.lastAtk >= m.def.atkMs) hitPlayer(m);
      if (NOW >= m.nextThink) {
        const danced = Math.random() < 0.2 && danceStep(m);
        m.nextThink = NOW + (danced ? m.stepMs : m.moveMs) + Math.random() * 120;
      }
    } else if (NOW >= m.nextThink) {
      let moved = false;
      if (dist <= m.def.aggro && !pSafe) moved = stepToward(m, player.x, player.y);   // persegue
      else if (Math.random() < 0.35) {                                                // vagueia
        const [ox, oy] = DIRS8[rnd(0, 3) * 2];   // só nas ortogonais: diagonal não é necessária
        if (canStep(m.x + ox, m.y + oy) && cheb({x: m.x + ox, y: m.y + oy}, {x: m.sx, y: m.sy}) <= 4) {
          moveEnt(m, m.x + ox, m.y + oy);
          moved = true;
        }
      }
      // passo diagonal também custa 2x para o monstro
      m.nextThink = NOW + (moved ? m.stepMs : m.moveMs) + Math.random() * 120;
    }
  }
}
