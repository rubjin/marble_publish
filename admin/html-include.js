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
 *   부품:  <h2 class="pageTitle">{{ title }}</h2>
 *   - {{ name | 기본값 }} : 값이 없으면 기본값 사용 (기본값 생략 시 빈 문자열)
 *   - 값 없는 속성(예: full)은 "true"
 *
 * 내용 끼워 넣기 (slot)
 *   화면:  <include src="../../partials/searchItem.html" label="조회일자"> ...마크업... </include>
 *   부품:  <div class="searchField">{{ slot }}</div>
 *
 * 이름 있는 slot (내용을 넣을 자리가 여러 개일 때)
 *   화면:  <include src="../../partials/viewSection.html" title="상세 설정">
 *            <slot name="actions"><button ...>미리보기</button></slot>
 *            ...행 마크업 (기본 slot)...
 *          </include>
 *   부품:  {{ actions }} / {{ slot }}
 *
 * 조건부 출력
 *   {{#if count}} ... {{/if}}   : count 값이 있을 때만 출력 (중첩 가능)
 *   {{#if !count}} ... {{/if}}  : count 값이 없을 때만 출력
 *
 * 목록 반복 (쉼표로 구분한 값)
 *   화면:  <include src="../../partials/checkGroup.html" name="status" options="운영중,중단,종료" checked="중단"></include>
 *   부품:  {{#each options}} ... {{ item }} ... {{/each}}   (중첩 불가)
 *   - 반복 안에서 쓸 수 있는 값: item(현재 값), num(1부터 순번), first / last(처음·마지막이면 true),
 *     isChecked(checked 속성 목록에 포함되면 true, checked 속성이 없으면 첫 번째가 true)
 *
 * - HTML 주석(<!-- -->) 안의 {{ }} 는 치환하지 않음 (부품 사용법 설명용)
 * - 부품 파일 맨 위 <!-- [부품] ... --> 사용법 주석은 결과물에 포함하지 않음
 * - 부품 파일 위치: src/partials (dist 에는 단독 파일로 출력하지 않음)
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

function applyProps(html, props) {
  return outsideComments(html, (part) =>
    part
      .replace(EACH_RE, (_, name, body) => {
        const items = splitList(props[name]);
        const checked = props.checked === undefined ? null : splitList(props.checked);
        return items
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
          .join('');
      })
      .replace(/[\s\S]*/, (text) => {
        let prev;
        do {
          prev = text;
          text = text.replace(IF_RE, (_, not, name, body) => {
            const has = props[name] !== undefined && String(props[name]).trim() !== '';
            return (not ? !has : has) ? body : '';
          });
        } while (text !== prev);
        return text;
      })
      .replace(PLACEHOLDER_RE, (_, name, fallback) => {
        const v = props[name];
        if (v !== undefined && v !== '') return v;
        return fallback !== undefined ? fallback.trim() : '';
      })
  );
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
    // 부품 파일 맨 위 사용법 주석(<!-- [부품] ... -->)은 결과물에서 제외
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\s*<!--\s*\[부품\][\s\S]*?-->\s*/, '');
    const content = applyProps(raw, { ...props, slot });
    out += resolveIncludes(content, { ...opts, baseDir: path.dirname(filePath) });
  }
  return out + html.slice(pos);
}

module.exports = { resolveIncludes };
