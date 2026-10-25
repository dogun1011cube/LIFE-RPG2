// 먼작귀 캐릭터 그림 (SVG). app.js보다 먼저 로드된다.
// 공통 클래스: .eye(졸림), .tears(눈물), .mouth-closed / .mouth-open(먹을 때)
const INK = "#4b3b36";
const LINE = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;

// 찹쌀떡처럼 머리와 몸이 하나인 몸통
const MOCHI = "M60 32 C83 32 99 49 99 73 C99 95 83 106 60 106 C37 106 21 95 21 73 C21 49 37 32 60 32 Z";

function eyes({ x1 = 47, x2 = 73, y = 66, rx = 4.4, ry = 5.6, sparkle = 1 } = {}) {
  const one = (x) => `
    <ellipse class="eye" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#2b2220"/>
    <circle cx="${x + rx * 0.35}" cy="${y - ry * 0.4}" r="${rx * 0.38}" fill="#fff"/>
    ${sparkle > 1 ? `<circle cx="${x - rx * 0.35}" cy="${y + ry * 0.45}" r="${rx * 0.2}" fill="#fff"/>` : ""}`;
  return one(x1) + one(x2);
}
// 빗금이 들어간 볼터치
function cheeks({ x1 = 36, x2 = 84, y = 77 } = {}) {
  const one = (x) => `
    <ellipse cx="${x}" cy="${y}" rx="7.5" ry="4.2" fill="#ffc4ce"/>
    <path d="M${x - 4} ${y + 2} l2.4 -4 M${x - 0.6} ${y + 2} l2.4 -4 M${x + 2.8} ${y + 2} l2.4 -4" stroke="#f2899c" stroke-width="1.1" stroke-linecap="round"/>`;
  return one(x1) + one(x2);
}
function tears({ x1 = 47, x2 = 73, y = 66 } = {}) {
  return `<g class="tears">
    <path d="M${x1} ${y + 6} q-3.5 7 0 11 q3.5 -4 0 -11 Z" fill="#8fd3ff"/>
    <path d="M${x2} ${y + 6} q-3.5 7 0 11 q3.5 -4 0 -11 Z" fill="#8fd3ff"/></g>`;
}
function mouth(kind, y = 77) {
  const closed = {
    small: `<path d="M57 ${y} q3 3 6 0" fill="none" ${LINE} stroke-width="2"/>`,
    cat: `<path d="M53.5 ${y - 1} q3.2 4 6.5 0 q3.3 4 6.5 0" fill="none" ${LINE} stroke-width="2"/>`,
    usagi: `<path d="M55 ${y - 1} q5 6 10 0" fill="#e96f82" ${LINE} stroke-width="2"/>`,
    tiny: `<path d="M58 ${y} q2 2 4 0" fill="none" ${LINE} stroke-width="2"/>`,
  }[kind];
  return `<g class="mouth-closed">${closed}</g>
    <ellipse class="mouth-open" cx="60" cy="${y + 2}" rx="4.2" ry="4.8" fill="#e96f82" ${LINE} stroke-width="1.8"/>`;
}
// 몸통 옆의 짧은 팔과 아래로 살짝 보이는 발
function limbs(fill) {
  return `
    <ellipse cx="22" cy="86" rx="6.5" ry="5" transform="rotate(-25 22 86)" fill="${fill}" ${LINE} stroke-width="2.2"/>
    <ellipse cx="98" cy="86" rx="6.5" ry="5" transform="rotate(25 98 86)" fill="${fill}" ${LINE} stroke-width="2.2"/>
    <ellipse cx="46" cy="106" rx="9" ry="4.5" fill="${fill}" ${LINE} stroke-width="2.2"/>
    <ellipse cx="74" cy="106" rx="9" ry="4.5" fill="${fill}" ${LINE} stroke-width="2.2"/>`;
}
const svg = (inner) => `<svg viewBox="0 0 120 120">${inner}</svg>`;

