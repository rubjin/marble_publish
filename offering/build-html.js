const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'src', 'pages');
const OUT_DIR = path.join(ROOT, 'src', 'dist');
const SRC_ROOT = path.join(ROOT, 'src');

// {{#key}}...{{/key}} 조건 블록 + {{key}} 단순 치환 처리
function renderTemplate(template, params) {
  let out = template.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (_, key, inner) => {
    return params[key] ? inner : '';
  });
  out = out.replace(/{{(\w+)}}/g, (_, key) => (params[key] !== undefined ? params[key] : ''));
  return out;
}

function parseParamLines(block) {
  const params = {};
  block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      params[key] = value;
    });
  return params;
}

function parsePage(raw) {
  const layoutMatch = raw.match(/<!--\s*@@layout:\s*(.+?)\s*-->/);
  const classMatch = raw.match(/<!--\s*@@class:\s*(.+?)\s*-->/);
  const headerMatch = raw.match(/<!--\s*@@header:\s*([^\n]+)\n?([\s\S]*?)-->/);

  const content = raw
    .replace(/<!--\s*@@layout:.*?-->/, '')
    .replace(/<!--\s*@@class:.*?-->/, '')
    .replace(/<!--\s*@@header:[\s\S]*?-->/, '')
    .trim();

  return {
    layout: layoutMatch ? layoutMatch[1].trim() : null,
    className: classMatch ? classMatch[1].trim() : '',
    header: headerMatch
      ? { path: headerMatch[1].trim(), params: parseParamLines(headerMatch[2]) }
      : null,
    content
  };
}

function renderComponent(componentInfo) {
  if (!componentInfo) return '';
  const filePath = path.join(ROOT, 'src', componentInfo.path);
  const template = fs.readFileSync(filePath, 'utf-8');
  return renderTemplate(template, componentInfo.params);
}

// outPath가 "src" 루트 기준 몇 depth 깊이인지 계산해서
// '/assets/...' 절대경로를 상대경로(예: '../../assets/...')로 변환
// ⚠ assets 폴더는 dist 밖(= src 바로 아래)에 있으므로 기준은 반드시 SRC_ROOT여야 함
function toRelativeAssetPaths(html, outPath) {
  const fromDir = path.dirname(outPath);
  let rel = path.relative(fromDir, SRC_ROOT);
  rel = rel === '' ? '.' : rel;
  const prefix = rel.replace(/\\/g, '/') + '/';

  return html.replace(/(href|src)="\/assets\//g, `$1="${prefix}assets/`);
}

function buildFile(srcPath, outPath) {
  const raw = fs.readFileSync(srcPath, 'utf-8');
  const { layout, className, header, content } = parsePage(raw);

  let output;
  if (layout) {
    const layoutPath = path.join(ROOT, 'src', layout);
    let layoutHtml = fs.readFileSync(layoutPath, 'utf-8');

    layoutHtml = layoutHtml.replace('<!-- @@header -->', renderComponent(header));
    layoutHtml = layoutHtml.replace('<!-- @@content -->', content);
    layoutHtml = layoutHtml.replace(/__CLASS_NAME__/g, className);
    layoutHtml = renderTemplate(layoutHtml, header ? header.params : {});

    output = layoutHtml;
  } else {
    output = content;
  }

  output = toRelativeAssetPaths(output, outPath);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output);
  console.log('✔ built:', path.relative(ROOT, outPath));
}

// srcPath(예: src/pages/A/A001.html) → 대응하는 outPath(src/dist/A/A001.html) 변환
function toOutPath(changedPath) {
  const relative = path.relative(SRC_DIR, changedPath);
  return path.join(OUT_DIR, relative);
}

// outPath(dist 쪽 파일) → 대응하는 srcPath(pages 쪽 파일) 역변환
function toSrcPath(outPath) {
  const relative = path.relative(OUT_DIR, outPath);
  return path.join(SRC_DIR, relative);
}

// dist 안을 훑으면서, pages에 원본이 없는 "고아 파일"을 찾아 삭제
// (원본 파일이 지워졌는데 빌드 결과물만 남아있는 경우를 정리)
function cleanOrphans(dir = OUT_DIR) {
  if (!fs.existsSync(dir)) return;

  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const outPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      cleanOrphans(outPath);
      if (fs.existsSync(outPath) && fs.readdirSync(outPath).length === 0) {
        fs.rmdirSync(outPath);
        console.log('🗑 빈 폴더 삭제:', path.relative(ROOT, outPath));
      }
    } else if (entry.name.endsWith('.html')) {
      const srcPath = toSrcPath(outPath);
      if (!fs.existsSync(srcPath)) {
        fs.unlinkSync(outPath);
        console.log('🗑 고아 파일 삭제:', path.relative(ROOT, outPath));
      }
    }
  });
}

function buildAll(srcDir = SRC_DIR, outDir = OUT_DIR) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.readdirSync(srcDir, { withFileTypes: true }).forEach((entry) => {
    const srcPath = path.join(srcDir, entry.name);
    const outPath = path.join(outDir, entry.name);
    if (entry.isDirectory()) {
      buildAll(srcPath, outPath);
    } else if (entry.name.endsWith('.html')) {
      buildFile(srcPath, outPath);
    }
  });

  // 전체 빌드 시엔 항상 고아 파일까지 정리해서 dist를 pages와 완전히 동기화
  cleanOrphans();
}

module.exports = { buildAll, buildFile, toOutPath, toSrcPath, cleanOrphans, ROOT, SRC_DIR, OUT_DIR };

if (require.main === module) {
  buildAll();
  console.log('\n✅ 빌드 완료');
}