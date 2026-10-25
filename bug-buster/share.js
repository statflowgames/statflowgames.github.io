// 은하 방역대 - SNS 공유 (젤리도쿠와 같은 방식)
// 자랑하기·추천하기에 붙는 주소. 지금은 웹 체험판.
// 출시 후 플레이 스토어 주소로 바꾸려면: https://play.google.com/store/apps/details?id=com.statflow.bugbuster
const SHARE_URL = 'https://statflowgames.github.io/bug-buster/';

const Share = {
  card: null, text: '',
  comma: n => n.toLocaleString('ko-KR'),
  scoreText(score, newBest, where) {
    const head = newBest ? `은하 방역대 최고 기록 경신! ${this.comma(score)}점 🎉` : `은하 방역대에서 ${this.comma(score)}점 냈어요! 🪲`;
    return `${head}\n${where}까지 방역 성공 🚀\n나보다 잘할 수 있어? 👉 ${SHARE_URL}`;
  },
  inviteText: `우주 해충을 박멸하는 슈팅게임, 은하 방역대 같이 해요! 🚀🪲\n👉 ${SHARE_URL}`,

  // 게임이 끝나면 자랑하기용 그림을 미리 만들어 둔다 (누르는 순간 바로 공유 창이 뜨도록)
  prepare(newBest) {
    const where = `STAGE ${G.stage + 1} ${STAGES[G.stage].title}`;
    this.text = this.scoreText(G.score, newBest, where);
    this.card = null;
    try {
      const W = 540, H = 720, cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
      const c = cv.getContext('2d'); c.scale(2, 2);
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, STAGES[G.stage].sky[0]); g.addColorStop(1, STAGES[G.stage].sky[1]);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) { c.globalAlpha = Math.random() * 0.8 + 0.2; c.fillStyle = '#fff'; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      c.globalAlpha = 1;
      const t = (s, y, size, color, font = "'Black Han Sans', sans-serif") => { c.font = `${size}px ${font}`; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillText(s, W / 2 + 2, y + 3); c.fillStyle = color; c.fillText(s, W / 2, y); };
      t('GALAXY PEST CONTROL', 70, 18, '#c6ff4d', "'Jua', sans-serif");
      t('은하 방역대', 130, 64, '#ffffff');
      const boss = WORLDS[STAGES[G.stage].world].boss;
      c.save(); c.translate(W / 2, 270); c.scale(2.2, 2.2); Art[boss](c, 1.2, { phase: 0 }); c.restore();
      [['mosquito', 90, 400], ['ladybug', 450, 390], ['spider', 110, 220], ['firefly', 440, 230]].forEach(([k, x, y]) => { c.save(); c.translate(x, y); c.scale(2, 2); Art[k](c, 0.5, {}); c.restore(); });
      c.save(); c.translate(W / 2, 430); c.scale(2.4, 2.4); Art.player(c, 0.3); c.restore();
      if (newBest) { c.fillStyle = '#ffd23f'; c.beginPath(); c.roundRect(W / 2 - 70, 480, 140, 34, 17); c.fill(); t('최고 기록!', 505, 20, '#3a2a00', "'Jua', sans-serif"); }
      t(this.comma(G.score), 590, 72, '#ffffff');
      t(where, 635, 22, '#c6ff4d', "'Jua', sans-serif");
      t('statflowgames.github.io/bug-buster', 690, 15, 'rgba(255,255,255,0.6)', "'Jua', sans-serif");
      cv.toBlob(b => { this.card = b; }, 'image/png');
    } catch (e) { console.warn('자랑하기 그림 만들기 실패:', e); this.card = null; }
  },

  // 공유 창을 연다. 그림을 못 보내는 곳이면 글만, 그것도 안 되면 글을 복사해 둔다.
  async share(text, image) {
    if (navigator.share) {
      if (image) {
        try {
          const files = [new File([image], 'bugbuster.png', { type: 'image/png' })];
          if (!navigator.canShare || navigator.canShare({ files })) { await navigator.share({ text, files }); return; }
        } catch (e) { if (e.name === 'AbortError') return; }
      }
      try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast('공유 글을 복사했어요. 원하는 곳에 붙여 넣어 주세요!'); }
    catch (e) { toast('공유하지 못했어요. 이 기기에서는 공유 기능을 쓸 수 없어요.'); }
  },
  brag() { return this.share(this.text, this.card); },
  invite() { return this.share(this.inviteText, null); },
};

function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2600);
}
