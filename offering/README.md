# A파트 (오퍼링 서비스) 퍼블리싱 소스

## 실행 방법

\`\`\`bash
npm install
npm start
# → http://localhost:3000 자동 오픈 (A_01_001 화면부터 시작)
\`\`\`

## 폴더 구조

\`\`\`
src/
├── assets/
│   ├── images/            # 화면별 하위 폴더로 구분 (예: offering/A_01_001)
│   ├── styles/
│   │   ├── scss/          # 작업 소스 (7-folder 구조)
│   │   └── css/           # 컴파일 결과물, git 제외, npm run sass:watch로 자동 생성
│   ├── js/
│   │   └── common.js      # header/footer 자동 삽입 스크립트 (미리보기 전용)
│   └── lottie/
└── pages/
    ├── common/            # header, footer, 공통 모달 (화면 코드 없음)
    ├── A/ ~ E/            # 대메뉴별 화면 (예: A_01_001)
\`\`\`

## 꼭 확인해주세요

- ⚠️ 화면 상단/하단에 header/footer가 안 보이면 **로컬 서버(localhost)로 열었는지 확인**하세요.
  \`file://\`로 더블클릭하면 jQuery load가 동작하지 않습니다.
- 이미지 경로는 전부 **루트 절대경로**(\`/assets/images/...\`)로 작성합니다.
- 화면 코드(A_01_001 등)는 폴더명 · 파일명 · SCSS 클래스명(\`offering-a-01-001\`)에
  동일하게 사용합니다. 자세한 규칙은 \`guide/handoff-guide.md\` 참고.
- header/footer의 jQuery load 방식은 **퍼블리싱 확인용**이며,
  개발 반영 대상이 아닙니다.
