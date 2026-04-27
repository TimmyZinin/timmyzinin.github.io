// Kaş'ta Simit Koşusu — 8-bit pixel runner v2 (game-art pass)
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
  sun:  '#fcd34d', sunGlow: '#fde68a', sunRay: '#fff1b8',
  cloud: '#fff8e8', cloudSh: '#e8d4a8',
  seaFar: '#3b82c4', seaMid: '#2769a8', seaNear: '#1e5a96', seaFoam: '#cfe9f5', seaWave: '#5fa9d8',
  mtn1: '#7c6e8d', mtn1Hi: '#9686a8', mtn2: '#564e6a', mtn2Hi: '#6a607a',
  hill: '#3a5a7a', hillHouse: '#cfc6ad', hillRoof: '#7a3f17',
  white: '#f5efdf', whiteSh: '#d9cfb8', whiteHi: '#fffaef',
  ochre: '#c77b3b', ochreSh: '#8a4f22', ochreHi: '#dd9456',
  blue: '#9fb8d4', blueSh: '#5a7596',
  roof: '#b5512f', roofSh: '#7a2f17', roofHi: '#d96f48',
  win:  '#3a5f8f', winLit: '#fce28a', winFrame: '#e8d4a8', winGlass: '#5b87b8',
  shut: '#2a4060', shutOpen: '#5a8b3e',
  doorBlue: '#3a5a8a', doorGreen: '#3e6b3a', doorRed: '#8a3a3a',
  doorFrame: '#f5efdf', doorKnob: '#fcd34d',
  street: '#caa97d', streetSh: '#8b6f47', streetLine: '#6b4423', cobble: '#a88860',
  curb: '#6b5536',
  sign: '#1d1208', signBg: '#f0d99a', signBorder: '#7a4f1a',
  bougain: '#d44b91', bougainDark: '#9c2f6a', bougainHi: '#ed7fb8',
  leaf: '#2f7d3a', leafDark: '#1c4a22', leafHi: '#5fa850',
  pot: '#a55432', potSh: '#6e3320',
  cypress: '#1e3d28', cypressHi: '#2e5538', cypressTrunk: '#3a2818',
  garland: '#f5efdf', garlandBulb: ['#fcd34d', '#ef4444', '#3a8fc8', '#5fa850'],
  shirt: '#dc2626', shirtSh: '#8e1010', shirtHi: '#ff5050',
  pants: '#1e3a8a', pantsSh: '#0e1e5a',
  skin: '#f4c58a', skinSh: '#c9854f', skinHi: '#ffe5c0',
  hair: '#3b2317', hairHi: '#5e3a26',
  shoe: '#1a1009',
  scarf: '#9c2f6a',
  catFur: '#e8a86b', catFurSh: '#a86b2f', catFurHi: '#f4c58a', catEye: '#22c55e', catNose: '#7a3a3a',
  dogFur: '#7a4a2a', dogFurSh: '#3e2010', dogFurHi: '#a06a3a', dogWhite: '#f5efdf', dogNose: '#1a1009', dogTongue: '#d44b6f',
  simit: '#c77b3b', simitSh: '#7a3f17', simitHi: '#e9a368', simitGlow: '#fde68a', sesame: '#fff5d0',
  particleA: '#fcd34d', particleB: '#fff5d0', particleC: '#c77b3b',
  black: '#1a1009', dark: '#2a1810', shadow: 'rgba(26,16,9,0.35)',
  bubble: '#fff8e8', bubbleSh: '#e8d4a8',
  bird: '#1d1208',
};

// ---------- SPRITE HELPER ----------
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

// ---------- HERO SPRITES (14x22) ---------- 4-frame run + jump up + jump down
const HERO_LEGEND = {
  K: C.hair, k: C.hairHi, S: C.skin, s: C.skinSh, H: C.skinHi,
  R: C.shirt, r: C.shirtSh, h: C.shirtHi,
  P: C.pants, p: C.pantsSh,
  B: C.shoe, O: C.black,
  X: C.scarf,
};
// Frame 1: right leg forward, left arm forward
const HERO_RUN_1 = [
  '....KkKKKK....',
  '...KKKKKKKK...',
  '..KSSSSSSSSK..',
  '..KSHSSSSSSK..',
  '..KSSSsSSSSK..',
  '..KSSSSSSSSK..',
  '..KkSOSSSOsK..',
  '...SSSSSSSSk..',
  '...SXXXXXXX...',
  '..RRRhRRRRR...',
  '.RRRRRRRRRRR..',
  '.RRRrRRhRRRR..',
  '.RRRRRRRRRRR..',
  '..PPPPPPPPP...',
  '..PPpPPPpPP...',
  '..PPPPPPPPP...',
  '..PPP...PPP...',
  '..PPP...PPP...',
  '..PPP...PPP...',
  '..BBB...PPP...',
  '.BBBB...PPP...',
  'BBBB....BBBB..',
];
// Frame 2: passing pose
const HERO_RUN_2 = [
  '....KkKKKK....',
  '...KKKKKKKK...',
  '..KSSSSSSSSK..',
  '..KSHSSSSSSK..',
  '..KSSSsSSSSK..',
  '..KSSSSSSSSK..',
  '..KkSOSSSOsK..',
  '...SSSSSSSSk..',
  '...SXXXXXXX...',
  '...RRRhRRRR...',
  '..RRRRRRRRR...',
  '..RRRrRRhRR...',
  '..RRRRRRRRR...',
  '..PPPPPPPPP...',
  '..PPpPPPpPP...',
  '...PPPPPPP....',
  '...PP...PP....',
  '...PP...PP....',
  '..PPP...PP....',
  '..BBB...BB....',
  '.BBBB...BB....',
  '.BBB....BB....',
];
// Frame 3: left leg forward, right arm forward (mirror of 1 in arm/leg pattern)
const HERO_RUN_3 = [
  '....KkKKKK....',
  '...KKKKKKKK...',
  '..KSSSSSSSSK..',
  '..KSHSSSSSSK..',
  '..KSSSsSSSSK..',
  '..KSSSSSSSSK..',
  '..KkSOSSSOsK..',
  '...SSSSSSSSk..',
  '...SXXXXXXX...',
  '...RRRRRhRRR..',
  '..RRRRRRRRRRR.',
  '..RRRrRRhRRRR.',
  '..RRRRRRRRRRR.',
  '..PPPPPPPPP...',
  '..PPpPPPpPP...',
  '..PPPPPPPPP...',
  '...PPP...PPP..',
  '...PPP...PPP..',
  '...PPP...PPP..',
  '...PPP...BBB..',
  '...PPP...BBBB.',
  '..BBBB....BBBB',
];
// Frame 4: passing pose other side
const HERO_RUN_4 = [
  '....KkKKKK....',
  '...KKKKKKKK...',
  '..KSSSSSSSSK..',
  '..KSHSSSSSSK..',
  '..KSSSsSSSSK..',
  '..KSSSSSSSSK..',
  '..KkSOSSSOsK..',
  '...SSSSSSSSk..',
  '...SXXXXXXX...',
  '...RRRRhRRR...',
  '...RRRRRRRRR..',
  '...RRrRRhRRR..',
  '...RRRRRRRRR..',
  '..PPPPPPPPP...',
  '..PPpPPPpPP...',
  '....PPPPPPP...',
  '....PP...PP...',
  '....PP...PP...',
  '....PP...PPP..',
  '....BB...BBB..',
  '....BB...BBBB.',
  '....BB....BBB.',
];
// Jump up: legs tucked, arms up (anticipation+stretch)
const HERO_JUMP_UP = [
  '....KkKKKK....',
  '..R.KKKKKKKK.R',
  '.RR.KSSSSSSSKR',
  'RRR.KSHSSSSSKR',
  'RRRR.SSSsSSSR.',
  '.RRRRSSSSSSR..',
  '..RRRkSOSOsR..',
  '...RRSSSSSSk..',
  '...RRXXXXXX...',
  '...RRRRRRRR...',
  '..RRRRRRRRRR..',
  '..RRRrRRhRRR..',
  '..RRRRRRRRRR..',
  '...PPPPPPPP...',
  '...PPpPPPpPP..',
  '...PPPPPPPPP..',
  '....PPPPPPP...',
  '.....PPPPP....',
  '.....PPPPP....',
  '....BBB.BBB...',
  '...BBBB.BBBB..',
  '...BBB...BBB..',
];
// Jump down: legs ready to land (squash)
const HERO_JUMP_DOWN = [
  '....KkKKKK....',
  '...KKKKKKKK...',
  '..KSSSSSSSSK..',
  '..KSHSSSSSSK..',
  '..KSSSsSSSSK..',
  '..KSSSSSSSSK..',
  '..KkSOSSSOsK..',
  '...SSSSSSSSk..',
  '..RSXXXXXXX.R.',
  '.RRRRhRRRRRRR.',
  'RRRRRRRRRRRRRR',
  'RRRRrRRhRRRRRR',
  '.RRRRRRRRRRRR.',
  '..PPPPPPPPP...',
  '..PPpPPPpPP...',
  '..PPPPPPPPP...',
  '.PPP.....PPP..',
  'PPP.......PPP.',
  'BBB.......BBB.',
  'BBB.......BBB.',
  '..............',
  '..............',
];

