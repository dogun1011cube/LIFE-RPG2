// 먼작귀 캐릭터 그림 (SVG). app.js보다 먼저 로드된다.
// 공통 클래스: .eye(졸림), .tears(눈물), .mouth-closed / .mouth-open(먹을 때)
const INK = "#3f3330";
const LINE = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;

// 큰 머리 + 작은 몸이 한 덩어리로 이어진 실루엣 (목에서 살짝 들어감)
const BODY = "M60 28 C84 28 99 42 99 60 C99 72 93 79 88 83 C92 89 92 98 86 103 C78 108 42 108 34 103 C28 98 28 89 32 83 C27 79 21 72 21 60 C21 42 36 28 60 28 Z";

function eyes({ x1 = 46, x2 = 74, y = 60, rx = 3.6, ry = 4.6, hi = 1 } = {}) {
  const one = (x) => `
    <ellipse class="eye" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#231b1a"/>
    ${hi ? `<circle cx="${x + rx * 0.3}" cy="${y - ry * 0.38}" r="${rx * 0.36}" fill="#fff"/>` : ""}
    ${hi > 1 ? `<circle cx="${x - rx * 0.35}" cy="${y + ry * 0.42}" r="${rx * 0.2}" fill="#fff"/>` : ""}`;
  return one(x1) + one(x2);
}
// 원작처럼 빗금이 들어간 분홍 볼
function cheeks({ x1 = 34, x2 = 86, y = 70 } = {}) {
  const one = (x) => `
    <ellipse cx="${x}" cy="${y}" rx="6.4" ry="3.4" fill="#ffbfcb"/>
    <path d="M${x - 3.6} ${y + 1.8} l2 -3.6 M${x - 0.6} ${y + 1.8} l2 -3.6 M${x + 2.4} ${y + 1.8} l2 -3.6" stroke="#ee8a9c" stroke-width="0.9" stroke-linecap="round"/>`;
  return one(x1) + one(x2);
}
function tears({ x1 = 46, x2 = 74, y = 60 } = {}) {
  const one = (x) => `<path d="M${x} ${y + 5} C${x - 3} ${y + 10} ${x - 2} ${y + 14} ${x} ${y + 15} C${x + 3} ${y + 13} ${x + 3} ${y + 9} ${x} ${y + 5} Z" fill="#8bd6f5"/>`;
  return `<g class="tears">${one(x1)}${one(x2)}</g>`;
}
function mouth(kind, y = 68) {
  const closed = {
    // 치이카와: 아주 작은 입
    small: `<path d="M57.6 ${y} Q60 ${y + 2.4} 62.4 ${y}" fill="none" ${LINE} stroke-width="1.6"/>`,
    // 하치와레: 고양이 입
    cat: `<path d="M54.5 ${y} Q57.2 ${y + 3} 60 ${y} Q62.8 ${y + 3} 65.5 ${y}" fill="none" ${LINE} stroke-width="1.6"/>`,
    // 우사기: 늘 벌어진 입
    usagi: `<path d="M55.5 ${y - 1} Q60 ${y - 2} 64.5 ${y - 1} Q63 ${y + 5} 60 ${y + 5} Q57 ${y + 5} 55.5 ${y - 1} Z" fill="#e2707f" ${LINE} stroke-width="1.5"/>
            <path d="M57.5 ${y + 3} Q60 ${y + 1.5} 62.5 ${y + 3}" fill="#f7a9b4"/>`,
    // 모몽가: 조그만 ω
    tiny: `<path d="M56.5 ${y} Q58.2 ${y + 2} 60 ${y} Q61.8 ${y + 2} 63.5 ${y}" fill="none" ${LINE} stroke-width="1.5"/>`,
  }[kind];
  return `<g class="mouth-closed">${closed}</g>
    <ellipse class="mouth-open" cx="60" cy="${y + 2}" rx="3.6" ry="4.2" fill="#e2707f" ${LINE} stroke-width="1.5"/>`;
}
// 목 옆에서 나온 짧은 팔과 아래로 살짝 보이는 발
function limbs(fill) {
  return `
    <path d="M33 84 C26 86 23 92 26 95 C29 97 33 93 35 89" fill="${fill}" ${LINE}/>
    <path d="M87 84 C94 86 97 92 94 95 C91 97 87 93 85 89" fill="${fill}" ${LINE}/>
    <path d="M42 104 C41 109 47 111 52 108" fill="${fill}" ${LINE}/>
    <path d="M78 104 C79 109 73 111 68 108" fill="${fill}" ${LINE}/>`;
}
const svg = (inner) => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const SVGS = {
  // 치이카와: 하얀 몸, 머리 위의 작고 둥근 귀
  chiikawa: svg(`
    <path d="M36 37 C31 31 33 23 40 23 C45 23 48 27 47 32" fill="#fff" ${LINE}/>
    <path d="M84 37 C89 31 87 23 80 23 C75 23 72 27 73 32" fill="#fff" ${LINE}/>
    <path d="${BODY}" fill="#fff" ${LINE}/>
    ${limbs("#fff")}
    ${eyes()}${cheeks()}${tears()}${mouth("small")}`),

  // 하치와레: 머리를 덮은 파란 무늬가 이마 가운데에서 八자로 갈라짐, 뾰족한 파란 고양이 귀
  hachiware: svg(`
    <defs><clipPath id="hachiClip"><path d="${BODY}"/></clipPath></defs>
    <path d="M27 46 L25 18 Q26 13 31 16 L50 31 Z" fill="#8cb6e0" ${LINE}/>
    <path d="M93 46 L95 18 Q94 13 89 16 L70 31 Z" fill="#8cb6e0" ${LINE}/>
    <path d="${BODY}" fill="#fff"/>
    <path clip-path="url(#hachiClip)" d="M0 0 H120 V64 C110 58 100 52 90 50 C78 48 68 44 60 34 C52 44 42 48 30 50 C20 52 10 58 0 64 Z" fill="#8cb6e0"/>
    <path d="${BODY}" fill="none" ${LINE}/>
    ${limbs("#fff")}
    ${eyes({ y: 62 })}${cheeks({ y: 72 })}${tears({ y: 62 })}${mouth("cat", 70)}`),

  // 우사기: 연노랑 몸, 위로 쭉 뻗은 긴 귀, 작은 점 눈과 벌린 입
  usagi: svg(`
    <path d="M44 36 C38 24 38 5 45 3 C52 1 55 20 53 34" fill="#fbeea8" ${LINE}/>
    <path d="M76 36 C82 24 82 5 75 3 C68 1 65 20 67 34" fill="#fbeea8" ${LINE}/>
    <path d="M45.5 28 C43 19 43.5 10 45.6 9 C48 9.5 49.6 18 49.4 28 Z" fill="#f6bcc8"/>
    <path d="M74.5 28 C77 19 76.5 10 74.4 9 C72 9.5 70.4 18 70.6 28 Z" fill="#f6bcc8"/>
    <path d="${BODY}" fill="#fbeea8" ${LINE}/>
    ${limbs("#fbeea8")}
    ${eyes({ x1: 44, x2: 76, rx: 2.9, ry: 3.6 })}${cheeks({ x1: 33, x2: 87 })}${tears({ x1: 44, x2: 76 })}${mouth("usagi", 68)}`),

  // 모몽가: 하얀 몸, 바깥으로 뻗은 큰 귀, 반짝반짝 큰 눈, 풍성한 꼬리
  momonga: svg(`
    <path d="M84 100 C104 104 118 88 116 66 C115 50 105 42 97 46 C91 49 93 56 97 60 C103 68 101 82 88 88 Z" fill="#fff" ${LINE}/>
    <path d="M104 58 C108 66 108 76 103 84" fill="none" stroke="#ddd4e5" stroke-width="2" stroke-linecap="round"/>
    <path d="M37 38 C25 33 22 19 31 16 C39 14 46 24 47 32" fill="#fff" ${LINE}/>
    <path d="M83 38 C95 33 98 19 89 16 C81 14 74 24 73 32" fill="#fff" ${LINE}/>
    <path d="M37 32 C30 29 28 22 32 20 C37 19 41 25 42 30 Z" fill="#ffd0da"/>
    <path d="M83 32 C90 29 92 22 88 20 C83 19 79 25 78 30 Z" fill="#ffd0da"/>
    <path d="${BODY}" fill="#fff" ${LINE}/>
    ${limbs("#fff")}
    ${eyes({ x1: 45, x2: 75, y: 59, rx: 5.2, ry: 6.4, hi: 2 })}${cheeks({ x1: 33, x2: 87, y: 71 })}${tears({ x1: 45, x2: 75, y: 61 })}${mouth("tiny", 70)}`),
};
