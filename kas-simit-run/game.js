// Kaş'ta Simit Koşusu — 8-bit pixel runner v2 (game-art pass)
// Vanilla Canvas + Web Audio. No dependencies.

(() => {
'use strict';

const W = 320, H = 180;
const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- PALETTE (Kaş sunset over the Aegean) ----------
const C = {
  // sunset sky: deep amber → rose → lavender → indigo
  sky1: '#fcc88a', // top warm gold
  sky2: '#f48a5a', // orange
  sky3: '#e85a7c', // rose
  sky4: '#9b5fb5', // violet
  sky5: '#5a4080', // deep horizon violet
  sun:  '#ff7d3a', sunGlow: '#ffae5a', sunRay: '#ffd58a', sunCore: '#fff0c4',
  cloud: '#ff9870', cloudSh: '#c45f6a', cloudHi: '#ffd0a8',
  // sea reflecting sunset
  seaFar: '#5a3a78', seaMid: '#7a3a78', seaNear: '#3a2858',
  seaFoam: '#ffd0a8', seaWave: '#c4567a', seaGold: '#ffae5a',
  mtn1: '#3e2a5a', mtn1Hi: '#5a3e7a', mtn2: '#22153e', mtn2Hi: '#3a2858',
  hill: '#1a0e2a', hillHouse: '#3a2858', hillRoof: '#7a2f17',
  // sunset-lit walls: warm but in shadow
  white: '#e8c8a4', whiteSh: '#a8845a', whiteHi: '#fce0b0',
  ochre: '#c4683a', ochreSh: '#7a3a1f', ochreHi: '#e88858',
  blue: '#9b6f9c', blueSh: '#5a3e6a',
  roof: '#8e3520', roofSh: '#4f1a10', roofHi: '#c4563a',
  win:  '#1e1430', winLit: '#ffc870', winFrame: '#a88458', winGlass: '#3a2a4a',
  shut: '#1a1028', shutOpen: '#5a4a30',
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

// ---------- SUN (big sunset disc) ----------
function drawSun(x, y, t) {
  // outer glow gradient (large soft halo)
  for (let r = 28; r > 14; r--) {
    const a = (28 - r) / 14;
    const alpha = (1 - r/28) * 0.5;
    ctx.fillStyle = `rgba(255, 174, 90, ${alpha})`;
    for (let ang = 0; ang < Math.PI * 2; ang += 0.05) {
      const px = Math.round(x + Math.cos(ang) * r);
      const py = Math.round(y + Math.sin(ang) * r);
      ctx.fillRect(px, py, 1, 1);
    }
  }
  // animated rays (faint, sunset has long horizontal rays)
  const rayCount = 10;
  ctx.fillStyle = C.sunRay;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / rayCount) * Math.PI * 2 + t * 0.0003;
    const len = 22 + Math.sin(t * 0.002 + i) * 4;
    for (let r = 16; r < 16 + len; r += 2) {
      const px = Math.round(x + Math.cos(a) * r);
      const py = Math.round(y + Math.sin(a) * r);
      ctx.fillRect(px, py, 1, 1);
    }
  }
  // bright halo ring
  ctx.fillStyle = C.sunGlow;
  const rh = 15;
  for (let i = -rh; i <= rh; i++) {
    for (let j = -rh; j <= rh; j++) {
      const d2 = i*i + j*j;
      if (d2 <= rh*rh && d2 >= (rh-2)*(rh-2)) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  // disc — big sunset orange
  ctx.fillStyle = C.sun;
  const r2 = 12;
  for (let i = -r2; i <= r2; i++) {
    for (let j = -r2; j <= r2; j++) {
      if (i*i + j*j <= r2*r2) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  // bright core
  ctx.fillStyle = C.sunGlow;
  for (let i = -7; i <= 7; i++) {
    for (let j = -7; j <= 7; j++) {
      if (i*i + j*j <= 49) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  ctx.fillStyle = C.sunCore;
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      if (i*i + j*j <= 9) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
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

// ---------- ANTIK TIYATRO (Hellenistic theater of Kaş) ----------
function drawTheater(x, baseY) {
  const cx = x + 65;
  const stoneLight = '#d9c8a0';
  const stoneMid   = '#b89d6c';
  const stoneDark  = '#7a6244';
  const stoneShade = '#4a3a26';
  const grass      = '#3e4a2a';

  // Hill rising behind the theater (ancient stone hillside)
  ctx.fillStyle = '#4a3826';
  for (let i = -8; i < 138; i++) {
    const norm = (i - 65) / 70;
    const hgt = Math.round(36 * Math.max(0, 1 - norm * norm * 0.85));
    if (hgt > 0) ctx.fillRect(x + i, baseY - hgt - 4, 1, hgt + 4);
  }
  // hill highlight rim
  ctx.fillStyle = '#6a5238';
  for (let i = -8; i < 138; i++) {
    const norm = (i - 65) / 70;
    const hgt = Math.round(36 * Math.max(0, 1 - norm * norm * 0.85));
    if (hgt > 0) ctx.fillRect(x + i, baseY - hgt - 4, 1, 1);
  }

  // Tiered stone seating (cavea) — solid trapezoid-ish stone shape, stepped tier lines on top.
  // Trapezoid: narrow at top (back rows), wider at bottom (front rows).
  // y ranges from baseY-32 (top, smallest) to baseY-8 (bottom, widest).
  const tierTopY = baseY - 32;
  const tierBotY = baseY - 8;
  const widthFn = (y) => {
    const t = (y - tierTopY) / (tierBotY - tierTopY); // 0..1
    return Math.round(36 + t * 60); // 36 wide at top → 96 wide at bottom
  };
  // 1) Fill stone body
  for (let y = tierTopY; y <= tierBotY; y++) {
    const w = widthFn(y);
    ctx.fillStyle = stoneMid;
    ctx.fillRect(cx - Math.floor(w / 2), y, w, 1);
  }
  // 2) Round the upper corners (overpaint with hill color) for arc feel
  const hillBg = '#4a3826';
  for (let y = tierTopY; y < tierTopY + 6; y++) {
    const t = (y - tierTopY) / 6;
    const cornerCut = Math.round((1 - t) * 6);
    const w = widthFn(y);
    const left = cx - Math.floor(w / 2);
    ctx.fillStyle = hillBg;
    ctx.fillRect(left, y, cornerCut, 1);
    ctx.fillRect(left + w - cornerCut, y, cornerCut, 1);
  }
  // 3) Tier lines (shadow grooves separating rows of seats)
  const tierYs = [tierTopY + 4, tierTopY + 9, tierTopY + 14, tierTopY + 19];
  tierYs.forEach(ty => {
    const w = widthFn(ty);
    ctx.fillStyle = stoneShade;
    ctx.fillRect(cx - Math.floor(w / 2) + 1, ty, w - 2, 1);
  });
  // 4) Top highlight on each tier (light edge above the shadow line)
  tierYs.forEach(ty => {
    const w = widthFn(ty - 1);
    ctx.fillStyle = stoneLight;
    ctx.fillRect(cx - Math.floor(w / 2) + 2, ty - 1, w - 4, 1);
  });
  // 5) Top crown (back row of seats)
  ctx.fillStyle = stoneLight;
  const wTop = widthFn(tierTopY) - 4;
  ctx.fillRect(cx - Math.floor(wTop / 2) + 1, tierTopY + 1, wTop - 2, 1);

  // Vertical kerkides (radial aisle dividers between wedges)
  ctx.fillStyle = stoneShade;
  for (let k = -2; k <= 2; k++) {
    if (k === 0) continue;
    const a = (k / 2.5) * 0.95; // angular spread
    for (let r = 8; r < 56; r++) {
      const px = Math.round(cx + Math.sin(a) * r);
      const py = Math.round(baseY - 6 - Math.cos(a) * r * 0.32);
      if (py >= baseY - 30 && py <= baseY - 6) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  // Stage / orchestra (flat platform at front)
  ctx.fillStyle = stoneLight;
  ctx.fillRect(cx - 18, baseY - 5, 36, 4);
  ctx.fillStyle = stoneMid;
  ctx.fillRect(cx - 18, baseY - 2, 36, 1);
  ctx.fillStyle = stoneShade;
  ctx.fillRect(cx - 18, baseY - 1, 36, 1);
  // stage edge stones
  for (let i = 0; i < 36; i += 4) {
    ctx.fillStyle = stoneShade;
    ctx.fillRect(cx - 18 + i, baseY - 5, 1, 4);
  }

  // Two ruined columns flanking the stage (skene remnants)
  for (const dx of [-22, 22]) {
    // column shaft
    ctx.fillStyle = stoneLight;
    ctx.fillRect(cx + dx, baseY - 16, 3, 11);
    ctx.fillStyle = stoneDark;
    ctx.fillRect(cx + dx + 2, baseY - 16, 1, 11);
    // capital
    ctx.fillStyle = stoneMid;
    ctx.fillRect(cx + dx - 1, baseY - 17, 5, 2);
    ctx.fillStyle = stoneShade;
    ctx.fillRect(cx + dx - 1, baseY - 18, 5, 1);
    // base
    ctx.fillStyle = stoneMid;
    ctx.fillRect(cx + dx - 1, baseY - 5, 5, 1);
  }
  // Broken column tops (one shorter)
  ctx.fillStyle = stoneLight;
  ctx.fillRect(cx - 30, baseY - 8, 2, 3);
  ctx.fillStyle = stoneDark;
  ctx.fillRect(cx - 28, baseY - 8, 1, 3);

  // A few tiny audience figures sitting on the upper tiers (pixel dots)
  ctx.fillStyle = '#2a1810';
  const audience = [
    [-22, -14], [-12, -16], [-2, -18], [8, -16], [18, -14],
    [-30, -10], [22, -12], [-18, -22], [-6, -24], [10, -22],
  ];
  audience.forEach(([dx, dy]) => {
    ctx.fillRect(cx + dx, baseY + dy, 1, 1);
  });

  // Cypresses flanking the theater
  drawCypress(x - 6, baseY, 22);
  drawCypress(x + 130, baseY, 24);
  drawCypress(x - 14, baseY, 16);

  // Welcome sign
  drawSign(x + 38, baseY - 44, 'ANTİK TİYATRO');
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
  // sunset sky gradient (5 stops: gold → orange → rose → violet → indigo at horizon)
  const stops = [
    [0,  0xfc, 0xc8, 0x8a],
    [18, 0xf4, 0x8a, 0x5a],
    [36, 0xe8, 0x5a, 0x7c],
    [54, 0x9b, 0x5f, 0xb5],
    [70, 0x5a, 0x40, 0x80],
    [78, 0x3a, 0x28, 0x58],
  ];
  for (let y = 0; y < 78; y++) {
    let r=0, g=0, b=0;
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
  // big setting sun, low on horizon, partially behind sea
  drawSun(W - 70, 62, t);
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
  // sea band — sunset reflection
  ctx.fillStyle = C.seaFar;
  ctx.fillRect(0, 75, W, 4);
  ctx.fillStyle = C.seaMid;
  ctx.fillRect(0, 79, W, 4);
  ctx.fillStyle = C.seaNear;
  ctx.fillRect(0, 83, W, GROUND_Y - 83);
  // golden sun-trail on water (vertical column under sun, dancing)
  const sunX = W - 70;
  for (let y = 78; y < GROUND_Y; y++) {
    const flicker = Math.sin(t * 0.008 + y * 0.5) * 0.5 + 0.5;
    const widen = (y - 78) * 0.4;
    const w = Math.max(2, Math.round(6 + widen + flicker * 3));
    const a = Math.max(0, 1 - (y - 78) / 40);
    if (a > 0.05) {
      ctx.fillStyle = `rgba(255, 174, 90, ${a * 0.7})`;
      ctx.fillRect(sunX - w / 2, y, w, 1);
      // bright streak in center
      if ((Math.floor(t * 0.01) + y) % 5 === 0) {
        ctx.fillStyle = C.sunRay;
        ctx.fillRect(sunX - 1, y, 2, 1);
      }
    }
  }
  // animated waves — pink/violet ripples
  ctx.fillStyle = C.seaWave;
  for (let y = 84; y < GROUND_Y - 2; y += 4) {
    for (let x = 0; x < W; x += 10) {
      const phase = (x * 0.1 + t * 0.005 + y) % (Math.PI * 2);
      const off = Math.floor(Math.sin(phase) * 2);
      ctx.fillRect(x + off, y, 4, 1);
    }
  }
  // gold foam sparkles (reflect sun)
  for (let i = 0; i < 14; i++) {
    const sx = ((i * 47 + Math.floor(t * 0.04)) % (W + 40)) - 20;
    const sy = 84 + ((i * 13) % 18);
    if ((Math.floor(t * 0.005) + i) % 4 === 0) {
      // closer to sun trail = brighter gold
      const distFromSun = Math.abs(sx - sunX);
      ctx.fillStyle = distFromSun < 40 ? C.sunRay : C.seaFoam;
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
const LEVEL_LENGTH = 2950;
const GROUND_Y = 158;

// Antik Tiyatro of Kaş — Hellenistic theater carved into the hillside (1st c. BC)
// Real landmark, opens the level as a "welcome to Kaş" backdrop.
const THEATER = { x: 20, w: 130 };

const HOUSES = [];
{
  const widths = [44, 56, 38, 60, 48, 50, 42, 64];
  // First house starts at x=210 to leave room for the theater
  for (let x = 210, i = 0; x < LEVEL_LENGTH; i++) {
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

// ---------- AUDIO ENGINE — Turkish Hicaz makam, 9/8 aksak ----------
// Hicaz scale (Phrygian Dominant) on D: D, Eb, F#, G, A, Bb, C#, D
// This makam is the sound of mediterranean/Anatolian sunset music.
let audioCtx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let ambientNode = null;
let ambientGain = null;
let musicTimer = null;
let footstepTimer = null;
let intensityLevel = 0; // 0 = intro (bass+lead), 1 = play (full mix)

function ensureAudio() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.6;
    musicGain.connect(masterGain);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.85;
    sfxGain.connect(masterGain);
  } catch(e) { audioCtx = null; }
  return audioCtx;
}

// duck music briefly when SFX plays
function duckMusic(amount = 0.4, dur = 0.15) {
  if (!musicGain) return;
  const ac = audioCtx;
  const now = ac.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  musicGain.gain.linearRampToValueAtTime(amount, now + 0.02);
  musicGain.gain.linearRampToValueAtTime(0.6, now + dur);
}

function tone(freq, duration, type = 'square', volume = 0.08, dest = null, attack = 0.005) {
  const ac = ensureAudio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(gain).connect(dest || sfxGain || ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration + 0.02);
  return osc;
}

// Saz-like pluck: square wave with a tiny pitch glide (taksim feel)
function pluck(freq, duration, volume = 0.05, dest = null) {
  const ac = ensureAudio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq * 1.02, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq, ac.currentTime + 0.04);
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(gain).connect(dest || musicGain);
  osc.start();
  osc.stop(ac.currentTime + duration + 0.02);
}

// Darbuka-like percussion: short noise burst with bandpass
let noiseBuffer = null;
function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const ac = ensureAudio();
  if (!ac) return null;
  const length = ac.sampleRate * 0.5;
  noiseBuffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}
function drum(type = 'doum', volume = 0.18, dest = null) {
  const ac = ensureAudio();
  if (!ac) return;
  const buf = getNoiseBuffer();
  if (!buf) return;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  if (type === 'doum') {
    // low, deep — bass drum
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 6;
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    // also add a sine thump
    const thump = ac.createOscillator();
    const thumpGain = ac.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, ac.currentTime);
    thump.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.08);
    thumpGain.gain.setValueAtTime(volume * 0.8, ac.currentTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    thump.connect(thumpGain).connect(dest || musicGain);
    thump.start();
    thump.stop(ac.currentTime + 0.15);
  } else if (type === 'tek') {
    // higher slap — snare-like
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    filter.Q.value = 2;
    gain.gain.setValueAtTime(volume * 0.6, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
  } else if (type === 'ka') {
    // dampened slap
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 4;
    gain.gain.setValueAtTime(volume * 0.4, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.04);
  }
  src.connect(filter).connect(gain).connect(dest || musicGain);
  src.start();
  src.stop(ac.currentTime + 0.3);
}

// ---------- SFX ----------
function sfxJump() {
  duckMusic();
  tone(330, 0.04, 'square', 0.07);
  setTimeout(() => tone(523, 0.06, 'square', 0.06), 30);
  setTimeout(() => tone(659, 0.05, 'triangle', 0.04), 70);
}
function sfxPickup() {
  duckMusic(0.3, 0.25);
  // Hicaz-flavoured ascending chime: D, F#, A, D
  const notes = [587.33, 739.99, 880, 1174.66];
  notes.forEach((n, i) => setTimeout(() => tone(n, 0.10, 'square', 0.08), i * 45));
  setTimeout(() => tone(1567.98, 0.12, 'triangle', 0.05), 200);
}
function sfxLose() {
  // descending chromatic minor cadence, sad
  const notes = [392, 369.99, 349.23, 329.63, 311.13, 293.66];
  notes.forEach((n, i) => {
    setTimeout(() => tone(n, 0.18, 'sawtooth', 0.09), i * 100);
  });
  // bass thud
  setTimeout(() => drum('doum', 0.3, sfxGain), 0);
  setTimeout(() => drum('doum', 0.25, sfxGain), 600);
}
function sfxWin() {
  // Hicaz arpeggio fanfare: D, F#, A, C#, D + drums
  const notes = [587.33, 739.99, 880, 1108.73, 1174.66];
  notes.forEach((n, i) => {
    setTimeout(() => {
      pluck(n, 0.25, 0.08, sfxGain);
      pluck(n / 2, 0.25, 0.04, sfxGain);
    }, i * 130);
  });
  // celebratory drum roll
  for (let i = 0; i < 6; i++) {
    setTimeout(() => drum(i % 2 === 0 ? 'doum' : 'tek', 0.15, sfxGain), 700 + i * 80);
  }
  setTimeout(() => {
    pluck(587.33, 0.5, 0.1, sfxGain);
    pluck(880, 0.5, 0.06, sfxGain);
    pluck(1174.66, 0.5, 0.08, sfxGain);
  }, 1200);
}

// Cat meow — pitch sweep on triangle
function sfxMeow() {
  duckMusic();
  const ac = ensureAudio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(700, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(550, ac.currentTime + 0.08);
  osc.frequency.exponentialRampToValueAtTime(800, ac.currentTime + 0.18);
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0.07, ac.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.25);
  osc.connect(gain).connect(sfxGain);
  osc.start();
  osc.stop(ac.currentTime + 0.3);
}

// Dog bark — gruff square with vibrato + noise burst
function sfxBark() {
  duckMusic();
  const ac = ensureAudio();
  if (!ac) return;
  // bark 1
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(180, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, ac.currentTime + 0.08);
  gain.gain.setValueAtTime(0.08, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
  osc.connect(gain).connect(sfxGain);
  osc.start();
  osc.stop(ac.currentTime + 0.13);
  // noise component (gruff)
  drum('tek', 0.1, sfxGain);
}

// Bird chirp
function sfxBirdChirp() {
  const ac = ensureAudio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(2400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(3200, ac.currentTime + 0.04);
  osc.frequency.exponentialRampToValueAtTime(2200, ac.currentTime + 0.08);
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0.03, ac.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.10);
  osc.connect(gain).connect(sfxGain);
  osc.start();
  osc.stop(ac.currentTime + 0.12);
}

// Footstep tap
function sfxFootstep() {
  const ac = ensureAudio();
  if (!ac) return;
  const buf = getNoiseBuffer();
  if (!buf) return;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  filter.type = 'bandpass';
  filter.frequency.value = 600 + Math.random() * 200;
  filter.Q.value = 3;
  gain.gain.setValueAtTime(0.025, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.05);
  src.connect(filter).connect(gain).connect(sfxGain);
  src.start();
  src.stop(ac.currentTime + 0.08);
}

// Ambient: low-frequency sea drone
function startAmbient() {
  const ac = ensureAudio();
  if (!ac || ambientNode) return;
  // pink-ish noise filtered low — sounds like distant waves
  const buf = getNoiseBuffer();
  if (!buf) return;
  ambientNode = ac.createBufferSource();
  ambientNode.buffer = buf;
  ambientNode.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 280;
  filter.Q.value = 1.5;
  ambientGain = ac.createGain();
  ambientGain.gain.value = 0;
  ambientGain.gain.linearRampToValueAtTime(0.05, ac.currentTime + 1.5);
  // slow LFO for wave breathing
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = 0.18;
  lfoGain.gain.value = 0.025;
  lfo.connect(lfoGain).connect(ambientGain.gain);
  lfo.start();
  ambientNode.connect(filter).connect(ambientGain).connect(masterGain);
  ambientNode.start();
}
function stopAmbient() {
  if (!ambientNode) return;
  const ac = audioCtx;
  ambientGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
  setTimeout(() => {
    try { ambientNode.stop(); } catch(e) {}
    ambientNode = null;
  }, 600);
}

// ---------- MUSIC: Hicaz makam, 9/8 aksak (3+2+2+2 grouping) ----------
// Hicaz scale on D: D=293.66, Eb=311.13, F#=369.99, G=392, A=440, Bb=466.16, C#=554.37, D=587.33
// Lower octave for bass: D2=73.42, A2=110, F#2=92.5, G2=98, etc.
const HZ = {
  D3: 146.83, Eb3: 155.56, F3: 174.61, F_3: 184.99, G3: 196, A3: 220, Bb3: 233.08, C4: 261.63, C_4: 277.18, D4: 293.66, Eb4: 311.13, F4: 349.23, F_4: 369.99, G4: 392, A4: 440, Bb4: 466.16, C5: 523.25, C_5: 554.37, D5: 587.33, Eb5: 622.25, F_5: 739.99, G5: 783.99, A5: 880,
};
// 9/8 aksak: 9 sixteenth-notes per measure grouped as 2+2+2+3 or 3+2+2+2 — feels lopsided in a good way
// Each "step" = 1 sixteenth at ~140 BPM => ~107ms per step.
// Lead melody (32 steps = 4 measures of 8/8 + dot, simplified to 32 even sixteenths).
// '.' = rest, otherwise frequency name from HZ
const MUSIC_LEAD = [
  // measure 1 — taksim opening on tonic
  'D4', '.',  'Eb4', 'D4', 'F_4', '.',  'G4',  '.',
  // measure 2 — climb
  'A4', 'G4', 'F_4','Eb4','D4',  '.',  'F_4', 'G4',
  // measure 3 — high register
  'A4', '.',  'Bb4','A4', 'G4',  'F_4','Eb4','D4',
  // measure 4 — return to tonic with hicaz characteristic Eb-F#
  'C_4','D4', 'Eb4','D4', 'C_4', 'D4', '.',   '.',
];
const MUSIC_BASS = [
  // 9/8 doum-tek pattern in pitched bass — D pedal with A movement
  'D3', '.',  '.',  'A3', '.',  '.',  'D3', '.',
  'D3', '.',  '.',  'A3', '.',  '.',  'F_3','G3',
  'A3', '.',  '.',  'A3', '.',  '.',  'D3', '.',
  'D3', '.',  '.',  'G3', '.',  'A3', 'D3', '.',
];
// Drums per step: 'D' = doum (deep), 'T' = tek, 'K' = ka, '.' = rest
// 9/8 aksak feels: D . T . K . D T . in 9 — adapted to 8-step phrase with accents
const MUSIC_DRUMS = [
  'D','.','T','.','K','.','D','T',
  'D','.','T','.','K','.','D','T',
  'D','.','T','.','K','T','D','T',
  'D','T','K','T','D','.','T','.',
];

let musicStep = 0;
function startMusic() {
  if (musicTimer) return;
  const ac = ensureAudio();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume();

  const STEP_MS = 107; // ~140 BPM sixteenths

  const tick = () => {
    const i = musicStep % MUSIC_LEAD.length;
    // Lead saz (always plays)
    const leadNote = MUSIC_LEAD[i];
    if (leadNote !== '.') {
      pluck(HZ[leadNote], 0.45, 0.06);
      // octave doubling for highlights
      if (i % 4 === 0) pluck(HZ[leadNote] * 2, 0.35, 0.025);
    }
    // Bass triangle (always plays)
    const bassNote = MUSIC_BASS[i];
    if (bassNote !== '.') {
      const ac2 = audioCtx;
      const osc = ac2.createOscillator();
      const gain = ac2.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(HZ[bassNote], ac2.currentTime);
      gain.gain.setValueAtTime(0, ac2.currentTime);
      gain.gain.linearRampToValueAtTime(0.07, ac2.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac2.currentTime + 0.25);
      osc.connect(gain).connect(musicGain);
      osc.start();
      osc.stop(ac2.currentTime + 0.3);
    }
    // Drums (only at intensity 1)
    if (intensityLevel >= 1) {
      const drumHit = MUSIC_DRUMS[i];
      if (drumHit === 'D') drum('doum', 0.16);
      else if (drumHit === 'T') drum('tek', 0.10);
      else if (drumHit === 'K') drum('ka', 0.08);
    }
    musicStep++;
  };

  musicTimer = setInterval(tick, STEP_MS);
  tick();
}
function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
function setIntensity(level) {
  intensityLevel = level;
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
  lastStepFrame: -1,
};
let scrollX = 0;
let collected = 0;
let stateTime = 0;
let simits = SIMIT_POSITIONS.map(p => ({ ...p, taken: false, bobPhase: Math.random() * Math.PI * 2 }));
let enemies = ENEMIES.map(e => ({ ...e, baseX: e.x, animTime: 0, barkTime: -100, greeted: false }));
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
  enemies = ENEMIES.map(e => ({ ...e, baseX: e.x, animTime: 0, barkTime: -100, greeted: false }));
  particles.length = 0;
  shake = 0;
  player.lastStepFrame = -1;
}

// ---------- INPUT ----------
function attemptJump() {
  if (state === STATE.INTRO) {
    state = STATE.PLAY;
    stateTime = 0;
    setIntensity(1);
    startMusic();
    startAmbient();
    return;
  }
  if (state === STATE.WIN || state === STATE.LOSE) {
    if (stateTime > 60) {
      resetGame();
      state = STATE.INTRO;
      stopMusic();
      stopAmbient();
      setIntensity(0);
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
    // Cats: lively (faster sway, smaller range). Dogs: slow lumbering trot.
    if (e.type === 'cat') {
      e.x = e.baseX + Math.sin(e.animTime * 0.025) * 16 * (e.dir);
    } else {
      e.x = e.baseX + Math.sin(e.animTime * 0.010) * 10 * (e.dir);
    }
    const screenDist = Math.abs((e.x - scrollX) - player.x);
    // bark/meow when enemy enters screen (~80px ahead)
    if (screenDist < 100 && screenDist > 80 && !e.greeted) {
      e.greeted = true;
      if (e.type === 'dog') {
        e.barkTime = stateTime;
        sfxBark();
      } else {
        sfxMeow();
      }
    }
    // random barks for nearby dogs
    if (e.type === 'dog' && screenDist < 120 && Math.random() < 0.002) {
      e.barkTime = stateTime;
      sfxBark();
    }
  });

  // Footstep on each run-cycle ground frame
  if (player.onGround) {
    const stepFrame = Math.floor(player.animTime * 0.10) % 4;
    if (stepFrame !== player.lastStepFrame && (stepFrame === 0 || stepFrame === 2)) {
      sfxFootstep();
    }
    player.lastStepFrame = stepFrame;
  }

  // Random bird chirps
  if (Math.random() < 0.004) sfxBirdChirp();

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
        stopAmbient();
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
      stopAmbient();
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

  // Antique theater (foreground, before first house)
  {
    const tx = THEATER.x - scrollX;
    if (tx > -150 && tx < W + 10) drawTheater(tx, GROUND_Y);
  }

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
      // sprite — cats animate faster than dogs (dogs lumber)
      const frameRate = e.type === 'cat' ? 0.08 : 0.045;
      const frame = Math.floor(e.animTime * frameRate) % 4;
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
