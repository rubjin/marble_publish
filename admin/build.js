const fs = require('fs');
const path = require('path');
const sass = require('sass');

const ROOT_DIR = __dirname;
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

console.log('Starting HTML dist build...\n');

// 1. Clean dist
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Custom alias importer for Sass (supports styles/, @/, assets/, src/)
const sassAliasImporter = {
  canonicalize(url) {
    let resolvedPath = null;
    if (url.startsWith('styles/')) {
      resolvedPath = path.resolve(ROOT_DIR, 'src/assets/scss', url.replace(/^styles\//, ''));
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

// 2. Compile SCSS directly to dist/assets/css
function compileSass(srcFile, destFile) {
  const fullSrc = path.resolve(ROOT_DIR, srcFile);
  const fullDest = path.resolve(ROOT_DIR, destFile);
  if (!fs.existsSync(fullSrc)) return;
  try {
    const result = sass.compile(fullSrc, {
      importers: [sassAliasImporter],
      loadPaths: [
        path.dirname(fullSrc),
        path.resolve(ROOT_DIR, 'src/assets/scss'),
        path.resolve(ROOT_DIR, 'src/assets'),
        path.resolve(ROOT_DIR, 'src'),
        ROOT_DIR
      ],
      style: 'expanded',
      sourceMap: false
    });

    let css = result.css;
    // dist 배포용 CSS는 독립적인 상대 경로(dist/assets/images, dist/assets/fonts)로 보정
    if (destFile.startsWith('dist/')) {
      css = css.replace(/\/src\/assets\/images/g, '../images');
      css = css.replace(/\/src\/assets\/fonts/g, '../fonts');
      css = css.replace(/\/assets\/images/g, '../images');
      css = css.replace(/\/assets\/fonts/g, '../fonts');
    }

    fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    fs.writeFileSync(fullDest, css, 'utf8');
    console.log(`[Sass] Compiled: ${srcFile} -> ${destFile}`);
  } catch (err) {
    console.error(`[Sass Error] ${srcFile}:`, err.message);
  }
}

// 3. Helper to copy directory recursively
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

// Compile SCSS directly to src/assets/css & dist/assets/css
compileSass('src/assets/scss/common.scss', 'src/assets/css/common.css');
compileSass('src/assets/scss/globals.scss', 'src/assets/css/globals.css');
compileSass('src/assets/scss/common.scss', 'dist/assets/css/common.css');
compileSass('src/assets/scss/globals.scss', 'dist/assets/css/globals.css');

// 4. HTML Include Resolver
function resolveIncludes(htmlContent, currentFilePath) {
  const includeRegex = /<!--[\s\S]*?-->|<include\s+src="([^"]+)"><\/include>/g;
  return htmlContent.replace(includeRegex, (match, src) => {
    if (match.startsWith('<!--')) return match;
    const includePath = path.resolve(ROOT_DIR, src.replace(/^\.\//, ''));
    if (fs.existsSync(includePath)) {
      const nestedContent = fs.readFileSync(includePath, 'utf8');
      return resolveIncludes(nestedContent, includePath);
    }
    console.warn(`[Include Warning] Not found: ${src} in ${currentFilePath}`);
    return match;
  });
}

// 5. Process all HTML files in src (output directly under dist/)
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

const allHtmlFiles = walkHtml(SRC_DIR);

for (const htmlFile of allHtmlFiles) {
  const relativePath = path.relative(SRC_DIR, htmlFile);
  let content = fs.readFileSync(htmlFile, 'utf8');

  // 1) Resolve includes
  content = resolveIncludes(content, htmlFile);

  // 2) Replace .scss references with .css references for dist
  const depth = relativePath.split(path.sep).length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : './';
  content = content.replace(/href="[^"]*?(?:assets\/)?scss\/(?:globals|main|common)\.scss"/g, `href="${prefix}assets/css/globals.css"`);
  content = content.replace(/src="[^"]*?(?:assets\/)?js\/ui\.js"/g, `src="${prefix}assets/js/ui.js"`);

  const destPath = path.resolve(DIST_DIR, relativePath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, content, 'utf8');
  console.log(`[HTML] Generated: ${relativePath}`);
}

console.log('\n========================================');
console.log('Dist build completed successfully in ./dist');
console.log('========================================\n');
