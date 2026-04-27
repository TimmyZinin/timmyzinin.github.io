// Kaş'ta Simit Koşusu — 8-bit pixel runner
// Vanilla Canvas + Web Audio. No dependencies.

(() => {
'use strict';

const W = 320, H = 180;
const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- PALETTE ----------
const C = {
  sky1: '#ffd9a8', sky2: '#ffb066', sky3: '#7ec9e8',
  sun:  '#fcd34d', sunGlow: '#fde68a',
  seaFar: '#3b82c4', seaNear: '#1e5a96', seaFoam: '#bde0f1',
  mtn1: '#6b5e7a', mtn2: '#4a4258',
  white: '#f5efdf', whiteSh: '#d9cfb8',
  ochre: '#c77b3b', ochreSh: '#8a4f22',
  roof: '#b5512f', roofSh: '#7a2f17',
  win:  '#3a5f8f', winLit: '#fce28a',
  shut: '#2a4060',
  door: '#5a3a22',
  street: '#caa97d', streetSh: '#8b6f47', streetLine: '#6b4423',
  curb: '#6b5536',
  sign: '#1d1208', signBg: '#f0d99a',
  bougain: '#d44b91', bougainDark: '#9c2f6a', leaf: '#2f7d3a', leafDark: '#1c4a22',
  shirt: '#dc2626', shirtSh: '#7f1d1d',
  pants: '#1e3a8a', pantsSh: '#0f1e4a',
  skin: '#f4c58a', skinSh: '#c9854f',
  hair: '#3b2317',
  shoe: '#1a1009',
  catFur: '#e8a86b', catFurSh: '#a86b2f', catEye: '#22c55e',
  dogFur: '#5c3a1d', dogFurSh: '#2f1c0a', dogWhite: '#f5efdf', dogNose: '#1a1009',
  simit: '#c77b3b', simitSh: '#7a3f17', simitHi: '#e9a368', sesame: '#fff5d0',
  black: '#1a1009', dark: '#2a1810',
  water: '#7ec5ec', waterDark: '#3a8fc8',
};

// ---------- SPRITE HELPER ----------
// Sprites are arrays of strings; each char maps to a color via supplied legend.
// '.' = transparent.
function drawSprite(x, y, sprite, legend, flip = false) {
  const h = sprite.length;
  for (let row = 0; row < h; row++) {
    const line = sprite[row];
    const w = line.length;
    for (let col = 0; col < w; col++) {
      const ch = line[col];
      if (ch === '.') continue;
      const color = legend[ch];
      if (!color) continue;
      const px = flip ? x + (w - 1 - col) : x + col;
      ctx.fillStyle = color;
      ctx.fillRect(px, y + row, 1, 1);
    }
  }
}

// ---------- HERO SPRITES ---------- (16x20)
const HERO_LEGEND = {
  K: C.hair, S: C.skin, s: C.skinSh,
  R: C.shirt, r: C.shirtSh,
  P: C.pants, p: C.pantsSh,
  B: C.shoe, O: C.black,
};
const HERO_RUN_1 = [
  '....KKKKKK......',
  '...KKKKKKKK.....',
  '..KKSSSSSSKK....',
  '..KSSsSSSsSK....',
  '..KSSSSSSSSK....',
  '..KsSSSSSSsK....',
  '...SSSSSSSS.....',
  '...RRRRRRRR.....',
  '..RRRRRRRRRR....',
  '.RRRRRRRRRRRR...',
  '.RRRrRRRRrRRR...',
  '.RRRRRRRRRRRR...',
  '..PPPPPPPPPP....',
  '..PPPPPPPPPP....',
  '..PPpPPPPpPP....',
  '..PPPPPPPPPP....',
  '..PP....PPPP....',
  '.BBB....PPPP....',
  'BBBB....PBBB....',
  '........BBBB....',
];
const HERO_RUN_2 = [
  '....KKKKKK......',
  '...KKKKKKKK.....',
  '..KKSSSSSSKK....',
  '..KSSsSSSsSK....',
  '..KSSSSSSSSK....',
  '..KsSSSSSSsK....',
  '...SSSSSSSS.....',
  '...RRRRRRRR.....',
  '..RRRRRRRRRR....',
  '.RRRRRRRRRRRR...',
  '.RRRrRRRRrRRR...',
  '.RRRRRRRRRRRR...',
  '..PPPPPPPPPP....',
  '..PPPPPPPPPP....',
  '..PPpPPPPpPP....',
  '...PPPPPPPP.....',
  '..PPP....PP.....',
  '..PPP....PPP....',
  '.BBBB....BBBB...',
  'BBBB.....BBBB...',
];
const HERO_JUMP = [
  '....KKKKKK......',
  '...KKKKKKKK.....',
  '..KKSSSSSSKK....',
  '..KSSsSSSsSK....',
  '..KSSSSSSSSK....',
  '..KsSSSSSSsK....',
  '...SSSSSSSS.....',
  '...RRRRRRRR.....',
  '.RRRRRRRRRRRR...',
  'RRRRRRRRRRRRRR..',
  'RRRRRRRRRRRRRR..',
  '.RRRRRRRRRRRR...',
  '..PPPPPPPPPP....',
  '..PPPPPPPPPP....',
  '..PPpPPPPpPP....',
  '..PPPPPPPPPP....',
  '..PPP....PPP....',
  '..PPP....PPP....',
  '.BBBB....BBBB...',
  '.BBB......BBB...',
];

// ---------- SIMIT (12x12) ----------
const SIMIT_LEGEND = { S: C.simit, s: C.simitSh, H: C.simitHi, e: C.sesame, '#': C.dark };
const SIMIT = [
  '...####....',
  '..#SSSS#...',
  '.#SHHHHs#..',
  '#SHe..esS#.',
  '#Se....eS#.',
  '#S......S#.',
  '#Se....eS#.',
  '#SHe..esS#.',
  '.#SHHHHs#..',
  '..#sSSS#...',
  '...####....',
];

// ---------- CAT (16x12) ----------
const CAT_LEGEND = { F: C.catFur, f: C.catFurSh, E: C.catEye, O: C.black, P: C.bougain };
const CAT_1 = [
  '............F.F.',
  '...FF......FFFF.',
  '..FFFF....FFFFFF',
  '..FFFFFFFFFFFFff',
  '.FFFFFFFFFFFFffO',
  '.FFEFffFFFFffffO',
  '.FFEFffFFFFffff.',
  '..FFFFFFffffff..',
  '..FfFFFFffffff..',
  '..FfFFFFFFFFFf..',
  '..F..FF..FF..F..',
  '..O..OO..OO..O..',
];
const CAT_2 = [
  '............F.F.',
  '...FF......FFFF.',
  '..FFFF....FFFFFF',
  '..FFFFFFFFFFFFff',
  '.FFFFFFFFFFFFffO',
  '.FFEFffFFFFffffO',
  '.FFEFffFFFFffff.',
  '..FFFFFFffffff..',
  '..FfFFFFffffff..',
  '..FfFFFFFFFFFf..',
  '..FF..F..F..FF..',
  '..OO..O..O..OO..',
];

// ---------- DOG (18x14) ----------
const DOG_LEGEND = { D: C.dogFur, d: C.dogFurSh, W: C.dogWhite, N: C.dogNose, O: C.black, T: C.bougain };
const DOG_1 = [
  '..................',
  '...DD.............',
  '..DDDD....DDDDDD..',
  '..DDDDDDDDDDDDDD..',
  '.DDDDDWWWDDDDDDDd.',
  '.DDDODDWWDDDDDDdd.',
  'DDDODDDDWDDDDDDdd.',
  'DDNNDDDDDDDDDDDDd.',
  'DDNNDWDDDDDDDDDDD.',
  '.DDDWWDDDDDDDDDD..',
  '..DDWWDD.DDDDDD...',
  '..DD..DD.DD..DD...',
  '..DD..DD.DD..DD...',
  '..OO..OO.OO..OO...',
];
const DOG_2 = [
  '..................',
  '...DD.............',
  '..DDDD....DDDDDD..',
  '..DDDDDDDDDDDDDD..',
  '.DDDDDWWWDDDDDDDd.',
  '.DDDODDWWDDDDDDdd.',
  'DDDODDDDWDDDDDDdd.',
  'DDNNDDDDDDDDDDDDd.',
  'DDNNDWDDDDDDDDDDD.',
  '.DDDWWDDDDDDDDDD..',
  '..DDWWDD.DDDDDD...',
  '..DDD..D.D..DDD...',
  '..DDD..D.D..DDD...',
  '..OOO..O.O..OOO...',
];

// ---------- SUN ----------
function drawSun(x, y, t) {
  // halo
  const r = 14 + Math.sin(t * 0.002) * 0.5;
  ctx.fillStyle = C.sunGlow;
  for (let i = -r; i <= r; i++) {
    for (let j = -r; j <= r; j++) {
      if (i*i + j*j <= r*r && i*i + j*j >= (r-3)*(r-3)) {
        ctx.fillRect(x + i, y + j, 1, 1);
      }
    }
  }
  // disc
  ctx.fillStyle = C.sun;
  const r2 = 10;
  for (let i = -r2; i <= r2; i++) {
    for (let j = -r2; j <= r2; j++) {
      if (i*i + j*j <= r2*r2) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

// ---------- HOUSE BUILDER ----------
// each house is rendered procedurally by seed
function drawHouse(x, baseY, seed) {
  const widths   = [44, 52, 38, 60, 46, 50, 42];
  const heights  = [56, 64, 48, 72, 60, 56, 50];
  const palettes = [
    {wall: C.white, sh: C.whiteSh},
    {wall: C.ochre, sh: C.ochreSh},
    {wall: '#e8d4a0', sh: '#b89766'},
    {wall: C.white, sh: C.whiteSh},
    {wall: '#e8a86b', sh: '#a06b3a'},
    {wall: C.white, sh: C.whiteSh},
    {wall: '#cfc6ad', sh: '#8a8068'},
  ];
  const w = widths[seed % widths.length];
  const h = heights[seed % heights.length];
  const p = palettes[seed % palettes.length];
  const top = baseY - h;
  // wall
  ctx.fillStyle = p.wall;
  ctx.fillRect(x, top, w, h);
  // shadow side
  ctx.fillStyle = p.sh;
  ctx.fillRect(x + w - 3, top, 3, h);
  ctx.fillRect(x, top + h - 2, w, 2);
  // roof (terracotta)
  ctx.fillStyle = C.roof;
  ctx.fillRect(x - 2, top - 5, w + 4, 5);
  ctx.fillStyle = C.roofSh;
  ctx.fillRect(x - 2, top - 1, w + 4, 1);
  // tiles pattern
  for (let i = 0; i < w + 4; i += 4) {
    ctx.fillStyle = C.roofSh;
    ctx.fillRect(x - 2 + i, top - 5, 1, 5);
  }
  // windows
  const winRows = h > 50 ? 2 : 1;
  const winCols = Math.max(1, Math.floor(w / 14));
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < winCols; c++) {
      const wx = x + 6 + c * 14;
      const wy = top + 8 + r * 22;
      if (wx + 8 > x + w - 4) continue;
      // shutter or open window
      const lit = ((seed * 7 + r * 3 + c) % 5 === 0);
      ctx.fillStyle = lit ? C.winLit : C.win;
      ctx.fillRect(wx, wy, 8, 10);
      ctx.fillStyle = C.shut;
      ctx.fillRect(wx - 1, wy - 1, 1, 12);
      ctx.fillRect(wx + 8, wy - 1, 1, 12);
      ctx.fillRect(wx - 1, wy - 1, 10, 1);
      // window cross
      ctx.fillStyle = C.dark;
      ctx.fillRect(wx + 3, wy, 1, 10);
      ctx.fillRect(wx, wy + 4, 8, 1);
    }
  }
  // door (sometimes)
  if (seed % 3 === 0) {
    const dw = 9, dh = 16;
    const dx = x + Math.floor(w / 2) - 4;
    const dy = baseY - dh;
    ctx.fillStyle = C.door;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.fillStyle = C.dark;
    ctx.fillRect(dx + dw - 2, dy + dh / 2, 1, 1);
  }
  // bougainvillea (sometimes)
  if (seed % 2 === 1) {
    for (let i = 0; i < 12; i++) {
      const bx = x + ((seed * 13 + i * 7) % w);
      const by = top + ((seed * 5 + i * 11) % 20);
      ctx.fillStyle = (i % 3 === 0) ? C.bougainDark : C.bougain;
      ctx.fillRect(bx, by, 2, 2);
    }
    ctx.fillStyle = C.leaf;
    ctx.fillRect(x + 2, top + 2, 3, 4);
    ctx.fillStyle = C.leafDark;
    ctx.fillRect(x + 3, top + 4, 1, 2);
  }
  return { x, y: top, w, h };
}

// ---------- SIGN (turkish text on a board) ----------
function drawSign(x, y, text) {
  const w = text.length * 4 + 4;
  ctx.fillStyle = C.dark;
  ctx.fillRect(x - 1, y - 1, w + 2, 9);
  ctx.fillStyle = C.signBg;
  ctx.fillRect(x, y, w, 7);
  drawTextTiny(x + 2, y + 1, text, C.sign);
}

// ---------- TINY PIXEL FONT (3x5) ----------
const FONT = {
  'A': ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  'B': ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
  'C': ['.XX', 'X..', 'X..', 'X..', '.XX'],
  'D': ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'],
  'E': ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  'F': ['XXX', 'X..', 'XX.', 'X..', 'X..'],
  'G': ['.XX', 'X..', 'X.X', 'X.X', '.XX'],
  'H': ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  'I': ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  'J': ['..X', '..X', '..X', 'X.X', '.X.'],
  'K': ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'],
  'L': ['X..', 'X..', 'X..', 'X..', 'XXX'],
  'M': ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'],
  'N': ['X.X', 'XXX', 'XXX', 'XXX', 'X.X'],
  'O': ['.X.', 'X.X', 'X.X', 'X.X', '.X.'],
  'P': ['XX.', 'X.X', 'XX.', 'X..', 'X..'],
  'Q': ['.X.', 'X.X', 'X.X', 'XXX', '.XX'],
  'R': ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
  'S': ['.XX', 'X..', '.X.', '..X', 'XX.'],
  'T': ['XXX', '.X.', '.X.', '.X.', '.X.'],
  'U': ['X.X', 'X.X', 'X.X', 'X.X', '.X.'],
  'V': ['X.X', 'X.X', 'X.X', '.X.', '.X.'],
  'W': ['X.X', 'X.X', 'XXX', 'XXX', 'X.X'],
  'X': ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
  'Y': ['X.X', 'X.X', '.X.', '.X.', '.X.'],
  'Z': ['XXX', '..X', '.X.', 'X..', 'XXX'],
  'Ç': ['.XX', 'X..', 'X..', '.XX', '.X.'],
  'Ş': ['.XX', 'X..', '.X.', '..X', 'XX.'],
  'Ğ': ['XXX', 'X..', 'X.X', 'X.X', '.XX'],
  'Ü': ['X.X', 'X.X', 'X.X', 'X.X', '.X.'],
  'Ö': ['X.X', '.X.', 'X.X', 'X.X', '.X.'],
  'İ': ['.X.', '...', 'XXX', '.X.', 'XXX'],
  'I': ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  '0': ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  '2': ['XXX', '..X', 'XXX', 'X..', 'XXX'],
  '3': ['XXX', '..X', '.XX', '..X', 'XXX'],
  '4': ['X.X', 'X.X', 'XXX', '..X', '..X'],
  '5': ['XXX', 'X..', 'XXX', '..X', 'XXX'],
  '6': ['XXX', 'X..', 'XXX', 'X.X', 'XXX'],
  '7': ['XXX', '..X', '..X', '..X', '..X'],
  '8': ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  '9': ['XXX', 'X.X', 'XXX', '..X', 'XXX'],
  ' ': ['...', '...', '...', '...', '...'],
  '!': ['.X.', '.X.', '.X.', '...', '.X.'],
  '?': ['XX.', '..X', '.X.', '...', '.X.'],
  '/': ['..X', '..X', '.X.', 'X..', 'X..'],
  '\'': ['.X.', '.X.', '...', '...', '...'],
  '.': ['...', '...', '...', '...', '.X.'],
  ',': ['...', '...', '...', '.X.', 'X..'],
  ':': ['...', '.X.', '...', '.X.', '...'],
  '-': ['...', '...', 'XXX', '...', '...'],
};
function drawTextTiny(x, y, text, color) {
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const glyph = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (glyph[r][c] === 'X') {
          ctx.fillStyle = color;
          ctx.fillRect(x + i * 4 + c, y + r, 1, 1);
        }
      }
    }
  }
}
function drawTextBig(x, y, text, color, scale = 2) {
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const glyph = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (glyph[r][c] === 'X') {
          ctx.fillStyle = color;
          ctx.fillRect(x + i * (3 * scale + scale) + c * scale, y + r * scale, scale, scale);
        }
      }
    }
  }
}
function textWidthBig(text, scale = 2) {
  return text.length * (3 * scale + scale) - scale;
}

