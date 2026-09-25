// Pixel-art sprite definitions. Each grid row is a string; '.' is transparent,
// every other character maps to a color in the sprite's palette.
// `mirror` rows hold the left half only and are reflected to build the full row
// (odd-width sprites include the center column as the last character).

export const SPRITES = {
  player: {
    scale: 2,
    mirror: 'even',
    palette: { c: 0x4de3ff, d: 0x1a6b80, w: 0xe8fdff, o: 0xffb04d },
    rows: [
      '.....d',
      '.....c',
      '....dc',
      '....cw',
      '...dcw',
      '...ccc',
      '..dccc',
      '.dcccc',
      'dccdcc',
      'dcd.dc',
      'dd..od',
      '....o.',
    ],
  },

  enemy_drone: {
    scale: 2,
    palette: { r: 0xff4d4d, d: 0x8a1f1f, y: 0xffe14d },
    rows: [
      'dd....dd',
      'drr..rrd',
      'drrrrrrd',
      '.rryyrr.',
      '.rrrrrr.',
      '..rrrr..',
      '...rr...',
      '...dd...',
    ],
  },

  enemy_gunner: {
    scale: 2,
    mirror: 'odd',
    palette: { o: 0xff9640, d: 0x8a4a14, y: 0xfff0b0, g: 0x9a9aa8 },
    rows: [
      'd....',
      'do.oo',
      'doooo',
      '.ooyy',
      '.oooo',
      '..ooo',
      '...og',
      '....g',
      '....g',
    ],
  },

  enemy_weaver: {
    scale: 2,
    mirror: 'odd',
    palette: { m: 0xb34dff, d: 0x5a1f80, l: 0xe0b0ff },
    rows: [
      'd...d',
      'dm.mm',
      'dmmmm',
      '.mmll',
      '..mml',
      '.mmmm',
      'dm..m',
      'd....',
      '.....',
    ],
  },

  enemy_bulwark: {
    scale: 2,
    mirror: 'even',
    palette: { m: 0x3dbf5a, d: 0x1d6b2e, l: 0xa8f0b8, g: 0x9a9aa8 },
    rows: [
      '..ddddd',
      '.dmmmmm',
      'dmmmmmm',
      'dmllmmm',
      'dmllmmd',
      'dmmmmdl',
      'dmmmmdl',
      'dmmmmmd',
      'dmmmmmm',
      '.dmmmmm',
      '..dmmmm',
      '...g..g',
      '...g..g',
      '.......',
    ],
  },

  boss_sentinel: {
    scale: 2,
    mirror: 'even',
    palette: {
      r: 0xc23b3b, d: 0x7a1f1f, k: 0x3a0c0c, l: 0xff8a7a,
      y: 0xffe14d, w: 0xffffff, g: 0x9a9aa8,
    },
    rows: [
      '................',
      '....yy..........',
      '...dyyd......ddd',
      '...dddd....ddrrr',
      '...drrd..ddrrrrr',
      '...drrdddrrrllll',
      '..ddrrrrrrrlllll',
      '.drrrrrrrrrrrrrr',
      'drrrrrrrrrrrrrrr',
      'drrlllrrrrrdddkk',
      'drrlllrrrrdkkkkk',
      'drrrrrrrrdkkyyyy',
      'dddrrrrrrdkyyyww',
      'dggdrrrrrdkyyyww',
      'dggdrrrrrdkkyyyy',
      'dggdrrrrrrdkkkkk',
      'dggdrrrrrrrdddkk',
      'dggdrrrrrrrrrrrr',
      'dggddrrrlllrrrrr',
      'dggd.drrrrrrrrrr',
      'dggd..drrrrrrrrr',
      'dkkd...drrrrrrrr',
      '.kk.....drrrrrrr',
      '.kk......drrrrrr',
      '..........drrrrr',
      '...........drrrr',
      '............drrr',
      '.............drr',
      '..............dd',
      '................',
      '................',
      '................',
    ],
  },

  player_bullet: {
    scale: 2,
    palette: { w: 0xfffbe0, y: 0xffe14d },
    rows: ['ww', 'yy', 'yy', 'yy', 'yy'],
  },

  pickup_upgrade: {
    scale: 1,
    palette: { g: 0xffd700, y: 0xfff6a8, d: 0x9a7a00 },
    rows: [
      '......yy......',
      '.....yggy.....',
      '....yggggy....',
      '...ygggdggy...',
      '..ygggd.dggy..',
      '.ygggd...dggy.',
      'ygggd.yy.dgggy',
      'dggd.yggy.dggd',
      '.dd.yggggy.dd.',
      '...ygggdggy...',
      '..ygggd.dggy..',
      '.ygggd...dggy.',
      'ygggd.....dggy',
      'ddd........ddd',
    ],
  },

  particle: {
    scale: 2,
    palette: { w: 0xffffff },
    rows: ['ww', 'ww'],
  },

  star: {
    scale: 1,
    palette: { w: 0xffffff },
    rows: ['w'],
  },
};

// 6x6 core-and-rim dots, generated once per color.
export const ENEMY_BULLET_SHAPE = [
  '..rr..',
  '.rccr.',
  'rccccr',
  'rccccr',
  '.rccr.',
  '..rr..',
];

export const ENEMY_BULLET_COLORS = {
  ebullet_orange: { rim: 0xff9640, core: 0xfff0d0 },
  ebullet_purple: { rim: 0xb34dff, core: 0xf2dcff },
  ebullet_green: { rim: 0x3dbf5a, core: 0xdcffe4 },
  ebullet_boss: { rim: 0xff3b3b, core: 0xffe0e0 },
};

// 6x6 glyphs drawn in white on top of each ability pickup's diamond.
export const ABILITY_GLYPHS = {
  shield: [
    '.####.',
    '##..##',
    '#....#',
    '#....#',
    '##..##',
    '.####.',
  ],
  nova: [
    '#.##.#',
    '.####.',
    '######',
    '######',
    '.####.',
    '#.##.#',
  ],
  rapid: [
    '...##.',
    '..##..',
    '.####.',
    '..##..',
    '.##...',
    '.#....',
  ],
  spread: [
    '#.##.#',
    '#.##.#',
    '.####.',
    '..##..',
    '..##..',
    '..##..',
  ],
  overdrive: [
    '######',
    '.####.',
    '..##..',
    '..##..',
    '.####.',
    '######',
  ],
};
