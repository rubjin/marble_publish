/**
 * HTML Include (vite.config.js / build.js 공통)
 *
 * 기본
 *   <include src="../components/form.html"></include>
 *   - 경로는 include 를 쓴 파일 기준 상대 경로 (VS Code Ctrl+클릭 이동 가능)
 *   - 기존 admin 루트 기준 "./src/..." 경로도 지원
 *
 * UI 컴포넌트 (src/partials) - Nunjucks 템플릿 (https://mozilla.github.io/nunjucks/templating.html)
 *   화면에서 넘긴 속성 / slot 이 템플릿 변수가 됩니다. (그 외 include 파일은 그대로 삽입)
 *
 *   속성 전달
 *     화면:         <include src="../../partials/pageHeader.html" title="미션 목록"></include>
 *     UI 컴포넌트:  <h2 class="pageTitle">{{ title }}</h2>
 *     - 기본값: {{ resetText | default('초기화', true) }}  (속성이 없거나 빈 값이면 기본값)
 *     - 값 없는 속성(예: full)은 "true"
 *
 *   내용 끼워 넣기 (slot)
 *     화면:         <include src="../../partials/searchItem.html" label="조회일자"> ...마크업... </include>
 *     UI 컴포넌트:  {{ slot }}
 *     - 한 줄에 {{ 변수 }} 만 있으면 여러 줄 값을 그 자리 들여쓰기에 맞춰 출력 (빈 값이면 줄 삭제)
 *
 *   이름 있는 slot (내용을 넣을 자리가 여러 개일 때)
 *     화면:         <include src="../../partials/viewSection.html" title="상세 설정">
 *                     <slot name="actions"><button ...>미리보기</button></slot>
 *                     ...행 마크업 (기본 slot)...
 *                   </include>
 *     UI 컴포넌트:  {{ actions }} / {{ slot }}
 *
 *   조건 / 반복
 *     {% if count %} ... {% endif %}   /   {% if not count %} ... {% endif %}
 *     {% for opt in options | list %} ... {{ opt }} ... {% endfor %}   (list: 쉼표 구분 값 → 배열)
 *     - 반복 안: loop.first / loop.last / loop.index(1부터)
 *     - {% %} 태그가 있는 줄은 결과가 공백뿐이면 자동 삭제 (블록 태그만 있는 줄, 거짓 조건 줄)
 *
 *   바인딩 속성 (속성 값에 {{ }} 를 쓸 때 에디터의 CSS 검사 회피)
 *     UI 컴포넌트:  <col :style="width: {{ thWidth | default('160px', true) }};">  →  출력: <col style="width: 160px;">
 *
 * 레이아웃 (src/layout) - UI 컴포넌트와 같은 방식 (속성 / slot)
 *   화면:  <include src="../../layout/layoutDefault.html" title="미션등록"> ...화면 콘텐츠... </include>
 *   - layoutDefault(헤더 + 사이드바) / layoutLogin(로그인) / layoutError(404·500·점검)
 *   - head.html 의 title 속성 → <title>미션등록 | Admin</title>
 *
 * - UI 컴포넌트 / 레이아웃 파일 맨 위 <!-- [UI 컴포넌트] ... --> / <!-- [레이아웃] ... --> 사용법 주석은 결과물에 포함하지 않음
 * - 그 외 템플릿 설명은 Nunjucks 주석 {# ... #} 사용 (HTML 주석 안의 {{ }} 도 치환되므로 주의)
 * - dist/partials 에는 사용법 주석의 예시를 렌더링한 완성 마크업을 출력 (renderExamples)
 */
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

const ATTR_RE = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
const DOC_COMMENT_RE = /^\s*<!--\s*\[(?:UI 컴포넌트|레이아웃)\][\s\S]*?-->\s*/;

// Nunjucks 템플릿으로 렌더링하는 폴더 (속성 / slot 사용 가능)
const TEMPLATE_DIRS = ['partials', 'layout'];

// 출력이 비는 자리 표시 (빈 slot 등) - 표시만 남은 줄은 통째로 제거
const MARK = '\u0001';
// 한 줄에 {{ 변수 }} 만 있는 경우 → 여러 줄 값 들여쓰기 맞춤
const BLOCK_VAR_RE = /^([ \t]*)\{\{\s*([A-Za-z_]\w*)\s*\}\}[ \t]*$/gm;
// 바인딩 속성: :style="..." → style="..."
const BOUND_ATTR_RE = /(<[A-Za-z][^<>]*?\s):([A-Za-z][\w-]*)=/g;

/** 여러 줄 값을 지정한 들여쓰기에 맞춤 (공통 들여쓰기 제거 + 앞뒤 빈 줄 제거) */
function reindent(value, indent) {
  const lines = String(value).replace(/\r/g, '').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const min = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length));
  return lines.map((l) => (l.trim() ? indent + l.slice(min) : '')).join('\n');
}

