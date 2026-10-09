/**
 * dist 실시간 빌드 (npm run build:watch)
 * - src 하위 파일이 저장되면 build.js 를 다시 실행합니다.
 * - build.js 가 직접 생성하는 src/styles/css 는 감시에서 제외 (무한 반복 방지)
 * - 연속 저장은 300ms 동안 모아서 1번만 빌드, 빌드 중 변경이 생기면 끝난 뒤 1번 더 빌드
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = __dirname;
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const BUILD_SCRIPT = path.resolve(ROOT_DIR, 'build.js');

// src 기준 상대 경로 (구분자 '/')
const IGNORE = [
  /^styles\/css\//,        // build.js 가 생성하는 CSS
  /(^|\/)\.[^/]+$/,        // 숨김 파일
  /~$|\.swp$|\.tmp$/       // 에디터 임시 파일
];

const DEBOUNCE_MS = 300;

let timer = null;
let building = false;
let pending = false;
let changed = new Set();

const time = () => new Date().toTimeString().slice(0, 8); // HH:MM:SS

function runBuild() {
  building = true;
  const files = [...changed].filter((f) => path.extname(f)); // 로그에는 파일만 표시 (폴더 이벤트 제외)
  changed = new Set();
  if (files.length) console.log(`\n[${time()}] 변경 감지: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ` 외 ${files.length - 5}개` : ''}`);

  const started = Date.now();
  const child = spawn(process.execPath, [BUILD_SCRIPT], { cwd: ROOT_DIR, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });

  child.on('close', (code) => {
    building = false;
    if (code === 0) {
      console.log(`[${time()}] dist 빌드 완료 (${Date.now() - started}ms)`);
    } else {
      console.error(`[${time()}] dist 빌드 실패 (exit ${code})\n${stderr}`);
    }
    if (pending) {
      pending = false;
      runBuild();
    }
  });
}

function schedule(file) {
  changed.add(file);
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (building) pending = true;
    else runBuild();
  }, DEBOUNCE_MS);
}

fs.watch(SRC_DIR, { recursive: true }, (event, filename) => {
  if (!filename) return;
  const rel = filename.split(path.sep).join('/');
  if (IGNORE.some((re) => re.test(rel))) return;
  schedule(rel);
});

console.log(`[${time()}] dist 실시간 빌드 시작 - src 변경 감시 중 (종료: Ctrl+C)`);
runBuild();