// ---------- CAT (16x14) ---------- 4-frame walk + tail
const CAT_LEGEND = {
  F: C.catFur, f: C.catFurSh, H: C.catFurHi, E: C.catEye, O: C.black, N: C.catNose, w: C.dogWhite,
};
const CAT_1 = [
  '............F.F.',
  '...........FFFF.',
  '...........FEFE.',
  '..........FFNFF.',
  '.........FFFFwF.',
  '..FFFFFFFFFFFFf.',
  '.FHFFFFFFFFFFFf.',
  'FHFFFFFFFFFFFFf.',
  'FFFFFFFFFFFFFff.',
  '.FfFFFFFFFFFFf..',
  '..F..F..F..F....',
  '..F..F..F..F....',
  '..O..O..O..O....',
  '................',
];
const CAT_2 = [
  '............F.F.',
  '...........FFFF.',
  '...........FEFE.',
  '..........FFNFF.',
  '.........FFFFwF.',
  '..FFFFFFFFFFFFf.',
  '.FHFFFFFFFFFFFf.',
  'FHFFFFFFFFFFFFf.',
  'FFFFFFFFFFFFFff.',
  '.FfFFFFFFFFFFf..',
  '..FF.F..F.FF....',
  '..F..F..F..F....',
  '..O..O..O..O....',
  '................',
];
const CAT_3 = [
  '............F.F.',
  '...........FFFF.',
  '...........FEFE.',
  '..........FFNFF.',
  '.........FFFFwF.',
  '..FFFFFFFFFFFFf.',
  '.FHFFFFFFFFFFFf.',
  'FHFFFFFFFFFFFFf.',
  'FFFFFFFFFFFFFff.',
  '.FfFFFFFFFFFFf..',
  '..FF..F..F..FF..',
  '..F...F..F...F..',
  '..O...O..O...O..',
  '................',
];
const CAT_4 = [
  '............F.F.',
  '...........FFFF.',
  '...........FEFE.',
  '..........FFNFF.',
  '.........FFFFwF.',
  '..FFFFFFFFFFFFf.',
  '.FHFFFFFFFFFFFf.',
  'FHFFFFFFFFFFFFf.',
  'FFFFFFFFFFFFFff.',
  '.FfFFFFFFFFFFf..',
  '..F..FF..FF..F..',
  '..F..F...F...F..',
  '..O..O...O...O..',
  '................',
];
const CAT_FRAMES = [CAT_1, CAT_2, CAT_3, CAT_4];

// ---------- DOG (20x16) ---------- recognizable: long snout, floppy ear, raised tail, 4-frame trot
const DOG_LEGEND = {
  D: C.dogFur, d: C.dogFurSh, H: C.dogFurHi, W: C.dogWhite, N: C.dogNose, T: C.dogTongue, O: C.black,
};
const DOG_1 = [
  '....................',
  '..............dD....',
  '..D..........DDDD...',
  '.DD.....DDDDDDDDDDD.',
  'DDDD..DDDDDHDDDDDDDD',
  'DDdD.DDDdDHHHDDDDDDD',
  'DDdDDDDDdDdHHHDDDDDD',
  '.DDDDDOWWDDdHHDDDDD.',
  '..NDDDDWWDDDDdDDDDD.',
  '..NTDDDDDDDDDDDDDDd.',
  '..NDDDWWDDDDDDDDDDd.',
  '..DDD.WD..DD..DDDDd.',
  '...DD.WD..DD..DDDD..',
  '...DD.DD..DD..DDD...',
  '...DD.DD..DD..DDD...',
  '...OO.OO..OO..OOO...',
];
const DOG_2 = [
  '....................',
  '..............dD....',
  '..D...........DDDDDD',
  '.DD......DDDDDDDDDDD',
  'DDDD...DDDDDHDDDDDDD',
  'DDdD..DDDdDHHHDDDDDD',
  'DDdDDDDDdDdHHHDDDDDD',
  '.DDDDDOWWDDdHHDDDDD.',
  '..NDDDDWWDDDDdDDDDD.',
  '..NTDDDDDDDDDDDDDDd.',
  '..NDDDWWDDDDDDDDDDd.',
  '..DDD.WDD.DDD.DDDDd.',
  '...DD.DDD.DDD.DDDD..',
  '...DD.DDDD.DD.DDD...',
  '...DD..DDD.DD.DDD...',
  '...OO..OOO.OO.OOO...',
];
const DOG_3 = [
  '....................',
  '..............dD....',
  '...D..........DDDDDD',
  '..DD.....DDDDDDDDDDD',
  '.DDDD...DDDDHDDDDDDD',
  '.DDdD..DDDdDHHHDDDDD',
  'DDDdDDDDDdDdHHHDDDDD',
  '.DDDDDOWWDDdHHDDDDD.',
  '..NDDDDWWDDDDdDDDDD.',
  '..NTDDDDDDDDDDDDDDd.',
  '..NDDDWWDDDDDDDDDDd.',
  '..DDD.WD..DD..DDDDd.',
  '...DD..D..DD..DDDD..',
  '...DD..DD.DD..DDD...',
  '...DD..DD.DD..DDD...',
  '...OO..OO.OO..OOO...',
];
const DOG_4 = [
  '....................',
  '..............dD....',
  '..D...........DDDDDD',
  '.DD......DDDDDDDDDDD',
  'DDDD...DDDDDHDDDDDDD',
  'DDdD..DDDdDHHHDDDDDD',
  'DDdDDDDDdDdHHHDDDDDD',
  '.DDDDDOWWDDdHHDDDDD.',
  '..NDDDDWWDDDDdDDDDD.',
  '..NTDDDDDDDDDDDDDDd.',
  '..NDDDWWDDDDDDDDDDd.',
  '..DDDD.D..DDD.DDDDd.',
  '...DDD.D..DDD.DDDD..',
  '...DDD..D.DDDDDDD...',
  '...DD...D.DD.DDD....',
  '...OO...O.OO.OOO....',
];
const DOG_FRAMES = [DOG_1, DOG_2, DOG_3, DOG_4];

