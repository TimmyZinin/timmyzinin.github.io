// Hero illustration for the landing page — static pixel scene of a young
// person walking through Kaş with a friendly dog at sunset.
// Self-contained: own sprites + draw functions, renders once on load.

(() => {
'use strict';

const cv = document.getElementById('hero-art');
if (!cv) return;
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = cv.width;   // 640
const H = cv.height;  // 320

// ---------- PALETTE (sunset Kaş) ----------
const C = {
  sun: '#ff7d3a', sunGlow: '#ffae5a', sunRay: '#ffd58a', sunCore: '#fff0c4',
  cloud: '#ff9870', cloudSh: '#c45f6a',
  seaWave: '#c4567a', seaFoam: '#ffd0a8',
  cypress: '#1e3d28', cypressTrunk: '#3a2818',
  // theater
  stoneL: '#d9c8a0', stoneM: '#b89d6c', stoneD: '#7a6244', stoneS: '#4a3a26',
  hill: '#3e2a4e',
  // houses
  white: '#e8c8a4', whiteSh: '#a8845a', whiteHi: '#fce0b0',
  ochre: '#c4683a', ochreSh: '#7a3a1f', ochreHi: '#e88858',
  blue: '#9b6f9c', blueSh: '#5a3e6a',
  roof: '#8e3520', roofSh: '#4f1a10', roofHi: '#c4563a',
  win: '#1e1430', winLit: '#ffc870', winFrame: '#a88458',
  shut: '#1a1028', shutOpen: '#5a4a30',
  doorBlue: '#3a5a8a', doorGreen: '#3e6b3a', doorRed: '#8a3a3a', doorFrame: '#f5efdf', doorKnob: '#fcd34d',
  street: '#caa97d', streetSh: '#8b6f47', cobble: '#a88860',
  bougain: '#d44b91', bougainDark: '#9c2f6a', bougainHi: '#ed7fb8',
  leaf: '#2f7d3a', leafDark: '#1c4a22',
  // hero
  hair: '#3b2317', hairHi: '#5e3a26',
  skin: '#f4c58a', skinSh: '#c9854f', skinHi: '#ffe5c0',
  shirt: '#dc2626', shirtSh: '#8e1010',
  pants: '#1e3a8a', pantsSh: '#0e1e5a',
  shoe: '#1a1009',
  scarf: '#9c2f6a',
  // friendly dog (golden retriever-ish)
  dogFur: '#d4a060', dogFurSh: '#9c6a30', dogFurHi: '#e8c478',
  dogWhite: '#f5efdf', dogNose: '#1a1009', dogTongue: '#d44b6f',
  // simit
  simit: '#c77b3b', simitSh: '#7a3f17', simitHi: '#e9a368', sesame: '#fff5d0',
  black: '#1a1009', dark: '#2a1810',
  bird: '#1d1208',
  garland: '#f5efdf', garlandBulb: ['#fcd34d', '#ef4444', '#3a8fc8', '#5fa850'],
  pot: '#a55432', potSh: '#6e3320',
  catFur: '#e8a86b', catEye: '#22c55e',
};

// ---------- SPRITE HELPER ----------
function drawSprite(x, y, sprite, legend, scale = 1, flip = false) {
  const h = sprite.length;
  for (let row = 0; row < h; row++) {
    const line = sprite[row];
    const w = line.length;
    for (let col = 0; col < w; col++) {
      const ch = line[col];
      if (ch === '.') continue;
      const color = legend[ch];
      if (!color) continue;
      const px = flip ? x + (w - 1 - col) * scale : x + col * scale;
      ctx.fillStyle = color;
      ctx.fillRect(px, y + row * scale, scale, scale);
    }
  }
}

// ---------- HERO (young person walking, side view, scaled big) ----------
const HERO_LEGEND = {
  K: C.hair, k: C.hairHi, S: C.skin, s: C.skinSh, H: C.skinHi,
  R: C.shirt, r: C.shirtSh, P: C.pants, p: C.pantsSh,
  B: C.shoe, X: C.scarf, O: C.black,
};
// Mid-stride walking pose (right leg forward, arm holding leash)
const HERO_WALK = [
  '....KkKKKK....',
  '...KKKKKKKK...',
  '..KSSSSSSSSK..',
  '..KSHSSSSSSK..',
  '..KSSSsSSSSK..',
  '..KSSSSSSSSK..',
  '..KkSOSSSOsK..',
  '...SSSSSSSSk..',
  '...SXXXXXXX...',
  '..RRRhRRRR....',
  '.RRRRRRRRRRR..',  // arm reaches forward (leash hand)
  '.RRRrRRRRRRR..',
  '.RRRRRRRRRRR..',
  '..PPPPPPPPP...',
  '..PPpPPPpPP...',
  '..PPPPPPPPP...',
  '..PP....PPP...',
  '..PP....PPP...',
  '.BBB....PPP...',
  'BBBB....BBBB..',
];
// Replace lowercase 'h' (was shirtHi marker) — define
HERO_LEGEND.h = '#ff5050';

// ---------- FRIENDLY DOG (golden retriever, walking beside hero) ----------
const DOG_LEGEND = {
  D: C.dogFur, d: C.dogFurSh, H: C.dogFurHi, W: C.dogWhite, N: C.dogNose, T: C.dogTongue, O: C.black,
};
// Cheerful dog walking right, tail UP and slightly wagging
const DOG_WALK = [
  '....................',
  '...............dD...',
  '..D...........DDDDD.',
  '.DDD.....DDDDDDDDDDD',
  'DDDD...DDDHDDDDDDDDD',
  'DDdD..DDDdDHHHDDDDDD',
  'DDdDDDDDdDdHHHDDDDDD',
  '.DDDDDOWWDDdHHDDDDD.',
  '..NDDDDWWDDDDdDDDDD.',
  '..NTDDDDDDDDDDDDDDd.',
  '..NDDDWWDDDDDDDDDDd.',
  '..DDDDWDD.DDDD.DDDd.',
  '...DDDDDD.DDDD.DDD..',
  '...DD..DD.DD..DDD...',
  '...DD..DD.DD..DDD...',
  '...OO..OO.OO..OOO...',
];

// ---------- SIMIT ----------
const SIMIT_LEGEND = { S: C.simit, s: C.simitSh, H: C.simitHi, e: C.sesame, '#': C.dark };
const SIMIT = [
  '....####.....',
  '..##SSSS##...',
  '.#SHHHHHHs#..',
  '#SH.eeee.SS#.',
  '#SH......sS#.',
  '#SH......sS#.',
  '#SH......sS#.',
  '#SH.eeee.sS#.',
  '.#SHsHsHsS#..',
  '..##SSSS##...',
  '....####.....',
];

// ---------- BIRD ----------
const BIRD_LEGEND = { B: C.bird };
const BIRD = ['B...B', '.BBB.', '..B..'];

// ---------- DRAWING ROUTINES ----------
function drawSky() {
  // 5-stop sunset gradient covering full canvas height
  const stops = [
    [0,    0xfc, 0xc8, 0x8a],
    [60,   0xf4, 0x8a, 0x5a],
    [120,  0xe8, 0x5a, 0x7c],
    [180,  0x9b, 0x5f, 0xb5],
    [220,  0x5a, 0x40, 0x80],
    [240,  0x3a, 0x28, 0x58],
  ];
  for (let y = 0; y < 240; y++) {
    let r=0,g=0,b=0;
    for (let i = 0; i < stops.length - 1; i++) {
      if (y >= stops[i][0] && y <= stops[i+1][0]) {
        const tt = (y - stops[i][0]) / (stops[i+1][0] - stops[i][0]);
        r = lerp(stops[i][1], stops[i+1][1], tt) | 0;
        g = lerp(stops[i][2], stops[i+1][2], tt) | 0;
        b = lerp(stops[i][3], stops[i+1][3], tt) | 0;
        break;
      }
    }
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, W, 1);
  }
  // Sea/horizon below 240
  ctx.fillStyle = '#3a2858';
  ctx.fillRect(0, 240, W, H - 240);
}
function lerp(a, b, t) { return a + (b - a) * t; }

function drawSun(x, y) {
  // outer glow
  for (let r = 56; r > 28; r--) {
    const alpha = (1 - r/56) * 0.45;
    ctx.fillStyle = `rgba(255, 174, 90, ${alpha})`;
    for (let ang = 0; ang < Math.PI * 2; ang += 0.04) {
      const px = Math.round(x + Math.cos(ang) * r);
      const py = Math.round(y + Math.sin(ang) * r);
      ctx.fillRect(px, py, 1, 1);
    }
  }
  // long rays
  ctx.fillStyle = C.sunRay;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const len = 50 + (i % 3) * 8;
    for (let r = 32; r < 32 + len; r += 2) {
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
    }
  }
  // halo
  ctx.fillStyle = C.sunGlow;
  for (let i = -28; i <= 28; i++) {
    for (let j = -28; j <= 28; j++) {
      const d2 = i*i + j*j;
      if (d2 <= 28*28 && d2 >= 26*26) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  // disc
  ctx.fillStyle = C.sun;
  for (let i = -24; i <= 24; i++) {
    for (let j = -24; j <= 24; j++) {
      if (i*i + j*j <= 24*24) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  // bright core
  ctx.fillStyle = C.sunGlow;
  for (let i = -14; i <= 14; i++) {
    for (let j = -14; j <= 14; j++) {
      if (i*i + j*j <= 14*14) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  ctx.fillStyle = C.sunCore;
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      if (i*i + j*j <= 6*6) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

function drawMountains() {
  // far range
  ctx.fillStyle = '#3e2a5a';
  for (let i = 0; i < W; i++) {
    const h = 28 + Math.sin(i * 0.06) * 14 + Math.sin(i * 0.13) * 6;
    ctx.fillRect(i, 230 - h, 1, h);
  }
  // highlight rim
  ctx.fillStyle = '#5a3e7a';
  for (let i = 0; i < W; i++) {
    const h = 28 + Math.sin(i * 0.06) * 14 + Math.sin(i * 0.13) * 6;
    ctx.fillRect(i, 230 - h, 1, 1);
  }
  // mid range
  ctx.fillStyle = '#22153e';
  for (let i = 0; i < W; i++) {
    const h = 18 + Math.sin(i * 0.04 + 1) * 10 + Math.sin(i * 0.11 + 0.5) * 4;
    ctx.fillRect(i, 232 - h, 1, h);
  }
}

function drawSeaTrail(sunX, sunY) {
  // golden reflection on water
  for (let y = 240; y < H - 30; y++) {
    const widen = (y - 240) * 1.3;
    const w = Math.max(8, Math.round(20 + widen));
    const a = Math.max(0, 1 - (y - 240) / 80);
    if (a > 0.05) {
      ctx.fillStyle = `rgba(255, 174, 90, ${a * 0.6})`;
      ctx.fillRect(sunX - w / 2, y, w, 1);
      if (y % 4 === 0) {
        ctx.fillStyle = C.sunRay;
        ctx.fillRect(sunX - 2, y, 4, 1);
      }
    }
  }
  // gentle waves
  ctx.fillStyle = C.seaWave;
  for (let y = 244; y < H - 30; y += 7) {
    for (let x = 0; x < W; x += 14) {
      const phase = (x * 0.05 + y * 0.3) % (Math.PI * 2);
      const off = Math.floor(Math.sin(phase) * 3);
      ctx.fillRect(x + off, y, 6, 1);
    }
  }
  // foam sparkles near sun
  for (let i = 0; i < 25; i++) {
    const sx = (i * 51) % W;
    const sy = 244 + (i * 7) % 26;
    const distFromSun = Math.abs(sx - sunX);
    if (distFromSun < 80) {
      ctx.fillStyle = C.sunRay;
      ctx.fillRect(sx, sy, 2, 1);
    } else {
      ctx.fillStyle = C.seaFoam;
      ctx.fillRect(sx, sy, 1, 1);
    }
  }
}

function drawClouds() {
  const blob = (cx, cy, r, color) => {
    ctx.fillStyle = color;
    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) {
        if (i*i + j*j <= r*r) ctx.fillRect(cx + i, cy + j, 1, 1);
      }
    }
  };
  // a few sunset-lit clouds
  const clouds = [
    { x: 80, y: 50 }, { x: 200, y: 36 }, { x: 380, y: 60 }, { x: 500, y: 42 },
  ];
  clouds.forEach(c => {
    blob(c.x, c.y, 8, C.cloud);
    blob(c.x + 12, c.y - 4, 10, C.cloud);
    blob(c.x + 24, c.y, 9, C.cloud);
    blob(c.x + 14, c.y + 4, 8, C.cloudSh);
  });
}

function drawBirds() {
  ctx.fillStyle = C.bird;
  const positions = [
    [120, 80], [180, 65], [240, 90], [400, 70], [460, 85], [550, 60],
  ];
  positions.forEach(([x, y]) => {
    drawSprite(x, y, BIRD, BIRD_LEGEND, 2);
  });
}

// ---------- ANTIK TIYATRO (big version) ----------
function drawTheater(x, baseY) {
  const cx = x + 100;
  // Hill behind
  ctx.fillStyle = '#3a2818';
  for (let i = -16; i < 216; i++) {
    const norm = (i - 100) / 110;
    const hgt = Math.round(70 * Math.max(0, 1 - norm * norm * 0.85));
    if (hgt > 0) ctx.fillRect(x + i, baseY - hgt - 4, 1, hgt + 4);
  }
  ctx.fillStyle = '#5a3e2a';
  for (let i = -16; i < 216; i++) {
    const norm = (i - 100) / 110;
    const hgt = Math.round(70 * Math.max(0, 1 - norm * norm * 0.85));
    if (hgt > 0) ctx.fillRect(x + i, baseY - hgt - 4, 1, 1);
  }
  // Stone seating shape (trapezoidal with rounded corners)
  const tierTopY = baseY - 56;
  const tierBotY = baseY - 14;
  const widthFn = (y) => {
    const t = (y - tierTopY) / (tierBotY - tierTopY);
    return Math.round(60 + t * 110); // 60→170
  };
  for (let y = tierTopY; y <= tierBotY; y++) {
    const w = widthFn(y);
    ctx.fillStyle = C.stoneM;
    ctx.fillRect(cx - Math.floor(w / 2), y, w, 1);
  }
  // round upper corners
  for (let y = tierTopY; y < tierTopY + 12; y++) {
    const t = (y - tierTopY) / 12;
    const cut = Math.round((1 - t) * 12);
    const w = widthFn(y);
    const left = cx - Math.floor(w / 2);
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(left, y, cut, 1);
    ctx.fillRect(left + w - cut, y, cut, 1);
  }
  // tier shadow & highlight lines (8 tiers visible)
  for (let i = 1; i <= 7; i++) {
    const ty = tierTopY + i * 5;
    const w = widthFn(ty);
    ctx.fillStyle = C.stoneS;
    ctx.fillRect(cx - Math.floor(w / 2) + 2, ty, w - 4, 1);
    ctx.fillStyle = C.stoneL;
    ctx.fillRect(cx - Math.floor(w / 2) + 3, ty - 1, w - 6, 1);
  }
  // crown highlight
  ctx.fillStyle = C.stoneL;
  const wt = widthFn(tierTopY + 1);
  ctx.fillRect(cx - Math.floor(wt / 2) + 2, tierTopY + 1, wt - 4, 1);
  // Vertical kerkides (radial aisles)
  ctx.fillStyle = C.stoneS;
  for (let k = -3; k <= 3; k++) {
    if (k === 0) continue;
    const a = (k / 3.5) * 1.0;
    for (let r = 14; r < 96; r++) {
      const px = Math.round(cx + Math.sin(a) * r);
      const py = Math.round(baseY - 14 - Math.cos(a) * r * 0.5);
      if (py >= tierTopY && py <= tierBotY) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
  // Stage platform
  ctx.fillStyle = C.stoneL;
  ctx.fillRect(cx - 32, baseY - 10, 64, 6);
  ctx.fillStyle = C.stoneM;
  ctx.fillRect(cx - 32, baseY - 4, 64, 2);
  ctx.fillStyle = C.stoneS;
  ctx.fillRect(cx - 32, baseY - 2, 64, 2);
  for (let i = 0; i < 64; i += 6) {
    ctx.fillStyle = C.stoneS;
    ctx.fillRect(cx - 32 + i, baseY - 10, 1, 8);
  }
  // Two columns
  for (const dx of [-40, 40]) {
    ctx.fillStyle = C.stoneL;
    ctx.fillRect(cx + dx, baseY - 30, 5, 22);
    ctx.fillStyle = C.stoneD;
    ctx.fillRect(cx + dx + 4, baseY - 30, 1, 22);
    ctx.fillStyle = C.stoneM;
    ctx.fillRect(cx + dx - 2, baseY - 32, 9, 3);
    ctx.fillStyle = C.stoneS;
    ctx.fillRect(cx + dx - 2, baseY - 33, 9, 1);
    ctx.fillStyle = C.stoneM;
    ctx.fillRect(cx + dx - 2, baseY - 9, 9, 2);
  }
  // Audience dots
  ctx.fillStyle = '#2a1810';
  const audience = [
    [-32, -22], [-20, -28], [-8, -32], [4, -32], [16, -28], [28, -22],
    [-44, -18], [40, -18], [-26, -38], [-12, -42], [0, -44], [12, -42], [24, -38],
    [-36, -28], [32, -28], [-18, -34], [20, -34],
  ];
  audience.forEach(([dx, dy]) => {
    ctx.fillRect(cx + dx, baseY + dy, 1, 1);
  });
}

// ---------- CYPRESS ----------
function drawCypress(x, baseY, height) {
  ctx.fillStyle = C.cypressTrunk;
  ctx.fillRect(x + 2, baseY - 5, 3, 5);
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const w = Math.round(3 + Math.sin(t * Math.PI) * 5);
    ctx.fillStyle = C.cypress;
    ctx.fillRect(x + 4 - Math.floor(w / 2), baseY - 5 - height + y, w, 1);
    if (y % 4 === 0) {
      ctx.fillStyle = '#2e5538';
      ctx.fillRect(x + 4 - Math.floor(w / 2), baseY - 5 - height + y, 1, 1);
    }
  }
}

// ---------- HOUSE ----------
function drawHouse(x, baseY, w, h, type) {
  const wallColors = {
    white: [C.white, C.whiteSh, C.whiteHi],
    ochre: [C.ochre, C.ochreSh, C.ochreHi],
    blue: [C.blue, C.blueSh, '#c4a0c4'],
  };
  const [wall, sh, hi] = wallColors[type] || wallColors.white;
  const top = baseY - h;
  ctx.fillStyle = wall;
  ctx.fillRect(x, top, w, h);
  ctx.fillStyle = sh;
  ctx.fillRect(x + w - 4, top, 4, h);
  ctx.fillStyle = hi;
  ctx.fillRect(x, top, w - 4, 2);
  // foundation
  ctx.fillStyle = C.streetSh;
  ctx.fillRect(x, baseY - 5, w, 5);
  // roof
  ctx.fillStyle = C.roofSh;
  ctx.fillRect(x - 3, top - 9, w + 6, 9);
  ctx.fillStyle = C.roof;
  ctx.fillRect(x - 3, top - 8, w + 6, 6);
  ctx.fillStyle = C.roofHi;
  ctx.fillRect(x - 3, top - 8, w + 6, 2);
  for (let i = 0; i < w + 6; i += 5) {
    ctx.fillStyle = C.roofSh;
    ctx.fillRect(x - 3 + i, top - 8, 1, 8);
  }
  // windows (2 rows, 2-3 cols)
  const winCols = Math.max(2, Math.floor(w / 22));
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < winCols; c++) {
      const wx = x + 8 + c * 22;
      const wy = top + 12 + r * 32;
      if (wx + 14 > x + w - 6) continue;
      ctx.fillStyle = C.winFrame;
      ctx.fillRect(wx - 2, wy - 2, 18, 18);
      const lit = (r * 7 + c * 3) % 4 === 0;
      ctx.fillStyle = lit ? C.winLit : C.win;
      ctx.fillRect(wx, wy, 14, 14);
      ctx.fillStyle = C.dark;
      ctx.fillRect(wx + 6, wy, 2, 14);
      ctx.fillRect(wx, wy + 6, 14, 2);
      // shutters
      ctx.fillStyle = (r + c) % 3 === 0 ? C.shutOpen : C.shut;
      ctx.fillRect(wx - 5, wy - 2, 3, 18);
      ctx.fillRect(wx + 16, wy - 2, 3, 18);
      // flower box (bottom row)
      if (r === 1) {
        ctx.fillStyle = C.pot;
        ctx.fillRect(wx - 1, wy + 16, 16, 4);
        ctx.fillStyle = C.potSh;
        ctx.fillRect(wx - 1, wy + 19, 16, 1);
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = (i % 2) ? C.bougainHi : C.bougain;
          ctx.fillRect(wx + i * 2, wy + 14, 1, 2);
        }
      }
    }
  }
  // door
  const dw = 16, dh = 26;
  const dx = x + Math.floor(w / 2) - 8;
  const dy = baseY - dh - 5;
  const doorColors = [C.doorBlue, C.doorGreen, C.doorRed];
  const dcol = doorColors[(x % 3)];
  ctx.fillStyle = C.doorFrame;
  ctx.fillRect(dx - 2, dy - 2, dw + 4, dh + 2);
  ctx.fillStyle = dcol;
  ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = C.dark;
  ctx.fillRect(dx + 1, dy + 4, dw - 2, 1);
  ctx.fillRect(dx + 1, dy + 14, dw - 2, 1);
  ctx.fillStyle = C.doorKnob;
  ctx.fillRect(dx + dw - 4, dy + dh - 12, 2, 2);
  // bougainvillea climbing
  for (let i = 0; i < 18; i++) {
    const bx = x + ((i * 11) % w);
    const by = top + ((i * 13) % Math.min(h - 6, 30));
    ctx.fillStyle = (i % 4 === 0) ? C.bougainDark : (i % 3 === 0) ? C.bougainHi : C.bougain;
    ctx.fillRect(bx, by, 2, 2);
  }
}

// ---------- LEASH ----------
function drawLeash(x1, y1, x2, y2) {
  ctx.fillStyle = C.dark;
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sag = Math.sin(t * Math.PI) * 4;
    const px = Math.round(x1 + (x2 - x1) * t);
    const py = Math.round(y1 + (y2 - y1) * t + sag);
    ctx.fillRect(px, py, 1, 1);
  }
}

// ---------- GARLAND ----------
function drawGarland(x1, x2, y) {
  const segments = 20;
  const dy = 12;
  for (let i = 0; i <= segments; i++) {
    const tt = i / segments;
    const px = Math.round(x1 + (x2 - x1) * tt);
    const py = Math.round(y + Math.sin(tt * Math.PI) * dy);
    ctx.fillStyle = C.dark;
    ctx.fillRect(px, py, 1, 1);
    if (i % 2 === 0) {
      const colors = C.garlandBulb;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(px - 1, py + 2, 3, 3);
      ctx.fillStyle = '#ffe5a0';
      ctx.fillRect(px, py + 2, 1, 1);
    }
  }
}

// ---------- SCENE COMPOSITION ----------
function render() {
  const sunX = 540;
  const sunY = 160;
  const groundY = 286;

  // Sky + sun + clouds + birds
  drawSky();
  drawSun(sunX, sunY);
  drawClouds();
  drawBirds();
  drawMountains();

  // Sea reflection (horizon at y=240)
  drawSeaTrail(sunX, sunY);

  // Antik Tiyatro on the LEFT
  drawTheater(15, groundY);

  // Cypresses scattered
  drawCypress(170, groundY, 36);
  drawCypress(258, groundY, 32);
  drawCypress(595, groundY, 32);

  // Houses on the right side
  drawHouse(220, groundY, 64, 110, 'white');
  drawHouse(290, groundY, 70, 130, 'ochre');
  drawHouse(366, groundY, 60, 100, 'blue');
  drawHouse(432, groundY, 76, 124, 'white');
  drawHouse(514, groundY, 70, 110, 'ochre');

  // Garland between two houses
  drawGarland(308, 396, 175);
  drawGarland(465, 540, 195);

  // Street
  ctx.fillStyle = C.street;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = C.streetSh;
  ctx.fillRect(0, groundY, W, 1);
  ctx.fillStyle = '#6b5536';
  ctx.fillRect(0, groundY + 1, W, 1);
  // cobblestones
  for (let i = 0; i < W; i += 12) {
    ctx.fillStyle = C.cobble;
    ctx.fillRect(i, groundY + 6, 5, 1);
    ctx.fillRect(i + 6, groundY + 12, 5, 1);
    ctx.fillRect(i + 2, groundY + 18, 5, 1);
    ctx.fillRect(i + 8, groundY + 24, 5, 1);
  }

  // Hero — big, scaled 4×, walking forward (centered, slightly left of middle)
  const heroX = 295;
  const heroY = groundY - 80;
  const heroScale = 4;
  drawSprite(heroX, heroY, HERO_WALK, HERO_LEGEND, heroScale);
  // Hero shadow
  ctx.fillStyle = 'rgba(26,16,9,0.35)';
  ctx.fillRect(heroX + 8, groundY - 1, 40, 2);

  // Friendly dog beside hero (right side, smaller scale)
  const dogX = heroX + 14 * heroScale + 10;
  const dogY = groundY - 16 * 3;
  const dogScale = 3;
  drawSprite(dogX, dogY, DOG_WALK, DOG_LEGEND, dogScale);
  // Dog shadow
  ctx.fillStyle = 'rgba(26,16,9,0.35)';
  ctx.fillRect(dogX + 8, groundY - 1, 50, 2);

  // Leash from hero's hand to dog's neck
  const leashStartX = heroX + 13 * heroScale;       // hand position
  const leashStartY = heroY + 11 * heroScale;
  const leashEndX = dogX + 5 * dogScale;
  const leashEndY = dogY + 4 * dogScale;
  drawLeash(leashStartX, leashStartY, leashEndX, leashEndY);

  // A simit floating above hero (welcoming icon)
  const simitX = heroX + 6 * heroScale - 24;
  const simitY = heroY - 38;
  // Halo around simit
  ctx.fillStyle = 'rgba(253, 230, 138, 0.4)';
  for (let i = -22; i <= 22; i++) {
    for (let j = -22; j <= 22; j++) {
      const d2 = i*i + j*j;
      if (d2 >= 280 && d2 <= 484) ctx.fillRect(simitX + 26 + i, simitY + 22 + j, 1, 1);
    }
  }
  drawSprite(simitX, simitY, SIMIT, SIMIT_LEGEND, 4);

  // Soft vignette overlay (handled by HTML overlay too, but tiny darkening at corners)
  ctx.fillStyle = 'rgba(26, 16, 9, 0.18)';
  // bottom edge for readability with hero text
  for (let y = H - 50; y < H; y++) {
    ctx.fillStyle = `rgba(26, 16, 9, ${(y - (H-50)) / 50 * 0.5})`;
    ctx.fillRect(0, y, W, 1);
  }
}

// Handle device pixel ratio + responsive sizing
function setupCanvasSize() {
  // Render at native resolution; CSS handles scaling
  // We keep internal 640x320 for crisp pixel art at all viewport sizes
  cv.width = 640;
  cv.height = 320;
  render();
}

setupCanvasSize();
window.addEventListener('resize', () => {
  // Re-render on orientation/dpr change (no-op for static art but safe)
  render();
});

})();
