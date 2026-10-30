'use strict';
/* 펭귄 썰매 활강 — 꾸미기(썰매·모자)와 미션 */
const SLEDS = [
  { id: 'red', price: 0, col: '#d9573d', dark: '#7a3324', hi: '#f08a5d' },
  { id: 'blue', price: 150, col: '#3d7fd9', dark: '#23497f', hi: '#7fb4f5' },
  { id: 'mint', price: 350, col: '#3cc4a0', dark: '#1f7a63', hi: '#8ff0d4' },
  { id: 'gold', price: 800, col: '#f2c230', dark: '#a8780f', hi: '#fff0a0', shine: true },
  { id: 'rainbow', price: 2000, col: 'rainbow', dark: '#5a3a8a', hi: '#ffffff', shine: true },
];
const HATS = [
  { id: 'beanie', price: 0 },
  { id: 'santa', price: 200 },
  { id: 'party', price: 450 },
  { id: 'crown', price: 1000 },
  { id: 'tophat', price: 1800 },
];
const sledOf = id => SLEDS.find(s => s.id === id) || SLEDS[0];
const owns = key => Save.data.owned.includes(key);

// ===== 미션: 늘 3개가 걸려 있고, 깨면 생선을 받고 다음 미션으로 바뀐다 =====
const M_TYPES = ['dist', 'fish', 'perfect', 'flip', 'item', 'fever', 'golden'];
const M_GOALS = {
  dist: [300, 600, 1000, 1500, 2000, 3000, 4000, 5000],
  fish: [20, 40, 70, 100, 150, 200, 260],
  perfect: [2, 4, 6, 10, 14, 20, 28],
  flip: [1, 2, 4, 6, 9, 12, 16],
  item: [1, 2, 3, 4, 6, 8],
  fever: [1, 2, 3, 4, 6],
  golden: [1, 2, 3, 4, 5],
};
function makeMission(n) {
  const type = M_TYPES[n % M_TYPES.length], lv = Math.floor(n / M_TYPES.length), g = M_GOALS[type];
  const goal = g[Math.min(lv, g.length - 1)] * (lv >= g.length ? 1 + (lv - g.length + 1) * 0.5 : 1);
  return { type, goal: Math.round(goal), reward: 40 + lv * 30 + (type === 'golden' || type === 'flip' ? 20 : 0) };
}
function ensureMissions() {
  const d = Save.data;
  if (!Array.isArray(d.missions) || d.missions.length !== 3) {
    d.missions = [];
    while (d.missions.length < 3) d.missions.push(makeMission(d.mIdx++));
    Save.save();
  }
}
const missionText = m => tn('m_' + m.type, m.goal);