// ---------- BACKGROUND LAYERS ----------
function drawBackground(scrollX, t) {
  // base wash so no transparent gaps between layers and houses
  ctx.fillStyle = C.seaNear;
  ctx.fillRect(0, 0, W, GROUND_Y);
  // sky gradient (top portion)
  for (let y = 0; y < 70; y++) {
    const tt = y / 70;
    const r = lerp(0xff, 0x7e, tt) | 0;
    const g = lerp(0xd9, 0xc9, tt) | 0;
    const b = lerp(0xa8, 0xe8, tt) | 0;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, W, 1);
  }
  // sun
  drawSun(W - 60, 30, t);
  // far mountains (Taurus)
  const mtnOff = (scrollX * 0.08) % 80;
  ctx.fillStyle = C.mtn1;
  for (let i = -1; i < 6; i++) {
    const bx = i * 80 - mtnOff;
    drawMountain(bx, 60, 80, 24, C.mtn1);
  }
  ctx.fillStyle = C.mtn2;
  for (let i = -1; i < 6; i++) {
    const bx = i * 110 - (scrollX * 0.12) % 110 + 30;
    drawMountain(bx, 65, 90, 18, C.mtn2);
  }
  // sea band (extends down to where rooftops begin)
  ctx.fillStyle = C.seaFar;
  ctx.fillRect(0, 70, W, 12);
  ctx.fillStyle = C.seaNear;
  ctx.fillRect(0, 82, W, GROUND_Y - 82);
  // sea sparkles (animated)
  ctx.fillStyle = C.seaFoam;
  for (let i = 0; i < 14; i++) {
    const sx = ((i * 47 + Math.floor(t * 0.03)) % (W + 40)) - 20;
    const sy = 78 + ((i * 13) % 14);
    if ((Math.floor(t * 0.005) + i) % 4 === 0) ctx.fillRect(sx, sy, 2, 1);
  }
  // sailboat
  const bx = ((scrollX * 0.05) % (W + 80)) - 40;
  drawBoat(W - bx % (W + 80), 78);
}
function drawMountain(x, baseY, w, h, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < w; i++) {
    const norm = (i / w) * 2 - 1;
    const yy = Math.floor(h * (1 - Math.abs(norm)));
    ctx.fillRect(x + i, baseY - yy, 1, yy);
  }
}
function drawBoat(x, y) {
  ctx.fillStyle = C.white;
  ctx.fillRect(x, y - 6, 1, 6);
  ctx.fillRect(x - 2, y - 5, 3, 4);
  ctx.fillStyle = C.dark;
  ctx.fillRect(x - 4, y, 10, 2);
}
function lerp(a, b, t) { return a + (b - a) * t; }