// ---------- SIMIT (13x13) ---------- 4-frame slow rotation
const SIMIT_LEGEND = { S: C.simit, s: C.simitSh, H: C.simitHi, e: C.sesame, '#': C.dark };
const SIMIT_1 = [
  '....####.....',
  '..##SSSS##...',
  '.#SHHHsHsS#..',
  '#SHe...esSS#.',
  '#SH.....eSS#.',
  '#SH......SS#.',
  '#SHe....eSS#.',
  '#SHHe..esSS#.',
  '.#SHHsHHsS#..',
  '..##sSSS##...',
  '....####.....',
  '.............',
  '.............',
];
const SIMIT_2 = [
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
  '.............',
  '.............',
];
const SIMIT_3 = [
  '....####.....',
  '..##SSSS##...',
  '.#sHHHHHHs#..',
  '#sHe...esS#..',
  '#sH.....eS#..',
  '#sH......S#..',
  '#sHe....eS#..',
  '#sHHe..esS#..',
  '.#sHHsHHsS#..',
  '..##sSSSs##..',
  '....####.....',
  '.............',
  '.............',
];
const SIMIT_4 = [
  '....####.....',
  '..##SSSS##...',
  '.#sHHHHHHS#..',
  '#sH.eeee.S#..',
  '#sH......S#..',
  '#sH......S#..',
  '#sH......S#..',
  '#sH.eeee.S#..',
  '.#sHsHsHHS#..',
  '..##SSSSS##..',
  '....####.....',
  '.............',
  '.............',
];
const SIMIT_FRAMES = [SIMIT_1, SIMIT_2, SIMIT_3, SIMIT_4];

// ---------- BIRD (5x3) silhouette ----------
const BIRD_LEGEND = { B: C.bird };
const BIRD_1 = ['B...B', '.BBB.', '..B..'];
const BIRD_2 = ['.B.B.', 'BBBBB', '..B..'];

// ---------- SUN ----------
function drawSun(x, y, t) {
  // animated rays
  const rayCount = 8;
  ctx.fillStyle = C.sunRay;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / rayCount) * Math.PI * 2 + t * 0.0004;
    const len = 16 + Math.sin(t * 0.002 + i) * 2;
    for (let r = 14; r < 14 + len; r++) {
      const px = Math.round(x + Math.cos(a) * r);
      const py = Math.round(y + Math.sin(a) * r);
      if (r % 3 !== 0) ctx.fillRect(px, py, 1, 1);
    }
  }
  // halo
  ctx.fillStyle = C.sunGlow;
  const r = 13;
  for (let i = -r; i <= r; i++) {
    for (let j = -r; j <= r; j++) {
      const d2 = i*i + j*j;
      if (d2 <= r*r && d2 >= (r-2)*(r-2)) ctx.fillRect(x + i, y + j, 1, 1);
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
  // highlight
  ctx.fillStyle = C.sunGlow;
  ctx.fillRect(x - 4, y - 5, 3, 2);
  ctx.fillRect(x - 5, y - 3, 2, 2);
}

// ---------- CLOUD ----------
function drawCloud(x, y, scale = 1) {
  ctx.fillStyle = C.cloud;
  const blob = (cx, cy, r) => {
    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) {
        if (i*i + j*j <= r*r) ctx.fillRect(cx + i, cy + j, 1, 1);
      }
    }
  };
  blob(x, y, 4 * scale);
  blob(x + 5 * scale, y - 2, 5 * scale);
  blob(x + 11 * scale, y, 4 * scale);
  blob(x + 7 * scale, y + 2, 4 * scale);
  ctx.fillStyle = C.cloudSh;
  ctx.fillRect(x - 3, y + 3, 14 * scale, 1);
}

// ---------- BIRD ANIM ----------
function drawBird(x, y, t) {
  const flap = Math.floor(t * 0.012) % 2;
  drawSprite(x, y, flap ? BIRD_2 : BIRD_1, BIRD_LEGEND);
}

