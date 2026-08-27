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

// 2. Compile SCSS
function compileSass(srcFile, destFile) {
  const fullSrc = path.resolve(ROOT_DIR, srcFile);
  const fullDest = path.resolve(ROOT_DIR, destFile);
  if (!fs.existsSync(fullSrc)) return;
  try {
    const result = sass.compile(fullSrc, {
      loadPaths: [path.dirname(fullSrc)],
      style: 'expanded',
      sourceMap: false
    });
    fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    fs.writeFileSync(fullDest, result.css, 'utf8');
    console.log(`[Sass] Compiled: ${srcFile} -> ${destFile}`);
  } catch (err) {
    console.error(`[Sass Error] ${srcFile}:`, err.message);
  }
}

compileSass('src/assets/scss/main.scss', 'src/assets/css/main.css');

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

// Copy static assets directly to dist/assets
['css', 'fonts', 'images', 'js'].forEach(subDir => {
  copyDirSync(path.resolve(SRC_DIR, 'assets', subDir), path.resolve(DIST_DIR, 'assets', subDir));
});

// Also copy compiled CSS to dist
if (fs.existsSync(path.resolve(SRC_DIR, 'assets/css/main.css'))) {
  fs.mkdirSync(path.resolve(DIST_DIR, 'assets/css'), { recursive: true });
  fs.copyFileSync(path.resolve(SRC_DIR, 'assets/css/main.css'), path.resolve(DIST_DIR, 'assets/css/main.css'));
}

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
      if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist' || item.name === 'components') continue;
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
  content = content.replace(/(href="[^"]*?)scss\/main\.scss(")/g, '$1css/main.css$2');

  const destPath = path.resolve(DIST_DIR, relativePath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, content, 'utf8');
  console.log(`[HTML] Generated: ${relativePath}`);
}

console.log('\n========================================');
console.log('Dist build completed successfully in ./dist');
console.log('========================================\n');