// ---------- LEVEL DATA ----------
const LEVEL_LENGTH = 2800;
const GROUND_Y = 158;

// Houses placed along the level
const HOUSES = [];
for (let x = 40, i = 0; x < LEVEL_LENGTH; i++) {
  HOUSES.push({ x, seed: i });
  const widths = [44, 52, 38, 60, 46, 50, 42];
  x += widths[i % widths.length] + 6;
}

// Signs above doors
const SIGN_TEXTS = ['FIRIN', 'KAHVE', 'MARKET', 'ECZANE', 'LOKANTA', 'BAKKAL', 'ÇAY EVI', 'OTEL', 'KEBAP', 'BALIK'];
const SIGNS = HOUSES.filter((_, i) => i % 2 === 0).map((h, idx) => ({
  x: h.x + 4, baseHouse: h, text: SIGN_TEXTS[idx % SIGN_TEXTS.length],
}));

// Simits (10 collectibles)
const SIMIT_POSITIONS = [
  { x: 220,  y: GROUND_Y - 30 },
  { x: 460,  y: GROUND_Y - 50 },
  { x: 660,  y: GROUND_Y - 28 },
  { x: 900,  y: GROUND_Y - 55 },
  { x: 1180, y: GROUND_Y - 30 },
  { x: 1430, y: GROUND_Y - 48 },
  { x: 1700, y: GROUND_Y - 32 },
  { x: 1980, y: GROUND_Y - 52 },
  { x: 2280, y: GROUND_Y - 34 },
  { x: 2580, y: GROUND_Y - 30 },
];

