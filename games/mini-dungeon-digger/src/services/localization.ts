import { Language } from '../data/gameData';

const languageNames: Record<Language, string> = { ko: '한국어', en: 'English', ja: '日本語', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', vi: 'Tiếng Việt', th: 'ไทย', es: 'Español' };

const words: Record<Language, Record<string, string>> = {
  ko: { play: '탐험', upgrade: '작업대', shop: '상점', storage: '창고', codex: '도감', missions: '미션', records: '기록', settings: '설정', return: '지상 귀환', pause: '일시정지', resume: '계속하기', base: '기지로', newRun: '탐험 시작', locked: '잠김', clear: '클리어', buy: '구매', sell: '모두 판매', claim: '받기' },
  en: { play: 'Explore', upgrade: 'Workshop', shop: 'Shop', storage: 'Storage', codex: 'Codex', missions: 'Missions', records: 'Records', settings: 'Settings', return: 'Return', pause: 'Paused', resume: 'Resume', base: 'Base', newRun: 'Start Run', locked: 'Locked', clear: 'Cleared', buy: 'Buy', sell: 'Sell all', claim: 'Claim' },
  ja: { play: '探検', upgrade: '作業台', shop: 'ショップ', storage: '倉庫', codex: '図鑑', missions: 'ミッション', records: '記録', settings: '設定', return: '帰還', pause: '一時停止', resume: '続ける', base: '基地へ', newRun: '探検開始', locked: 'ロック', clear: 'クリア', buy: '購入', sell: '全て売却', claim: '受取' },
  'zh-CN': { play: '探险', upgrade: '工作台', shop: '商店', storage: '仓库', codex: '图鉴', missions: '任务', records: '记录', settings: '设置', return: '返回地面', pause: '暂停', resume: '继续', base: '基地', newRun: '开始探险', locked: '未解锁', clear: '已通关', buy: '购买', sell: '全部出售', claim: '领取' },
  'zh-TW': { play: '探險', upgrade: '工作台', shop: '商店', storage: '倉庫', codex: '圖鑑', missions: '任務', records: '記錄', settings: '設定', return: '返回地面', pause: '暫停', resume: '繼續', base: '基地', newRun: '開始探險', locked: '未解鎖', clear: '已通關', buy: '購買', sell: '全部出售', claim: '領取' },
  vi: { play: 'Thám hiểm', upgrade: 'Xưởng', shop: 'Cửa hàng', storage: 'Kho', codex: 'Bách khoa', missions: 'Nhiệm vụ', records: 'Kỷ lục', settings: 'Cài đặt', return: 'Trở về', pause: 'Tạm dừng', resume: 'Tiếp tục', base: 'Căn cứ', newRun: 'Bắt đầu', locked: 'Đã khóa', clear: 'Hoàn thành', buy: 'Mua', sell: 'Bán tất cả', claim: 'Nhận' },
  th: { play: 'สำรวจ', upgrade: 'โรงงาน', shop: 'ร้านค้า', storage: 'คลัง', codex: 'สารานุกรม', missions: 'ภารกิจ', records: 'สถิติ', settings: 'ตั้งค่า', return: 'กลับพื้นดิน', pause: 'หยุดชั่วคราว', resume: 'เล่นต่อ', base: 'ฐาน', newRun: 'เริ่มสำรวจ', locked: 'ล็อก', clear: 'ผ่านแล้ว', buy: 'ซื้อ', sell: 'ขายทั้งหมด', claim: 'รับ' },
  es: { play: 'Explorar', upgrade: 'Taller', shop: 'Tienda', storage: 'Almacén', codex: 'Códice', missions: 'Misiones', records: 'Récords', settings: 'Ajustes', return: 'Regresar', pause: 'Pausa', resume: 'Continuar', base: 'Base', newRun: 'Empezar', locked: 'Bloqueado', clear: 'Superado', buy: 'Comprar', sell: 'Vender todo', claim: 'Cobrar' },
};

export const tr = (language: Language, key: string) => words[language]?.[key] ?? words.en[key] ?? key;
export const languages = Object.entries(languageNames) as [Language, string][];
