# EVOLUTION LAB — 무한 진화 실험실

파트 기반 생명체 합성과 자동 전투를 연결한 Phaser 3 모바일 프로토타입입니다.

## 구현 범위

- 슬라임·버그·스톤 기본종과 12가지 돌연변이 능력
- 부모 능력 계승, 규칙 기반 기본형 선택, 희귀 돌연변이
- 가시·날개·갑옷·촉수·전기 등 능력이 몸 파츠와 효과로 표시
- 3 대 3 자동 전투: 탐색, 이동, 공격, 독, 반사, 흡혈, 재생, 분열, 폭발, 연쇄 공격
- 독+가시, 전기+분열, 흡혈+갑옷, 날개+폭발 시너지
- 15개 특수종을 포함한 도감과 미발견 실루엣
- 오프라인 `localStorage` 저장

## 실행과 빌드

```bash
cd games
npm install
npm run dev --workspace evolution-lab
npm run check --workspace evolution-lab
npm run build --workspace evolution-lab
```

웹 빌드는 `draft-test/evolution-lab`에 생성됩니다. Capacitor 설정은 `capacitor.config.ts`에 있습니다.

## 주요 파일

- `src/main.ts`: 합성 규칙, 파츠 렌더러, 자동 전투, 도감, 저장
- `src/style.css`: 9:16 캔버스 셸
- `vite.config.ts`: 정적 웹 빌드 경로
- `capacitor.config.ts`: 모바일 앱 설정