// ===== 꾸미기 화면 =====
let shopSel = null;
function drawShop() {
  ctx.fillStyle = 'rgba(10,20,60,0.45)'; ctx.fillRect(0, 0, VW, VH);
  button(12, 12, 78, 36, t('back'), toTitle, { color: '#8a9ab8', dark: '#5a6a88', size: 15 });
  text(t('shop'), VW / 2, 31, 24, '#fff', 'center', 'rgba(20,30,70,0.9)', 5);
  bankChip(VW - 14, 30);
  // 미리보기
  const px = Math.min(120, VW * 0.2), py = 262;
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ell(px, py + 4, 70, 14); ctx.fill();
  ctx.save(); ctx.translate(px, py); ctx.scale(2.8, 2.8);
  drawPenguinFigure({ tuck: 0, air: false, flap: 0, sp: 300, dizzy: false, sled: Save.data.sled, hat: Save.data.hat, time });
  ctx.restore();
  // 카드 두 줄
  const x0 = px + 90, avail = VW - x0 - 12, cw = Math.min(78, avail / 5 - 6), gap = (avail - cw * 5) / 4;
  const row = (list, y, kind) => {
    text(t(kind === 'sled' ? 'sleds' : 'hats'), x0, y - 14, 14, '#fff', 'left', 'rgba(20,30,70,0.8)', 3);
    list.forEach((it, i) => {
      const x = x0 + i * (cw + gap), key = kind + ':' + it.id, own = owns(key);
      const on = (kind === 'sled' ? Save.data.sled : Save.data.hat) === it.id;
      UIB.push({ x, y, w: cw, h: 96, cb: () => shopTap(kind, it) });
      ctx.fillStyle = on ? '#fff6c8' : own ? '#f4f9ff' : 'rgba(240,246,255,0.8)';
      rrect(x, y, cw, 96, 12); ctx.fill();
      if (on) { ctx.strokeStyle = '#ffb02e'; ctx.lineWidth = 3; rrect(x, y, cw, 96, 12); ctx.stroke(); }
      ctx.save(); ctx.translate(x + cw / 2, kind === 'sled' ? y + 52 : y + 38);
      if (kind === 'sled') { ctx.scale(1.6, 1.6); ctx.translate(0, 4); drawSled(it.id); }
      else { ctx.scale(1.45, 1.45); ctx.translate(0, 6); drawHatIcon(it.id); }
      ctx.restore();
      if (on) text('✔ ' + t('equipped'), x + cw / 2, y + 84, 10, '#c77800', 'center', false);
      else if (own) text(t('equip'), x + cw / 2, y + 84, 11, '#3a5a90', 'center', false);
      else {
        const can = Save.data.bank >= it.price;
        drawFish(x + cw / 2 - 16, y + 84, 0.6, false, 0);
        text(String(it.price), x + cw / 2 - 6, y + 84, 11, can ? '#22335a' : '#b04050', 'left', false);
      }
    });
  };
  row(SLEDS, 80, 'sled');
  row(HATS, 214, 'hat');
  if (shopSel) {
    shopSel.t -= 1 / 60;
    if (shopSel.t <= 0) shopSel = null;
    else text(shopSel.msg, x0 + avail / 2, 330, 14, shopSel.col, 'center', 'rgba(20,30,70,0.85)', 4);
  }
}
function shopTap(kind, it) {
  const key = kind + ':' + it.id, name = t((kind === 'sled' ? 'sl_' : 'ht_') + it.id);
  if (!owns(key)) {
    if (Save.data.bank < it.price) { Sound.sfx('deny'); shopSel = { msg: t('needFish'), col: '#ffb3a8', t: 1.6 }; return; }
    Save.data.bank -= it.price; Save.data.owned.push(key); Sound.sfx('buy');
    shopSel = { msg: name + ' — ' + t('bought'), col: '#ffe066', t: 1.6 };
  } else shopSel = { msg: name, col: '#ffffff', t: 1.2 };
  if (kind === 'sled') Save.data.sled = it.id; else Save.data.hat = it.id;
  Save.save();
}
function bankChip(rx, cy) {
  const s = String(Save.data.bank);
  font(15); const w = ctx.measureText(s).width + 44;
  ctx.fillStyle = 'rgba(20,30,70,0.5)'; rrect(rx - w, cy - 15, w, 30, 15); ctx.fill();
  drawFish(rx - w + 18, cy, 0.85, false, 0);
  text(s, rx - 12, cy + 1, 15, '#fff', 'right', false);
}
// 미션 목록 (타이틀, 게임 오버 화면)
function drawMissionList(x, y, w, opt) {
  opt = opt || {};
  const ms = opt.list || Save.data.missions;
  ms.forEach((m, i) => {
    const yy = y + i * 22, done = opt.done && opt.done[i];
    ctx.fillStyle = done ? 'rgba(255,214,90,0.9)' : opt.dark ? 'rgba(30,50,100,0.08)' : 'rgba(20,30,70,0.45)';
    rrect(x, yy - 9, w, 19, 9); ctx.fill();
    const col = done ? '#5a3a00' : opt.dark ? '#22335a' : '#ffffff';
    text((done ? '✔ ' : '• ') + missionText(m), x + 8, yy + 1, 11, col, 'left', false);
    let right = '';
    if (done) right = `+${m.reward}`;
    else if (opt.prog) right = `${Math.min(opt.prog[i], m.goal)}/${m.goal}`;
    else right = `${m.reward}`;
    text(right, x + w - 26, yy + 1, 11, col, 'right', false);
    drawFish(x + w - 14, yy, 0.55, false, 0);
  });
}
