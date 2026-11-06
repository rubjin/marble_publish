# iframe 퍼블리싱 소스

iframe 안에 단독으로 띄우는 화면의 퍼블리싱 소스입니다.
html 과 `assets`(fonts, images, js), `styles`(css, scss) 로 구성됩니다.

```
iframe/
├── README.md
├── .vscode/                                  ← 퍼블리셔 작업 환경 (개발 무시)
├── glenn2223.live-sass-6.1.5-win32-x64.vsix  ← 퍼블리셔 작업 환경 (개발 무시)
├── searchBox.html                            ← 조회 컨트롤 박스
├── assets/
│   ├── fonts/
│   ├── images/
│   └── js/
│       ├── datePicker.js                     ← 기간 선택 캘린더 (searchBox.js 보다 먼저 로드)
│       └── searchBox.js
└── styles/
    ├── css/
    │   └── searchBox.css                     ← scss 컴파일 결과
    └── scss/
        ├── searchBox.scss                    ← 진입 파일
        ├── common.scss
        ├── abstracts/
        └── components/
```

---

## 개발

- **`.vscode` 폴더와 `.vsix` 파일은 무시해 주세요.** 퍼블리셔의 편집기 설정과 확장 설치 파일이라 화면 동작과 관계없습니다. 개발 소스에 옮기지 않아도 됩니다.
- 화면에 필요한 파일은 html(예: `searchBox.html`), `assets/`, `styles/css/` 입니다.
- 스타일은 컴파일된 css(예: `styles/css/searchBox.css`)를 사용합니다. scss 를 직접 빌드할 경우 진입 파일은 `styles/scss/searchBox.scss` 하나입니다.
- css 안의 이미지 / 폰트 경로는 css 파일 기준 상대경로(`../../assets/images/...`, `../../assets/fonts/...`)입니다. 폴더 구조를 바꾸면 경로가 맞지 않습니다.
- 캘린더는 React 없이 `assets/js/datePicker.js` 로 동작하며, admin 캘린더(react-day-picker)와 같은 `.rdp-*` 마크업 / 스타일을 씁니다.
  - `.formDateRange` 에 `data-datepicker="range"` 를 붙이면 기간 선택 레이어(빠른 선택 + 2개월 + 취소/적용)가 붙습니다.
  - `data-max-date="today"` (또는 `yyyy.MM.dd`) : 이후 날짜 선택 불가
  - 적용 시 입력창 값이 바뀌고 `change` 이벤트가 발생합니다.
- iframe 자동 높이: `searchBox:resize` 메시지의 높이에는 열린 캘린더 레이어까지 포함됩니다. 부모 창에서 이 값으로 iframe 높이를 맞추지 않으면 레이어가 iframe 안에서 잘립니다.

---

## 퍼블리셔

scss 컴파일은 VS Code 확장 **Live Sass Compiler** 로 합니다. 이 폴더에 들어 있는 `glenn2223.live-sass-6.1.5-win32-x64.vsix` 파일로 설치합니다 (인터넷 연결 없이 설치 가능).

### 설치

1. VS Code 왼쪽 **확장(Extensions)** 패널을 엽니다.
2. 패널 오른쪽 위 `···` 메뉴 → **VSIX에서 설치(Install from VSIX...)** 를 누릅니다.
3. `iframe` 폴더 안의 `glenn2223.live-sass-6.1.5-win32-x64.vsix` 파일을 선택합니다.
4. 설치가 끝나면 VS Code 를 다시 로드합니다.

터미널에서 설치할 수도 있습니다.

```
code --install-extension iframe/glenn2223.live-sass-6.1.5-win32-x64.vsix
```

### 사용

0. VS Code 에서 **`iframe` 폴더를 작업 폴더로 엽니다** (파일 → 폴더 열기). 상위 폴더(`marble_publish`)로 열면 `.vscode` 설정이 적용되지 않습니다.
1. VS Code 아래쪽 상태 표시줄의 **Watch Sass** 를 누릅니다.
2. scss 파일을 저장하면 css 가 자동으로 컴파일됩니다.
3. 작업이 끝나면 **Watching...** 을 눌러 감시를 끕니다.

- 컴파일 설정은 `.vscode/settings.json` 에 들어 있습니다. 따로 바꾸지 않아도 됩니다.
  - 대상: `styles/scss/` 바로 아래 scss (진입 파일). 화면을 추가할 때는 `styles/scss/화면명.scss` 진입 파일만 만들면 자동으로 컴파일됩니다.
  - 제외: `common.scss` (진입 파일에서 불러와 함께 컴파일)
  - 출력: `styles/css/` (소스맵 없음)
- 컴파일 결과는 `styles/css/` 안(예: `styles/css/searchBox.css`)에 만들어져야 합니다. 위치가 다르면 css 의 이미지 경로(`../../assets/images/...`)가 맞지 않습니다.
- `_` 로 시작하는 파일(`_variables.scss` 등)은 단독으로 컴파일되지 않고 진입 파일에서 불러와 함께 컴파일됩니다.
- **css 파일은 직접 수정하지 마세요.** 다음 컴파일 때 scss 내용으로 덮어써집니다.
