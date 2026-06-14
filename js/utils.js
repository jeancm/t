'use strict';
// ===================================================================== utilidades

// Constantes do mundo, em tiles e pixels.
const TILE = 32;          // lado de um tile, em pixels
const VW = 15, VH = 11;   // viewport, em tiles (largura x altura)
const MW = 40, MH = 30;   // mapa, em tiles (largura x altura)

const cv = document.getElementById('cv');   // canvas do jogo
const g = cv.getContext('2d');               // contexto 2D de desenho
g.imageSmoothingEnabled = false;             // mantém o visual pixelado

let NOW = performance.now();   // timestamp (ms) do frame atual, atualizado no loop

// limita `value` ao intervalo [lo, hi]
const clamp = (value, lo, hi) => value < lo ? lo : value > hi ? hi : value;

// distância de Chebyshev (movimento de rei) entre dois pontos {x, y}
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// inteiro aleatório no intervalo [min, max], inclusivo nas pontas
const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// PRNG determinístico a partir de uma seed — gera o mapa de forma estável/repetível
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// mostra erros de runtime no log da tela (quando o log já existe)
window.addEventListener('error', e => {
  try { log('[erro] ' + e.message, '#f66'); } catch (_) {}
});
