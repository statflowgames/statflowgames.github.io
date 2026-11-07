# MINI DUNGEON DIGGER — 미니 던전 디거

모바일 세로 화면에 맞춘 오프라인 2D 채굴·탐험·로그라이크 게임입니다. 플레이어는 매 탐험에서 광물과 보물을 모으고, 더 내려갈지 안전하게 귀환할지 결정합니다. 귀환한 자원으로 영구 장비를 강화하고 지역 보스를 처치해 다음 지역을 해금합니다.

## 완성 콘텐츠

- Green Cave, Crystal Cave, Ancient Ruins, Lava Zone, Abyss의 5개 반복 탐험 지역
- Giant Mole, Crystal Golem, Ancient Guardian, Lava Dragon, Abyss King의 5개 보스
- 보스별 돌진·투사체·레이저·화염·소환 패턴과 실제 지형 약점
- Cave Bat, Rock Slime, Crystal Spider, Ancient Golem, Lava Beast 추격/공격 AI
- 청크 기반 시드 월드, 자연 동굴, 비밀방, 보물상자, 보호된 보스 아레나
- 흙·돌·암석·철·금·수정·루비·에메랄드·자수정·고대 광물·폭발석·가스·함정·용암 등 지형
- 폭발 3×3 파괴, 수정 연쇄, 가스 폭발, 불안정 암석 낙하
- 체력·에너지·가방·폭탄·에너지 셀, 정상/긴급/실패 귀환 보존율
- 드릴·배터리·가방 Lv.10, 탐지기·폭탄 Lv.5 영구 성장
- 기지, 지역 선택, 작업대, 상점, 창고, 도감, 미션, 기록, 설정
- 한국어·영어·일본어·중국어(간/번)·베트남어·태국어·스페인어 UI 리소스
- 버전 3 로컬 저장과 이전 프로토타입 저장 마이그레이션
- 합성 효과음, 진동, 화면 흔들림, 파편, 희귀 광물, 보스 등장/처치 연출
- Capacitor Android 프로젝트

## 조작

### 모바일

- 왼쪽 가상 조이스틱: 이동 및 채굴 방향 지정
- 주변 블록 직접 터치/길게 누르기: 자유 채굴
- 큰 채굴 버튼 길게 누르기: 지정 방향 연속 채굴/드릴 공격
- 파란 ↑ 버튼: 점프
- 빨간 ● 버튼: 폭탄
- 초록 ⚡ 버튼: 에너지 셀

### 데스크톱 테스트

- `A/D` 또는 `←/→`: 이동
- `W` 또는 `↑`: 점프
- `Space`: 채굴/공격
- `B`: 폭탄, `E`: 에너지 셀, `R`: 귀환, `Esc`: 일시정지

## 실행과 웹 빌드

```bash
cd games
npm install
npm run dev --workspace mini-dungeon-digger
npm run check --workspace mini-dungeon-digger
npm run build --workspace mini-dungeon-digger
```

웹 빌드는 `draft-test/mini-dungeon-digger`에 생성됩니다.

## Android

```bash
cd games
npm run build --workspace mini-dungeon-digger
npm run cap:sync --workspace mini-dungeon-digger
cd mini-dungeon-digger/android
./gradlew assembleDebug
```

Android Studio에서는 `games/mini-dungeon-digger/android` 폴더를 엽니다. 앱 ID는 `com.statflowgames.minidungeondigger`입니다.

## 주요 구조

```text
src/
  data/gameData.ts          지역·타일·경제·미션·업그레이드 데이터
  game/BaseScene.ts         기지와 성장/수집/설정 화면
  game/GameScene.ts         채굴·전투·보스·귀환 플레이
  game/art.ts               독립 런타임 타일/몬스터/보스 텍스처와 배경
  services/save.ts          버전 저장·마이그레이션
  services/localization.ts  8개 언어 리소스
  world/chunkGenerator.ts   시드 기반 청크 생성
  main.ts                   Phaser 부팅과 씬 등록
public/assets/
  characters/miner-sheet.png  16프레임 광부 스프라이트 시트
android/                    Capacitor Android 프로젝트
```

## 구현 원칙

- 게임 규칙과 밸런스 데이터는 렌더링/씬 코드와 분리했습니다.
- 보스 아레나의 외곽은 파괴 불가능한 기반암으로 보호합니다.
- 화면 밖 타일 충돌과 몬스터 갱신을 제한하고 파티클 수를 제한합니다.
- 광고·인앱결제·서버·온라인 랭킹은 기획서의 초기 제외 범위에 따라 포함하지 않습니다.

## 그래픽 자산

광부 스프라이트는 내장 이미지 생성 도구로 제작한 프로젝트 전용 투명 PNG입니다. 타일·광물·몬스터·보스·이펙트는 코드에서 독립 텍스처로 생성되어 충돌/상태 데이터와 분리됩니다. 모든 자산은 외부 게임 에셋을 복사하지 않았습니다.

## 테스트

- `tsc --noEmit`
- Vite production build
- Capacitor Android add/sync
- Gradle `assembleDebug` 성공 (`android/app/build/outputs/apk/debug/app-debug.apk`)
- 모바일 9:16 브라우저에서 메뉴, 지역 선택, 이동, 직접 채굴, 버튼 연속 채굴, 점프, 귀환 흐름

## 알려진 제한

- 합성 사운드는 Web Audio 기반이며, 스토어 출시용 BGM/효과음 파일은 별도 마스터링이 필요합니다.
- Android 릴리스 서명과 실제 중급 단말 성능 측정은 배포 키와 기기가 필요한 출시 작업입니다.
