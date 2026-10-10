/**
 * HTML Include (vite.config.js / build.js 공통)
 *
 * 기본
 *   <include src="../components/form.html"></include>
 *   - 경로는 include 를 쓴 파일 기준 상대 경로 (VS Code Ctrl+클릭 이동 가능)
 *   - 기존 admin 루트 기준 "./src/..." 경로도 지원
 *
 * 속성 전달 (props)
 *   화면:  <include src="../../partials/pageHeader.html" title="미션 목록"></include>
 *   UI 컴포넌트:  <h2 class="pageTitle">{{ title }}</h2>
 *   - {{ name | 기본값 }} : 값이 없으면 기본값 사용 (기본값 생략 시 빈 문자열)
 *   - 값 없는 속성(예: full)은 "true"
 *
 * 내용 끼워 넣기 (slot)
 *   화면:  <include src="../../partials/searchItem.html" label="조회일자"> ...마크업... </include>
 *   UI 컴포넌트:  <div class="searchField">{{ slot }}</div>
 *
 * 이름 있는 slot (내용을 넣을 자리가 여러 개일 때)
 *   화면:  <include src="../../partials/viewSection.html" title="상세 설정">
 *            <slot name="actions"><button ...>미리보기</button></slot>
 *            ...행 마크업 (기본 slot)...
 *          </include>
 *   UI 컴포넌트:  {{ actions }} / {{ slot }}
 *
 * 조건부 출력
 *   {{#if count}} ... {{/if}}   : count 값이 있을 때만 출력 (중첩 가능)
 *   {{#if !count}} ... {{/if}}  : count 값이 없을 때만 출력
 *
 * 목록 반복 (쉼표로 구분한 값)
 *   화면:  <include src="../../partials/checkGroup.html" name="status" options="운영중,중단,종료" checked="중단"></include>
 *   UI 컴포넌트:  {{#each options}} ... {{ item }} ... {{/each}}   (중첩 불가)
 *   - 반복 안에서 쓸 수 있는 값: item(현재 값), num(1부터 순번), first / last(처음·마지막이면 true),
 *     isChecked(checked 속성 목록에 포함되면 true, checked 속성이 없으면 첫 번째가 true)
 *
 * 바인딩 속성 (속성 값에 {{ }} 를 쓸 때 에디터 검사 회피)
 *   UI 컴포넌트:  <col :style="width: {{ thWidth | 160px }};">  →  출력: <col style="width: 160px;">
 *
 * - HTML 주석(<!-- -->) 안의 {{ }} 는 치환하지 않음 (UI 컴포넌트 사용법 설명용)
 * - UI 컴포넌트 파일 맨 위 <!-- [UI 컴포넌트] ... --> 사용법 주석은 결과물에 포함하지 않음
 * - UI 컴포넌트 파일 위치: src/partials
 *   dist/partials 에는 사용법 주석의 예시를 렌더링한 완성 마크업을 출력 (renderExamples)
 */
const fs = require('fs');
const path = require('path');

const ATTR_RE = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_][\w-]*)\s*(?:\|([^}]*))?\}\}/g;
// 안쪽(다른 {{#if 를 포함하지 않는) 조건부터 처리 → 바깥으로 반복 (중첩 지원)
const IF_RE = /\{\{#if\s+(!?)([A-Za-z_][\w-]*)\s*\}\}((?:(?!\{\{#if\b)[\s\S])*?)\{\{\/if\}\}/g;
const EACH_RE = /\{\{#each\s+([A-Za-z_][\w-]*)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g;

const splitList = (v) => (v === undefined ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));

function parseAttrs(str) {
  const attrs = {};
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(str))) {
    attrs[m[1]] = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : 'true';
  }
  return attrs;
}

/** 주석을 제외한 부분에만 fn 적용 */
function outsideComments(html, fn) {
  return html
    .split(/(<!--[\s\S]*?-->)/g)
    .map((part) => (part.startsWith('<!--') ? part : fn(part)))
    .join('');
}

// 출력이 비는 자리 표시 (반복 끝 / 거짓 조건 / 빈 값) - 표시만 남은 줄은 통째로 제거
const MARK = '\u0001';
const BLOCK_PLACEHOLDER_RE = /^([ \t]*)\{\{\s*([A-Za-z_][\w-]*)\s*(?:\|([^}]*))?\}\}[ \t]*$/gm;
// 바인딩 속성: :style="width: {{ w }};" → style="..." (에디터의 CSS 검사 회피용)
const BOUND_ATTR_RE = /(<[A-Za-z][^<>]*?\s):([A-Za-z][\w-]*)=/g;

function propValue(props, name, fallback) {
  const v = props[name];
  if (v !== undefined && v !== '') return v;
  return fallback !== undefined ? fallback.trim() : '';
}

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
    .filter((line) => !(line.includes(MARK) && !line.replace(new RegExp(MARK, 'g'), '').trim()))
    .join('\n')
    .replace(new RegExp(MARK, 'g'), '');
}

function applyProps(html, props) {
  const out = outsideComments(html, (part) => {
    let text = part.replace(EACH_RE, (_, name, body) => {
      const items = splitList(props[name]);
      const checked = props.checked === undefined ? null : splitList(props.checked);
      return (
        items
          .map((item, i) =>
            applyProps(body, {
              ...props,
              item,
              num: String(i + 1),
              first: i === 0 ? 'true' : '',
              last: i === items.length - 1 ? 'true' : '',
              isChecked: (checked ? checked.includes(item) : i === 0) ? 'true' : ''
            })
          )
          .join('') + MARK
      );
    });

    let prev;
    do {
      prev = text;
      text = text.replace(IF_RE, (_, not, name, body) => {
        const has = props[name] !== undefined && String(props[name]).trim() !== '';
        return (not ? !has : has) ? body : MARK;
      });
    } while (text !== prev);

    // 한 줄 전체가 {{ 값 }} 인 경우: 여러 줄 값을 그 자리 들여쓰기에 맞춤
    text = text.replace(BLOCK_PLACEHOLDER_RE, (_, indent, name, fallback) => {
      const v = propValue(props, name, fallback);
      return v.trim() ? reindent(v, indent) : MARK;
    });
    text = text.replace(PLACEHOLDER_RE, (_, name, fallback) => propValue(props, name, fallback));

    let bound;
    do {
      bound = text;
      text = text.replace(BOUND_ATTR_RE, '$1$2=');
    } while (text !== bound);
    return text;
  });
  return cleanMarks(out);
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
    // UI 컴포넌트 파일 맨 위 사용법 주석(<!-- [UI 컴포넌트] ... -->)은 결과물에서 제외
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\s*<!--\s*\[UI 컴포넌트\][\s\S]*?-->\s*/, '');
    const content = applyProps(raw, { ...props, slot });
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

module.exports = { resolveIncludes, renderExamples };
