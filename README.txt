LIFE-RPG2 FIX (시작 안 되는 문제 + 랜덤 타워 캔버스)

✅ 적용 방법
1) 이 ZIP을 풀기
2) 기존 GitHub 저장소 루트에 index.html / main.js 를 업로드해서 '덮어쓰기'
   (style.css, assets 폴더는 그대로 유지)
3) assets/tower_tiles.png 를 추가 (타일 스프라이트 시트)
4) GitHub Pages에서 Ctrl+F5

✅ 해결 내용
- enterGame()에서 화면이 열린 다음 프레임에 startTowerCanvas() 실행 → '시작 안 됨' 해결
- towerCanvas가 없거나 타일 시트가 없으면 게임이 멈추지 않도록 안전 처리
- 기존 CSS 배경(towerBg)은 게임 진입 시 display:none 처리 → '배경이 그대로' 문제 해결
