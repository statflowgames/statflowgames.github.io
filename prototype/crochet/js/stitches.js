// 코바늘 기법 목록 — 도안 데이터의 기호 코드는 여기 있는 것만 쓸 수 있다.
//   use  : 앞 단에서 쓰는 코 수 (1번 뜰 때)
//   make : 이 단에 새로 생기는 코 수
//   h    : 코 높이 (1 짧은뜨기, 2 긴뜨기, 3 한길긴뜨기, 4 두길긴뜨기) — 평평한 원의 늘림 수 계산에 씀
//   unit : 글로 쓸 때 단위 (코 / 번)
// 사슬(ch)은 코 수에 넣지 않고 '공간' 1개를 만든다 (사슬 여러 코가 이어지면 공간 1개).
export const STITCH = {
  ch:     { ko: '사슬뜨기',             short: '사슬',            unit: '코', use: 0, make: 0 },
  sl:     { ko: '빼뜨기',               short: '빼뜨기',          unit: '코', use: 1, make: 1, h: 0 },
  sc:     { ko: '짧은뜨기',             short: '짧은뜨기',        unit: '코', use: 1, make: 1, h: 1 },
  sc_blo: { ko: '짧은 이랑뜨기 (뒷고리)', short: '뒷고리 짧은뜨기', unit: '코', use: 1, make: 1, h: 1 },
  hdc:    { ko: '긴뜨기',               short: '긴뜨기',          unit: '코', use: 1, make: 1, h: 2 },
  dc:     { ko: '한길긴뜨기',           short: '한길긴뜨기',      unit: '코', use: 1, make: 1, h: 3 },
  tr:     { ko: '두길긴뜨기',           short: '두길긴뜨기',      unit: '코', use: 1, make: 1, h: 4 },
  inc:    { ko: '짧은뜨기 2코 늘려뜨기', short: '늘리기',          unit: '번', use: 1, make: 2, h: 1 },
  dec:    { ko: '짧은뜨기 2코 모아뜨기', short: '모아뜨기',        unit: '번', use: 2, make: 1, h: 1 },
  hdcinc: { ko: '긴뜨기 2코 늘려뜨기',   short: '긴뜨기 늘리기',   unit: '번', use: 1, make: 2, h: 2 },
  dcinc:  { ko: '한길긴뜨기 2코 늘려뜨기', short: '한길긴뜨기 늘리기', unit: '번', use: 1, make: 2, h: 3 },
  dcdec:  { ko: '한길긴뜨기 2코 모아뜨기', short: '한길긴뜨기 모아뜨기', unit: '번', use: 2, make: 1, h: 3 },
  sk:     { ko: '건너뛰기',             short: '건너뛰기',        unit: '코', use: 1, make: 0 },
};

// 높이별 기둥코(사슬) 수
export const TURN_CH = { 0: 1, 1: 1, 2: 2, 3: 3, 4: 4 };
// 평평한 원에서 한 단에 늘어야 하는 코 수 (높이별)
export const FLAT_INC = { 1: 6, 2: 8, 3: 12, 4: 16 };

export const CATEGORIES = ['수세미', '코스터', '모티브', '소품', '인형', '가방', '담요'];
export const LEVELS = { 1: '입문', 2: '초급', 3: '중급' };