// Enemies
const ENEMIES = [
  { x: 360,  type: 'cat', dir: -1 },
  { x: 580,  type: 'dog', dir: -1 },
  { x: 820,  type: 'cat', dir: 1  },
  { x: 1080, type: 'cat', dir: -1 },
  { x: 1300, type: 'dog', dir: -1 },
  { x: 1580, type: 'cat', dir: 1  },
  { x: 1830, type: 'dog', dir: -1 },
  { x: 2120, type: 'cat', dir: -1 },
  { x: 2380, type: 'dog', dir: 1  },
  { x: 2660, type: 'cat', dir: -1 },
];

// ---------- AUDIO ----------
let audioCtx = null;
let musicNode = null;
let musicGain = null;
let musicTimer = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) { audioCtx = null; }
  return audioCtx;
}
function beep(freq, duration, type = 'square', volume = 0.08) {
  const ac = ensureAudio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}
function sfxJump()    { beep(440, 0.08, 'square', 0.08); setTimeout(() => beep(660, 0.06, 'square', 0.07), 50); }
function sfxPickup()  { beep(880, 0.06, 'square', 0.09); setTimeout(() => beep(1320, 0.08, 'square', 0.08), 50); }
function sfxLose()    { beep(220, 0.15, 'sawtooth', 0.1); setTimeout(() => beep(165, 0.18, 'sawtooth', 0.1), 120); setTimeout(() => beep(110, 0.3, 'sawtooth', 0.1), 280); }
function sfxWin()     {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => setTimeout(() => beep(n, 0.18, 'square', 0.1), i * 120));
}