const SVGS = {
  // 치이카와: 하얀 찹쌀떡 몸, 작고 둥근 귀
  chiikawa: svg(`
    <path d="M33 42 C29 30 37 22 45 26 C49 28 50 33 49 36" fill="#fff" ${LINE}/>
    <path d="M87 42 C91 30 83 22 75 26 C71 28 70 33 71 36" fill="#fff" ${LINE}/>
    ${limbs("#fff")}
    <path d="${MOCHI}" fill="#fff" ${LINE}/>
    ${eyes()}${cheeks()}${tears()}${mouth("small")}`),

  // 하치와레: 이마 가운데가 八자로 갈라진 파란 무늬, 뾰족한 고양이 귀
  hachiware: svg(`
    <defs><clipPath id="hachiClip"><path d="${MOCHI}"/></clipPath></defs>
    <path d="M27 52 L26 22 Q27 16 32 19 L52 35 Z" fill="#8fb8e0" ${LINE}/>
    <path d="M93 52 L94 22 Q93 16 88 19 L68 35 Z" fill="#8fb8e0" ${LINE}/>
    ${limbs("#fff")}
    <path d="${MOCHI}" fill="#fff"/>
    <path clip-path="url(#hachiClip)" d="M0 0 H120 V72 C110 64 96 58 82 56 C72 54 64 48 60 40 C56 48 48 54 38 56 C24 58 10 64 0 72 Z" fill="#8fb8e0"/>
    <path d="${MOCHI}" fill="none" ${LINE}/>
    <path clip-path="url(#hachiClip)" d="M0 72 C10 64 24 58 38 56 C48 54 56 48 60 40 C64 48 72 54 82 56 C96 58 110 64 120 72" fill="none" ${LINE} stroke-width="2"/>
    ${eyes({ y: 69 })}${cheeks({ y: 80 })}${tears({ y: 69 })}${mouth("cat", 80)}`),

  // 우사기: 연노랑 몸, 위로 쭉 뻗은 긴 귀, 늘 벌어진 입
  usagi: svg(`
    <path d="M42 40 C36 24 38 4 46 3 C54 2 55 22 53 36" fill="#fdf0b4" ${LINE}/>
    <path d="M78 40 C84 24 82 4 74 3 C66 2 65 22 67 36" fill="#fdf0b4" ${LINE}/>
    <path d="M45 32 C42 22 43 10 46 9 C49 9 50 20 49.5 31 Z" fill="#ffd3da"/>
    <path d="M75 32 C78 22 77 10 74 9 C71 9 70 20 70.5 31 Z" fill="#ffd3da"/>
    ${limbs("#fdf0b4")}
    <path d="${MOCHI}" fill="#fdf0b4" ${LINE}/>
    ${eyes({ x1: 45, x2: 75, rx: 3.8, ry: 4.6 })}${cheeks({ x1: 34, x2: 86 })}${tears({ x1: 45, x2: 75 })}${mouth("usagi", 76)}`),

  // 모몽가: 하얀 몸, 커다란 귀와 반짝이는 큰 눈, 풍성한 꼬리
  momonga: svg(`
    <path d="M84 100 C104 102 120 86 118 64 C117 48 106 38 98 42 C92 45 94 52 98 56 C104 64 102 78 90 84 Z" fill="#fff" ${LINE}/>
    <path d="M106 54 C110 62 110 74 104 82 M98 92 C104 90 108 88 111 84" fill="none" stroke="#ddd6e8" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="35" cy="38" r="13" fill="#fff" ${LINE}/>
    <circle cx="85" cy="38" r="13" fill="#fff" ${LINE}/>
    <circle cx="35" cy="38" r="7" fill="#ffd3da"/><circle cx="85" cy="38" r="7" fill="#ffd3da"/>
    ${limbs("#fff")}
    <path d="${MOCHI}" fill="#fff" ${LINE}/>
    ${eyes({ x1: 46, x2: 74, y: 65, rx: 6, ry: 7.4, sparkle: 2 })}${cheeks({ x1: 34, x2: 86, y: 79 })}${tears({ x1: 46, x2: 74, y: 67 })}${mouth("tiny", 79)}`),
};