// ---------- HOUSE BUILDER ----------
function drawHouse(x, baseY, seed) {
  const widths   = [44, 56, 38, 60, 48, 50, 42, 64];
  const heights  = [56, 64, 48, 72, 60, 56, 50, 70];
  const palettes = [
    {wall: C.white, sh: C.whiteSh, hi: C.whiteHi},
    {wall: C.ochre, sh: C.ochreSh, hi: C.ochreHi},
    {wall: '#e8d4a0', sh: '#b89766', hi: '#f5e8b8'},
    {wall: C.white, sh: C.whiteSh, hi: C.whiteHi},
    {wall: '#e8a86b', sh: '#a06b3a', hi: '#f4c58a'},
    {wall: C.white, sh: C.whiteSh, hi: C.whiteHi},
    {wall: '#cfc6ad', sh: '#8a8068', hi: '#e0d8c0'},
    {wall: C.blue, sh: C.blueSh, hi: '#c4d6ec'},
  ];
  const w = widths[seed % widths.length];
  const h = heights[seed % heights.length];
  const p = palettes[seed % palettes.length];
  const top = baseY - h;
  // wall
  ctx.fillStyle = p.wall;
  ctx.fillRect(x, top, w, h);
  // shadow side (right)
  ctx.fillStyle = p.sh;
  ctx.fillRect(x + w - 3, top, 3, h);
  ctx.fillRect(x, top + h - 2, w, 2);
  // highlight side (top edge)
  ctx.fillStyle = p.hi;
  ctx.fillRect(x, top, w - 3, 1);
  // stone foundation
  ctx.fillStyle = C.streetSh;
  ctx.fillRect(x, baseY - 3, w, 3);
  for (let i = 0; i < w; i += 4) {
    ctx.fillStyle = C.dark;
    ctx.fillRect(x + i, baseY - 2, 1, 2);
  }
  // roof (terracotta) with highlight
  ctx.fillStyle = C.roofSh;
  ctx.fillRect(x - 2, top - 6, w + 4, 6);
  ctx.fillStyle = C.roof;
  ctx.fillRect(x - 2, top - 5, w + 4, 4);
  ctx.fillStyle = C.roofHi;
  ctx.fillRect(x - 2, top - 5, w + 4, 1);
  // tiles pattern
  for (let i = 0; i < w + 4; i += 3) {
    ctx.fillStyle = C.roofSh;
    ctx.fillRect(x - 2 + i, top - 5, 1, 5);
  }
  // chimney sometimes
  if (seed % 4 === 0) {
    const chx = x + Math.floor(w * 0.7);
    ctx.fillStyle = p.sh;
    ctx.fillRect(chx, top - 11, 4, 6);
    ctx.fillStyle = C.dark;
    ctx.fillRect(chx, top - 11, 4, 1);
  }
  // windows with frames
  const winRows = h > 50 ? 2 : 1;
  const winCols = Math.max(1, Math.floor(w / 14));
  const hasBalcony = (seed % 5 === 1) && winRows === 2;
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < winCols; c++) {
      const wx = x + 6 + c * 14;
      const wy = top + 8 + r * 22;
      if (wx + 9 > x + w - 4) continue;
      // frame
      ctx.fillStyle = C.winFrame;
      ctx.fillRect(wx - 1, wy - 1, 11, 12);
      // glass
      const lit = ((seed * 7 + r * 3 + c) % 5 === 0);
      ctx.fillStyle = lit ? C.winLit : C.winGlass;
      ctx.fillRect(wx, wy, 9, 10);
      // window cross (4-pane)
      ctx.fillStyle = C.dark;
      ctx.fillRect(wx + 4, wy, 1, 10);
      ctx.fillRect(wx, wy + 4, 9, 1);
      // shutter (sometimes open green)
      const shutOpen = (seed + r + c) % 3 === 0;
      ctx.fillStyle = shutOpen ? C.shutOpen : C.shut;
      ctx.fillRect(wx - 3, wy - 1, 2, 12);
      ctx.fillRect(wx + 10, wy - 1, 2, 12);
      // flower pot on bottom-floor windows
      if (r === winRows - 1 && (seed + c) % 2 === 0) {
        ctx.fillStyle = C.pot;
        ctx.fillRect(wx, wy + 11, 9, 3);
        ctx.fillStyle = C.potSh;
        ctx.fillRect(wx, wy + 13, 9, 1);
        // flowers
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = (i % 2 === 0) ? C.bougain : C.bougainHi;
          ctx.fillRect(wx + 1 + i * 2, wy + 10, 1, 1);
        }
        ctx.fillStyle = C.leafHi;
        ctx.fillRect(wx + 4, wy + 10, 1, 1);
      }
      // window cat (sometimes, top floor)
      if (r === 0 && (seed * 11 + c) % 8 === 0) {
        ctx.fillStyle = C.catFur;
        ctx.fillRect(wx + 2, wy + 5, 5, 5);
        ctx.fillRect(wx + 2, wy + 4, 1, 1);
        ctx.fillRect(wx + 6, wy + 4, 1, 1);
        ctx.fillStyle = C.catEye;
        ctx.fillRect(wx + 3, wy + 6, 1, 1);
        ctx.fillRect(wx + 5, wy + 6, 1, 1);
      }
    }
  }
  // balcony (optional)
  if (hasBalcony) {
    const by = top + 18;
    const bx = x + 4;
    const bw = w - 8;
    ctx.fillStyle = C.dark;
    ctx.fillRect(bx, by, bw, 1);
    for (let i = 0; i < bw; i += 2) {
      ctx.fillRect(bx + i, by + 1, 1, 4);
    }
    ctx.fillRect(bx, by + 4, bw, 1);
    // bougainvillea on balcony
    for (let i = 0; i < bw; i += 3) {
      ctx.fillStyle = (i % 6 === 0) ? C.bougainDark : C.bougain;
      ctx.fillRect(bx + i, by - 1, 1, 1);
    }
  }
  // door (sometimes)
  if (seed % 3 === 0) {
    const dw = 11, dh = 18;
    const dx = x + Math.floor(w / 2) - 5;
    const dy = baseY - dh - 3;
    const colors = [C.doorBlue, C.doorGreen, C.doorRed];
    const dcol = colors[seed % colors.length];
    // frame
    ctx.fillStyle = C.doorFrame;
    ctx.fillRect(dx - 1, dy - 1, dw + 2, dh + 1);
    ctx.fillStyle = dcol;
    ctx.fillRect(dx, dy, dw, dh);
    // panels
    ctx.fillStyle = C.dark;
    ctx.fillRect(dx + 1, dy + 2, dw - 2, 1);
    ctx.fillRect(dx + 1, dy + 8, dw - 2, 1);
    ctx.fillStyle = C.doorKnob;
    ctx.fillRect(dx + dw - 3, dy + dh - 8, 1, 1);
    // arch top
    ctx.fillStyle = dcol;
    ctx.fillRect(dx + 2, dy - 2, dw - 4, 2);
  }
  // bougainvillea draped (climbing plant)
  if (seed % 2 === 1) {
    const startX = x + 1;
    for (let i = 0; i < 14; i++) {
      const bx = startX + ((seed * 13 + i * 5) % (w - 2));
      const by = top + ((seed * 5 + i * 7) % Math.min(h - 4, 22));
      ctx.fillStyle = (i % 4 === 0) ? C.bougainDark : (i % 3 === 0) ? C.bougainHi : C.bougain;
      ctx.fillRect(bx, by, 1, 1);
      if (i % 3 === 0) ctx.fillRect(bx + 1, by, 1, 1);
    }
    // a few leaves
    for (let i = 0; i < 3; i++) {
      const lx = x + 2 + ((seed * 3 + i * 11) % (w - 4));
      const ly = top + ((seed * 7 + i * 5) % 18);
      ctx.fillStyle = C.leafDark;
      ctx.fillRect(lx, ly, 2, 1);
      ctx.fillStyle = C.leaf;
      ctx.fillRect(lx, ly + 1, 2, 1);
    }
  }
  return { x, y: top, w, h };
}

// ---------- SIGN ----------
function drawSign(x, y, text) {
  const w = text.length * 4 + 4;
  ctx.fillStyle = C.signBorder;
  ctx.fillRect(x - 1, y - 1, w + 2, 9);
  ctx.fillStyle = C.signBg;
  ctx.fillRect(x, y, w, 7);
  // little nails
  ctx.fillStyle = C.dark;
  ctx.fillRect(x + 1, y + 1, 1, 1);
  ctx.fillRect(x + w - 2, y + 1, 1, 1);
  drawTextTiny(x + 2, y + 1, text, C.sign);
}

// ---------- CYPRESS TREE ----------
function drawCypress(x, baseY, height) {
  // trunk
  ctx.fillStyle = C.cypressTrunk;
  ctx.fillRect(x + 2, baseY - 3, 2, 3);
  // foliage (tall narrow ellipse)
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const w = Math.round(2 + Math.sin(t * Math.PI) * 3);
    ctx.fillStyle = C.cypress;
    ctx.fillRect(x + 3 - Math.floor(w / 2), baseY - 3 - height + y, w, 1);
    if (y % 3 === 0) {
      ctx.fillStyle = C.cypressHi;
      ctx.fillRect(x + 3 - Math.floor(w / 2), baseY - 3 - height + y, 1, 1);
    }
  }
}

// ---------- GARLAND (string lights between houses) ----------
function drawGarland(x1, x2, y, t) {
  const segments = 12;
  const dy = 6;
  ctx.fillStyle = C.dark;
  for (let i = 0; i <= segments; i++) {
    const tt = i / segments;
    const px = Math.round(x1 + (x2 - x1) * tt);
    const py = Math.round(y + Math.sin(tt * Math.PI) * dy);
    ctx.fillRect(px, py, 1, 1);
    if (i % 2 === 0) {
      const colors = C.garlandBulb;
      const flicker = (Math.floor(t * 0.005) + i) % colors.length;
      ctx.fillStyle = colors[flicker];
      ctx.fillRect(px, py + 1, 1, 1);
    }
  }
}

