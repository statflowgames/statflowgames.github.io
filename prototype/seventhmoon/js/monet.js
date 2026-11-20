// 🆕 광고·결제 연결 자리 ('시간을 사는' 쪽만: 보상 2배, 이어하기, 소모품 꾸러미, 외형).
// 앱(Capacitor)에서는 window.SM_ADS.show(kind) → Promise<bool>, window.SM_IAP.buy(id) → Promise<bool> 를 붙이면 그대로 쓴다.
// 웹 체험판: 광고 대신 짧은 '광고 자리' 화면 뒤 바로 보상(하루 횟수 제한), 결제는 '앱에서 구매'로 안내만 한다.
const MONET_AD_DAILY = 12;
const MONET_PRODUCTS = [
  { id: 'pack_starter', ko: '모험가 꾸러미', desc: '회복약 5 · 마석 폭탄 3 · 치유/보호 두루마리 각 2 · 금화 2,000', price: '₩3,900', give: { belt: { potion: 5, bomb: 3, scroll_heal: 2, scroll_guard: 2 }, gold: 2000 } },
  { id: 'pack_feather', ko: '부활 깃털 묶음', desc: '부활 깃털 3개 (최대 보유 3)', price: '₩2,500', give: { belt: { feather: 3 } } },
  { id: 'pack_trophy', ko: '사냥꾼의 주머니', desc: '보스 전리품을 잡을 때마다 1개 더 (영구)', price: '₩5,900', give: { flag: 'trophyPlus' } },
  { id: 'pack_gold', ko: '포포의 금고', desc: '금화 10,000 · 상급 마석 10 · 심연 마석 3', price: '₩4,900', give: { gold: 10000, mats: { high: 10, abyss: 3 } } },
  { id: 'skin_moon', ko: '외형 · 흑월 망토', desc: '주인공 망토 색이 흑월빛으로 (준비 중)', price: '₩2,900', give: { flag: 'skin_moon' }, soon: true },
];
const Monet = {
  native() { return typeof window !== 'undefined' && !!(window.SM_ADS || window.SM_IAP); },
  day() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
  adsLeft(s) {
    s.ads = s.ads && s.ads.day === this.day() ? s.ads : { day: this.day(), n: 0 };
    return Math.max(0, MONET_AD_DAILY - s.ads.n);
  },
  // 광고 보고 보상. cb는 보상이 확정됐을 때만 부른다
  rewardAd(scene, kind, cb) {
    const s = Save.data;
    if (!this.adsLeft(s)) return UI.toast(scene, '오늘 볼 수 있는 광고를 다 봤어요', '#ff9a8a');
    const done = () => { s.ads.n++; Save.write(); cb(); };
    if (window.SM_ADS && window.SM_ADS.show) { window.SM_ADS.show(kind).then(ok => ok ? done() : UI.toast(scene, '광고를 끝까지 보지 않았어요', '#ff9a8a')).catch(() => UI.toast(scene, '광고를 불러오지 못했어요', '#ff9a8a')); return; }
    // 웹 체험판: 광고 자리 화면
    const c = scene.add.container(0, 0).setDepth(9800).setScrollFactor(0);
    c.add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.86).setOrigin(0).setInteractive());
    c.add(UI.text(scene, W / 2, H / 2 - 30, '광고 자리 (체험판에서는 바로 보상)', 30, '#ffe7a8', { bold: true }).setOrigin(0.5));
    const t = UI.text(scene, W / 2, H / 2 + 30, '1', 26, '#c8b8a0').setOrigin(0.5); c.add(t);
    c.each(o => o.setScrollFactor && o.setScrollFactor(0));
    let n = 2;
    const ev = scene.time.addEvent({ delay: 500, repeat: 2, callback: () => { t.setText(n > 0 ? String(n) : ''); n--; } });
    scene.time.delayedCall(1500, () => { ev.remove(); c.destroy(); done(); });
  },
  buy(scene, p, after) {
    if (p.soon) return UI.toast(scene, '준비 중인 상품이에요', '#c8b8a0');
    if (!(window.SM_IAP && window.SM_IAP.buy)) return UI.toast(scene, '체험판에서는 구매할 수 없어요 (앱에서 구매)', '#c8b8a0');
    window.SM_IAP.buy(p.id).then(ok => { if (!ok) return; this.grant(p.give); UI.toast(scene, `「${p.ko}」 구매 완료!`, '#ffe27a'); after && after(); });
  },
  grant(g) {
    const s = Save.data;
    if (g.gold) s.gold += g.gold;
    if (g.belt) for (const [k, n] of Object.entries(g.belt)) s.belt[k] = Math.min(k === 'feather' ? 3 : 9, (s.belt[k] || 0) + n);
    if (g.mats) for (const [k, n] of Object.entries(g.mats)) s.mats[k] = (s.mats[k] || 0) + n;
    if (g.flag) s.flags[g.flag] = true;
    Save.write();
  },
};
