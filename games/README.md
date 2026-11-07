# Statflow Playtest Games

`draft-test`에 배포되는 모바일 세로형 Phaser 프로토타입 3종의 소스 워크스페이스입니다.

## 실행

```bash
cd games
npm install
npm run check
npm run build
```

개별 개발 서버는 `npm run dev --workspace <게임 이름>`으로 실행합니다.

| 게임 | 워크스페이스 | 웹 빌드 |
|---|---|---|
| SNEAKY CAT | `sneaky-cat` | `../draft-test/sneaky-cat` |
| EVOLUTION LAB | `evolution-lab` | `../draft-test/evolution-lab` |
| MINI DUNGEON DIGGER | `mini-dungeon-digger` | `../draft-test/mini-dungeon-digger` |

각 게임은 서버 없이 실행되며 진행 상태는 `localStorage`에 저장됩니다. Android 프로젝트를 만들려면 해당 게임 폴더에서 `npm run cap:add:android` 후 `npm run cap:sync`를 실행합니다.
