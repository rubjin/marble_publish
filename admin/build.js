const fs = require('fs');
const path = require('path');
const sass = require('sass');

const ROOT_DIR = __dirname;
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

console.log('Starting HTML dist build...\n');

// Clean dist
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Custom alias importer for Sass (supports styles/, @/, assets/, src/)
const sassAliasImporter = {
  canonicalize(url) {
    let resolvedPath = null;
    if (url.startsWith('styles/')) {
      resolvedPath = path.resolve(ROOT_DIR, 'src/styles/scss', url.replace(/^styles\//, ''));
    } else if (url.startsWith('@/')) {
      resolvedPath = path.resolve(ROOT_DIR, 'src', url.replace(/^@\//, ''));
    } else if (url.startsWith('assets/')) {
      resolvedPath = path.resolve(ROOT_DIR, 'src/assets', url.replace(/^assets\//, ''));
    } else if (url.startsWith('src/')) {
      resolvedPath = path.resolve(ROOT_DIR, url);
    }

    if (!resolvedPath) return null;

    const dir = path.dirname(resolvedPath);
    const base = path.basename(resolvedPath);
    const candidates = [
      resolvedPath,
      `${resolvedPath}.scss`,
      path.join(dir, `_${base}.scss`),
      path.join(resolvedPath, '_index.scss'),
      path.join(resolvedPath, 'index.scss')
    ];

    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        const fileUrlStr = `file:///${c.replace(/\\/g, '/')}`;
        return new URL(fileUrlStr);
      }
    }
    return null;
  },
  load(canonicalUrl) {
    let filePath = canonicalUrl.pathname;
    // On Windows, pathname starts with /C:/..., normalize it
    if (/^\/[a-zA-Z]:/.test(filePath)) {
      filePath = filePath.substring(1);
    }
    const decodedPath = decodeURIComponent(filePath);
    return {
      contents: fs.readFileSync(decodedPath, 'utf8'),
      syntax: decodedPath.endsWith('.sass') ? 'indented' : 'scss'
    };
  }
};

// Compile SCSS directly to dist/styles/css
function compileSass(srcFile, destFile) {
  const fullSrc = path.resolve(ROOT_DIR, srcFile);
  const fullDest = path.resolve(ROOT_DIR, destFile);
  if (!fs.existsSync(fullSrc)) return;
  try {
    const result = sass.compile(fullSrc, {
      importers: [sassAliasImporter],
      loadPaths: [
        path.dirname(fullSrc),
        path.resolve(ROOT_DIR, 'src/styles/scss'),
        path.resolve(ROOT_DIR, 'src/assets'),
        path.resolve(ROOT_DIR, 'src'),
        ROOT_DIR
      ],
      style: 'expanded',
      sourceMap: false
    });

    let css = result.css;
    // dist 배포용 CSS는 독립적인 상대 경로로 보정
    // CSS 위치: dist/styles/css/ → 이미지/폰트: dist/assets/images, dist/assets/fonts (../../assets/...)
    if (destFile.startsWith('dist/')) {
      css = css.replace(/(["'(])\/(?:src\/)?assets\/(images|fonts)\//g, '$1../../assets/$2/');
    }

    fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    fs.writeFileSync(fullDest, css, 'utf8');
    console.log(`[Sass] Compiled: ${srcFile} -> ${destFile}`);
  } catch (err) {
    console.error(`[Sass Error] ${srcFile}:`, err.message);
  }
}

// Helper to copy directory recursively
function copyDirSync(srcDirPath, destDirPath) {
  if (!fs.existsSync(srcDirPath)) return;

  fs.mkdirSync(destDirPath, { recursive: true });
  const entries = fs.readdirSync(srcDirPath, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDirPath, entry.name);
    const destPath = path.join(destDirPath, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy static assets directly to dist/assets (css, fonts, images, js)
['css', 'fonts', 'images', 'js'].forEach(subDir => {
  copyDirSync(path.resolve(SRC_DIR, 'assets', subDir), path.resolve(DIST_DIR, 'assets', subDir));
});

// Compile SCSS directly to src/styles/css & dist/styles/css
compileSass('src/styles/scss/common.scss', 'src/styles/css/common.css');
compileSass('src/styles/scss/globals.scss', 'src/styles/css/globals.css');
compileSass('src/styles/scss/common.scss', 'dist/styles/css/common.css');
compileSass('src/styles/scss/globals.scss', 'dist/styles/css/globals.css');

// Copy vendor CSS (가이드 코드 하이라이트 테마)
fs.copyFileSync(
  path.resolve(SRC_DIR, 'styles/css/prism-tomorrow.min.css'),
  path.resolve(DIST_DIR, 'styles/css/prism-tomorrow.min.css')
);

// HTML Include Resolver (vite.config.js 와 공통 모듈 사용 - 속성 전달 / slot / 조건부 출력)
const htmlInclude = require('./html-include.js');

function resolveIncludes(htmlContent, currentFilePath) {
  return htmlInclude.resolveIncludes(htmlContent, {
    baseDir: path.dirname(currentFilePath),
    rootDir: ROOT_DIR,
    onMissing: (src) => console.warn(`[Include Warning] Not found: ${src} in ${currentFilePath}`)
  });
}

// Process all HTML files in src (output directly under dist/)
function walkHtml(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist' ) continue;
      results = results.concat(walkHtml(fullPath));
    } else if (item.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * <script type="module"> 안의 상대 경로 import 를 모듈 소스로 치환 (dist 파일 직접 열기 대응)
 * - file:// 로 열면 브라우저가 외부 모듈 import 를 차단(CORS)해 차트 등이 그려지지 않음
 * - import { a, b as c } from './x.js';  →  const { a, b: c } = (() => { ...x.js(export 제거)...; return { a, b }; })();
 */
function inlineModuleImports(html, baseDir) {
  const IMPORT_RE = /^([ \t]*)import\s*\{([^}]*)\}\s*from\s*['"](\.{1,2}\/[^'"]+\.js)['"];?[ \t]*$/gm;
  return html.replace(/(<script\b[^>]*type="module"[^>]*>)([\s\S]*?)(<\/script>)/g, (m, open, body, close) => {
    const inlined = body.replace(IMPORT_RE, (line, indent, names, src) => {
      const file = path.resolve(baseDir, src);
      if (!fs.existsSync(file)) return line;
      const specs = names.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.split(/\s+as\s+/));
      const source = fs.readFileSync(file, 'utf8').replace(/^export\s+(?=(?:async\s+)?function|const|let|var|class)/gm, '');
      const exported = specs.map(([name]) => name).join(', ');
      const bound = specs.map(([name, alias]) => (alias ? `${name}: ${alias}` : name)).join(', ');
      return `${indent}// ${src} (dist: 파일 직접 열기에서도 동작하도록 빌드 시 인라인)\n` +
        `${indent}const { ${bound} } = (() => {\n${source}\nreturn { ${exported} };\n})();`;
    });
    return open + inlined + close;
  });
}

// 개발 서버 전용 페이지 (React 번들 필요 - 정적 dist 에서는 동작하지 않음)
const DEV_ONLY_HTML = ['guide/library.html'];

// UI 컴포넌트 파일(src/partials)은 사용법 주석의 예시를 렌더링한 완성 마크업으로 출력
const PARTIAL_DIR = 'partials/';

const allHtmlFiles = walkHtml(SRC_DIR).filter((f) => {
  const rel = path.relative(SRC_DIR, f).split(path.sep).join('/');
  return !DEV_ONLY_HTML.includes(rel);
});

for (const htmlFile of allHtmlFiles) {
  const relativePath = path.relative(SRC_DIR, htmlFile);
  const isPartial = relativePath.split(path.sep).join('/').startsWith(PARTIAL_DIR);
  let content;

  // Resolve includes
  if (isPartial) {
    content = htmlInclude.renderExamples(htmlFile, {
      rootDir: ROOT_DIR,
      onMissing: (src) => console.warn(`[Include Warning] Not found: ${src} in ${htmlFile}`)
    });
  } else {
    // 레이아웃 파일(slot 이 있는 layoutDefault 등)은 콘텐츠 자리에 안내 문구를 넣은 미리보기로 출력
    const layoutPreview = htmlInclude.renderLayoutPreview(htmlFile, { rootDir: ROOT_DIR });
    content = layoutPreview || resolveIncludes(fs.readFileSync(htmlFile, 'utf8'), htmlFile);
  }

  // Replace .scss references with .css references for dist
  const depth = relativePath.split(path.sep).length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : './';
  content = content.replace(/href="[^"]*?(?:assets\/)?scss\/(?:globals|main|common)\.scss"/g, `href="${prefix}styles/css/globals.css"`);
  content = content.replace(/src="[^"]*?(?:assets\/)?js\/ui\.js"/g, `src="${prefix}assets/js/ui.js"`);
  // 사이드바 등 루트 기준 페이지 링크(/pages/...)를 상대 경로로 변환 (dist 파일 직접 열기 대응)
  content = content.replace(/href="\/pages\//g, `href="${prefix}pages/`);
  content = inlineModuleImports(content, path.dirname(htmlFile));

  const destPath = path.resolve(DIST_DIR, relativePath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, content, 'utf8');
  console.log(`[HTML] Generated: ${relativePath}`);
}

// Process admin worksheet data
const srcDataDir = path.resolve(SRC_DIR, 'data');
if (fs.existsSync(srcDataDir)) {
  copyDirSync(srcDataDir, path.resolve(DIST_DIR, 'data'));
  console.log('[Worksheet Data] Copied: dist/data');
}

console.log('\n========================================');
console.log('Dist build completed successfully in ./dist');
console.log('========================================\n');