// Tiny chiptune loop (8 notes, 200ms each = 1.6s loop)
const MUSIC_NOTES = [
  // Light Mediterranean ostinato in C major
  [262, 392], [330, 0], [262, 392], [330, 0],
  [294, 440], [349, 0], [294, 440], [262, 0],
];
let musicStep = 0;
function startMusic() {
  if (musicTimer) return;
  const ac = ensureAudio();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  const tick = () => {
    const [bass, harm] = MUSIC_NOTES[musicStep % MUSIC_NOTES.length];
    if (bass) beep(bass, 0.18, 'triangle', 0.045);
    if (harm) beep(harm, 0.16, 'square', 0.025);
    musicStep++;
  };
  musicTimer = setInterval(tick, 200);
  tick();
}
function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

// ---------- GAME STATE ----------
const STATE = { INTRO: 0, PLAY: 1, WIN: 2, LOSE: 3 };
let state = STATE.INTRO;

const player = {
  x: 60, y: GROUND_Y - 20,
  vy: 0,
  onGround: true,
  animTime: 0,
};
let scrollX = 0;
let collected = 0;
let timeAlive = 0;
let stateTime = 0;
let simits = SIMIT_POSITIONS.map(p => ({ ...p, taken: false, bobPhase: Math.random() * Math.PI * 2 }));
let enemies = ENEMIES.map(e => ({ ...e, baseX: e.x, animTime: 0 }));
let loseReason = '';

