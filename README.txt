LIFE-RPG2 v2.2.0-randomtower-merge

✅ 변경점
- 기존 CSS 배경(towerBg/bgStairs) 대신 Canvas 기반 랜덤 타워 배경 적용
- 좌/우 성벽은 랜덤 조합으로 '한 번 생성 후 고정'
- 가운데 계단은 무한 스크롤(층수에 따라 약간 가속)
- 배경이 그대로였던 문제: enterGame()에서 towerBg를 display:none 처리

📌 꼭 넣어야 하는 파일
- assets/tower_tiles.png  (스프라이트 시트)
  ※ 지금 채팅에서 올린 타일 시트를 이 이름으로 저장해서 assets 폴더에 넣어줘.

업로드 방법
1) 이 ZIP을 풀고, index.html / main.js 를 기존 저장소에 '업로드(덮어쓰기)'
2) assets/tower_tiles.png 추가
3) GitHub Pages에서 Ctrl+F5 (강력 새로고침)

주의
- style.css는 기존 프로젝트 파일을 그대로 사용합니다(이 ZIP에는 포함하지 않음).
