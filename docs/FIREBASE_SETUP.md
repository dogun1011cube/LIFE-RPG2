# 온라인 계정(UID · 로그인 · 클라우드 저장) 켜기 — Firebase 설정 안내

LIFE RPG의 온라인 계정 기능은 **Firebase**(구글의 무료 서버 서비스)를 사용합니다.
아래 과정을 한 번만 하면 게임에 **회원가입 / 로그인 / 고유 번호(UID) / 클라우드 저장**이 켜집니다.
설정하기 전에는 지금처럼 이 브라우저에만 저장되는 오프라인 모드로 동작합니다.

소요 시간: 약 10분 · 비용: 무료(Spark 요금제)

---

## 1. Firebase 프로젝트 만들기

1. <https://console.firebase.google.com> 에 구글 계정으로 접속합니다.
2. **프로젝트 추가** → 이름 입력(예: `life-rpg`) → Google 애널리틱스는 **사용 안 함**으로 해도 됩니다 → **프로젝트 만들기**.

## 2. 로그인 방식 켜기 (Authentication)

1. 왼쪽 메뉴 **빌드 → Authentication → 시작하기**.
2. **로그인 방법** 탭 → **이메일/비밀번호** → **사용 설정** 켜고 저장합니다.
   (게임에서는 아이디만 입력하지만, 내부적으로 `아이디@player.liferpg.app` 형식의 이메일 계정으로 저장됩니다. 실제 메일은 보내지 않습니다.)
3. **설정** 탭 → **승인된 도메인** → **도메인 추가** → `dogun1011cube.github.io` 를 추가합니다.

## 3. 데이터베이스 만들기 (Firestore)

1. 왼쪽 메뉴 **빌드 → Firestore Database → 데이터베이스 만들기**.
2. 위치는 **asia-northeast3 (서울)** 을 추천합니다 → **프로덕션 모드**로 시작.
3. 만들어지면 **규칙** 탭을 열고, 이 저장소의 [`firestore.rules`](../firestore.rules) 파일 내용을 **전부 복사해서 붙여넣고 → 게시**합니다.
   - 이 규칙은 ① 자기 세이브만 읽고 쓸 수 있고 ② UID는 가입 순서대로 하나씩만 발급되며(조작 불가) ③ 세이브가 몰래 덮어써지지 않도록 막습니다.

## 4. 웹 앱 설정값 받기

1. 왼쪽 위 **톱니바퀴 → 프로젝트 설정 → 일반** 탭 → 아래쪽 **내 앱** → **웹(`</>`) 아이콘**.
2. 앱 닉네임(예: `life-rpg-web`) 입력 → **앱 등록** (Firebase 호스팅은 체크하지 않아도 됩니다).
3. 화면에 나오는 아래와 같은 `firebaseConfig` 값을 복사합니다.

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "life-rpg-xxxx.firebaseapp.com",
  projectId: "life-rpg-xxxx",
  storageBucket: "life-rpg-xxxx.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef..."
};
```

> 이 값들은 **비밀번호가 아니라 공개용 주소**입니다. 원래 모든 방문자의 브라우저로 전달되는 값이고, 보안은 2~3단계의 로그인과 보안 규칙이 담당합니다.

## 5. 게임에 설정값 넣기 (둘 중 하나)

**방법 A — Claude에게 맡기기 (가장 쉬움)**
위의 `firebaseConfig` 내용을 채팅에 붙여 주세요. `src/online/firebaseConfig.ts` 에 넣고 배포까지 해 드립니다.

**방법 B — 직접 GitHub에 넣기**
저장소 **Settings → Secrets and variables → Actions → Variables** 탭 → **New repository variable** 로 아래 6개를 추가한 뒤,
**Actions** 탭에서 *Build & Deploy LIFE RPG* 를 다시 실행(Run workflow)합니다.

| 이름 | 값 |
| --- | --- |
| `FIREBASE_API_KEY` | apiKey |
| `FIREBASE_AUTH_DOMAIN` | authDomain |
| `FIREBASE_PROJECT_ID` | projectId |
| `FIREBASE_STORAGE_BUCKET` | storageBucket |
| `FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `FIREBASE_APP_ID` | appId |

배포가 끝나면 사이트 타이틀 화면에 **로그인 / 회원가입** 버튼이 나타납니다.

---

## 알아 두면 좋은 것

- **무료 한도**: Spark 요금제는 Firestore 하루 쓰기 2만 회 · 읽기 5만 회 · 저장 1GB까지 무료입니다. 게임은 변경 후 30초마다 한 번 정도만 저장하므로 개인·친구 규모로는 충분합니다.
- **UID**: 첫 가입자가 `UID 10000001`, 다음 가입자가 `10000002` … 순서대로 발급됩니다.
- **세이브 충돌**: 두 기기에서 따로 진행한 경우 게임이 덮어쓰지 않고 어느 쪽을 쓸지 묻습니다. 고르지 않은 쪽은 설정 → 자동 백업에 보관됩니다.
- **비밀번호 분실**: 실제 이메일이 없어 메일로 재설정할 수 없습니다. Firebase 콘솔 → Authentication → 사용자에서 해당 계정(`아이디@player.liferpg.app`)을 삭제하면 같은 아이디로 다시 가입할 수 있습니다(UID는 새로 발급). 이전 세이브는 Firestore의 `saves/<사용자 UID>` 문서에 남아 있습니다.
- **(선택) API 키 제한**: Google Cloud 콘솔 → API 및 서비스 → 사용자 인증 정보에서 브라우저 키의 웹사이트 제한에 `https://dogun1011cube.github.io/*` 를 넣으면 다른 사이트가 키를 쓰지 못합니다.

## 개발자용: 로컬 에뮬레이터로 테스트

```bash
npm i -g firebase-tools
firebase emulators:start --only auth,firestore --project demo-liferpg
# 다른 터미널에서
VITE_FIREBASE_EMULATOR=127.0.0.1 VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_PROJECT_ID=demo-liferpg VITE_FIREBASE_APP_ID=demo-app \
  npx vitest run src/online/firebase.emulator.test.ts     # SDK + 보안 규칙 통합 테스트
VITE_FIREBASE_EMULATOR=127.0.0.1 VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_PROJECT_ID=demo-liferpg VITE_FIREBASE_APP_ID=demo-app \
  npm run dev                                              # 에뮬레이터에 연결된 게임
```
