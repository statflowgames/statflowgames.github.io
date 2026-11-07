# SNEAKY CAT — 도둑 고양이

Phaser 3 + TypeScript + Vite로 만든 모바일 세로형 잠입 퍼즐 액션 프로토타입입니다.

## 구현 범위

- 서로 다른 퍼즐을 요구하는 거실·주방·로봇청소기 스테이지 3개
- `PATROL → SUSPICIOUS → INVESTIGATE → CHASE → SEARCH` 경비 AI
- 시야각·사거리·가구 가림, 경비견 근거리 감지, 발각 직전 경고
- 상자 숨기, 컵 소음 유인, 로봇청소기 탑승
- 가상 조이스틱, 상황형 단일 액션 버튼, 키보드 테스트 조작
- S/A/B/C 평가, 로컬 진행 저장, 2초 이내 재시작

## 조작

- 모바일: 왼쪽 조이스틱 이동, 오른쪽 액션 버튼
- 데스크톱: WASD/방향키 이동, Space 상호작용, Esc 스테이지 선택

## 실행과 빌드

```bash
cd games
npm install
npm run dev --workspace sneaky-cat
npm run check --workspace sneaky-cat
npm run build --workspace sneaky-cat
```

웹 빌드는 `draft-test/sneaky-cat`에 생성됩니다. Android용 Capacitor 셸은 `npm run cap:add:android --workspace sneaky-cat` 후 `npm run cap:sync --workspace sneaky-cat`으로 생성할 수 있습니다.

## 주요 파일

- `src/main.ts`: 스테이지, 경비 상태 머신, 시야, 상호작용, 점수
- `src/style.css`: 전체 화면 모바일 캔버스 셸
- `vite.config.ts`: GitHub Pages용 상대 경로 빌드
- `capacitor.config.ts`: Android/iOS 패키징 설정