function resetGame() {
  scrollX = 0;
  collected = 0;
  timeAlive = 0;
  stateTime = 0;
  player.x = 60;
  player.y = GROUND_Y - 20;
  player.vy = 0;
  player.onGround = true;
  player.animTime = 0;
  simits = SIMIT_POSITIONS.map(p => ({ ...p, taken: false, bobPhase: Math.random() * Math.PI * 2 }));
  enemies = ENEMIES.map(e => ({ ...e, baseX: e.x, animTime: 0 }));
}

// ---------- INPUT ----------
function attemptJump() {
  if (state === STATE.INTRO) {
    state = STATE.PLAY;
    stateTime = 0;
    startMusic();
    return;
  }
  if (state === STATE.WIN || state === STATE.LOSE) {
    if (stateTime > 60) {
      resetGame();
      state = STATE.INTRO;
      stopMusic();
    }
    return;
  }
  if (player.onGround) {
    player.vy = -3.6;
    player.onGround = false;
    sfxJump();
  }
}
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    attemptJump();
  }
  if (e.code === 'KeyR' && (state === STATE.WIN || state === STATE.LOSE)) {
    resetGame();
    state = STATE.INTRO;
    stopMusic();
  }
});
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  attemptJump();
});

// ---------- COLLISION ----------
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------- UPDATE ----------
function update(dt) {
  stateTime += dt;
  if (state !== STATE.PLAY) return;

  timeAlive += dt;
  // Auto-run: world scrolls
  const speed = 1.4;
  scrollX += speed;
  if (scrollX > LEVEL_LENGTH - W) scrollX = LEVEL_LENGTH - W;

  // Player physics
  player.vy += 0.2;
  player.y += player.vy;
  if (player.y >= GROUND_Y - 20) {
    player.y = GROUND_Y - 20;
    player.vy = 0;
    player.onGround = true;
  }
  player.animTime += dt;

  // Enemies wander a bit
  enemies.forEach(e => {
    e.animTime += dt;
    e.x = e.baseX + Math.sin(e.animTime * 0.04) * 18 * (e.dir);
  });

  const playerWorldX = scrollX + player.x;
  const playerRect = { x: playerWorldX + 2, y: player.y + 2, w: 12, h: 18 };

  // Simit pickup
  simits.forEach(s => {
    if (s.taken) return;
    s.bobPhase += 0.05;
    const sRect = { x: s.x, y: s.y + Math.sin(s.bobPhase) * 2, w: 11, h: 11 };
    if (rectsOverlap(playerRect, sRect)) {
      s.taken = true;
      collected++;
      sfxPickup();
      if (collected >= 10) {
        state = STATE.WIN;
        stateTime = 0;
        sfxWin();
        stopMusic();
      }
    }
  });

  // Enemy collision
  for (const e of enemies) {
    const w = e.type === 'cat' ? 16 : 18;
    const h = e.type === 'cat' ? 12 : 14;
    const eRect = { x: e.x, y: GROUND_Y - h, w, h };
    if (rectsOverlap(playerRect, eRect)) {
      state = STATE.LOSE;
      stateTime = 0;
      loseReason = e.type === 'cat' ? 'KEDI SIMITINI YEDI!' : 'KÖPEK SIMITINI YEDI!';
      sfxLose();
      stopMusic();
      break;
    }
  }
}

