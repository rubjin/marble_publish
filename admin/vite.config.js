import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

// 초간단 HTML Include 플러그인 (정규식 기반 - 중첩 include 지원)
// 경로는 include 를 쓴 파일 기준 상대 경로 (VS Code 에서 Ctrl+클릭으로 파일 이동 가능)
//   예) src/guide/guide.html → <include src="../components/form.html"></include>
// 기존 방식(admin 루트 기준 "./src/...")도 계속 지원
function resolveIncludePath(src, baseDir) {
  const candidates = [resolve(baseDir, src), resolve(__dirname, src)];
  return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
}

function resolveIncludes(htmlContent, baseDir = __dirname) {
  const regex = /<!--[\s\S]*?-->|<include\s+src="([^"]+)"><\/include>/g;
  return htmlContent.replace(regex, (match, src) => {
    // 매칭된 내용이 주석이라면 원본 그대로 통과
    if (match.startsWith('<!--')) return match;

    const filePath = resolveIncludePath(src, baseDir);
    if (filePath) {
      const nestedContent = fs.readFileSync(filePath, 'utf-8');
      return resolveIncludes(nestedContent, dirname(filePath)); // 중첩 include 는 포함된 파일 기준으로 다시 해석
    }
    console.warn(`[html-include] 파일을 찾을 수 없습니다: ${src} (기준: ${baseDir})`);
    return match; // 파일이 없으면 원본 그대로 둠
  });
}

