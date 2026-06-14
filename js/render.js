'use strict';
// ===================================================================== desenho

// sprite do terreno em (x,y); grama tem 2 variações e a água anima com o tempo
function tileSprite(x, y) {
  switch (map[y][x]) {
    case '.': return (x * 7 + y * 13) % 5 === 0 ? S.grass2 : S.grass1;
    case ',': return S.dirt;
    case 's': return S.stone;
    case 'w': return S.wall;
    case 'T': return S.tree;
    case 'R': return S.rock;
    case '~': return (Math.floor(NOW / 600) + x + y) % 2 ? S.water1 : S.water2;
  }
  return S.grass1;
}

// desenha a barra de vida + nome acima de uma criatura (cor conforme o % de HP)
function drawBarName(px, py, name, pct) {
  const color = pct > 0.6 ? '#4ad14a' : pct > 0.3 ? '#e6c84a' : '#d14a4a';
  g.fillStyle = '#111'; g.fillRect(px + 2, py - 6, 28, 5);
  g.fillStyle = color;  g.fillRect(px + 3, py - 5, Math.max(0, Math.round(26 * pct)), 3);
  g.font = 'bold 9px Verdana'; g.textAlign = 'center';
  g.strokeStyle = '#000'; g.lineWidth = 2.5; g.lineJoin = 'round';
  g.strokeText(name, px + 16, py - 9);
  g.fillStyle = color; g.fillText(name, px + 16, py - 9);
}

