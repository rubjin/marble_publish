# 퍼블리싱 환경 가이드

---

## 0. 공유받는 파일 안내

`node_modules` 폴더는 **공유하지 않습니다.**
`package.json`만 있으면 각자 컴퓨터에서 설치 가능합니다. (아래 2번 참고)

---

## 1. 사전 준비물

- **Node.js** 설치 필요 (설치 확인: 터미널에 `node -v` 입력 → 버전 나오면 OK)
- 없다면 [nodejs.org](https://nodejs.org) 에서 LTS 버전 설치

---

## 2. 설치 순서

1. 전달받은 프로젝트 폴더를 원하는 위치에 저장
2. 터미널(CMD)에서 해당 폴더로 이동

```bash
cd 프로젝트폴더경로
```

3. 패키지 설치 (최초 1회만)

```bash
npm install
```

---

## 3. 서버 여는 방법

```bash
npm start
```

- 브라우저가 자동으로 열리고 화면리스트 페이지가 뜹니다.
- 화면리스트에서 원하는 화면 링크를 클릭해서 확인합니다.
- 터미널을 끄면 서버도 꺼집니다. 작업하는 동안은 계속 켜두세요.

---

## 4. 전체 폴더 구조

```
offering/
├── package.json           # 설치 정보 (건드리지 않음)
├── bs-config.js            # 서버 설정 (건드리지 않음)
├── build-html.js           # 빌드 스크립트 (건드리지 않음)
├── watch-html.js
├── screen-list.html         # 화면리스트 (진행상황 확인)
├── screen-list-data.js      # 화면리스트 데이터 (여기에 화면 추가/수정)
└── src/
    ├── assets/
    │   ├── images/          # 이미지
    │   ├── fonts/            # 폰트
    │   └── styles/scss/      # 스타일 작업 (여기서 작업)
    ├── components/
    │   ├── header.html       # 공통 헤더 (여기서 관리)
    │   └── layout.html       # 공통 레이아웃 틀
    ├── pages/                # ★ 실제 작업 영역 (화면 마크업 작성)
    │   
    └── dist/                 # ★★★ 빌드 결과물, 절대 직접 수정 금지
```

```
admin/
├── package.json           # 설치 정보 (건드리지 않음)
├── bs-config.js            # 서버 설정 (건드리지 않음)
├── build-html.js           # 빌드 스크립트 (건드리지 않음)
├── watch-html.js
├── screen-list.html         # 화면리스트 (진행상황 확인)
├── screen-list-data.js      # 화면리스트 데이터 (여기에 화면 추가/수정)
└── src/
    ├── assets/
    │   ├── images/          # 이미지
    │   ├── fonts/            # 폰트
    │   └── styles/scss/      # 스타일 작업 (여기서 작업)
    │
    ├── pages/                # ★ 실제 작업 영역 (화면 마크업 작성)
    │   
    └── dist/                 # ★★★ 빌드 결과물, 절대 직접 수정 금지
```

---

## 5. ⚠️ 꼭 지켜주세요

- **`src/dist` 폴더는 작업하지 않습니다.**
  `src/pages`에서 작업한 내용이 자동으로 빌드되어 만들어지는 결과물입니다.
  여기를 직접 고치면 다음 빌드 때 내용이 사라집니다.
- 화면 작업은 항상 **`src/pages`** 안에서 진행합니다.
- **offering과 admin은 완전히 독립된 프로젝트입니다.**
  각자 폴더 안에서만 작업하며, 서로의 `components`, `assets`를 참조하지 않습니다.
- admin은 화면 구조가 offering과 다를 수 있습니다.
- 새 화면을 만들면 **`screen-list-data.js`**에도 한 줄 추가해주세요.
