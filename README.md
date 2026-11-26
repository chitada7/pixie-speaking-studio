# Pixie Speaking Studio

현아의 영어 말하기 연습 앱. 실전 상황 영어(B2+)와 OPIc AL 두 모드로 구성돼요.

**주소:** https://chitada7.github.io/pixie-speaking-studio/

## 처음 설정 (한 번만)
1. console.anthropic.com 가입 → Billing에서 카드 등록 후 $5~10 충전 (자동 충전은 끄기)
2. API Keys → Create Key → 복사
3. 앱 설정 탭 → API 키 붙여넣기 → 연결 테스트

## 구성
- `index.html` 화면 뼈대 · `style.css` 디자인
- `data.js` 카테고리, 기본 문제, 끝맺음 문장, OPIc 질문은행
- `core.js` 저장(IndexedDB), 녹음·음성인식, 음성 재생, Claude API 호출
- `prompts.js` 평가·롤플레이 프롬프트
- `app.js` 화면과 동작
- `sw.js`, `manifest.webmanifest` 홈 화면 앱(PWA)

## 데이터
- 학습 기록과 녹음은 폰 안(브라우저 저장공간)에만 저장돼요. 서버로 가지 않아요.
- AI 평가에는 받아쓴 글자만 Anthropic으로 보내요.
- 기기를 바꿀 때는 설정 → 기록 내보내기/가져오기.

## 수정 방법
수정할 내용은 진아 언니 → Claude 대화로 요청. 사이트는 `gh-pages` 브랜치에서 배포돼요. 수정하면 main과 gh-pages에 같이 올려요.