function htmlIncludePlugin() {
  return {
    name: 'html-include',
    transformIndexHtml(html, ctx) {
      // Include 치환 (현재 HTML 파일 위치 기준)
      const baseDir = ctx?.filename ? dirname(ctx.filename) : __dirname;
      let content = resolveIncludes(html, baseDir);

      // SCSS 링크 경로 정규화 (<link> 유지: JS 주입 방식은 렌더 후 CSS가 적용되어 화면 깨짐(FOUC) 발생)
      content = content.replace(/<link\s+rel=["']stylesheet["']\s+href=["'][^"']*?(?:assets\/)?scss\/globals\.scss["']\s*\/?>/gi, '<link rel="stylesheet" href="/src/styles/scss/globals.scss">');
      content = content.replace(/<link\s+rel=["']stylesheet["']\s+href=["'][^"']*?(?:assets\/)?scss\/common\.scss["']\s*\/?>/gi, '<link rel="stylesheet" href="/src/styles/scss/common.scss">');

      // UI JS 스크립트 경로 정규화
      content = content.replace(/src=["'][^"']*?(?:assets\/)?js\/ui\.js["']/g, 'src="/src/assets/js/ui.js"');
      content = content.replace(/src=["'][^"']*?(?:assets\/)?js\/guide\.js["']/g, 'src="/src/assets/js/guide.js"');
      content = content.replace(/src=["'][^"']*?(?:assets\/)?js\/prism\.min\.js["']/g, 'src="/src/assets/js/prism.min.js"');

      // Prism 테마 CSS 경로 정규화 (상대경로 ../styles/... 는 dev 서버에서 404)
      content = content.replace(/href=["'][^"']*?styles\/css\/prism-tomorrow\.min\.css["']/g, 'href="/src/styles/css/prism-tomorrow.min.css"');

      return content;
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.html') || file.endsWith('.scss')) {
        server.ws.send({
          type: 'full-reload'
        });
      }
    }
  };
}

// dist 실시간 빌드 플러그인 (npm run dev 실행 시 build-watch.js 를 함께 실행)
// 끄기: DIST_WATCH=false npm run dev (PowerShell: $env:DIST_WATCH='false'; npm run dev)
function distWatchPlugin() {
  return {
    name: 'dist-watch',
    apply: 'serve',
    configureServer(server) {
      if (process.env.DIST_WATCH === 'false') return;
      const child = spawn(process.execPath, [resolve(__dirname, 'build-watch.js')], { cwd: __dirname, stdio: 'inherit' });
      const stop = () => { if (!child.killed) child.kill(); };
      // 설정 변경으로 서버가 재시작되거나 종료되면 감시 프로세스도 함께 종료
      server.httpServer?.once('close', stop);
      process.once('exit', stop);
    }
  };
}

// 루트 워크시트(index.html) 및 경로 서빙 플러그인
function rootWorksheetPlugin() {
  return {
    name: 'root-worksheet',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0];

        // 루트 접근 시 admin/src/index.html 서빙
        if (url === '/' || url === '/index.html') {
          const adminIndexPath = resolve(__dirname, 'src/index.html');
          if (fs.existsSync(adminIndexPath)) {
            let html = fs.readFileSync(adminIndexPath, 'utf-8');
            html = await server.transformIndexHtml('/src/index.html', html);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.end(html);
          }
        }

        // /admin/ 경로로 들어온 요청은 / 경로로 리라이트
        if (req.url.startsWith('/admin/')) {
          req.url = req.url.replace(/^\/admin/, '');
        }

        // /data/ 또는 /src/data/ 경로 요청 처리
        if (req.url.startsWith('/data/') || req.url.startsWith('/src/data/')) {
          const cleanPath = req.url.replace(/^\/(?:src\/)?/, '').split('?')[0];
          const dataFilePath = resolve(__dirname, 'src', cleanPath);
          if (fs.existsSync(dataFilePath) && fs.statSync(dataFilePath).isFile()) {
            const ext = dataFilePath.split('.').pop();
            const mimeMap = { js: 'application/javascript; charset=utf-8', json: 'application/json; charset=utf-8' };
            res.setHeader('Content-Type', mimeMap[ext] || 'text/plain');
            return res.end(fs.readFileSync(dataFilePath));
          }
        }

        // /pages/, /guide/, /layout/, /components/ 등 src 하위 HTML 요청 직접 매핑
        const subDirs = ['pages', 'guide', 'layout', 'components'];
        for (const dir of subDirs) {
          if (req.url.startsWith(`/${dir}/`)) {
            const relativeReqPath = req.url.replace(/^\//, '').split('?')[0];
            const srcFilePath = resolve(__dirname, 'src', relativeReqPath);
            if (fs.existsSync(srcFilePath) && fs.statSync(srcFilePath).isFile()) {
              if (srcFilePath.endsWith('.html')) {
                let html = fs.readFileSync(srcFilePath, 'utf-8');
                html = await server.transformIndexHtml(`/src/${relativeReqPath}`, html);
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.end(html);
              }
            }
          }
        }

        // /assets/ 경로로 들어온 요청은 /src/assets/ 디렉토리 파일 서빙 (호환성)
        if (req.url.startsWith('/assets/')) {
          const assetFilePath = resolve(__dirname, 'src', req.url.replace(/^\//, '').split('?')[0]);
          if (fs.existsSync(assetFilePath) && fs.statSync(assetFilePath).isFile()) {
            const ext = assetFilePath.split('.').pop();
            const mimeMap = {
              woff2: 'font/woff2',
              woff: 'font/woff',
              ttf: 'font/ttf',
              svg: 'image/svg+xml',
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              gif: 'image/gif',
              webp: 'image/webp',
              css: 'text/css; charset=utf-8',
              js: 'application/javascript; charset=utf-8'
            };
            res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
            return res.end(fs.readFileSync(assetFilePath));
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [htmlIncludePlugin(), rootWorksheetPlugin(), distWatchPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'src': resolve(__dirname, 'src'),
      'styles': resolve(__dirname, 'src/styles/scss'),
      'scss': resolve(__dirname, 'src/styles/scss'),
      'abstracts': resolve(__dirname, 'src/styles/scss/abstracts'),
      'components': resolve(__dirname, 'src/styles/scss/components'),
      'pages': resolve(__dirname, 'src/styles/scss/pages'),
      'assets': resolve(__dirname, 'src/assets')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [
          resolve(__dirname, 'src/styles/scss'),
          resolve(__dirname, 'src/assets'),
          resolve(__dirname, 'src'),
          resolve(__dirname)
        ]
      }
    }
  },
  server: {
    port: 3000,
    open: true, // 서버 실행 시 브라우저 자동 열기
    fs: {
      allow: ['..']
    }
  }
});
