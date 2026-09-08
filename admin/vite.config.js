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
      return resolveIncludes(html);
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.html')) {
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

        // 1. 루트 접근 시 상위 index.html 서빙
        if (url === '/' || url === '/index.html') {
          const rootIndexPath = resolve(__dirname, '../index.html');
          if (fs.existsSync(rootIndexPath)) {
            let html = fs.readFileSync(rootIndexPath, 'utf-8');
            html = await server.transformIndexHtml(req.url, html);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.end(html);
          }
        }

        // 2. /admin/ 경로로 들어온 요청은 / 경로로 리라이트 (admin 폴더 내부 파일 매핑)
        if (req.url.startsWith('/admin/')) {
          req.url = req.url.replace(/^\/admin/, '');
        }

        // 3. /offering/ 경로로 들어온 요청은 상위 offering 디렉토리 파일 서빙
        if (req.url.startsWith('/offering/')) {
          const offeringFilePath = resolve(__dirname, '..', req.url.replace(/^\//, ''));
          if (fs.existsSync(offeringFilePath) && fs.statSync(offeringFilePath).isFile()) {
            const ext = offeringFilePath.split('.').pop();
            const mimeMap = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css' };
            res.setHeader('Content-Type', mimeMap[ext] || 'text/plain');
            return res.end(fs.readFileSync(offeringFilePath));
          }
        }

        // 4. /data/ 경로로 들어온 요청은 상위 data 디렉토리 파일 서빙
        if (req.url.startsWith('/data/')) {
          const dataFilePath = resolve(__dirname, '..', req.url.replace(/^\//, '').split('?')[0]);
          if (fs.existsSync(dataFilePath) && fs.statSync(dataFilePath).isFile()) {
            const ext = dataFilePath.split('.').pop();
            const mimeMap = { js: 'application/javascript; charset=utf-8', json: 'application/json; charset=utf-8' };
            res.setHeader('Content-Type', mimeMap[ext] || 'text/plain');
            return res.end(fs.readFileSync(dataFilePath));
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [htmlIncludePlugin(), rootWorksheetPlugin()],
  server: {
    port: 3000,
    open: true, // 서버 실행 시 브라우저 자동 열기
    fs: {
      allow: ['..']
    }
  }
});
