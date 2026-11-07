# MINI DUNGEON DIGGER — 미니 던전 디거

귀환 시점을 선택하는 2D 사이드뷰 채굴 로그라이크 프로토타입입니다.

## 구현 범위

- 0~300m 절차 생성 지형과 항상 이어지는 중심 갱도
- 흙·돌·단단한 암석·철·금·보석·폭발석·수정·불안정 암석·함정
- 타일 내구도, 에너지 소비, 타격 파편과 희귀 광물 연출
- 3×3 폭발, 연결 수정 연쇄, 낙석
- 박쥐·동굴 두더지 추격 AI, 체력과 긴급 귀환
- 광물 판매와 드릴·배터리·가방·탐지기·폭탄 업그레이드
- 가상 조이스틱, 채굴 버튼, 폭탄 버튼, 키보드 테스트 조작

## 조작

- 모바일: 왼쪽 조이스틱 이동/점프/조준, 오른쪽 채굴·폭탄
- 데스크톱: WASD/방향키, Space 채굴, B 폭탄, R 귀환

## 실행과 빌드

```bash
cd games
npm install
npm run dev --workspace mini-dungeon-digger
npm run check --workspace mini-dungeon-digger
npm run build --workspace mini-dungeon-digger
```

웹 빌드는 `draft-test/mini-dungeon-digger`에 생성됩니다. Capacitor 설정은 `capacitor.config.ts`에 있습니다.

## 주요 파일

- `src/main.ts`: 지형 생성, 채굴/연쇄, 위험, 귀환/판매, 업그레이드
- `src/style.css`: 모바일 전체 화면 셸
- `vite.config.ts`: GitHub Pages 빌드 설정
- `capacitor.config.ts`: Android/iOS 패키징 설정
