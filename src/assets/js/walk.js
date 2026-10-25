// Home page hero: a walk down the factory aisle. GRC pieces stand on the left and FRP on the right, with
// someone at work at every bay. Scrolling walks forward and the pointer turns your head.
// Everything is drawn on one canvas each frame, which stays smooth while scrolling. The product links stay
// in the page (.walk__list) for keyboards, screen readers and search engines.
(() => {
  const walk = document.querySelector('[data-walk]');
  const canvas = walk && walk.querySelector('.walk__canvas');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return;
  const motion = document.documentElement.classList.contains('motion');
  const view = walk.querySelector('.walk__view');
  const copy = walk.querySelector('.walk__copy');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const ease = (t) => t * t * (3 - 2 * t);
  const wave = (t) => 1 - Math.abs((((t % 2) + 2) % 2) - 1); // 0, 1, 0 every 2
  const TAU = Math.PI * 2;

  const INK = '#24143A';
  const SAND = '#F8EFE6';
  const OCHRE = '#FFA24C';
  const STONE = '#C6C1B8';
  const STONE_DEEP = '#ADA79D';
  const GEL = '#A9DCD6';
  const GEL_DEEP = '#86C6BE';
  const BEAM = '#2C1849';
  const STEEL = '#9A8FA8';

  // ---------- The factory, in world units (a person is 17.5 tall) ----------
  // x runs right, y runs down from eye level, d is the depth from the entrance.
  const EYE = 20;        // eye height above the floor
  const ROOF = 66;       // wall height
  const Z0 = 50;         // first bay
  const GAP = 56;        // bay to bay
  const BAYS = 8;
  const END = 540;       // far wall, with the open door
  const BACK = 90;       // the room reaches this far behind the entrance
  const START = -40;     // where you stand before the walk
  const STOP = 390;      // where the walk ends, in front of the casting bay
  const F = 60;          // focal length
  const NEAR = 2;
  const PLINTH = 4;
  const TOP = EYE - ROOF;
  let HALF = 54;         // half the aisle width
  let INSET = 16;        // from the wall to the middle of each product
  let SIZE = 1;          // product size

  // ---------- Camera ----------
  const cam = { d: START, to: START, yaw: 0, yawTo: 0, pitch: 0, pitchTo: 0, bob: 0, stride: 0, bounce: 0 };
  let W = 0;
  let H = 0;
  let DPR = 1;
  let quality = 1;
  let FPX = 840;  // focal length in pixels
  let CX = 0;
  let CY = 0;
  let cosY = 1;
  let sinY = 0;
  let cosP = 1;
  let sinP = 0;

  // World to camera space
  const toCam = (x, y, d) => {
    const ry = y - cam.bob;
    const rz = d - cam.d;
    const x1 = x * cosY - rz * sinY;
    const z1 = x * sinY + rz * cosY;
    return { x: x1, y: ry * cosP + z1 * sinP, z: z1 * cosP - ry * sinP };
  };
  // World to screen, or null behind the camera. k is pixels per world unit at that depth.
  const pt = (x, y, d) => {
    const p = toCam(x, y, d);
    if (p.z < NEAR) return null;
    p.k = FPX / p.z;
    p.sx = CX + p.x * p.k;
    p.sy = CY + p.y * p.k;
    return p;
  };
  const cut = (a, b) => {
    const t = (NEAR - a.z) / (b.z - a.z);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR };
  };
  // Adds a polygon to the current path, clipped where it passes behind the camera
  const trace = (points) => {
    const inCam = points.map(([x, y, d]) => toCam(x, y, d));
    const kept = [];
    inCam.forEach((a, i) => {
      const b = inCam[(i + 1) % inCam.length];
      if (a.z >= NEAR) kept.push(a);
      if ((a.z >= NEAR) !== (b.z >= NEAR)) kept.push(a.z >= NEAR ? cut(b, a) : cut(a, b));
    });
    if (kept.length < 3) return false;
    kept.forEach((p, i) => {
      const sx = CX + (p.x * FPX) / p.z;
      const sy = CY + (p.y * FPX) / p.z;
      if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy);
    });
    ctx.closePath();
    return true;
  };
  const shape = (points) => { ctx.beginPath(); return trace(points); };
  const fillShape = (points, style) => { if (shape(points)) { ctx.fillStyle = style; ctx.fill(); } };
  const seg = (x1, y1, d1, x2, y2, d2) => {
    let a = toCam(x1, y1, d1);
    let b = toCam(x2, y2, d2);
    if (a.z < NEAR && b.z < NEAR) return;
    if (a.z < NEAR) a = cut(a, b); else if (b.z < NEAR) b = cut(b, a);
    ctx.moveTo(CX + (a.x * FPX) / a.z, CY + (a.y * FPX) / a.z);
    ctx.lineTo(CX + (b.x * FPX) / b.z, CY + (b.y * FPX) / b.z);
  };
  const fog = (z) => clamp(1.4 - z / 300, 0.08, 1);
  const passing = (z) => clamp((z - 7) / 16, 0, 1); // fades things out as you walk past them

  // ---------- Products: the site's line drawings, painted once into bitmaps ----------
  const list = walk.querySelector('.walk__list');
  const starPath = document.querySelector('#pattern-jali-star path');
  const products = [...list.querySelectorAll('a[data-bay]')].map((link) => {
    const svg = link.querySelector('svg');
    const box = svg.viewBox.baseVal;
    return {
      kind: 'product', link, svg, name: link.dataset.name, bay: Number(link.dataset.bay),
      side: link.dataset.side === 'frp' ? 1 : -1, material: link.dataset.side.toUpperCase(),
      frp: svg.classList.contains('m-frp'), vw: box.width, vh: box.height, scale: 0,
    };
  });
  const piece = (side, bay) => products.find((p) => p.material === side && p.bay === bay);

  // The concrete stipple and drafting hatch from svg-defs, as canvas patterns in drawing units
  const grcPattern = (g) => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 64;
    const t = tile.getContext('2d');
    t.scale(4, 4);
    t.fillStyle = STONE;
    t.fillRect(0, 0, 16, 16);
    t.fillStyle = 'rgba(36, 20, 58, 0.4)';
    for (const [x, y, r] of [[2.5, 3, 0.9], [9, 1.6, 0.6], [13.4, 6.2, 0.8], [6.2, 8.4, 0.7], [1.4, 12.6, 0.6], [11, 12, 0.9], [15, 14.6, 0.5], [6.8, 14.2, 0.5]]) {
      t.beginPath();
      t.arc(x, y, r, 0, TAU);
      t.fill();
    }
    t.fill(new Path2D('M10.5 7.6l1.8.5-1.2 1.3zM3.2 6.2l1.4-.9.3 1.6zM13.6 10l1.3 1.1-1.6.4z'));
    const pattern = g.createPattern(tile, 'repeat');
    pattern.setTransform(new DOMMatrix().scale(0.25));
    return pattern;
  };
  const hatchPattern = (g) => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 24;
    const t = tile.getContext('2d');
    t.fillStyle = '#F0E2D4';
    t.fillRect(0, 0, 24, 24);
    t.fillStyle = 'rgba(36, 20, 58, 0.6)';
    t.fillRect(0, 0, 2.2, 24);
    t.fillRect(21.8, 0, 2.2, 24);
    const pattern = g.createPattern(tile, 'repeat');
    pattern.setTransform(new DOMMatrix().rotate(45).scale(0.25));
    return pattern;
  };
  const stars = (g, fn) => {
    if (!starPath) return;
    const star = new Path2D(starPath.getAttribute('d'));
    for (let x = 18; x < 162; x += 24) {
      for (let y = 32; y < 272; y += 24) {
        g.save();
        g.translate(x, y);
        fn(star);
        g.restore();
      }
    }
  };
  // "cast" is the finished piece; "line" is its outline in sand, shown before it is poured
  const paint = (item, mode, scale) => {
    const pad = 3;
    const img = document.createElement('canvas');
    img.width = Math.ceil(item.vw * scale + pad * 2);
    img.height = Math.ceil(item.vh * scale + pad * 2);
    const g = img.getContext('2d');
    g.translate(pad, pad);
    g.scale(scale, scale);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const px = 1 / scale;
    const fills = { o: item.frp ? GEL : grcPattern(g), o2: item.frp ? GEL_DEEP : STONE_DEEP, x: hatchPattern(g), v: '#1E1236' };
    const draw = (el) => {
      for (const child of el.children) {
        const cls = child.getAttribute('class') || '';
        if (child.tagName === 'g') {
          g.save();
          if (cls === 'mould-l') g.translate(-14, 0);
          if (cls === 'mould-r') g.translate(14, 0);
          draw(child);
          g.restore();
        } else if (cls === 'jl') {
          if (mode === 'cast') { g.strokeStyle = INK; g.lineWidth = 1; stars(g, (star) => g.stroke(star)); }
        } else if (child.tagName === 'path') {
          const path = new Path2D(child.getAttribute('d'));
          if (mode === 'line') {
            if (cls !== 'h') { g.strokeStyle = SAND; g.lineWidth = (cls === 'd' ? 1.4 : 2.2) * px; g.stroke(path); }
          } else if (cls === 'd') {
            g.strokeStyle = INK; g.lineWidth = 1.4 * px; g.stroke(path);
          } else if (cls === 'h') {
            if (item.frp) { g.strokeStyle = 'rgba(255, 255, 255, 0.85)'; g.lineWidth = 3.6 * px; g.stroke(path); }
          } else {
            g.fillStyle = fills[cls] || STONE;
            g.fill(path);
            if (child.getAttribute('mask')) {
              g.save();
              g.globalCompositeOperation = 'destination-out';
              stars(g, (star) => g.fill(star));
              g.restore();
            }
            g.strokeStyle = INK; g.lineWidth = 2.2 * px; g.stroke(path);
          }
        }
      }
    };
    draw(item.svg);
    return { img, pad, scale };
  };
  const rasterise = () => {
    for (const p of products) {
      const scale = clamp((p.ps * FPX * DPR) / 70, 0.25, 4);
      if (p.cast && Math.abs(scale / p.scale - 1) < 0.25) continue;
      p.scale = scale;
      p.cast = paint(p, 'cast', scale);
      p.line = paint(p, 'line', scale * 0.6);
    }
  };
  // Draws a painted piece standing on (x, y) with m pixels per drawing unit. from/to pick a band of it,
  // as fractions from the top, so it can be drawn in or poured from the bottom.
  const blit = (art, item, x, y, m, from = 0, to = 1) => {
    if (to <= from) return;
    const { img, pad, scale } = art;
    const sy = pad + item.vh * scale * from;
    const sh = item.vh * scale * (to - from);
    const r = m / scale;
    ctx.drawImage(img, 0, sy, img.width, sh, x - (img.width * r) / 2, y - item.vh * m + item.vh * m * from, img.width * r, sh * r);
  };

  // ---------- People ----------
  // Each task follows "How GRC and FRP are made" further down the page
  const CREW = [
    ['GRC', 0, 'sand'], ['GRC', 1, 'measure'], ['GRC', 2, 'shovel'], ['GRC', 3, 'tamp'],
    ['GRC', 4, 'brush'], ['GRC', 5, 'pry'], ['GRC', 6, 'wipe'], ['GRC', 7, 'clipboard'],
    ['FRP', 0, 'wipe'], ['FRP', 1, 'brush'], ['FRP', 2, 'lay'], ['FRP', 3, 'roll'],
    ['FRP', 4, 'stir'], ['FRP', 5, 'pry'], ['FRP', 6, 'grind'], ['FRP', 7, 'measure'],
  ];
  // How far each one stands from the piece, and what they work at
  const REACH = { sand: 4.2, wipe: 4.2, grind: 4.6, measure: 5.4, clipboard: 7, brush: 12.5, roll: 12.5, lay: 12.5, shovel: 13.5, stir: 8.6, tamp: 10.5, pry: 11 };
  const PROP = { brush: 'table', roll: 'table', lay: 'table', shovel: 'mixer', stir: 'bucket', tamp: 'box', pry: 'mould' };
  const SUITS = [['#3B2A6E', '#271B4B'], ['#2D2F66', '#1E2047'], ['#4B2257', '#32163B']];
  const SKINS = ['#8D5A3B', '#6E4430', '#A0673F', '#7A4A31'];
  const HATS = ['#FFC15E', SAND, OCHRE];
  const GLOVE = '#2A1D45';

  const crew = CREW.map(([material, bay, task], i) => ({
    kind: 'worker', material, bay, task, prop: PROP[task], phase: i * 1.37,
    suit: SUITS[i % 3], skin: SKINS[(i * 3) % 4], hat: HATS[i % 3], vest: i % 2 === 0, timer: 0,
  }));
  const props = crew.filter((w) => w.prop).map((w) => ({ kind: 'prop', worker: w }));
  const frames = Array.from({ length: BAYS }, (_, bay) => ({ kind: 'frame', bay, d: Z0 + bay * GAP + 4 }));
  // They cross just behind a bay, in the middle distance from where you stop to look at it
  const walker = { kind: 'walker', d: Z0 + 3 * GAP + 12, x: -24, dir: 1, u: 0, wait: 2, step: 0, suit: SUITS[1], skin: SKINS[1], hat: HATS[0], vest: true };
  const forklift = { kind: 'forklift', d: Z0 + 5 * GAP + 14, x: -30, dir: 1, u: 0, wait: 5, roll: 0, suit: SUITS[0], skin: SKINS[2], hat: HATS[2], vest: false };
  const crane = { kind: 'crane', d: 200 };
  const stage = { kind: 'stage', d: END - 34 };
  const operator = { kind: 'worker', task: 'pendant', x: 23, dir: -1, d: END - 42, phase: 0, suit: SUITS[2], skin: SKINS[0], hat: HATS[1], vest: true, timer: 0 };
  const things = [...products, ...crew, ...props, ...frames, walker, forklift, crane, stage, operator];

  // Where everything stands; this changes with the shape of the screen
  const layout = () => {
    for (const p of products) {
      p.ps = Math.min(0.12, 36 / p.vh, 24 / p.vw) * SIZE;
      p.pw = p.vw * p.ps;
      p.ph = p.vh * p.ps;
      p.x = p.side * (HALF - INSET);
      p.d = Z0 + p.bay * GAP;
    }
    for (const w of crew) {
      const p = piece(w.material, w.bay);
      const inner = p.x - (p.side * p.pw) / 2;
      w.dir = p.side;
      w.x = inner - p.side * REACH[w.task];
      if (Math.abs(w.x) < 14) w.x = p.side * 14; // nobody stands in the walkway
      w.d = p.d - 7;
      w.zone = [Math.min(p.x + p.side * (p.pw / 2 + 2), w.x - p.side * 3), Math.max(p.x + p.side * (p.pw / 2 + 2), w.x - p.side * 3)];
    }
    for (const prop of props) prop.d = prop.worker.d + 0.6;
  };

  // Two-bone reach: from a joint at (ax, ay) toward (bx, by). Returns the middle joint and the end.
  const ik = (ax, ay, bx, by, l1, l2, bend) => {
    let dx = bx - ax;
    let dy = by - ay;
    let dist = Math.hypot(dx, dy);
    const max = l1 + l2 - 0.01;
    if (dist > max) { dx *= max / dist; dy *= max / dist; dist = max; }
    const angle = Math.atan2(dy, dx) + bend * Math.acos(clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist || 1), -1, 1));
    return [ax + Math.cos(angle) * l1, ay + Math.sin(angle) * l1, ax + dx, ay + dy];
  };

  // Poses, facing right, feet at the origin, y up is negative. The work surface is ahead (+x).
  const pose = (task, t, still) => {
    const s = Math.sin;
    const c = Math.cos;
    if (still) t = 1.2;
    switch (task) {
      case 'sand': { const a = t * 5; return { lean: 0.12, front: [5.4 + 0.9 * c(a), -12.6 + 0.9 * s(a)], back: [4.6, -10.4], tool: 'block', nod: 0.15, mask: true }; }
      case 'wipe': { const a = t * 3.2; return { lean: 0.1, front: [5.2 + 1.3 * c(a), -13 + 1.1 * s(a)], back: [3.9, -10.6], tool: 'cloth', nod: 0.1 }; }
      case 'grind': { const j = 0.12 * s(t * 47); return { lean: 0.22, crouch: 0.6, front: [5.6 + j, -11.4 + j], back: [4.4, -11], tool: 'grinder', nod: 0.2, goggles: true, mask: true }; }
      case 'measure': { const u = ease(wave(t * 0.35)); return { lean: 0.05, front: [6.4, -6 - 9 * u], back: [3, -11.6], tool: 'tape', nod: -0.1 - 0.25 * u }; }
      case 'clipboard': return { lean: 0.02, front: [3.4 + s(t * 9) * 0.25, -12.6 + 0.2 * s(t * 4)], back: [2.9, -12.2], tool: 'clipboard', nod: 0.3 + 0.25 * s(t * 0.7) };
      case 'brush': { const a = s(t * 2.4); return { lean: 0.55, crouch: 1, front: [5.6 + 1.6 * a, -9.6], back: [3.8, -9], tool: 'brush', nod: 0.35, coat: true }; }
      case 'roll': { const a = s(t * 1.7); return { lean: 0.45, crouch: 0.8, front: [5.4 + 2.2 * a, -10.6], back: [3.6 + 2.2 * a, -11.2], tool: 'roller', nod: 0.3 }; }
      case 'lay': { const u = ease(wave(t * 0.42)); return { lean: 0.15 + 0.3 * u, crouch: 1.2 * u, front: [6 + 1.4 * u, -14 + 4.4 * u], back: [3.8 + 1.2 * u, -14.2 + 4.2 * u], tool: 'mat', u, nod: 0.25 }; }
      case 'stir': { const a = t * 3; return { lean: 0.7, crouch: 3.4, front: [4.6 + 0.8 * c(a), -4.8 + 0.3 * s(a)], back: [2.4, -5.6], tool: 'stick', nod: 0.4, feet: [[2.2, 0], [-1.6, 0]] }; }
      case 'tamp': { const u = Math.abs(s(t * 3.2)); return { lean: 0.12, front: [4.4, -10.2 - 2.4 * u], back: [3.8, -12.6 - 2.4 * u], tool: 'rod', u, nod: 0.3 }; }
      case 'pry': { const u = 0.5 + 0.5 * s(t * 2); return { lean: 0.38 + 0.12 * u, crouch: 0.8 * u, front: [5.6, -9.6 + u], back: [4.2, -10.4 + u], tool: 'bar', u, nod: 0.35, feet: [[1.8, 0], [-1.4, 0]] }; }
      case 'shovel': {
        // scoop from the pile, swing up, tip into the mixer, back down
        const u = (t / 2.8) % 1;
        const up = u < 0.45 ? ease(u / 0.45) : u < 0.6 ? 1 : 1 - ease((u - 0.6) / 0.4);
        return {
          lean: 0.75 - 0.6 * up, crouch: 3 - 3 * up,
          front: [3.6 + 1.2 * up, -4.6 - 6.6 * up], back: [0.8 + 1.4 * up, -7.2 - 2.4 * up],
          tool: 'shovel', u, up, loaded: u < 0.5, nod: 0.2, feet: [[2, 0], [-1.6, 0]],
        };
      }
      case 'pendant': return { lean: -0.05, front: [2.8, -12.4], back: [2.4, -11.8 + 0.3 * s(t * 6)], tool: 'pendant', nod: -0.45 };
      case 'push': return { lean: 0.22, front: [4.2, -10.6], back: [3.8, -10.2], tool: null, nod: 0.05 };
      default: return { lean: 0, front: [1.2, -8.4], back: [-0.6, -8.4], nod: 0 };
    }
  };

  const rig = (p) => {
    const lean = p.lean || 0;
    const hx = p.hipX || 0;
    const hy = -9.2 + (p.crouch || 0);
    const sx = hx + Math.sin(lean) * 6.2;
    const sy = hy - Math.cos(lean) * 6.2;
    const [ff, bf] = p.feet || [[1.3, 0], [-1, 0]];
    return {
      p, hx, hy, sx, sy,
      headX: sx + Math.sin(lean * 0.6) * 2.4 + (p.nod || 0) * 0.5,
      headY: sy - Math.cos(lean * 0.6) * 2.4 + Math.max(0, p.nod || 0) * 0.3,
      fl: ik(hx + 0.3, hy, ff[0], ff[1], 4.7, 4.6, -1),
      bl: ik(hx - 0.3, hy, bf[0], bf[1], 4.7, 4.6, -1),
      fa: ik(sx + 0.3, sy + 0.4, p.front[0], p.front[1], 3.3, 3.2, 1),
      ba: ik(sx - 0.5, sy + 0.4, p.back[0], p.back[1], 3.3, 3.2, 1),
    };
  };

  const rrect = (x, y, w, h, r) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  };
  const line = (points, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  const dot = (x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };

  const leg = (x, y, [kx, ky, fx, fy], color) => {
    line([[x, y], [kx, ky], [fx, fy - 0.5]], color, 2.2);
    ctx.fillStyle = '#120A20';
    rrect(fx - 0.8, fy - 1.1, 2.6, 1.1, 0.45);
    ctx.fill();
  };
  const arm = (x, y, [ex, ey, hx, hy], color) => {
    line([[x, y], [ex, ey], [hx, hy]], color, 1.45);
    dot(hx, hy, 0.62, GLOVE);
  };
  const torso = (r, suit, vest) => {
    const lean = r.p.lean || 0;
    const nx = Math.cos(lean);
    const ny = Math.sin(lean);
    const at = (f, w) => [r.hx + (r.sx - r.hx) * f + nx * w, r.hy + (r.sy - r.hy) * f + ny * w];
    const body = [at(0, -1.8), at(0, 1.7), at(1, 1.9), at(1.06, 0.4), at(1, -2)];
    ctx.fillStyle = suit;
    ctx.strokeStyle = suit;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    body.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (vest) {
      ctx.fillStyle = OCHRE;
      ctx.beginPath();
      [at(0.2, -1.95), at(0.2, 1.85), at(0.92, 2.05), at(0.92, -2.15)].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
      for (const f of [0.42, 0.68]) line([at(f, -1.95), at(f, 1.9)], SAND, 0.42);
    }
  };
  const head = (r, w) => {
    const { headX: x, headY: y, p } = r;
    line([[r.sx + 0.2, r.sy], [x - 0.1, y + 0.6]], w.skin, 1.1);
    dot(x, y, 1.45, w.skin);
    ctx.fillStyle = '#1B1028';
    ctx.beginPath();
    ctx.arc(x - 0.2, y - 0.1, 1.42, Math.PI * 0.55, Math.PI * 1.2);
    ctx.fill();
    dot(x + 0.85 + (p.nod || 0) * 0.2, y + 0.05 + (p.nod || 0) * 0.5, 0.17, INK);
    if (p.mask) { ctx.fillStyle = SAND; rrect(x + 0.55, y + 0.35, 1.05, 0.85, 0.3); ctx.fill(); }
    if (p.goggles) line([[x + 0.3, y - 0.15], [x + 1.45, y - 0.15]], '#120A20', 0.45);
    // hard hat with a brim to the front
    ctx.fillStyle = w.hat;
    ctx.beginPath();
    ctx.arc(x, y - 0.3, 1.72, Math.PI, 0);
    ctx.fill();
    rrect(x - 1.8, y - 0.55, 4.3, 0.5, 0.2);
    ctx.fill();
  };

  const tool = (r, w, now) => {
    const { p } = r;
    const [, , fx, fy] = r.fa;
    const [, , bx, by] = r.ba;
    switch (p.tool) {
      case 'block': ctx.fillStyle = '#5E4A6E'; rrect(fx + 0.1, fy - 0.6, 1.5, 1.2, 0.2); ctx.fill(); break;
      case 'cloth': ctx.fillStyle = 'rgba(248, 239, 230, 0.92)'; ctx.beginPath(); ctx.ellipse(fx + 0.5, fy, 0.95, 0.65, 0.4, 0, TAU); ctx.fill(); break;
      case 'grinder':
        line([[bx, by], [fx + 0.6, fy + 0.2]], '#3E4466', 1.2);
        line([[bx + 0.3, by - 0.1], [bx + 1.4, by - 0.25]], OCHRE, 0.5);
        dot(fx + 1.2, fy + 0.5, 1.05, STEEL);
        dot(fx + 1.2, fy + 0.5, 0.35, '#3E4466');
        break;
      case 'tape':
        line([[bx + 0.6, by], [fx, fy]], '#FFC15E', 0.22);
        ctx.fillStyle = OCHRE; rrect(bx - 0.2, by - 0.75, 1.5, 1.5, 0.35); ctx.fill();
        break;
      case 'clipboard':
        ctx.save();
        ctx.translate((fx + bx) / 2 + 0.4, (fy + by) / 2 - 0.9);
        ctx.rotate(-0.5);
        ctx.fillStyle = '#B98B5E'; rrect(-1.1, -1.5, 2.2, 3, 0.2); ctx.fill();
        ctx.fillStyle = SAND; ctx.fillRect(-0.85, -1.1, 1.7, 2.4);
        ctx.restore();
        break;
      case 'brush':
        line([[fx, fy], [fx + 0.9, fy + 0.9]], '#B98B5E', 0.4);
        ctx.fillStyle = '#4A3566'; rrect(fx + 0.6, fy + 0.8, 1.3, 0.75, 0.15); ctx.fill();
        break;
      case 'roller': {
        const hx = fx + 2.2;
        const hy = fy + 1.9;
        line([[bx, by], [fx, fy], [hx, hy - 0.4]], '#4A3566', 0.38);
        ctx.fillStyle = '#E9D9C4'; rrect(hx - 1.2, hy - 0.9, 2.4, 1, 0.45); ctx.fill();
        break;
      }
      case 'mat': {
        const sag = 1 + p.u * 0.6;
        ctx.fillStyle = 'rgba(248, 239, 230, 0.88)';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo((bx + fx) / 2, (by + fy) / 2 + sag, fx, fy);
        ctx.lineTo(fx + 3.2, fy + 1.6 + sag);
        ctx.quadraticCurveTo((bx + fx) / 2 + 2, by + 2.4 + sag, bx + 1.6, by + 1.8);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'stick': line([[fx, fy], [4.6, -1.4]], '#B98B5E', 0.38); break;
      case 'rod': line([[4.2, by - 1.6], [4.6, by - 1.6 + 9.4]], STEEL, 0.45); break;
      case 'bar': {
        const dx = fx - bx;
        const dy = fy - by;
        const n = Math.hypot(dx, dy) || 1;
        line([[bx - (dx / n) * 1.2, by - (dy / n) * 1.2], [fx + (dx / n) * 3.2, fy + (dy / n) * 3.2]], '#5B4A7A', 0.5);
        break;
      }
      case 'shovel': {
        const dx = fx - bx;
        const dy = fy - by;
        const n = Math.hypot(dx, dy) || 1;
        const tx = fx + (dx / n) * 3;
        const ty = fy + (dy / n) * 3;
        line([[bx - (dx / n) * 0.8, by - (dy / n) * 0.8], [tx, ty]], '#B98B5E', 0.4);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(Math.atan2(dy, dx) + (p.up > 0.95 ? 0.9 : 0));
        ctx.fillStyle = STEEL; rrect(-0.2, -0.9, 2, 1.8, 0.35); ctx.fill();
        if (p.loaded) { ctx.fillStyle = '#8E8597'; ctx.beginPath(); ctx.ellipse(0.9, -0.7, 0.9, 0.5, 0, 0, TAU); ctx.fill(); }
        ctx.restore();
        break;
      }
      case 'pendant':
        line([[fx + 0.3, fy - 0.6], [fx + 0.6, -48]], '#4A3566', 0.18);
        ctx.fillStyle = OCHRE; rrect(fx - 0.2, fy - 0.9, 1.1, 1.8, 0.25); ctx.fill();
        dot(fx + 0.35, fy - 0.3, 0.22, (now * 2) % 1 < 0.5 ? '#E2457A' : INK);
        break;
      default:
    }
  };

  const person = (w, r, now) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const [suit, shade] = w.suit;
    leg(r.hx - 0.3, r.hy, r.bl, shade);
    arm(r.sx - 0.5, r.sy + 0.4, r.ba, shade);
    torso(r, suit, w.vest);
    leg(r.hx + 0.3, r.hy, r.fl, suit);
    head(r, w);
    tool(r, w, now);
    arm(r.sx + 0.3, r.sy + 0.4, r.fa, suit);
  };

  // Things people work at, in the same local units
  const drawProp = (w, now) => {
    const t = now + w.phase;
    const mould = w.material === 'GRC' ? '#6E6680' : '#4E3F6A';
    if (w.prop === 'table') {
      line([[3, -8.4], [2.5, 0]], '#3A2560', 0.6);
      line([[10.6, -8.4], [11.1, 0]], '#3A2560', 0.6);
      line([[2.8, -4], [10.8, -4]], '#3A2560', 0.35);
      ctx.fillStyle = '#4A2C6E'; ctx.fillRect(2, -8.9, 9.6, 0.6);
      ctx.fillStyle = mould; rrect(2.5, -10.1, 8.6, 1.3, 0.3); ctx.fill();
      if (w.task === 'brush') {
        // a coat spreads across the mould, then the next one starts
        const coat = (t * 0.11) % 1;
        ctx.fillStyle = w.material === 'GRC' ? '#A79DB8' : GEL;
        ctx.fillRect(2.8, -10.2, 8 * coat, 0.45);
      } else if (w.task === 'lay') {
        ctx.fillStyle = GEL; ctx.fillRect(2.8, -10.25, 8, 0.4);
        const layers = Math.floor(t * 0.21) % 4;
        for (let i = 0; i < layers; i++) { ctx.fillStyle = i % 2 ? '#EDE2D2' : '#F8EFE6'; ctx.fillRect(2.9, -10.6 - i * 0.32, 7.8, 0.3); }
      } else {
        ctx.fillStyle = '#EDE2D2'; ctx.fillRect(2.8, -10.5, 8, 0.45);
        ctx.fillStyle = 'rgba(255, 176, 96, 0.75)'; ctx.fillRect(2.8, -10.55, 5 + 3 * Math.sin(t * 1.7), 0.32);
      }
    } else if (w.prop === 'mixer') {
      ctx.fillStyle = '#8E8597';
      ctx.beginPath(); ctx.ellipse(5.4, 0, 2.8, 1.5, 0, Math.PI, 0); ctx.fill();
      line([[7.4, 0], [9.6, -4.4], [11.8, 0]], '#3A2560', 0.6);
      ctx.save();
      ctx.translate(9.6, -7.4);
      ctx.rotate(-0.5);
      ctx.fillStyle = OCHRE;
      ctx.beginPath(); ctx.ellipse(0, 0, 3.8, 3.2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(36, 20, 58, 0.55)';
      ctx.lineWidth = 0.35;
      for (let i = 0; i < 3; i++) {
        const a = t * 2.4 + i * 2.1;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 3.6, Math.sin(a) * 1.2 - 1.4); ctx.lineTo(Math.cos(a) * 3.6, Math.sin(a) * 1.2 + 1.6); ctx.stroke();
      }
      ctx.fillStyle = '#2A1746';
      ctx.beginPath(); ctx.ellipse(-3.3, 0, 0.9, 1.9, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (w.prop === 'bucket') {
      ctx.fillStyle = w.material === 'GRC' ? STEEL : GEL_DEEP;
      ctx.beginPath(); ctx.moveTo(3, -3.4); ctx.lineTo(6.2, -3.4); ctx.lineTo(5.8, 0); ctx.lineTo(3.4, 0); ctx.closePath(); ctx.fill();
      line([[2.9, -3.4], [6.3, -3.4]], '#E9D9C4', 0.3);
    } else if (w.prop === 'box') {
      ctx.fillStyle = mould; rrect(2.8, -6, 6, 6, 0.3); ctx.fill();
      ctx.fillStyle = '#8E8597'; ctx.fillRect(3.2, -6.1, 5.2, 0.6);
    } else if (w.prop === 'mould') {
      const lift = 0.6 * (w.pose ? w.pose.u : 0);
      ctx.fillStyle = mould; rrect(3.2, -4.6, 6.6, 4.6, 0.3); ctx.fill();
      ctx.fillStyle = w.material === 'GRC' ? '#7E7690' : '#5E4E7E';
      rrect(3.2, -6 - lift, 6.6, 1.4, 0.3); ctx.fill();
      for (const x of [4.2, 8.8]) dot(x, -2.3, 0.3, '#2A1746');
    }
  };

  // ---------- Particles: sparks, dust and motes in the lamp light ----------
  const sparks = [];
  const dust = [];
  const motes = Array.from({ length: 72 }, (_, i) => ({
    bay: i % BAYS, x: (Math.random() - 0.5) * 34, y: TOP + 14 + Math.random() * (ROOF - 16), dd: (Math.random() - 0.5) * 16, phase: Math.random() * TAU,
  }));
  const spark = (x, y, d, dir) => {
    if (sparks.length > 180) return;
    sparks.push({ x, y, d, vx: -dir * (5 + Math.random() * 14), vy: -3 - Math.random() * 11, vd: (Math.random() - 0.5) * 7, age: 0, life: 0.3 + Math.random() * 0.45 });
  };
  const puff = (x, y, d, size) => {
    if (dust.length > 90) return;
    dust.push({ x, y, d, vx: (Math.random() - 0.5) * 2.4, vy: -1.2 - Math.random() * 1.6, vd: (Math.random() - 0.5) * 1.2, age: 0, life: 1.1 + Math.random(), size });
  };
  const step = (list, dt, gravity) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i];
      q.age += dt;
      if (q.age > q.life) { list[i] = list[list.length - 1]; list.pop(); continue; }
      q.vy += gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.d += q.vd * dt;
      if (gravity && q.y > EYE) { q.y = EYE; q.vy *= -0.3; q.vx *= 0.55; }
    }
  };

  // ---------- Lamps switch on down the aisle, then as you walk towards them ----------
  const lampOn = new Array(BAYS).fill(null);
  const lamp = (bay, now) => {
    const on = lampOn[bay];
    if (on === null || now < on) return 0;
    const u = now - on;
    return u > 0.8 ? 1 : [0.25, 1, 0.15, 0.9, 0.35, 1, 1][Math.floor((u / 0.8) * 7)];
  };

  // The sun beyond the door, with the site's striped lower half
  const sun = document.createElement('canvas');
  {
    sun.width = sun.height = 256;
    const g = sun.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    [[0, '#FFD27A'], [0.38, '#FFA24C'], [0.68, '#F2685A'], [1, '#E2457A']].forEach(([o, c]) => grad.addColorStop(o, c));
    g.fillStyle = grad;
    g.beginPath(); g.arc(128, 128, 128, 0, TAU); g.fill();
    g.globalCompositeOperation = 'destination-out';
    for (let y = 133; y < 256; y += 8) g.fillRect(0, y + 5.5, 256, 2.5 + (y - 133) / 40);
  }

  // ---------- The room ----------
  const RACKS = [];
  for (let bay = 0; bay < BAYS; bay++) {
    for (const side of [-1, 1]) {
      let seed = bay * 7 + (side > 0 ? 3 : 0);
      const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      for (const shelf of [EYE - 13, EYE - 27]) {
        let d = Z0 + bay * GAP + 14;
        while (d < Z0 + bay * GAP + GAP - 12) {
          const w = 5 + rand() * 6;
          RACKS.push({ side, d0: d, d1: d + w, y0: shelf - 4 - rand() * 6, y1: shelf, tone: Math.floor(rand() * 3) });
          d += w + 1.5 + rand() * 3;
        }
      }
    }
  }
  const RACK_TONES = { '-1': ['#4A4360', '#5B5272', '#3A3350'], 1: ['#2F5560', '#3B6670', '#264650'] };

  const drawRoom = (now) => {
    const near = START - BACK;
    const far = END;
    const from = Math.max(near, cam.d);
    // roof, with a skylight down the middle and purlins across
    fillShape([[-HALF, TOP, near], [HALF, TOP, near], [HALF, TOP, far], [-HALF, TOP, far]], '#130A24');
    fillShape([[-7, TOP, near], [7, TOP, near], [7, TOP, far], [-7, TOP, far]], 'rgba(255, 150, 120, 0.08)');
    ctx.strokeStyle = 'rgba(255, 244, 232, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let d = Math.ceil(from / 11) * 11; d < far; d += 11) seg(-HALF, TOP, d, HALF, TOP, d);
    ctx.stroke();

    for (const side of [-1, 1]) {
      const x = side * HALF;
      fillShape([[x, TOP, near], [x, TOP, far], [x, EYE, far], [x, EYE, near]], '#1F1238');
      fillShape([[x, EYE - 8, near], [x, EYE - 8, far], [x, EYE, far], [x, EYE, near]], '#170C2C');
      // corrugated sheeting, near enough to see
      ctx.strokeStyle = 'rgba(255, 244, 232, 0.05)';
      ctx.beginPath();
      for (let d = Math.ceil(from / 3.5) * 3.5; d < Math.min(far, cam.d + 260); d += 3.5) seg(x, TOP + 16, d, x, EYE - 8, d);
      ctx.stroke();
      // clerestory windows glowing with the sunset
      ctx.beginPath();
      for (let d = 0; d < far - 8; d += 10) trace([[x, TOP + 5, d], [x, TOP + 5, d + 8], [x, TOP + 14, d + 8], [x, TOP + 14, d]]);
      ctx.fillStyle = 'rgba(255, 140, 110, 0.34)';
      ctx.fill();
      // racks of moulds between the bays
      const tones = RACK_TONES[side];
      for (let tone = 0; tone < 3; tone++) {
        ctx.beginPath();
        for (const r of RACKS) {
          if (r.side === side && r.tone === tone && r.d1 > from) trace([[x - side * 0.6, r.y0, r.d0], [x - side * 0.6, r.y0, r.d1], [x - side * 0.6, r.y1, r.d1], [x - side * 0.6, r.y1, r.d0]]);
        }
        ctx.fillStyle = tones[tone];
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255, 244, 232, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let bay = 0; bay < BAYS; bay++) {
        const d = Z0 + bay * GAP;
        if (d + GAP < from) continue;
        for (const shelf of [EYE - 13, EYE - 27]) seg(x - side * 0.6, shelf, d + 12, x - side * 0.6, shelf, d + GAP - 10);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    letters('GRC', -1, 62);
    letters('FRP', 1, 62);
    letters('GRC', -1, 290);
    letters('FRP', 1, 290);

    // floor: warmer towards the door
    const a = pt(0, EYE, far);
    if (a) {
      const grad = ctx.createLinearGradient(0, a.sy, 0, H);
      [[0, '#4A1E52'], [0.2, '#2C1642'], [0.55, '#1A0F30'], [1, '#110920']].forEach(([o, c]) => grad.addColorStop(o, c));
      fillShape([[-HALF, EYE, near], [HALF, EYE, near], [HALF, EYE, far], [-HALF, EYE, far]], grad);
    }
    ctx.strokeStyle = 'rgba(255, 244, 232, 0.05)';
    ctx.beginPath();
    for (let d = Math.ceil(from / 14) * 14; d < Math.min(far, cam.d + 320); d += 14) seg(-HALF, EYE, d, HALF, EYE, d);
    for (const x of [-40, -26, 26, 40]) seg(x, EYE, from, x, EYE, far);
    ctx.stroke();
    // the walkway
    for (const x of [-11.6, 11]) fillShape([[x, EYE, from], [x + 0.6, EYE, from], [x + 0.6, EYE, far], [x, EYE, far]], 'rgba(255, 162, 76, 0.55)');
    // painted work zones
    ctx.strokeStyle = 'rgba(255, 162, 76, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const w of crew) {
      if (w.d + 20 < cam.d) continue;
      const [x0, x1] = w.zone;
      trace([[x0, EYE, w.d - 4], [x1, EYE, w.d - 4], [x1, EYE, w.d + 18], [x0, EYE, w.d + 18]]);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    // the far wall and its open door onto the sunset
    const door = [[-40, EYE - 58, END], [40, EYE - 58, END], [40, EYE, END], [-40, EYE, END]];
    const lintel = pt(0, EYE - 58, END);
    const sill = pt(0, EYE, END);
    if (lintel && sill && shape(door)) {
      ctx.save();
      ctx.clip();
      const sky = ctx.createLinearGradient(0, lintel.sy, 0, CY);
      [[0, '#1A1030'], [0.4, '#241341'], [0.7, '#3E1850'], [0.9, '#6A2259'], [1, '#A8345F']].forEach(([o, c]) => sky.addColorStop(o, c));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      const s = pt(0, -30, END + 260);
      if (s) { const r = 44 * s.k; ctx.drawImage(sun, s.sx - r, s.sy - r, r * 2, r * 2); }
      const ground = ctx.createLinearGradient(0, CY, 0, sill.sy);
      ground.addColorStop(0, '#5A1E55');
      ground.addColorStop(1, '#24123C');
      fillShape([[-900, EYE, END], [900, EYE, END], [900, EYE, END + 4000], [-900, EYE, END + 4000]], ground);
      ctx.restore();
    }
    ctx.beginPath();
    trace([[-HALF, TOP, END], [HALF, TOP, END], [HALF, EYE, END], [-HALF, EYE, END]]);
    trace([[-40, EYE - 58, END], [-40, EYE, END], [40, EYE, END], [40, EYE - 58, END]]);
    ctx.fillStyle = '#22133C';
    ctx.fill('evenodd');
    // the rolled-up shutter
    fillShape([[-40, EYE - 58, END], [40, EYE - 58, END], [40, EYE - 54, END], [-40, EYE - 54, END]], '#3A2560');
  };

  // Big painted letters on the wall, one letter at a time so each follows the perspective
  const letters = (text, side, d0) => {
    const x = side * (HALF - 0.4);
    const LW = 12;
    ctx.save();
    ctx.font = '800 100px Geologica, system-ui, sans-serif';
    ctx.fillStyle = OCHRE;
    [...text].forEach((ch, i) => {
      const n = side < 0 ? i : text.length - 1 - i;
      const near = d0 + n * (LW + 3);
      const far = near + LW;
      const left = side < 0 ? near : far;
      const right = side < 0 ? far : near;
      const tl = pt(x, EYE - 58, left);
      const tr = pt(x, EYE - 58, right);
      const bl = pt(x, EYE - 41, left);
      if (!tl || !tr || !bl || tl.z > 380) return;
      const gw = ctx.measureText(ch).width;
      const a = (tr.sx - tl.sx) / gw;
      const b = (tr.sy - tl.sy) / gw;
      const c = (bl.sx - tl.sx) / 72;
      const d = (bl.sy - tl.sy) / 72;
      ctx.globalAlpha = 0.5 * fog(tl.z) * clamp((380 - tl.z) / 60, 0, 1);
      ctx.setTransform(DPR * a, DPR * b, DPR * c, DPR * d, DPR * (tl.sx + c * 72), DPR * (tl.sy + d * 72));
      ctx.fillText(ch, 0, 0);
    });
    ctx.restore();
  };

  // ---------- Things on the floor, drawn far to near ----------
  const hits = [];
  let hover = null;
  let focused = null;

  const drawFrame = (f, z, now) => {
    const d = f.d;
    const k = FPX / z;
    ctx.globalAlpha = fog(z) * passing(z + 6);
    for (const side of [-1, 1]) {
      const xo = side * HALF;
      const xi = side * (HALF - 2.6);
      fillShape([[xi, TOP, d], [xo, TOP, d], [xo, EYE, d], [xi, EYE, d]], BEAM);
      fillShape([[xi, TOP + 3, d], [xi, TOP + 3, d + 2.4], [xi, EYE, d + 2.4], [xi, EYE, d]], '#3D2460');
      fillShape([[xi, EYE - 3.4, d], [xo, EYE - 3.4, d], [xo, EYE - 1.8, d], [xi, EYE - 1.8, d]], OCHRE);
      const n = pt(side * (HALF - 1.3), EYE - 32, d);
      if (n && k > 3) {
        ctx.font = `700 ${(1.9 * k).toFixed(1)}px Geologica, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = OCHRE;
        ctx.fillText(`0${f.bay + 1}`, n.sx, n.sy);
      }
    }
    fillShape([[-HALF, TOP, d], [HALF, TOP, d], [HALF, TOP + 3, d], [-HALF, TOP + 3, d]], BEAM);
    fillShape([[-HALF, TOP + 3, d], [HALF, TOP + 3, d], [HALF, TOP + 3, d + 2.4], [-HALF, TOP + 3, d + 2.4]], '#221236');
    ctx.strokeStyle = BEAM;
    ctx.lineWidth = Math.max(1, 0.55 * k);
    ctx.beginPath();
    for (let x = -HALF + 2.6, up = true; x < HALF - 2.6; x += 3.4, up = !up) seg(x, TOP + (up ? 3 : 7.5), d, x + 3.4, TOP + (up ? 7.5 : 3), d);
    seg(-HALF, TOP + 7.5, d, HALF, TOP + 7.5, d);
    // the lamp, on wires
    ctx.lineWidth = Math.max(0.6, 0.18 * k);
    ctx.strokeStyle = '#4A3566';
    seg(-9, TOP + 7.5, d, -9, TOP + 11.5, d);
    seg(9, TOP + 7.5, d, 9, TOP + 11.5, d);
    ctx.stroke();
    const on = lamp(f.bay, now);
    fillShape([[-11, TOP + 11.5, d], [11, TOP + 11.5, d], [11, TOP + 12.4, d], [-11, TOP + 12.4, d]], on > 0.5 ? '#FFF3DE' : '#4F3C66');
    ctx.globalAlpha = 1;
  };

  const drawProduct = (p, z, now) => {
    const base = pt(p.x, EYE - PLINTH, p.d);
    if (!base) return;
    const alpha = fog(z) * passing(z);
    if (alpha <= 0.01) return;
    ctx.globalAlpha = alpha;
    // the plinth: front, top and the side facing the aisle
    const x0 = p.x - p.pw / 2 - 1.5;
    const x1 = p.x + p.pw / 2 + 1.5;
    const xi = p.side < 0 ? x1 : x0;
    fillShape([[x0, EYE - PLINTH, p.d - 3], [x1, EYE - PLINTH, p.d - 3], [x1, EYE - PLINTH, p.d + 3], [x0, EYE - PLINTH, p.d + 3]], '#4A2C6E');
    fillShape([[xi, EYE - PLINTH, p.d - 3], [xi, EYE - PLINTH, p.d + 3], [xi, EYE, p.d + 3], [xi, EYE, p.d - 3]], '#241339');
    fillShape([[x0, EYE - PLINTH, p.d - 3], [x1, EYE - PLINTH, p.d - 3], [x1, EYE, p.d - 3], [x0, EYE, p.d - 3]], '#33204F');
    // finished pieces; the far ones come out of the haze as you walk towards them
    if (p.cast) blit(p.cast, p, base.sx, base.sy, p.ps * base.k);
    const w = p.pw * base.k;
    const h = p.ph * base.k;
    // name on the plinth, once you start walking
    const front = pt(p.x, EYE - PLINTH / 2, p.d - 3);
    const size = 1.7 * (front ? front.k : 0);
    if (front && size > 7 && cam.d > START + 4) {
      ctx.globalAlpha = alpha * clamp((cam.d - START - 4) / 14, 0, 1);
      ctx.font = `640 ${size.toFixed(1)}px Geologica, system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SAND;
      ctx.fillText(p.name, front.sx + size * 0.2, front.sy);
      ctx.textAlign = 'left';
      ctx.fillStyle = OCHRE;
      ctx.fillText(p.material, front.sx + size * 0.6, front.sy);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.globalAlpha = 1;
    const bottom = pt(p.x, EYE, p.d - 3);
    hits.push({ p, x: base.sx - w / 2 - 4, y: base.sy - h - 4, w: w + 8, h: (bottom ? bottom.sy : base.sy) - base.sy + h + 8 });
  };

  // A sprite drawn in local units, standing at (x, d), facing dir. People fade out just before you reach
  // them, so nobody fills the edge of the screen as you pass.
  const sprite = (x, d, dir, z, fn) => {
    const at = pt(x, EYE, d);
    if (!at) return;
    ctx.globalAlpha = fog(z) * clamp((z - 15) / 8, 0, 1) * clamp((440 - z) / 110, 0, 1);
    if (ctx.globalAlpha <= 0.01) return;
    ctx.save();
    ctx.translate(at.sx, at.sy);
    ctx.scale(at.k * dir, at.k);
    fn();
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  const drawCrane = (now, z) => {
    const d = crane.d;
    ctx.globalAlpha = fog(z) * passing(z + 2);
    fillShape([[-HALF, TOP + 4, d], [HALF, TOP + 4, d], [HALF, TOP + 8, d], [-HALF, TOP + 8, d]], OCHRE);
    fillShape([[-HALF, TOP + 8, d], [HALF, TOP + 8, d], [HALF, TOP + 8, d + 3], [-HALF, TOP + 8, d + 3]], '#C9722E');
    ctx.strokeStyle = '#2A1746';
    ctx.lineWidth = Math.max(1, (0.7 * FPX) / z);
    ctx.beginPath();
    for (let x = -HALF + 2; x < HALF - 2; x += 5) seg(x, TOP + 4, d, x + 2.5, TOP + 8, d);
    ctx.stroke();
    // the trolley carries a tank over the FRP side, clear of the walkway, swinging a little
    const tx = HALF - INSET - 12 + 3 * Math.sin(now * 0.13);
    fillShape([[tx - 3.5, TOP + 8, d], [tx + 3.5, TOP + 8, d], [tx + 3.5, TOP + 12, d], [tx - 3.5, TOP + 12, d]], '#3A2560');
    const hook = pt(tx, EYE - 46, d);
    const trolley = pt(tx, TOP + 12, d);
    const load = piece('FRP', 0);
    ctx.globalAlpha = fog(z) * clamp((z - 30) / 40, 0, 1) * clamp((440 - z) / 110, 0, 1);
    if (hook && trolley && load.cast && ctx.globalAlpha > 0.01) {
      ctx.strokeStyle = '#4A3566';
      ctx.lineWidth = Math.max(1, 0.25 * hook.k);
      ctx.beginPath(); ctx.moveTo(trolley.sx, trolley.sy); ctx.lineTo(hook.sx, hook.sy); ctx.stroke();
      ctx.save();
      ctx.translate(hook.sx, hook.sy);
      ctx.rotate(Math.sin(now * 0.9) * 0.035);
      const m = Math.min(17 / load.vh, 14 / load.vw) * hook.k;
      line([[0, 0], [-load.vw * m * 0.35, load.vh * m * 0.12]], '#4A3566', Math.max(1, 0.2 * hook.k));
      line([[0, 0], [load.vw * m * 0.35, load.vh * m * 0.12]], '#4A3566', Math.max(1, 0.2 * hook.k));
      blit(load.cast, load, 0, load.vh * m * 1.12, m);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if ((now * 1.2) % 1 < 0.5) glows.push([tx, TOP + 12.5, d, 4, 'rgba(255, 162, 76, 0.9)']);
  };

  const drawForklift = (now, z) => {
    const load = piece('FRP', 2);
    sprite(forklift.x, forklift.d, forklift.dir, z, () => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // mast, forks and the load
      line([[6.2, 0], [6.2, -15]], '#3A2560', 0.8);
      line([[7, 0], [7, -15]], '#3A2560', 0.8);
      line([[7, -1.4], [14, -1.4]], STEEL, 0.5);
      ctx.fillStyle = '#7A5A3A'; ctx.fillRect(7.4, -2.6, 6.4, 1);
      if (load.cast) {
        ctx.save();
        ctx.scale(forklift.dir, 1);
        const m = Math.min(9 / load.vh, 6.4 / load.vw);
        blit(load.cast, load, forklift.dir * 10.6, -2.6, m);
        ctx.restore();
      }
      // body, counterweight and guard
      ctx.fillStyle = OCHRE; rrect(-6.5, -7.6, 12, 5.4, 0.8); ctx.fill();
      ctx.fillStyle = '#C9722E'; rrect(-7.2, -9, 2.6, 6.4, 0.6); ctx.fill();
      line([[-4.6, -7.6], [-4.8, -17.2], [3.4, -17.2], [3.2, -7.6]], '#2A1746', 0.55);
      // driver
      const r = rig({ lean: 0.05, hipX: -1.6, crouch: 1.2, front: [3.4, -11.6], back: [3, -11.8], feet: [[1.4, -2.8], [0.8, -2.8]], nod: 0 });
      head(r, forklift);
      torso(r, forklift.suit[0], false);
      arm(r.sx + 0.3, r.sy + 0.4, r.fa, forklift.suit[0]);
      line([[3.2, -11], [4, -9]], '#2A1746', 0.5);
      // wheels
      for (const [x, rad] of [[3, 1.8], [-4.2, 1.5]]) {
        dot(x, -rad, rad, '#120A20');
        dot(x, -rad, rad * 0.45, STEEL);
        line([[x, -rad], [x + Math.cos(forklift.roll) * rad * 0.8, -rad + Math.sin(forklift.roll) * rad * 0.8]], '#120A20', 0.3);
      }
    });
    if ((now * 1.6) % 1 < 0.45) glows.push([forklift.x - forklift.dir * 0.6, EYE - 18, forklift.d, 5, 'rgba(255, 162, 76, 0.95)']);
  };

  const drawWalker = (now, z) => {
    const load = piece('GRC', 6);
    sprite(walker.x, walker.d, walker.dir, z, () => {
      // trolley
      line([[4.2, -10.6], [4.6, -3.2]], '#4A3566', 0.45);
      ctx.fillStyle = '#4A2C6E'; ctx.fillRect(4.6, -3.4, 10, 0.8);
      for (const x of [6, 13.2]) { dot(x, -1, 1, '#120A20'); dot(x, -1, 0.4, STEEL); }
      line([[6, -2.6], [6, -2], [13.2, -2], [13.2, -2.6]], '#3A2560', 0.4);
      if (load.cast) {
        ctx.save();
        ctx.scale(walker.dir, 1);
        const m = Math.min(7 / load.vh, 9 / load.vw);
        blit(load.cast, load, walker.dir * 9.6, -3.4, m);
        ctx.restore();
      }
      const s = walker.step;
      const moving = walker.moving;
      const lift = (v) => (moving ? Math.max(0, v) * 1.1 : 0);
      const r = rig({
        ...pose('push', now), crouch: moving ? 0.25 * Math.abs(Math.sin(s)) : 0,
        feet: moving ? [[1.8 * Math.sin(s), -lift(Math.cos(s))], [-1.8 * Math.sin(s), -lift(-Math.cos(s))]] : null,
      });
      person(walker, r, now);
    });
  };

  // The casting bay in the doorway: each piece is drawn, poured, shown, then lifted away
  const STAGE = [['GRC', 0, 'GRC dome'], ['FRP', 0, 'FRP storage tank'], ['GRC', 2, 'GRC column'], ['FRP', 1, 'FRP arch'], ['GRC', 3, 'GRC minaret'], ['FRP', 2, 'FRP planter']];
  const STAGE_TIMES = [2.6, 3, 3.4, 2.2];
  const STAGE_LENGTH = STAGE_TIMES.reduce((a, b) => a + b, 0);
  let stageName = STAGE[0][2];
  const drawStage = (now, z) => {
    const d = stage.d;
    const cycle = motion ? now / STAGE_LENGTH : 2.4 / STAGE_LENGTH;
    const [material, bay, name] = STAGE[Math.floor(cycle) % STAGE.length];
    stageName = name;
    let t = (cycle % 1) * STAGE_LENGTH;
    let phase = 0;
    while (phase < 3 && t >= STAGE_TIMES[phase]) { t -= STAGE_TIMES[phase]; phase++; }
    const u = clamp(t / STAGE_TIMES[phase], 0, 1);
    const item = piece(material, bay);
    ctx.globalAlpha = fog(z);
    fillShape([[-17, EYE - 6, d - 6], [17, EYE - 6, d - 6], [17, EYE - 6, d + 6], [-17, EYE - 6, d + 6]], '#4A2C6E');
    fillShape([[-17, EYE - 6, d - 6], [17, EYE - 6, d - 6], [17, EYE, d - 6], [-17, EYE, d - 6]], '#33204F');
    fillShape([[-17, EYE - 6.4, d - 6], [17, EYE - 6.4, d - 6], [17, EYE - 6, d - 6], [-17, EYE - 6, d - 6]], 'rgba(248, 239, 230, 0.6)');
    const base = pt(0, EYE - 6, d);
    if (!base || !item.cast) { ctx.globalAlpha = 1; return; }
    const m = Math.min(34 / item.vh, 30 / item.vw) * base.k;
    const lifted = phase === 3 ? ease(clamp((u - 0.38) / 0.62, 0, 1)) : 0;
    const y = base.sy - lifted * 48 * base.k;
    ctx.globalAlpha = fog(z) * (1 - lifted * 0.9);
    if (phase === 0) blit(item.line, item, base.sx, y, m, 0, u);
    if (phase === 1) { blit(item.line, item, base.sx, y, m, 0, 1 - ease(u)); blit(item.cast, item, base.sx, y, m, 1 - ease(u), 1); }
    if (phase >= 2) blit(item.cast, item, base.sx, y, m);
    // the hook comes down, then takes the piece up
    const hookY = phase === 3 ? (u < 0.38 ? ease(u / 0.38) : 1) : 0;
    const restY = TOP + 14;
    const pieceTop = (y - item.vh * m - base.sy) / base.k + EYE - 6;
    const hook = pt(0, restY + (pieceTop - restY) * hookY, d);
    const roof = pt(0, TOP, d);
    ctx.globalAlpha = fog(z);
    if (hook && roof) {
      ctx.strokeStyle = '#4A3566';
      ctx.lineWidth = Math.max(1, 0.25 * hook.k);
      ctx.beginPath(); ctx.moveTo(roof.sx, roof.sy); ctx.lineTo(hook.sx, hook.sy); ctx.stroke();
      ctx.strokeStyle = SAND;
      ctx.lineWidth = Math.max(1, 0.35 * hook.k);
      ctx.beginPath(); ctx.arc(hook.sx, hook.sy + hook.k * 0.9, hook.k * 0.9, -0.2, Math.PI * 1.1); ctx.stroke();
    }
    const front = pt(0, EYE - 3, d - 6);
    if (front && front.k > 3) {
      ctx.font = `640 ${(2 * front.k).toFixed(1)}px Geologica, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SAND;
      ctx.fillText(name, front.sx, front.sy);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.globalAlpha = 1;
    glows.push([0, EYE - 30, d, 30, 'rgba(255, 200, 150, 0.16)']);
  };

  // ---------- Light ----------
  const glows = []; // [x, y, d, radius, colour] collected while drawing, added in the light pass
  const drawLight = (now) => {
    ctx.globalCompositeOperation = 'lighter';
    // the sunset spilling in through the door
    const sill = pt(0, EYE, END);
    if (sill) {
      const r = Math.min(80 * sill.k, W * 0.6);
      const g = ctx.createRadialGradient(sill.sx, sill.sy, 0, sill.sx, sill.sy, r);
      g.addColorStop(0, 'rgba(255, 120, 110, 0.32)');
      g.addColorStop(1, 'rgba(255, 120, 110, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(sill.sx - r, sill.sy - r, r * 2, r * 2);
    }
    for (let bay = 0; bay < BAYS; bay++) {
      const level = lamp(bay, now);
      if (!level) continue;
      const d = Z0 + bay * GAP + 4;
      const z = d - cam.d;
      if (z < 6) continue;
      const a = level * fog(z) * passing(z);
      const l = pt(-11, TOP + 12.4, d);
      const r = pt(11, TOP + 12.4, d);
      const fl = pt(-25, EYE, d);
      const fr = pt(25, EYE, d);
      if (!l || !r || !fl || !fr) continue;
      // the cone, the pool it makes on the floor and the glow round the tube
      const cone = ctx.createLinearGradient(0, l.sy, 0, fl.sy);
      cone.addColorStop(0, `rgba(255, 222, 176, ${0.2 * a})`);
      cone.addColorStop(1, 'rgba(255, 200, 150, 0)');
      ctx.fillStyle = cone;
      ctx.beginPath(); ctx.moveTo(l.sx, l.sy); ctx.lineTo(r.sx, r.sy); ctx.lineTo(fr.sx, fr.sy); ctx.lineTo(fl.sx, fl.sy); ctx.closePath(); ctx.fill();
      const nearP = pt(0, EYE, d - 18);
      const farP = pt(0, EYE, d + 18);
      const c = pt(0, EYE, d);
      if (nearP && farP && c) {
        for (const [x, rx, strength] of [[0, 30, 0.26], [-(HALF - INSET), 18, 0.2], [HALF - INSET, 18, 0.2]]) {
          const at = pt(x, EYE, d);
          if (!at) continue;
          ctx.save();
          ctx.translate(at.sx, at.sy);
          ctx.scale(Math.min(rx * c.k, W * 0.6), clamp((nearP.sy - farP.sy) / 2, 1, H * 0.3));
          const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
          pool.addColorStop(0, `rgba(255, 206, 156, ${strength * a})`);
          pool.addColorStop(1, 'rgba(255, 206, 156, 0)');
          ctx.fillStyle = pool;
          ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
      glows.push([0, TOP + 12, d, 10, `rgba(255, 226, 180, ${0.42 * a})`]);
    }
    for (const [x, y, d, radius, colour] of glows) {
      const p = pt(x, y, d);
      if (!p) continue;
      const r = Math.min(radius * p.k, W * 0.35);
      const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r);
      g.addColorStop(0, colour);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.sx - r, p.sy - r, r * 2, r * 2);
    }
    // dust drifting through the lamp light
    for (const mote of motes) {
      const level = lamp(mote.bay, now);
      if (!level) continue;
      const p = pt(mote.x + Math.sin(now * 0.3 + mote.phase) * 1.6, mote.y + Math.sin(now * 0.21 + mote.phase * 2) * 2.2, Z0 + mote.bay * GAP + 4 + mote.dd);
      if (!p || p.z > 260) continue;
      const s = Math.max(1, 0.22 * p.k);
      ctx.fillStyle = `rgba(255, 236, 205, ${0.55 * level * fog(p.z) * (0.5 + 0.5 * Math.sin(now * 1.7 + mote.phase))})`;
      ctx.fillRect(p.sx, p.sy, s, s);
    }
    // grinder sparks
    for (const q of sparks) {
      const p = pt(q.x, q.y, q.d);
      const tail = pt(q.x - q.vx * 0.035, q.y - q.vy * 0.035, q.d - q.vd * 0.035);
      if (!p || !tail) continue;
      const life = 1 - q.age / q.life;
      ctx.strokeStyle = `rgba(255, ${Math.round(150 + 90 * life)}, ${Math.round(80 + 60 * life)}, ${life})`;
      ctx.lineWidth = Math.max(1, 0.2 * p.k);
      ctx.beginPath(); ctx.moveTo(tail.sx, tail.sy); ctx.lineTo(p.sx, p.sy); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const q of dust) {
      const p = pt(q.x, q.y, q.d);
      if (!p) continue;
      ctx.fillStyle = `rgba(222, 208, 222, ${0.22 * (1 - q.age / q.life)})`;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, q.size * (1 + q.age * 1.4) * p.k, 0, TAU); ctx.fill();
    }
  };

  // ---------- Each frame ----------
  let intro = 0;
  const worldPoint = (w, lx, ly) => [w.x + w.dir * lx, EYE + ly, w.d];
  const update = (now, dt) => {
    for (let bay = 0; bay < BAYS; bay++) {
      if (lampOn[bay] !== null) continue;
      const z = Z0 + bay * GAP - cam.d;
      if (!motion) lampOn[bay] = -10;
      else if (z < 340 && now > intro + 0.5 + bay * 0.3) lampOn[bay] = Math.max(now, intro + 0.5 + bay * 0.3);
    }
    // people work once their lamp is on
    for (const w of [...crew, operator]) {
      const lit = w.task === 'pendant' || lamp(w.bay, now) > 0;
      w.pose = pose(w.task, now + w.phase, !motion || !lit);
      w.rig = rig(w.pose);
      const z = w.d - cam.d;
      if (!motion || !lit || z < 6 || z > 260) continue;
      w.timer += dt;
      const [, , hx, hy] = w.rig.fa;
      if (w.task === 'grind') {
        for (let i = 0; i < dt * 90; i++) spark(...worldPoint(w, hx + 1.4, hy + 0.9), w.dir);
      } else if (w.task === 'sand' && w.timer > 0.14) {
        w.timer = 0;
        puff(...worldPoint(w, hx + 1, hy), 0.35);
      } else if (w.task === 'shovel' && w.pose.up > 0.95 && w.timer > 0.2) {
        w.timer = 0;
        puff(...worldPoint(w, 7.4, -11.6), 0.6);
      } else if (w.task === 'tamp' && w.pose.u < 0.08 && w.timer > 0.25) {
        w.timer = 0;
        puff(...worldPoint(w, 4.6, -6.4), 0.4);
      }
    }
    step(sparks, dt, 60);
    step(dust, dt, 0);
    // the forklift and the trolley cross the aisle and back, pausing at each side. They don't set off
    // while you are standing close, so nothing blocks the view of a bay.
    const cross = (thing, span, seconds, drive) => {
      const z = thing.d - cam.d;
      if (thing.u === 0 && (thing.wait > 0 || (z > -10 && z < 80))) {
        thing.wait -= dt;
        thing.moving = false;
        return 0;
      }
      const was = thing.x;
      // already on its way when you arrive: it hurries across
      thing.u = Math.min(1, thing.u + (dt / seconds) * (z > -10 && z < 80 ? 3 : 1));
      thing.x = thing.dir * span * (2 * (drive ? ease(thing.u) : thing.u) - 1);
      thing.moving = true;
      if (thing.u === 1) { thing.u = 0; thing.dir = -thing.dir; thing.wait = 3; }
      return Math.abs(thing.x - was);
    };
    walker.step += cross(walker, 24, 11, false) * 0.95;
    forklift.roll += cross(forklift, 30, 9, true) / 1.6;
    crane.d = 250 + 210 * ease(wave(now / 60));
  };

  const draw = (now) => {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // beside the words at the entrance, the aisle opens up right of centre, then straightens as you walk
    CX = W * (0.5 + (wide ? 0.14 : 0) * (1 - ease(clamp((cam.d - START) / 60, 0, 1))));
    cosY = Math.cos(cam.yaw); sinY = Math.sin(cam.yaw);
    cosP = Math.cos(cam.pitch); sinP = Math.sin(cam.pitch);
    ctx.fillStyle = '#130A24';
    ctx.fillRect(0, 0, W, H);
    drawRoom(now);
    hits.length = 0;
    glows.length = 0;
    for (const thing of things) thing.z = thing.d - cam.d;
    things.sort((a, b) => b.z - a.z);
    for (const thing of things) {
      const z = thing.z;
      if (z < NEAR + 1 || z > 600) continue;
      if (thing.kind === 'product') drawProduct(thing, z, now);
      else if (thing.kind === 'frame') drawFrame(thing, z, now);
      else if (thing.kind === 'stage') drawStage(now, z);
      else if (z > 440) continue;
      else if (thing.kind === 'worker') sprite(thing.x, thing.d, thing.dir, z, () => person(thing, thing.rig, now));
      else if (thing.kind === 'prop') { const w = thing.worker; sprite(w.x, thing.d, w.dir, z, () => drawProp(w, now)); }
      else if (thing.kind === 'crane') drawCrane(now, z);
      else if (thing.kind === 'forklift') drawForklift(now, z);
      else if (thing.kind === 'walker') drawWalker(now, z);
    }
    ctx.globalAlpha = 1;
    // the hall is dark until the lamps come on
    const dark = motion ? 0.6 * (1 - clamp((now - intro - 0.3) / 2.6, 0, 1)) : 0;
    if (dark > 0.01) { ctx.fillStyle = `rgba(8, 4, 18, ${dark})`; ctx.fillRect(0, 0, W, H); }
    drawLight(now);
    // the piece under the pointer, or the one focused from the keyboard
    const marked = hits.find((hit) => hit.p === (focused || hover));
    if (marked) {
      ctx.strokeStyle = OCHRE;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(marked.x, marked.y, marked.w, marked.h);
      ctx.setLineDash([]);
    }
  };

  // ---------- Screen size ----------
  let portrait = false;
  let wide = false; // the words sit in a column on the left (matches home.css)
  const wideQuery = matchMedia('(min-width: 64rem) and (min-aspect-ratio: 1/1)');
  const resize = () => {
    const box = view.getBoundingClientRect();
    W = box.width;
    H = box.height;
    portrait = W / H < 0.8;
    const U = portrait ? Math.min(W * 0.022, H * 0.0062) : Math.min(W / 100, H * 0.0175);
    HALF = portrait ? 50 : 54;
    INSET = portrait ? 17 : 16;
    SIZE = portrait ? 1.15 : 1;
    // It is a soft illustration, so 1.5 device pixels per pixel is sharp enough and much cheaper than 3
    DPR = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    FPX = F * U;
    wide = wideQuery.matches;
    CX = W / 2;
    CY = H * (portrait ? 0.44 : 0.46);
    layout();
    rasterise();
  };

  // ---------- Scrolling, pointer and keyboard ----------
  const bayText = walk.querySelector('.walk__bay');
  const pairText = walk.querySelector('.walk__pair');
  const bar = walk.querySelector('.walk__progress');
  let top = 0;
  let range = 1;
  const measure = () => {
    top = walk.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(view).top) || 0);
    range = Math.max(1, walk.offsetHeight - view.offsetHeight);
  };
  const progress = () => clamp((scrollY - top) / range, 0, 1);
  // Where the camera stands for a scroll position. It slows to a stop in front of each bay, so there is
  // time to look around, then walks on to the next.
  const STOPS = [START, ...Array.from({ length: BAYS - 1 }, (_, i) => Z0 + (i + 1) * GAP - 75), STOP];
  const along = (t) => {
    const d = START + t * (STOP - START);
    let i = 0;
    while (i < STOPS.length - 2 && d > STOPS[i + 1]) i++;
    const a = STOPS[i];
    const b = STOPS[i + 1];
    const u = clamp((d - a) / (b - a), 0, 1);
    return a + (b - a) * (0.3 * u + 0.7 * ease(u));
  };

  let shown = '';
  const hud = () => {
    const walked = cam.d - START;
    let text = 'Scroll to walk through the factory';
    let pair = fine ? 'Move the mouse to look around' : '';
    if (cam.d > STOP - 30) {
      text = 'Casting bay';
      pair = `Now making ${stageName}`;
    } else if (walked > 8) {
      const bay = clamp(Math.round((cam.d + 80 - Z0) / GAP), 0, BAYS - 1);
      text = `Bay ${bay + 1} of ${BAYS}`;
      pair = products.filter((p) => p.bay === bay).map((p) => `${p.material} ${p.name.toLowerCase()}`).join(' · ');
    }
    const label = focused ? `${focused.name} in ${focused.material}, press Enter to open` : '';
    if (label) pair = label;
    if (text + pair !== shown) {
      shown = text + pair;
      bayText.textContent = text;
      pairText.textContent = pair;
    }
    bar.style.transform = `scaleX(${clamp(walked / (STOP - START), 0, 1).toFixed(4)})`;
    walk.classList.toggle('is-walking', walked > 40);
    // the words slide away as you set off: to the left beside the aisle, or up on a narrow screen
    const cc = clamp(walked, 0, 60) / 60;
    copy.style.opacity = clamp(1 - cc * 1.5, 0, 1).toFixed(3);
    const x = (-cam.yaw * 8 * W) / 100 - (wide ? cc * 0.3 * W : 0);
    const y = wide ? 0 : -cc * 0.2 * H;
    copy.style.transform = Math.abs(x) + Math.abs(y) > 0.1 ? `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)` : '';
  };

  let frame = 0;
  let last = 0;
  let onScreen = true;
  let slow = 0;
  let skip = false;
  const tick = (time) => {
    const now = time / 1000;
    const dt = Math.min(0.05, now - last) || 0.016;
    // a slow device draws at a lower resolution rather than stutter
    slow = dt > 0.024 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 40 && quality > 0.55) { quality *= 0.85; slow = 0; resize(); }
    last = now;
    // standing still, the people keep working at half the frame rate
    const busy = Math.abs(cam.to - cam.d) > 0.05 || Math.abs(cam.yawTo - cam.yaw) > 0.002
      || Math.abs(cam.pitchTo - cam.pitch) > 0.002 || now - intro < 4;
    skip = !busy && !skip;
    // the camera follows the scroll at walking pace, so even a quick flick becomes a steady walk
    const move = clamp((cam.to - cam.d) * (1 - Math.exp(-dt * 2.4)), -80 * dt, 80 * dt);
    cam.d += move;
    cam.yaw += (cam.yawTo - cam.yaw) * (1 - Math.exp(-dt * 5));
    cam.pitch += (cam.pitchTo - cam.pitch) * (1 - Math.exp(-dt * 5));
    cam.stride += move * 0.42;
    cam.bounce += (clamp(Math.abs(move) / dt / 60, 0, 1) * 0.5 - cam.bounce) * (1 - Math.exp(-dt * 6));
    cam.bob = (Math.abs(Math.sin(cam.stride)) - 0.5) * cam.bounce;
    update(now, dt);
    if (!skip) { draw(now); hud(); }
    frame = onScreen && !document.hidden ? requestAnimationFrame(tick) : 0;
  };
  const start = () => {
    if (frame || !onScreen) return;
    last = performance.now() / 1000;
    frame = requestAnimationFrame(tick);
  };
  const still = () => { update(1.2, 0); draw(1.2); };

  resize();
  if (motion) {
    walk.classList.add('is-live');
    measure();
    cam.to = along(progress());
    cam.d = cam.to > START + 1 ? cam.to : START - 26; // at the top of the page, step in through the door
    intro = performance.now() / 1000;
    addEventListener('scroll', () => { cam.to = along(progress()); }, { passive: true });
    if (fine) {
      view.addEventListener('pointermove', (event) => {
        const box = view.getBoundingClientRect();
        cam.yawTo = ((event.clientX - box.left) / box.width - 0.5) * 2 * 0.17;
        cam.pitchTo = ((event.clientY - box.top) / box.height - 0.5) * -2 * 0.06;
      });
      view.addEventListener('pointerleave', () => { cam.yawTo = 0; cam.pitchTo = 0; hover = null; view.classList.remove('is-pointing'); });
    }
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; start(); }).observe(walk);
    document.addEventListener('visibilitychange', start);
    start();
  } else {
    cam.d = START;
    still();
  }

  let resizing;
  addEventListener('resize', () => {
    clearTimeout(resizing);
    resizing = setTimeout(() => {
      resize();
      if (motion) { measure(); cam.to = along(progress()); } else still();
    }, 150);
  });
  document.fonts?.ready.then(() => { if (!motion) still(); });

  // Pointing at a piece marks it; clicking opens it
  const pieceAt = (event) => {
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    for (let i = hits.length - 1; i >= 0; i--) {
      const hit = hits[i];
      if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) return hit.p;
    }
    return null;
  };
  canvas.addEventListener('pointermove', (event) => {
    hover = pieceAt(event);
    view.classList.toggle('is-pointing', Boolean(hover));
    if (!motion) still();
  });
  canvas.addEventListener('click', (event) => {
    const p = pieceAt(event);
    if (p) p.link.click();
  });

  // Tabbing to a product walks to its bay
  list.addEventListener('focusin', (event) => {
    const p = products.find((item) => item.link === event.target);
    if (!p) return;
    focused = p;
    if (motion) {
      const goal = clamp(p.d - 75, START, STOP);
      scrollTo({ top: top + ((goal - START) / (STOP - START)) * range, behavior: 'instant' });
    } else {
      still();
    }
  });
  list.addEventListener('focusout', () => { focused = null; if (!motion) still(); });
})();
