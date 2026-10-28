// 은하 방역대 - 앱(Capacitor)에서만 불러오는 파일 (scripts/build-www.mjs 가 www/index.html 에 끼워 넣음)
// 빌드 도구가 없어서 플러그인을 직접 등록한다 → window.Capacitor.Plugins.AdMob 등으로 쓸 수 있음
if (window.Capacitor && Capacitor.registerPlugin) ['AdMob', 'Share', 'Filesystem', 'App', 'SplashScreen'].forEach(n => Capacitor.registerPlugin(n));