// ---------- RENDER ----------
function render(t) {
  // bg
  drawBackground(scrollX, t);

  // Houses + signs
  HOUSES.forEach(h => {
    const screenX = h.x - scrollX;
    if (screenX > -80 && screenX < W + 10) {
      const meta = drawHouse(screenX, GROUND_Y, h.seed);
    }
  });
  SIGNS.forEach(s => {
    const screenX = s.x - scrollX;
    if (screenX > -50 && screenX < W + 10) {
      drawSign(screenX, GROUND_Y - 18, s.text);
    }
  });

  // Street
  ctx.fillStyle = C.street;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = C.streetSh;
  ctx.fillRect(0, GROUND_Y, W, 2);
  // cobblestone pattern
  for (let i = 0; i < W + 8; i += 8) {
    const px = i - (scrollX % 8);
    ctx.fillStyle = C.streetLine;
    ctx.fillRect(px, GROUND_Y + 4, 1, 1);
    ctx.fillRect(px + 4, GROUND_Y + 8, 1, 1);
    ctx.fillRect(px, GROUND_Y + 12, 1, 1);
    ctx.fillRect(px + 4, GROUND_Y + 16, 1, 1);
  }
  // curb
  ctx.fillStyle = C.curb;
  ctx.fillRect(0, GROUND_Y - 1, W, 1);

  // Simits
  simits.forEach(s => {
    if (s.taken) return;
    const screenX = s.x - scrollX;
    if (screenX > -20 && screenX < W + 10) {
      const offsetY = Math.sin(s.bobPhase) * 2;
      drawSprite(screenX, s.y + offsetY, SIMIT, SIMIT_LEGEND);
    }
  });

  // Enemies
  enemies.forEach(e => {
    const screenX = e.x - scrollX;
    if (screenX > -20 && screenX < W + 10) {
      const frame = Math.floor(e.animTime * 0.15) % 2;
      if (e.type === 'cat') {
        drawSprite(screenX, GROUND_Y - 12, frame ? CAT_2 : CAT_1, CAT_LEGEND, e.dir < 0);
      } else {
        drawSprite(screenX, GROUND_Y - 14, frame ? DOG_2 : DOG_1, DOG_LEGEND, e.dir < 0);
      }
    }
  });

  // Player
  let sprite;
  if (!player.onGround) sprite = HERO_JUMP;
  else sprite = (Math.floor(player.animTime * 0.18) % 2 === 0) ? HERO_RUN_1 : HERO_RUN_2;
  drawSprite(player.x, player.y, sprite, HERO_LEGEND);

  // HUD: simit counter
  if (state === STATE.PLAY || state === STATE.WIN) {
    ctx.fillStyle = 'rgba(26, 16, 9, 0.7)';
    ctx.fillRect(4, 4, 76, 14);
    drawSprite(7, 6, SIMIT, SIMIT_LEGEND);
    drawTextTiny(22, 9, `${collected} / 10`, C.sun);
  }

  // Overlays
  if (state === STATE.INTRO) renderIntro(t);
  if (state === STATE.WIN) renderWin(t);
  if (state === STATE.LOSE) renderLose(t);
}