function cleanMarks(text) {
  return text
    .split('\n')
    .filter((line) => !(line.includes(MARK) && !line.split(MARK).join('').trim()))
    .join('\n')
    .split(MARK).join('');
}

// {% %} 태그가 있는 줄은 렌더링 결과가 공백뿐이면 줄 삭제 (블록 태그만 있는 줄 / 거짓 조건만 있는 줄)
// (Nunjucks trimBlocks 는 내용 뒤의 {% endif %} 줄바꿈까지 지워 다음 줄이 붙으므로 사용하지 않음)
const TAG_LINE_RE = /^.*\{%.*$/gm;

const env = new nunjucks.Environment(null, {
  autoescape: false    // slot 은 HTML 그대로 출력
});
// 쉼표 구분 값 → 배열 ("운영중, 중단" → ['운영중', '중단'])
env.addFilter('list', (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []));
// 블록 변수 출력 (BLOCK_VAR_RE 변환용)
env.addGlobal('__block', (value, indent) => (value && String(value).trim() ? reindent(value, indent) : MARK));

/** UI 컴포넌트 템플릿 렌더링 */
function renderTemplate(source, context, filePath) {
  const prepared = source
    .replace(TAG_LINE_RE, (line) => line + MARK)
    .replace(BLOCK_VAR_RE, (_, indent, name) => `{{ __block(${name}, ${JSON.stringify(indent)}) }}`);
  let html;
  try {
    html = env.renderString(prepared, context);
  } catch (err) {
    throw new Error(`[html-include] 템플릿 오류 (${filePath}): ${err.message}`);
  }
  let prev;
  do {
    prev = html;
    html = html.replace(BOUND_ATTR_RE, '$1$2=');
  } while (html !== prev);
  return cleanMarks(html);
}

function parseAttrs(str) {
  const attrs = {};
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(str))) {
    attrs[m[1]] = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : 'true';
  }
  return attrs;
}

/**
 * <include ...> 태그 찾기 (slot 안의 중첩 include 를 고려해 짝이 맞는 </include> 탐색)
 * @returns {{ start, end, attrs, slot } | null}
 */
function findInclude(html, from) {
  const openRe = /<include\b([^>]*?)(\/?)>/g;
  openRe.lastIndex = from;
  let m;
  while ((m = openRe.exec(html))) {
    // 주석 안의 include 는 건너뜀
    const before = html.lastIndexOf('<!--', m.index);
    if (before !== -1 && html.indexOf('-->', before) > m.index) {
      openRe.lastIndex = html.indexOf('-->', before) + 3;
      continue;
    }
    const attrs = parseAttrs(m[1]);
    if (m[2] === '/') return { start: m.index, end: openRe.lastIndex, attrs, slot: '' };

    // 짝이 맞는 </include> 찾기
    const tagRe = /<include\b[^>]*?(\/?)>|<\/include>/g;
    tagRe.lastIndex = openRe.lastIndex;
    let depth = 1;
    let t;
    while ((t = tagRe.exec(html))) {
      if (t[0] === '</include>') depth--;
      else if (t[1] !== '/') depth++;
      if (depth === 0) {
        return { start: m.index, end: tagRe.lastIndex, attrs, slot: html.slice(openRe.lastIndex, t.index) };
      }
    }
    throw new Error(`[html-include] </include> 가 없습니다: ${m[0]}`);
  }
  return null;
}

/**
 * include 내용에서 이름 있는 slot(<slot name="x">...</slot>) 분리
 * - 중첩된 include 안의 slot 은 그 include 의 것이므로 건드리지 않음
 * @returns {{ main: string, named: Record<string, string> }}
 */
function splitSlots(content) {
  const re = /<include\b[^>]*?(\/?)>|<\/include>|<slot\s+name="([^"]+)"\s*>|<\/slot>/g;
  const named = {};
  let main = '';
  let pos = 0;
  let depth = 0;
  let open = null; // { name, start }
  let m;
  while ((m = re.exec(content))) {
    if (m[0].startsWith('<include')) { if (m[1] !== '/') depth++; continue; }
    if (m[0] === '</include>') { depth--; continue; }
    if (depth !== 0) continue;
    if (m[2] && !open) {
      main += content.slice(pos, m.index);
      open = { name: m[2], start: re.lastIndex };
    } else if (m[0] === '</slot>' && open) {
      named[open.name] = content.slice(open.start, m.index);
      pos = re.lastIndex;
      open = null;
    }
  }
  main += content.slice(pos);
  return { main, named };
}

