# SNEAKY CAT — 도둑 고양이

모바일 세로 화면용 2D 잠입 퍼즐 액션 게임입니다. 회색 줄무늬 고양이가 집주인·경비견·경비원·보안 카메라의 시야를 피하고, 환경을 이용해 적을 속인 뒤 보물을 훔쳐 탈출합니다.

## 완성 콘텐츠

- 작은 집, 부잣집, 스마트홈, 고급 호텔, 박물관의 5개 챕터
- 데이터 기반 기본 스테이지 30개
- 집주인·경비견·경비원 상태 머신: 순찰, 의심, 조사, 추격, 수색, 복귀
- 가구에 의해 실제로 차단되는 시야 판정과 시각화
- 거리·달리기·은신·업그레이드를 반영하는 탐지 게이지
- 달리기 발소리, 컵, 장난감과 연결된 소음 유인 시스템
- 상자·커튼·옷장 숨기, 문 열기/닫기, 장난감 던지기
- 로봇청소기 탑승, 높은 가구, 보안 전원 차단
- 회전 보안 카메라와 박물관 레이저
- 필수 보물과 위험한 선택 보물, 6종 보물 도감
- 추격·수색·코믹한 적 반응과 2초 이내 재도전
- 점수, S/A/B/C 등급, 골드, 순차 스테이지 해금
- 5종 능력 업그레이드와 외형 전용 스킨 8종
- 아지트, 스테이지 선택, 능력, 스킨, 도감, 미션, 기록, 설정
- 타임 어택, 노 발각, 보물 러시, 랜덤 하우스 특수 모드
- 한국어·영어·일본어·중국어(간/번)·베트남어·태국어·스페인어 리소스
- 버전 2 로컬 저장과 기존 프로토타입 저장 마이그레이션
- Web Audio 효과음, 진동, 파티클, 화면 경고와 승리 연출
- Capacitor Android 프로젝트

## 모바일 조작

- 왼쪽 가상 조이스틱: 8방향 이동
- 오른쪽 상황 버튼: 훔치기, 숨기, 컵 떨어뜨리기, 문, 장난감, 로봇청소기, 전원, 탈출
- `RUN`: 누르는 동안 달리기. 빠르지만 소음과 탐지 위험이 증가합니다.

데스크톱에서는 WASD/방향키, Space 상호작용, Shift 달리기, Esc 일시정지를 사용합니다.

## 실행과 빌드

```bash
cd games
npm install
npm run dev --workspace sneaky-cat
npm run check --workspace sneaky-cat
npm run build --workspace sneaky-cat
```

웹 빌드는 `draft-test/sneaky-cat`에 생성됩니다.

## Android

```bash
cd games
npm run build --workspace sneaky-cat
npm run cap:sync --workspace sneaky-cat
cd sneaky-cat/android
./gradlew assembleDebug
```

- 앱 ID: `com.statflowgames.sneakycat`
- 디버그 APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## 주요 구조

```text
src/
  data/gameData.ts          30개 스테이지·챕터·보물·성장 데이터
  game/BaseScene.ts         아지트와 진행/수집/설정 화면
  game/GameScene.ts         잠입·AI·시야·소음·상호작용·점수
  game/art.ts               독립 캐릭터·가구·보물 런타임 텍스처
  services/save.ts          버전 저장과 마이그레이션
  services/localization.ts  8개 언어 리소스
  main.ts                   Phaser 부팅 및 씬 등록
public/assets/characters/
  cat-sheet.png             16프레임 고양이 애니메이션 시트
android/                    Capacitor Android 프로젝트
```

## 테스트

- TypeScript `tsc --noEmit`
- Vite 프로덕션 빌드
- Capacitor add/sync
- Gradle `assembleDebug`
- 모바일 9:16 화면에서 이동, 상호작용, 탐지, 추격, 재도전, 탈출, 저장 흐름

## 그래픽 자산

고양이 스프라이트는 내장 이미지 생성 도구로 제작한 프로젝트 전용 투명 PNG입니다. 적, 가구, 보물, UI와 효과는 동일한 따뜻한 카툰 팔레트의 독립 텍스처로 관리합니다. 다른 게임의 그래픽은 사용하지 않았습니다.

## 출시 전 남은 외부 작업

- Android/iOS 릴리스 서명
- 실제 중급 모바일 기기 성능 및 장기 밸런스 측정
- 스토어용 BGM/효과음 마스터링
- 기획상 초기 제외 범위인 광고와 인앱결제 연동