// ---------- TINY PIXEL FONT (3x5 base) ----------
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
  'Ç': ['.XX', 'X..', 'X..', 'X..', '.XX'],
  'Ş': ['.XX', 'X..', '.X.', '..X', 'XX.'],
  'Ğ': ['.XX', 'X..', 'X.X', 'X.X', '.XX'],
  'Ü': ['X.X', 'X.X', 'X.X', 'X.X', '.X.'],
  'Ö': ['.X.', 'X.X', 'X.X', 'X.X', '.X.'],
  'İ': ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  '(': ['..X', '.X.', '.X.', '.X.', '..X'],
  ')': ['X..', '.X.', '.X.', '.X.', 'X..'],
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
        const sym = glyph[r][c];
        if (sym === 'X') {
          ctx.fillStyle = color;
          ctx.fillRect(x + i * 4 + c, y + r, 1, 1);
        } else if (sym === 'Y') {
          // umlaut dots replace top row middles
          if (c === 0 || c === 2) { ctx.fillStyle = color; ctx.fillRect(x + i * 4 + c, y + r, 1, 1); }
        } else if (sym === 'D') {
          if (c === 1) { ctx.fillStyle = color; ctx.fillRect(x + i * 4 + c, y + r, 1, 1); }
        } else if (sym === 'C') {
          // hook below
          if (c === 1) { ctx.fillStyle = color; ctx.fillRect(x + i * 4 + c, y + r, 1, 1); }
          if (c === 0) { ctx.fillStyle = color; ctx.fillRect(x + i * 4 + c, y + r, 1, 1); }
        }
      }
    }
    // diacritics for Ş (hook)
    if (ch === 'Ş') {
      ctx.fillStyle = color;
      ctx.fillRect(x + i * 4 + 1, y + 5, 1, 1);
    }
    if (ch === 'Ç') {
      ctx.fillStyle = color;
      ctx.fillRect(x + i * 4 + 1, y + 5, 1, 1);
    }
    if (ch === 'İ') {
      ctx.fillStyle = color;
      ctx.fillRect(x + i * 4 + 1, y - 1, 1, 1);
    }
    if (ch === 'Ğ') {
      ctx.fillStyle = color;
      ctx.fillRect(x + i * 4, y - 1, 3, 1);
    }
    if (ch === 'Ü') {
      ctx.fillStyle = color;
      ctx.fillRect(x + i * 4, y - 1, 1, 1);
      ctx.fillRect(x + i * 4 + 2, y - 1, 1, 1);
    }
    if (ch === 'Ö') {
      ctx.fillStyle = color;
      ctx.fillRect(x + i * 4, y - 1, 1, 1);
      ctx.fillRect(x + i * 4 + 2, y - 1, 1, 1);
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
        const sym = glyph[r][c];
        if (sym === 'X') {
          ctx.fillStyle = color;
          ctx.fillRect(x + i * 4 * scale + c * scale, y + r * scale, scale, scale);
        }
      }
    }
    // diacritics for big text
    const cx = x + i * 4 * scale;
    if (ch === 'Ş' || ch === 'Ç') {
      ctx.fillStyle = color;
      ctx.fillRect(cx + 1 * scale, y + 5 * scale, scale, scale);
    }
    if (ch === 'İ') {
      ctx.fillStyle = color;
      ctx.fillRect(cx + 1 * scale, y - scale, scale, scale);
    }
    if (ch === 'Ğ') {
      ctx.fillStyle = color;
      ctx.fillRect(cx, y - scale, 3 * scale, scale);
    }
    if (ch === 'Ü' || ch === 'Ö') {
      ctx.fillStyle = color;
      ctx.fillRect(cx, y - scale, scale, scale);
      ctx.fillRect(cx + 2 * scale, y - scale, scale, scale);
    }
  }
}
function textWidthBig(text, scale = 2) {
  return text.length * 4 * scale - scale;
}

// ---------- BACKGROUND ----------
const CLOUDS = [
  { x: 30, y: 18, scale: 1, speed: 0.08 },
  { x: 110, y: 12, scale: 1, speed: 0.06 },
  { x: 200, y: 25, scale: 1, speed: 0.10 },
  { x: 270, y: 15, scale: 1, speed: 0.07 },
];
const BIRDS = [
  { x: 80, y: 30, speed: 0.4 },
  { x: 220, y: 22, speed: 0.3 },
  { x: 310, y: 35, speed: 0.5 },
];

function drawBackground(scrollX, t) {
  // base wash
  ctx.fillStyle = C.seaNear;
  ctx.fillRect(0, 0, W, GROUND_Y);
  // sky gradient
  for (let y = 0; y < 75; y++) {
    const tt = y / 75;
    const r = lerp(0xff, 0x7e, tt) | 0;
    const g = lerp(0xd9, 0xc9, tt) | 0;
    const b = lerp(0xa8, 0xe8, tt) | 0;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, W, 1);
  }
  // sun
  drawSun(W - 60, 30, t);
  // clouds (parallax)
  CLOUDS.forEach((c, i) => {
    const cx = (((c.x - scrollX * c.speed - t * 0.005) % (W + 60)) + (W + 60)) % (W + 60) - 30;
    drawCloud(cx, c.y, c.scale);
  });
  // far mountains
  const mtnOff = ((scrollX * 0.08) % 80 + 80) % 80;
  for (let i = -1; i < 6; i++) {
    const bx = i * 80 - mtnOff;
    drawMountain(bx, 62, 80, 24, C.mtn1, C.mtn1Hi);
  }
  for (let i = -1; i < 6; i++) {
    const off = ((scrollX * 0.12) % 110 + 110) % 110;
    const bx = i * 110 - off + 30;
    drawMountain(bx, 67, 90, 18, C.mtn2, C.mtn2Hi);
  }
  // mid-ground hill with tiny houses
  const hillOff = ((scrollX * 0.18) % 200 + 200) % 200;
  for (let i = -1; i < 4; i++) {
    const bx = i * 200 - hillOff;
    drawHillWithHouses(bx, 78);
  }
  // sea band
  ctx.fillStyle = C.seaFar;
  ctx.fillRect(0, 75, W, 4);
  ctx.fillStyle = C.seaMid;
  ctx.fillRect(0, 79, W, 4);
  ctx.fillStyle = C.seaNear;
  ctx.fillRect(0, 83, W, GROUND_Y - 83);
  // animated waves
  ctx.fillStyle = C.seaWave;
  for (let y = 84; y < 95; y += 3) {
    for (let x = 0; x < W; x += 8) {
      const phase = (x * 0.1 + t * 0.005 + y) % (Math.PI * 2);
      const off = Math.floor(Math.sin(phase) * 1.5);
      ctx.fillRect(x + off, y, 3, 1);
    }
  }
  // foam sparkles
  ctx.fillStyle = C.seaFoam;
  for (let i = 0; i < 18; i++) {
    const sx = ((i * 47 + Math.floor(t * 0.04)) % (W + 40)) - 20;
    const sy = 84 + ((i * 13) % 12);
    if ((Math.floor(t * 0.005) + i) % 4 === 0) {
      ctx.fillRect(sx, sy, 2, 1);
      ctx.fillRect(sx + 1, sy + 1, 1, 1);
    }
  }
  // sailboat
  drawBoat(80 + ((t * 0.012) % (W + 60)) - 30, 80);
  drawBoat(220 + ((t * 0.008) % (W + 60)) - 30, 84);
  // birds
  BIRDS.forEach(b => {
    const bx = (((b.x - t * b.speed * 0.05) % (W + 30)) + (W + 30)) % (W + 30) - 15;
    drawBird(bx, b.y + Math.sin(t * 0.003 + b.x) * 1, t);
  });
}