// ---------- INTRO ----------
function renderIntro(t) {
  ctx.fillStyle = 'rgba(26, 16, 9, 0.78)';
  ctx.fillRect(0, 0, W, H);

  // Title with bounce
  const bounce = Math.sin(t * 0.004) * 1.5;
  const title1 = "KAŞ'TA";
  const title2 = 'SIMIT KOŞUSU';
  const w1 = textWidthBig(title1, 2);
  const w2 = textWidthBig(title2, 2);
  drawTextBig((W - w1) / 2, 28 + bounce, title1, C.sun, 2);
  drawTextBig((W - w2) / 2, 50 + bounce, title2, C.simit, 2);

  // Decorative simit
  drawSprite(W / 2 - 6, 78, SIMIT, SIMIT_LEGEND);

  // Description in Turkish
  const lines = [
    '10 SIMIT TOPLA!',
    'KEDI VE KÖPEKLERDEN KAÇ.',
    '',
    'SPACE / DOKUN: ZIPLA',
  ];
  lines.forEach((line, i) => {
    const w = line.length * 4;
    drawTextTiny((W - w) / 2, 100 + i * 8, line, C.white);
  });

  // Press to start (blinking)
  if (Math.floor(t * 0.005) % 2 === 0) {
    const start = '> BAŞLAMAK IÇIN BASIN <';
    const w = start.length * 4;
    drawTextTiny((W - w) / 2, 158, start, C.sun);
  }
}

// ---------- WIN ----------
function renderWin(t) {
  ctx.fillStyle = 'rgba(26, 16, 9, 0.82)';
  ctx.fillRect(0, 0, W, H);

  const title = 'OYUNU KAZANDIN!';
  const w = textWidthBig(title, 2);
  drawTextBig((W - w) / 2, 40, title, C.sun, 2);

  const sub = 'AFERIN SANA!';
  const ws = textWidthBig(sub, 2);
  drawTextBig((W - ws) / 2, 64, sub, C.simit, 2);

  // celebration simits
  for (let i = 0; i < 10; i++) {
    const px = 30 + i * 26;
    const py = 95 + Math.sin(t * 0.005 + i) * 4;
    drawSprite(px, py, SIMIT, SIMIT_LEGEND);
  }

  drawTextTiny((W - 'KAŞ MANZARASI: 10/10'.length * 4) / 2, 130, 'KAŞ MANZARASI: 10/10', C.white);

  if (stateTime > 60 && Math.floor(t * 0.005) % 2 === 0) {
    const replay = '> TEKRAR OYNA <';
    drawTextTiny((W - replay.length * 4) / 2, 158, replay, C.sun);
  }
}

// ---------- LOSE ----------
function renderLose(t) {
  ctx.fillStyle = 'rgba(26, 16, 9, 0.82)';
  ctx.fillRect(0, 0, W, H);

  const title = 'OYUN BITTI';
  const w = textWidthBig(title, 2);
  drawTextBig((W - w) / 2, 40, title, '#ef4444', 2);

  const reason = loseReason;
  const wr = reason.length * 4;
  drawTextTiny((W - wr) / 2, 70, reason, C.white);

  drawTextTiny((W - 'TOPLADIĞIN: '.length * 4 - 12) / 2, 90, `TOPLADIĞIN: ${collected}/10`, C.sun);

  // sad simit
  drawSprite(W / 2 - 6, 105, SIMIT, SIMIT_LEGEND);

  if (stateTime > 60 && Math.floor(t * 0.005) % 2 === 0) {
    const replay = '> TEKRAR DENE <';
    drawTextTiny((W - replay.length * 4) / 2, 158, replay, C.sun);
  }
}

// ---------- LOOP ----------
let lastT = 0;
function frame(t) {
  const dt = Math.min(32, t - lastT);
  lastT = t;
  update(dt);
  render(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

})();