function resolveIncludePath(src, baseDir, rootDir) {
  const candidates = [path.resolve(baseDir, src), path.resolve(rootDir, src.replace(/^\.\//, ''))];
  return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
}

/**
 * include 치환
 * @param {string} html
 * @param {{ baseDir: string, rootDir: string, onMissing?: (src: string, baseDir: string) => void }} opts
 */
function resolveIncludes(html, opts) {
  const { baseDir, rootDir, onMissing } = opts;
  let out = '';
  let pos = 0;
  let inc;
  while ((inc = findInclude(html, pos))) {
    out += html.slice(pos, inc.start);
    pos = inc.end;

    const { src, ...props } = inc.attrs;
    const filePath = src && resolveIncludePath(src, baseDir, rootDir);
    if (!filePath) {
      if (onMissing) onMissing(src, baseDir);
      out += html.slice(inc.start, inc.end);
      continue;
    }

    // slot 은 화면(호출한 파일) 기준으로 먼저 처리
    const { main, named } = splitSlots(inc.slot);
    const slot = main.trim() ? resolveIncludes(main, opts) : '';
    Object.keys(named).forEach((k) => {
      props[k] = named[k].trim() ? resolveIncludes(named[k], opts) : '';
    });
    // 파일 맨 위 사용법 주석(<!-- [UI 컴포넌트] ... --> / <!-- [레이아웃] ... -->)은 결과물에서 제외
    const raw = fs.readFileSync(filePath, 'utf8').replace(DOC_COMMENT_RE, '');
    // src/partials, src/layout 은 Nunjucks 템플릿으로 렌더링, 그 외 파일은 그대로 삽입
    const isTemplate = TEMPLATE_DIRS.some((dir) => !path.relative(path.resolve(rootDir, 'src', dir), filePath).startsWith('..'));
    const content = isTemplate ? renderTemplate(raw, { ...props, slot }, filePath) : raw;
    const rendered = resolveIncludes(content, { ...opts, baseDir: path.dirname(filePath) }).replace(/\s+$/, '');
    // include 태그가 줄 맨 앞(들여쓰기만 있는 위치)에 있으면 결과 전체를 같은 들여쓰기로 맞춤
    const lineStart = html.lastIndexOf('\n', inc.start - 1) + 1;
    const indent = html.slice(lineStart, inc.start);
    out += /^[ \t]*$/.test(indent) ? rendered.replace(/\n(?=[^\n])/g, '\n' + indent) : rendered;
  }
  return out + html.slice(pos);
}

/**
 * UI 컴포넌트 파일(src/partials) 미리보기 렌더링
 * - 맨 위 <!-- [UI 컴포넌트] ... --> 주석의 사용 예시(<include ...>)를 실제로 치환한 결과를 반환
 * - 예시 경로("../../partials/...")는 화면(src/pages/폴더/) 기준이므로 그 위치에서 해석
 * - 결과: 원본 사용법 주석 + 예시별 완성 마크업 (dist/partials, 개발 서버 /partials/ 에서 사용)
 */
function renderExamples(filePath, opts) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const doc = raw.match(/^\s*<!--\s*\[UI 컴포넌트\][\s\S]*?-->/);
  if (!doc) return resolveIncludes(raw, { ...opts, baseDir: path.dirname(filePath) });

  const body = doc[0].replace(/^\s*<!--/, '').replace(/-->$/, '');
  const exampleBase = path.join(path.dirname(filePath), '..', 'pages', '_example');
  const examples = [];
  let pos = 0;
  let inc;
  while ((inc = findInclude(body, pos))) {
    examples.push(body.slice(inc.start, inc.end));
    pos = inc.end;
  }

  const rendered = examples.map((ex, i) => {
    const html = resolveIncludes(ex, { ...opts, baseDir: exampleBase }).trim();
    const label = ex.replace(/\s+/g, ' ').replace(/--/g, '- -');
    return `<!-- 예시 ${i + 1}: ${label} -->\n${html}`;
  });
  return `${doc[0].trim()}\n\n${rendered.join('\n\n')}\n`;
}

/**
 * 레이아웃 파일(src/layout 의 {{ slot }} 이 있는 파일) 단독 미리보기 렌더링
 * - 콘텐츠 자리(slot)에 안내 문구를 넣어 레이아웃 구조만 확인 (개발 서버 /layout/..., dist/layout 에서 사용)
 * - slot 이 없는 파일(head / header / aside 등 부분 파일)은 null
 */
function renderLayoutPreview(filePath, opts) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!/\{\{\s*slot\s*\}\}/.test(raw)) return null;
  const placeholder = '<p style="padding: 80px 0; text-align: center; color: #9CA3AF;">콘텐츠 영역 (화면별 콘텐츠가 들어가는 자리)</p>';
  const html = `<include src="./${path.basename(filePath)}" title="레이아웃 미리보기">\n${placeholder}\n</include>`;
  return resolveIncludes(html, { ...opts, baseDir: path.dirname(filePath) }) + '\n';
}

module.exports = { resolveIncludes, renderExamples, renderLayoutPreview };
