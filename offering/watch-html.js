/* =========================================================
  HTML 자동 빌드 (watch)
  - src/pages 안의 .html 변경을 감지해서 자동으로 src/dist에 반영합니다.
  - src/dist, node_modules는 감시 대상에서 반드시 제외합니다.
    (제외하지 않으면 "빌드→변경감지→재빌드" 무한 루프 발생)
  - src/components 안의 파일(header.html 등)이 바뀌면 전체를 다시 빌드합니다.
    (어떤 페이지가 그 컴포넌트를 쓰는지 일일이 추적하지 않고,
     전체 재빌드가 더 단순하고 화면 수 규모에서 성능 문제도 없습니다.)
  - 파일/폴더가 삭제되면 dist에서도 동일하게 삭제해서 항상 동기화합니다.
========================================================= */
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { buildAll, buildFile, toOutPath, SRC_DIR, ROOT } = require('./build-html');

const COMPONENTS_DIR = path.join(ROOT, 'src', 'components');

console.log('▶ 최초 전체 빌드 실행...');
buildAll();
console.log('▶ HTML 변경 감시를 시작합니다 (src/pages, src/components)\n');

const watcher = chokidar.watch(
  [SRC_DIR, COMPONENTS_DIR],
  {
    ignored: [
      '**/dist/**',      // 빌드 산출물 - 반드시 제외 (무한 루프 방지)
      '**/node_modules/**'
    ],
    ignoreInitial: true // 최초 실행 시 buildAll()로 이미 처리했으므로 중복 방지
  }
);

watcher.on('change', (changedPath) => {
  const isComponent = changedPath.startsWith(COMPONENTS_DIR);

  if (isComponent) {
    console.log(`\n🔧 공통 컴포넌트 변경 감지: ${path.relative(ROOT, changedPath)}`);
    console.log('   → 전체 페이지 재빌드');
    buildAll();
  } else if (changedPath.endsWith('.html')) {
    console.log(`\n🔧 변경 감지: ${path.relative(ROOT, changedPath)}`);
    buildFile(changedPath, toOutPath(changedPath));
  }
});

watcher.on('add', (addedPath) => {
  if (!addedPath.startsWith(COMPONENTS_DIR) && addedPath.endsWith('.html')) {
    console.log(`\n➕ 새 파일 감지: ${path.relative(ROOT, addedPath)}`);
    buildFile(addedPath, toOutPath(addedPath));
  }
});

// 파일 삭제 감지 → dist의 대응 파일도 삭제
watcher.on('unlink', (removedPath) => {
  if (removedPath.startsWith(COMPONENTS_DIR)) {
    console.log(`\n🗑 공통 컴포넌트 삭제 감지: ${path.relative(ROOT, removedPath)}`);
    console.log('   → 전체 페이지 재빌드 (참조 확인 필요)');
    buildAll();
    return;
  }
  if (removedPath.endsWith('.html')) {
    const outPath = toOutPath(removedPath);
    if (fs.existsSync(outPath)) {
      fs.unlinkSync(outPath);
      console.log(`\n🗑 파일 삭제 감지: ${path.relative(ROOT, removedPath)}`);
      console.log('   → dist에서도 삭제:', path.relative(ROOT, outPath));
    }
  }
});

// 폴더 삭제 감지 → dist의 대응 폴더도 삭제
watcher.on('unlinkDir', (removedDir) => {
  if (removedDir.startsWith(COMPONENTS_DIR)) return;
  const outDir = toOutPath(removedDir);
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
    console.log(`\n🗑 폴더 삭제 감지: ${path.relative(ROOT, removedDir)}`);
    console.log('   → dist에서도 폴더 삭제:', path.relative(ROOT, outDir));
  }
});