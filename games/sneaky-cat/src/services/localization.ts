import { Language } from '../data/gameData';
export const languages:[Language,string][]=[['ko','한국어'],['en','English'],['ja','日本語'],['zh-CN','简体中文'],['zh-TW','繁體中文'],['vi','Tiếng Việt'],['th','ไทย'],['es','Español']];
const d:Record<Language,Record<string,string>>={
ko:{deploy:'출동하기',stages:'스테이지',ability:'고양이 능력',skins:'스킨',codex:'보물 도감',records:'기록',missions:'미션',settings:'설정',steal:'훔치기',hide:'숨기',exit:'탈출',run:'달리기',pause:'일시정지',retry:'즉시 재도전'},
en:{deploy:'Deploy',stages:'Stages',ability:'Abilities',skins:'Skins',codex:'Treasure Codex',records:'Records',missions:'Missions',settings:'Settings',steal:'Steal',hide:'Hide',exit:'Escape',run:'Run',pause:'Paused',retry:'Retry now'},
ja:{deploy:'出動',stages:'ステージ',ability:'能力',skins:'スキン',codex:'お宝図鑑',records:'記録',missions:'ミッション',settings:'設定',steal:'盗む',hide:'隠れる',exit:'脱出',run:'走る',pause:'一時停止',retry:'すぐ再挑戦'},
'zh-CN':{deploy:'出动',stages:'关卡',ability:'能力',skins:'外观',codex:'宝物图鉴',records:'记录',missions:'任务',settings:'设置',steal:'偷取',hide:'躲藏',exit:'逃脱',run:'奔跑',pause:'暂停',retry:'立即重试'},
'zh-TW':{deploy:'出動',stages:'關卡',ability:'能力',skins:'外觀',codex:'寶物圖鑑',records:'記錄',missions:'任務',settings:'設定',steal:'偷取',hide:'躲藏',exit:'逃脫',run:'奔跑',pause:'暫停',retry:'立即重試'},
vi:{deploy:'Xuất phát',stages:'Màn chơi',ability:'Kỹ năng',skins:'Ngoại hình',codex:'Kho báu',records:'Kỷ lục',missions:'Nhiệm vụ',settings:'Cài đặt',steal:'Trộm',hide:'Trốn',exit:'Thoát',run:'Chạy',pause:'Tạm dừng',retry:'Thử lại'},
th:{deploy:'ออกปฏิบัติ',stages:'ด่าน',ability:'ความสามารถ',skins:'สกิน',codex:'สมบัติ',records:'สถิติ',missions:'ภารกิจ',settings:'ตั้งค่า',steal:'ขโมย',hide:'ซ่อน',exit:'หนี',run:'วิ่ง',pause:'หยุดชั่วคราว',retry:'ลองใหม่'},
es:{deploy:'Salir',stages:'Niveles',ability:'Habilidades',skins:'Aspectos',codex:'Tesoros',records:'Récords',missions:'Misiones',settings:'Ajustes',steal:'Robar',hide:'Ocultar',exit:'Escapar',run:'Correr',pause:'Pausa',retry:'Reintentar'}};
export const tr=(l:Language,k:string)=>d[l]?.[k]||d.en[k]||k;