function drawHillWithHouses(x, baseY) {
  // hill silhouette
  ctx.fillStyle = C.hill;
  for (let i = 0; i < 200; i++) {
    const norm = i / 200;
    const h = Math.round(8 + Math.sin(norm * Math.PI) * 14 + Math.sin(norm * Math.PI * 3) * 2);
    ctx.fillRect(x + i, baseY - h, 1, h);
  }
  // tiny houses scattered on hill
  for (let i = 0; i < 8; i++) {
    const norm = (i + 0.5) / 8;
    const px = x + Math.round(norm * 200);
    const h = Math.round(8 + Math.sin(norm * Math.PI) * 14);
    const py = baseY - h;
    ctx.fillStyle = C.hillHouse;
    ctx.fillRect(px - 2, py - 4, 5, 4);
    ctx.fillStyle = C.hillRoof;
    ctx.fillRect(px - 3, py - 5, 7, 1);
  }
}

function drawMountain(x, baseY, w, h, color, hiColor) {
  ctx.fillStyle = color;
  for (let i = 0; i < w; i++) {
    const norm = (i / w) * 2 - 1;
    const yy = Math.floor(h * (1 - Math.abs(norm)) - Math.sin(i * 0.3) * 1.5);
    if (yy <= 0) continue;
    ctx.fillRect(x + i, baseY - yy, 1, yy);
  }
  // snow caps / highlight on top
  ctx.fillStyle = hiColor;
  for (let i = 0; i < w; i++) {
    const norm = (i / w) * 2 - 1;
    const yy = Math.floor(h * (1 - Math.abs(norm)) - Math.sin(i * 0.3) * 1.5);
    if (yy > 6) {
      ctx.fillRect(x + i, baseY - yy, 1, 1);
    }
  }
}
function drawBoat(x, y) {
  // mast
  ctx.fillStyle = C.dark;
  ctx.fillRect(x + 3, y - 7, 1, 7);
  // sail
  ctx.fillStyle = C.cloud;
  ctx.fillRect(x + 1, y - 6, 3, 5);
  ctx.fillStyle = C.cloudSh;
  ctx.fillRect(x + 4, y - 5, 1, 4);
  // hull
  ctx.fillStyle = C.dark;
  ctx.fillRect(x - 2, y, 9, 1);
  ctx.fillStyle = C.dogFurSh;
  ctx.fillRect(x - 1, y + 1, 7, 1);
  ctx.fillStyle = C.dark;
  ctx.fillRect(x, y + 2, 5, 1);
}
function lerp(a, b, t) { return a + (b - a) * t; }

// ---------- LEVEL ----------
const LEVEL_LENGTH = 2800;
const GROUND_Y = 158;

const HOUSES = [];
{
  const widths = [44, 56, 38, 60, 48, 50, 42, 64];
  for (let x = 40, i = 0; x < LEVEL_LENGTH; i++) {
    HOUSES.push({ x, seed: i });
    x += widths[i % widths.length] + 8;
  }
}

const SIGN_TEXTS = ['FIRIN', 'KAHVE', 'MARKET', 'ECZANE', 'LOKANTA', 'BAKKAL', 'ÇAY EVI', 'OTEL', 'KEBAP', 'BALIK'];
const SIGNS = HOUSES.filter((_, i) => i % 2 === 0).map((h, idx) => ({
  x: h.x + 4, baseHouse: h, text: SIGN_TEXTS[idx % SIGN_TEXTS.length],
}));

const CYPRESSES = [];
for (let x = 100; x < LEVEL_LENGTH; x += 220) {
  CYPRESSES.push({ x, height: 28 + (x % 8) });
}

const GARLANDS = [];
for (let i = 0; i < HOUSES.length - 1; i += 3) {
  const h1 = HOUSES[i], h2 = HOUSES[i + 1];
  if (!h2) break;
  GARLANDS.push({ x1: h1.x + 20, x2: h2.x + 20, y: 100 });
}

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

// ---------- PARTICLES ----------
const particles = [];
function spawnPickupBurst(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 1 + Math.random() * 1.5;
    particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 0.8,
      life: 30 + Math.random() * 10,
      color: i % 3 === 0 ? C.particleA : (i % 3 === 1 ? C.particleB : C.particleC),
    });
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles() {
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  });
}

