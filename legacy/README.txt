LIFE-RPG2 v2.3.0 STABLE FULL PATCH

이 패치는 '게임 전체 로직'을 유지하면서 배경을 안정적으로 교체합니다.

✅ 특징
- 기존 UI/공부/로그/상점 등 전체 로직 유지
- 메인 진입 시 기존 CSS 배경(towerBg) 강제 숨김
- Canvas 배경이 반드시 보이도록 z-index 보정
- assets/tower_tiles.png가 있으면 스프라이트 타일로 랜덤 성벽 + 계단 스크롤
- assets/tower_tiles.png가 없거나 로드 실패하면, '절대 안 보일 수 없는' 절차적(프로시저) 배경으로 자동 대체
- D 키를 누르면 좌하단 디버그 박스 표시/숨김

📌 적용 방법
1) 이 ZIP을 풀기
2) 기존 GitHub 저장소 루트에 index.html / main.js 를 덮어쓰기 업로드
   (style.css, assets 폴더는 그대로 유지)
3) GitHub Pages에서 Ctrl+F5

📌 확인
- 게임 들어가서 D 키 → 디버그에 sprite loaded OK / FAILED 표시 확인