// desenha um frame inteiro: terreno, itens, alvo, efeitos e criaturas
function draw() {
  g.fillStyle = '#000';
  g.fillRect(0, 0, cv.width, cv.height);   // limpa o frame (fundo preto além do mapa)

  // câmera sempre centrada no jogador (sem prender às bordas: além do mapa fica preto).
  // arredonda para o pixel inteiro: evita costura sub-pixel (listras) entre os tiles.
  const pp = rpos(player);
  camX = Math.round(pp.x - 7 * TILE);
  camY = Math.round(pp.y - 5 * TILE);

  // só desenha os tiles visíveis (culling pela viewport)
  const x0 = clamp(Math.floor(camX / TILE), 0, MW - 1), x1 = clamp(Math.ceil((camX + cv.width) / TILE), 0, MW);
  const y0 = clamp(Math.floor(camY / TILE), 0, MH - 1), y1 = clamp(Math.ceil((camY + cv.height) / TILE), 0, MH);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++)
      g.drawImage(tileSprite(x, y), x * TILE - camX, y * TILE - camY);

  // itens no chão (apenas o item do topo de cada pilha)
  for (const [k, a] of groundItems) {
    if (!a.length) continue;
    const [xs, ys] = k.split(','); const x = +xs, y = +ys;
    if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
    const it = a[a.length - 1];
    g.drawImage(ISPR[sprKey(it)], x * TILE - camX, y * TILE - camY);
    if (it.count > 1) {
      g.font = 'bold 9px Verdana'; g.textAlign = 'right';
      g.strokeStyle = '#000'; g.lineWidth = 2;
      g.strokeText(it.count, x * TILE - camX + 30, y * TILE - camY + 30);
      g.fillStyle = '#fff'; g.fillText(it.count, x * TILE - camX + 30, y * TILE - camY + 30);
    }
  }

  // marcação do alvo
  if (target && !target.dead) {
    const tp = rpos(target);
    g.strokeStyle = '#d33030'; g.lineWidth = 2;
    g.strokeRect(tp.x - camX + 1.5, tp.y - camY + 1.5, 29, 29);
  }

  // respingos de sangue (somem em 500ms)
  for (const f of fx) {
    if (f.kind !== 'splat') continue;
    const t = (NOW - f.t0) / 500;
    if (t >= 1) continue;
    g.globalAlpha = 0.55 * (1 - t);
    g.fillStyle = '#a01010';
    g.beginPath(); g.arc(f.wx - camX + 16, f.wy - camY + 18, 9 - 3 * t, 0, 7); g.fill();
    g.globalAlpha = 1;
  }

  // efeito da cura (Exura): anel verde que cresce e some
  for (const f of fx) {
    if (f.kind !== 'heal') continue;
    const t = (NOW - f.t0) / 500;
    if (t >= 1) continue;
    g.globalAlpha = 0.7 * (1 - t);
    g.strokeStyle = '#7ef07e'; g.lineWidth = 2;
    g.beginPath(); g.arc(f.wx - camX + 16, f.wy - camY + 16, 4 + 16 * t, 0, 7); g.stroke();
    g.globalAlpha = 1;
  }

  // efeito da Exori: anel laranja que se expande pelas casas ao redor
  for (const f of fx) {
    if (f.kind !== 'exori') continue;
    const t = (NOW - f.t0) / 500;
    if (t >= 1) continue;
    g.globalAlpha = 0.6 * (1 - t);
    g.strokeStyle = '#ff7a3a'; g.lineWidth = 3;
    g.beginPath(); g.arc(f.wx - camX + 16, f.wy - camY + 16, 8 + 38 * t, 0, 7); g.stroke();
    g.globalAlpha = 1;
  }

  // criaturas, ordenadas por Y para o mais "ao sul" aparecer na frente
  const ents = [player, ...npcs, ...monsters.filter(m => !m.dead)];
  ents.sort((a, b) => rpos(a).y - rpos(b).y);
  for (const e of ents) {
    const p = rpos(e);
    const px = p.x - camX, py = p.y - camY;
    if (px < -TILE || py < -TILE || px > cv.width || py > cv.height) continue;
    if (e === player) {
      g.drawImage(S.player[player.dir], px, py);
      drawBarName(px, py, 'Você', player.hp / player.maxhp);
    } else if (e.label) {   // NPC: desenha o sprite e o nome do papel
      g.drawImage(e.id === 'smith' ? S.npc : S.oracle, px, py);
      g.font = 'bold 9px Verdana'; g.textAlign = 'center';
      g.strokeStyle = '#000'; g.lineWidth = 2.5; g.lineJoin = 'round';
      g.strokeText(e.label, px + 16, py - 4);
      g.fillStyle = e.id === 'smith' ? '#7ad8d8' : '#d8a4ff'; g.fillText(e.label, px + 16, py - 4);
    } else {                // monstro
      g.drawImage(MSPR[e.type], px, py);
      drawBarName(px, py, mName(e), e.hp / e.maxhp);
    }
  }

  // textos flutuantes de dano/xp (sobem e desaparecem); também expira os efeitos
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    const dur = f.kind === 'text' ? 950 : 500;   // texto sobe por 950ms; splat e heal somem em 500ms
    const t = (NOW - f.t0) / dur;
    if (t >= 1) { fx.splice(i, 1); continue; }
    if (f.kind !== 'text') continue;
    g.globalAlpha = 1 - t * t;
    g.font = 'bold 11px Verdana'; g.textAlign = 'center';
    g.strokeStyle = '#000'; g.lineWidth = 2.5; g.lineJoin = 'round';
    g.strokeText(f.txt, f.wx - camX + 16, f.wy - camY - 2 - 16 * t);
    g.fillStyle = f.color; g.fillText(f.txt, f.wx - camX + 16, f.wy - camY - 2 - 16 * t);
    g.globalAlpha = 1;
  }

  // indicador de zona de proteção (canto superior esquerdo)
  if (isPZ(player.x, player.y)) {
    g.globalAlpha = 0.78;
    g.fillStyle = '#102030'; g.fillRect(5, 5, 132, 16);
    g.strokeStyle = '#5a8ac6'; g.lineWidth = 1; g.strokeRect(5.5, 5.5, 131, 15);
    g.globalAlpha = 1;
    g.font = 'bold 9px Verdana'; g.textAlign = 'left';
    g.fillStyle = '#8ac6ff'; g.fillText('ZONA DE PROTEÇÃO', 12, 16);
  }
}