// ---------- AUDIO ----------
let audioCtx = null;
let musicTimer = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { audioCtx = null; }
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
function sfxJump()    { beep(440, 0.06, 'square', 0.07); setTimeout(() => beep(660, 0.05, 'square', 0.06), 40); }
function sfxPickup()  { beep(880, 0.05, 'square', 0.08); setTimeout(() => beep(1320, 0.07, 'square', 0.08), 40); setTimeout(() => beep(1760, 0.05, 'triangle', 0.05), 100); }
function sfxLose()    { beep(220, 0.15, 'sawtooth', 0.1); setTimeout(() => beep(165, 0.18, 'sawtooth', 0.1), 120); setTimeout(() => beep(110, 0.3, 'sawtooth', 0.1), 280); }
function sfxWin()     {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((n, i) => setTimeout(() => beep(n, 0.18, 'square', 0.1), i * 110));
}
const MUSIC_NOTES = [
  [262, 392], [330, 0], [262, 523], [330, 0],
  [294, 440], [349, 0], [294, 466], [349, 0],
  [262, 392], [330, 523], [262, 392], [330, 0],
  [220, 440], [294, 0], [262, 392], [262, 0],
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

// ---------- STATE ----------
const STATE = { INTRO: 0, PLAY: 1, WIN: 2, LOSE: 3 };
let state = STATE.INTRO;

const player = {
  x: 60, y: GROUND_Y - 22,
  vy: 0,
  onGround: true,
  animTime: 0,
  jumpPhase: 0, // 0 = ground, 1 = up, 2 = down
};
let scrollX = 0;
let collected = 0;
let stateTime = 0;
let simits = SIMIT_POSITIONS.map(p => ({ ...p, taken: false, bobPhase: Math.random() * Math.PI * 2 }));
let enemies = ENEMIES.map(e => ({ ...e, baseX: e.x, animTime: 0, barkTime: -100 }));
let loseReason = '';
let shake = 0;

function resetGame() {
  scrollX = 0;
  collected = 0;
  stateTime = 0;
  player.x = 60;
  player.y = GROUND_Y - 22;
  player.vy = 0;
  player.onGround = true;
  player.animTime = 0;
  simits = SIMIT_POSITIONS.map(p => ({ ...p, taken: false, bobPhase: Math.random() * Math.PI * 2 }));
  enemies = ENEMIES.map(e => ({ ...e, baseX: e.x, animTime: 0, barkTime: -100 }));
  particles.length = 0;
  shake = 0;
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
    player.vy = -3.7;
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

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------- UPDATE ----------
function update(dt) {
  stateTime += dt;
  updateParticles();
  if (shake > 0) shake = Math.max(0, shake - dt * 0.05);

  if (state !== STATE.PLAY) return;

  const speed = 1.5;
  scrollX += speed;
  if (scrollX > LEVEL_LENGTH - W) scrollX = LEVEL_LENGTH - W;

  player.vy += 0.2;
  player.y += player.vy;
  if (player.y >= GROUND_Y - 22) {
    player.y = GROUND_Y - 22;
    player.vy = 0;
    player.onGround = true;
    player.jumpPhase = 0;
  } else {
    player.jumpPhase = player.vy < 0 ? 1 : 2;
  }
  player.animTime += dt;

  enemies.forEach(e => {
    e.animTime += dt;
    e.x = e.baseX + Math.sin(e.animTime * 0.025) * 18 * (e.dir);
    if (e.type === 'dog' && Math.random() < 0.003) e.barkTime = stateTime;
  });

  const playerWorldX = scrollX + player.x;
  const playerRect = { x: playerWorldX + 2, y: player.y + 2, w: 12, h: 20 };

  simits.forEach(s => {
    if (s.taken) return;
    s.bobPhase += 0.04;
    const sRect = { x: s.x, y: s.y + Math.sin(s.bobPhase) * 2, w: 12, h: 12 };
    if (rectsOverlap(playerRect, sRect)) {
      s.taken = true;
      collected++;
      sfxPickup();
      spawnPickupBurst(s.x + 6 - scrollX, s.y + 6);
      if (collected >= 10) {
        state = STATE.WIN;
        stateTime = 0;
        sfxWin();
        stopMusic();
      }
    }
  });

  for (const e of enemies) {
    const w = e.type === 'cat' ? 16 : 20;
    const h = e.type === 'cat' ? 14 : 16;
    const eRect = { x: e.x + 2, y: GROUND_Y - h, w: w - 4, h: h - 2 };
    if (rectsOverlap(playerRect, eRect)) {
      state = STATE.LOSE;
      stateTime = 0;
      loseReason = e.type === 'cat' ? 'KEDI SİMİTİNİ YEDİ!' : 'KÖPEK SİMİTİNİ YEDİ!';
      sfxLose();
      stopMusic();
      shake = 8;
      break;
    }
  }
}

// ---------- RENDER ----------
function render(t) {
  // screen shake
  ctx.save();
  if (shake > 0) {
    ctx.translate(
      Math.round((Math.random() - 0.5) * shake),
      Math.round((Math.random() - 0.5) * shake)
    );
  }

  drawBackground(scrollX, t);

  // Cypresses (mid-foreground, just behind houses)
  CYPRESSES.forEach(cp => {
    const sx = cp.x - scrollX * 0.95;
    if (sx > -10 && sx < W + 10) drawCypress(sx, GROUND_Y, cp.height);
  });

  // Houses
  HOUSES.forEach(h => {
    const screenX = h.x - scrollX;
    if (screenX > -80 && screenX < W + 10) {
      drawHouse(screenX, GROUND_Y, h.seed);
    }
  });

  // Garlands (between houses, above doors)
  GARLANDS.forEach(g => {
    const sx1 = g.x1 - scrollX;
    const sx2 = g.x2 - scrollX;
    if (sx2 > -10 && sx1 < W + 10) drawGarland(sx1, sx2, g.y, t);
  });

  // Signs
  SIGNS.forEach(s => {
    const screenX = s.x - scrollX;
    if (screenX > -50 && screenX < W + 10) {
      drawSign(screenX, GROUND_Y - 22, s.text);
    }
  });

  // Street
  ctx.fillStyle = C.street;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = C.curb;
  ctx.fillRect(0, GROUND_Y, W, 1);
  ctx.fillStyle = C.streetSh;
  ctx.fillRect(0, GROUND_Y + 1, W, 1);
  // cobblestone
  for (let i = 0; i < W + 8; i += 8) {
    const px = i - (scrollX % 8);
    ctx.fillStyle = C.cobble;
    ctx.fillRect(px, GROUND_Y + 4, 3, 1);
    ctx.fillRect(px + 4, GROUND_Y + 8, 3, 1);
    ctx.fillRect(px + 1, GROUND_Y + 12, 3, 1);
    ctx.fillRect(px + 5, GROUND_Y + 16, 3, 1);
    ctx.fillStyle = C.streetLine;
    ctx.fillRect(px, GROUND_Y + 5, 1, 1);
    ctx.fillRect(px + 4, GROUND_Y + 9, 1, 1);
  }

  // Simits with halo + rotation
  simits.forEach(s => {
    if (s.taken) return;
    const screenX = s.x - scrollX;
    if (screenX > -20 && screenX < W + 10) {
      const offsetY = Math.sin(s.bobPhase) * 2;
      // halo
      const haloA = (Math.sin(t * 0.005 + s.bobPhase) + 1) * 0.5;
      ctx.fillStyle = `rgba(253, 230, 138, ${0.3 + haloA * 0.3})`;
      const cx = screenX + 6, cy = s.y + offsetY + 6;
      for (let i = -8; i <= 8; i++) {
        for (let j = -8; j <= 8; j++) {
          const d2 = i*i + j*j;
          if (d2 >= 36 && d2 <= 64) ctx.fillRect(cx + i, cy + j, 1, 1);
        }
      }
      // rotating sprite
      const frame = Math.floor(t * 0.004 + s.bobPhase) % 4;
      drawSprite(screenX, s.y + offsetY, SIMIT_FRAMES[frame], SIMIT_LEGEND);
    }
  });

  // Enemies with shadow
  enemies.forEach(e => {
    const screenX = e.x - scrollX;
    if (screenX > -20 && screenX < W + 20) {
      // shadow
      ctx.fillStyle = C.shadow;
      const sw = e.type === 'cat' ? 14 : 18;
      ctx.fillRect(screenX + 1, GROUND_Y - 1, sw, 1);
      // sprite
      const frame = Math.floor(e.animTime * 0.08) % 4;
      if (e.type === 'cat') {
        drawSprite(screenX, GROUND_Y - 14, CAT_FRAMES[frame], CAT_LEGEND, e.dir < 0);
      } else {
        drawSprite(screenX, GROUND_Y - 16, DOG_FRAMES[frame], DOG_LEGEND, e.dir < 0);
        // bark bubble
        if (e.type === 'dog' && stateTime - e.barkTime < 40) {
          const bx = screenX + (e.dir < 0 ? -8 : 18);
          const by = GROUND_Y - 22;
          ctx.fillStyle = C.bubble;
          ctx.fillRect(bx, by, 7, 6);
          ctx.fillStyle = C.bubbleSh;
          ctx.fillRect(bx + 6, by + 1, 1, 5);
          ctx.fillStyle = C.dark;
          drawTextTiny(bx + 1, by + 1, '!', C.dark);
        }
      }
    }
  });

  // Player shadow (under feet, scales with jump height)
  const jumpHeight = (GROUND_Y - 22) - player.y;
  const shadowW = Math.max(4, 12 - Math.floor(jumpHeight / 4));
  ctx.fillStyle = C.shadow;
  ctx.fillRect(player.x + 7 - shadowW / 2, GROUND_Y - 1, shadowW, 1);

  // Player (with bobbing)
  let sprite;
  const bobY = player.onGround ? Math.floor(Math.sin(player.animTime * 0.04) * 0.5) : 0;
  if (!player.onGround) {
    sprite = player.jumpPhase === 1 ? HERO_JUMP_UP : HERO_JUMP_DOWN;
  } else {
    const frame = Math.floor(player.animTime * 0.10) % 4;
    sprite = [HERO_RUN_1, HERO_RUN_2, HERO_RUN_3, HERO_RUN_4][frame];
  }
  drawSprite(player.x, player.y + bobY, sprite, HERO_LEGEND);

  // Particles
  drawParticles();

  // HUD
  if (state === STATE.PLAY || state === STATE.WIN) {
    ctx.fillStyle = 'rgba(26, 16, 9, 0.78)';
    ctx.fillRect(3, 3, 78, 16);
    ctx.fillStyle = C.simit;
    ctx.fillRect(3, 3, 78, 1);
    ctx.fillRect(3, 18, 78, 1);
    drawSprite(6, 6, SIMIT_1, SIMIT_LEGEND);
    drawTextTiny(22, 9, `${collected} / 10`, C.sun);
  }

  ctx.restore();

  // CRT scanlines (subtle, drawn over everything)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);

  // Overlays
  if (state === STATE.INTRO) renderIntro(t);
  if (state === STATE.WIN) renderWin(t);
  if (state === STATE.LOSE) renderLose(t);
}

// ---------- DECORATIVE BORDER ----------
function drawDecoBorder() {
  ctx.fillStyle = C.simit;
  ctx.fillRect(4, 4, W - 8, 1);
  ctx.fillRect(4, H - 5, W - 8, 1);
  ctx.fillRect(4, 4, 1, H - 8);
  ctx.fillRect(W - 5, 4, 1, H - 8);
  // corners
  ctx.fillStyle = C.sun;
  for (const [cx, cy] of [[4,4],[W-5,4],[4,H-5],[W-5,H-5]]) {
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
    ctx.fillStyle = C.dark;
    ctx.fillRect(cx, cy, 1, 1);
    ctx.fillStyle = C.sun;
  }
  // dotted decoration
  ctx.fillStyle = C.simit;
  for (let x = 8; x < W - 8; x += 6) {
    ctx.fillRect(x, 6, 1, 1);
    ctx.fillRect(x, H - 7, 1, 1);
  }
  for (let y = 8; y < H - 8; y += 6) {
    ctx.fillRect(6, y, 1, 1);
    ctx.fillRect(W - 7, y, 1, 1);
  }
}

// ---------- INTRO ----------
function renderIntro(t) {
  ctx.fillStyle = 'rgba(20, 12, 8, 0.84)';
  ctx.fillRect(0, 0, W, H);
  drawDecoBorder();

  // Title with sequential bouncing letters
  const title1 = "KAŞ'TA";
  const title2 = 'SİMİT KOŞUSU';
  const w1 = textWidthBig(title1, 2);
  const w2 = textWidthBig(title2, 2);
  for (let i = 0; i < title1.length; i++) {
    const phase = t * 0.005 - i * 0.3;
    const bounce = Math.max(0, Math.sin(phase)) * 3;
    drawTextBig((W - w1) / 2 + i * 4 * 2, 28 - bounce, title1[i], C.sun, 2);
  }
  for (let i = 0; i < title2.length; i++) {
    const phase = t * 0.005 - i * 0.25 - 1;
    const bounce = Math.max(0, Math.sin(phase)) * 3;
    drawTextBig((W - w2) / 2 + i * 4 * 2, 50 - bounce, title2[i], C.simit, 2);
  }

  // Decorative simit (rotating)
  const frame = Math.floor(t * 0.005) % 4;
  drawSprite(W / 2 - 6, 78, SIMIT_FRAMES[frame], SIMIT_LEGEND);

  const lines = [
    '10 SİMİT TOPLA!',
    'KEDİ VE KÖPEKLERDEN KAÇ.',
    '',
    'SPACE / DOKUN  =  ZIPLA',
  ];
  lines.forEach((line, i) => {
    const w = line.length * 4;
    drawTextTiny((W - w) / 2, 100 + i * 8, line, C.white);
  });

  if (Math.floor(t * 0.005) % 2 === 0) {
    const start = '> BAŞLAMAK İÇİN BASIN <';
    const w = start.length * 4;
    drawTextTiny((W - w) / 2, 158, start, C.sun);
  }
}

// ---------- WIN ----------
function renderWin(t) {
  ctx.fillStyle = 'rgba(20, 12, 8, 0.86)';
  ctx.fillRect(0, 0, W, H);
  drawDecoBorder();

  const title = 'OYUNU KAZANDIN!';
  const w = textWidthBig(title, 2);
  for (let i = 0; i < title.length; i++) {
    const bounce = Math.sin(t * 0.006 - i * 0.2) * 2;
    drawTextBig((W - w) / 2 + i * 4 * 2, 38 + bounce, title[i], C.sun, 2);
  }

  const sub = 'AFERIN SANA!';
  const ws = textWidthBig(sub, 2);
  drawTextBig((W - ws) / 2, 64, sub, C.simit, 2);

  // celebration: simits flying around
  for (let i = 0; i < 10; i++) {
    const phase = t * 0.005 + i * 0.6;
    const px = W / 2 - 5 + Math.cos(phase) * 80;
    const py = 110 + Math.sin(phase * 1.3) * 18;
    const f = Math.floor(t * 0.006 + i) % 4;
    drawSprite(Math.round(px), Math.round(py), SIMIT_FRAMES[f], SIMIT_LEGEND);
  }

  drawTextTiny((W - 'KAŞ MANZARASI: 10/10'.length * 4) / 2, 138, 'KAŞ MANZARASI: 10/10', C.white);

  if (stateTime > 60 && Math.floor(t * 0.005) % 2 === 0) {
    const replay = '> TEKRAR OYNA <';
    drawTextTiny((W - replay.length * 4) / 2, 158, replay, C.sun);
  }
}

// ---------- LOSE ----------
function renderLose(t) {
  ctx.fillStyle = 'rgba(20, 12, 8, 0.86)';
  ctx.fillRect(0, 0, W, H);
  drawDecoBorder();

  const title = 'OYUN BİTTİ';
  const w = textWidthBig(title, 2);
  drawTextBig((W - w) / 2, 38, title, '#ef4444', 2);

  const reason = loseReason;
  const wr = reason.length * 4;
  drawTextTiny((W - wr) / 2, 70, reason, C.white);

  const stat = `TOPLADIĞIN: ${collected} / 10`;
  drawTextTiny((W - stat.length * 4) / 2, 88, stat, C.sun);

  // sad simit (broken-looking)
  drawSprite(W / 2 - 6, 100, SIMIT_3, SIMIT_LEGEND);
  drawTextTiny(W / 2 - 8, 116, ':-(', C.white);

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
