import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// 초간단 HTML Include 플러그인 (정규식 기반 - 중첩 include 지원)
function resolveIncludes(htmlContent) {
  const regex = /<!--[\s\S]*?-->|<include\s+src="([^"]+)"><\/include>/g;
  return htmlContent.replace(regex, (match, src) => {
    // 매칭된 내용이 주석이라면 원본 그대로 통과
    if (match.startsWith('<!--')) return match;
    
    // vite.config.js 파일의 위치(__dirname) 기준으로 경로 탐색
    const filePath = resolve(__dirname, src);
    if (fs.existsSync(filePath)) {
      const nestedContent = fs.readFileSync(filePath, 'utf-8');
      return resolveIncludes(nestedContent); // 재귀 호출로 중첩된 include까지 모두 치환
    }
    console.warn(`[html-include] 파일을 찾을 수 없습니다: ${filePath}`);
    return match; // 파일이 없으면 원본 그대로 둠
  });
}

function htmlIncludePlugin() {
  return {
    name: 'html-include',
    transformIndexHtml(html) {
      // 1. Include 치환
      let content = resolveIncludes(html);

      // 2. SCSS 링크를 Vite 모듈 로더(<script type="module">)로 변환하여 CSS 정상 주입 및 HMR 지원
      content = content.replace(/<link\s+rel=["']stylesheet["']\s+href=["'][^"']*?(?:assets\/)?scss\/globals\.scss["']\s*\/?>/gi, '<script type="module" src="/src/assets/scss/globals.scss"></script>');
      content = content.replace(/<link\s+rel=["']stylesheet["']\s+href=["'][^"']*?(?:assets\/)?scss\/common\.scss["']\s*\/?>/gi, '<script type="module" src="/src/assets/scss/common.scss"></script>');
      content = content.replace(/<link\s+rel=["']stylesheet["']\s+href=["']([^"']+\.scss)["']\s*\/?>/gi, '<script type="module" src="$1"></script>');

      // 3. UI JS 스크립트 경로 정규화
      content = content.replace(/src=["'][^"']*?(?:assets\/)?js\/ui\.js["']/g, 'src="/src/assets/js/ui.js"');
      content = content.replace(/src=["'][^"']*?(?:assets\/)?js\/guide\.js["']/g, 'src="/src/assets/js/guide.js"');
      content = content.replace(/src=["'][^"']*?(?:assets\/)?js\/prism\.min\.js["']/g, 'src="/src/assets/js/prism.min.js"');

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

// 루트 워크시트(index.html) 및 경로 서빙 플러그인
function rootWorksheetPlugin() {
  return {
    name: 'root-worksheet',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0];

        // 1. 루트 접근 시 admin/src/index.html 서빙
        if (url === '/' || url === '/index.html') {
          const adminIndexPath = resolve(__dirname, 'src/index.html');
          if (fs.existsSync(adminIndexPath)) {
            let html = fs.readFileSync(adminIndexPath, 'utf-8');
            html = await server.transformIndexHtml('/src/index.html', html);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.end(html);
          }
        }

        // 2. /admin/ 경로로 들어온 요청은 / 경로로 리라이트
        if (req.url.startsWith('/admin/')) {
          req.url = req.url.replace(/^\/admin/, '');
        }

        // 3. /data/ 또는 /src/data/ 경로 요청 처리
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

        // 4. /pages/, /guide/, /layout/, /components/ 등 src 하위 HTML 요청 직접 매핑
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

        // 5. /assets/ 경로로 들어온 요청은 /src/assets/ 디렉토리 파일 서빙 (호환성)
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
  plugins: [htmlIncludePlugin(), rootWorksheetPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'src': resolve(__dirname, 'src'),
      'styles': resolve(__dirname, 'src/assets/scss'),
      'scss': resolve(__dirname, 'src/assets/scss'),
      'abstracts': resolve(__dirname, 'src/assets/scss/abstracts'),
      'components': resolve(__dirname, 'src/assets/scss/components'),
      'pages': resolve(__dirname, 'src/assets/scss/pages'),
      'assets': resolve(__dirname, 'src/assets')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [
          resolve(__dirname, 'src/assets/scss'),
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
