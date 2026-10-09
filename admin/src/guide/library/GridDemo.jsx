import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender
} from '@tanstack/react-table';
import { cx, seeded, Checkbox, StateView } from './shared.jsx';

const fmt = (n) => Number(n).toLocaleString('ko-KR');

/* ==========================================================================
   데모 데이터
   ========================================================================== */
const MISSION_NAMES = ['매일 만보 걷기 챌린지', '주 3회 금융 퀴즈 풀기', '적금 30일 연속 납입 미션', '출석체크 이벤트', '해외주식 첫 거래 미션', '스탁뷰 종목 조회 미션', '친구 초대 리워드', 'OX 퀴즈 데일리'];
const STATUS = [
  { key: 'ing', label: '운영중' },
  { key: 'ready', label: '대기' },
  { key: 'end', label: '종료' }
];

function makeMissions(count) {
  const rand = seeded(11);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(2026, 5, 1 + i);
    return {
      id: i + 1,
      title: `${MISSION_NAMES[i % MISSION_NAMES.length]} ${Math.floor(i / MISSION_NAMES.length) + 1}차`,
      status: STATUS[Math.floor(rand() * 3)],
      users: Math.round(rand() * 15000),
      date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    };
  });
}

const MONTHS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
function makeBranches() {
  const rand = seeded(5);
  const row = (name, subRows) => {
    const r = { name, subRows };
    MONTHS.forEach((m) => { r[m] = Math.round(300 + rand() * 600); });
    if (subRows) MONTHS.forEach((m) => { r[m] = subRows.reduce((sum, s) => sum + s[m], 0); });
    return r;
  };
  return [
    row('서울본부', [row('여의도지점'), row('강남지점'), row('종로지점')]),
    row('부산본부', [row('서면지점'), row('해운대지점')]),
    row('대구본부', [row('동성로지점'), row('수성지점')]),
    row('광주본부', [row('상무지점'), row('충장로지점')]),
    row('대전본부', [row('둔산지점'), row('유성지점')])
  ];
}
const rowTotal = (r) => MONTHS.reduce((sum, m) => sum + r[m], 0);

/* ==========================================================================
   공통 렌더링 조각
   ========================================================================== */
function HeaderContent({ header }) {
  const content = flexRender(header.column.columnDef.header, header.getContext());
  if (!header.column.getCanSort()) return content;
  const sorted = header.column.getIsSorted();
  return (
    <button
      type="button"
      className={cx('sortBtn', { isAsc: sorted === 'asc', isDesc: sorted === 'desc' })}
      onClick={header.column.getToggleSortingHandler()}
    >
      <span className="sortText">{content}</span>
      <span className="sortIcon" aria-hidden="true" />
    </button>
  );
}

// 1 2 3 4 5 ... 13 형태 (현재 페이지 기준 5개 + 마지막)
function getPageList(current, total) {
  const size = 5;
  let start = Math.max(0, Math.min(current - 2, total - size));
  const end = Math.min(total, start + size);
  const list = [];
  for (let i = start; i < end; i++) list.push(i);
  if (end < total - 1) list.push('...');
  if (end < total) list.push(total - 1);
  return list;
}

function Pagination({ table }) {
  const { pageIndex } = table.getState().pagination;
  const total = table.getPageCount();
  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button type="button" className="pageBtn first" aria-label="첫 페이지" disabled={!table.getCanPreviousPage()} onClick={() => table.firstPage()} />
      <button type="button" className="pageBtn prev" aria-label="이전 페이지" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} />
      <span className="pageNumList">
        {getPageList(pageIndex, total).map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="pageEllipsis" aria-hidden="true">...</span>
          ) : (
            <button
              key={p}
              type="button"
              className={cx('pageNum', { isActive: p === pageIndex })}
              aria-current={p === pageIndex ? 'page' : undefined}
              onClick={() => table.setPageIndex(p)}
            >
              {p + 1}
            </button>
          )
        )}
      </span>
      <button type="button" className="pageBtn next" aria-label="다음 페이지" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} />
      <button type="button" className="pageBtn last" aria-label="마지막 페이지" disabled={!table.getCanNextPage()} onClick={() => table.lastPage()} />
    </nav>
  );
}

/* ==========================================================================
   1. 기본 그리드 : 정렬 + 행 선택 + 페이지네이션
   ========================================================================== */
function BasicGrid() {
  const data = useMemo(() => makeMissions(57), []);
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const columns = useMemo(() => [
    {
      id: 'select',
      size: 56,
      enableSorting: false,
      meta: { className: 'colCheck' },
      header: ({ table }) => (
        <Checkbox
          label="전체 선택"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox label="행 선택" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
      )
    },
    { accessorKey: 'id', header: 'No.', size: 80, enableSorting: false },
    {
      accessorKey: 'title',
      header: '미션명',
      meta: { className: 'textLeft', fluid: true },
      cell: (info) => <a href="#" className="link" onClick={(e) => e.preventDefault()}>{info.getValue()}</a>
    },
    {
      accessorKey: 'status',
      header: '상태',
      size: 120,
      enableSorting: false,
      cell: (info) => <span className={cx('statusDot', info.getValue().key)}>{info.getValue().label}</span>
    },
    { accessorKey: 'users', header: '참여자 수', size: 140, meta: { className: 'isNumber' }, cell: (info) => fmt(info.getValue()) },
    { accessorKey: 'date', header: '등록일자', size: 140 }
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection, pagination },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="tblSection">
      <div className="tblTop">
        <div className="tblLeft">
          <h3 className="tblTitle">미션 목록</h3>
          <span className="tblCount">총 <strong className="count point">{fmt(data.length)}</strong>건</span>
        </div>
        <div className="tblRight">
          <div className="btnGroup">
            <button type="button" className="btn outline" disabled={!selectedCount} onClick={() => setRowSelection({})}>선택 해제</button>
            <button type="button" className="btn primary">신규 등록</button>
          </div>
        </div>
      </div>

      <div className="dataGridWrap">
        <table className="tbl dataGrid">
          <colgroup>
            {table.getAllLeafColumns().map((col) => (
              <col key={col.id} style={col.columnDef.meta?.fluid ? undefined : { width: col.getSize() }} />
            ))}
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className={header.column.columnDef.meta?.className}>
                    <HeaderContent header={header} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={cx({ isSelected: row.getIsSelected() })}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cell.column.columnDef.meta?.className}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dataGridBottom">
        <p className="gridSelectedInfo"><strong>{selectedCount}</strong>건 선택</p>
        <Pagination table={table} />
        <div className="gridPageSize">
          <select
            className="formControl wSm"
            aria-label="페이지당 건수"
            value={pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n}건씩 보기</option>)}
          </select>
        </div>
      </div>

      <StateView>
        sorting: {JSON.stringify(sorting)}{'\n'}selected ids: {JSON.stringify(Object.keys(rowSelection))}
      </StateView>
    </div>
  );
}

/* ==========================================================================
   2. 고급 그리드 : 컬럼 고정 + 리사이즈 + 행 펼침 + 합계 (헤더 고정 세로 스크롤)
   ========================================================================== */
function pinClass(column) {
  const pinned = column.getIsPinned();
  return cx({
    isPinnedLeft: pinned === 'left',
    isPinnedRight: pinned === 'right',
    isPinnedEdge: (pinned === 'left' && column.getIsLastColumn('left')) || (pinned === 'right' && column.getIsFirstColumn('right'))
  });
}

function pinStyle(column, width) {
  const pinned = column.getIsPinned();
  return {
    width,
    left: pinned === 'left' ? column.getStart('left') : undefined,
    right: pinned === 'right' ? column.getAfter('right') : undefined
  };
}

function AdvancedGrid() {
  const data = useMemo(() => makeBranches(), []);
  const [expanded, setExpanded] = useState({ 0: true });
  const [columnSizing, setColumnSizing] = useState({});

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: '지점명',
      size: 220,
      minSize: 140,
      meta: { className: 'textLeft' },
      cell: ({ row, getValue }) => (
        <span className="expandCell" style={row.depth > 0 ? { paddingLeft: 26 + (row.depth - 1) * 20 } : undefined}>
          {row.getCanExpand() && (
            <button
              type="button"
              className={cx('expandBtn', { isOpen: row.getIsExpanded() })}
              aria-label={row.getIsExpanded() ? '하위 지점 접기' : '하위 지점 펼치기'}
              aria-expanded={row.getIsExpanded()}
              onClick={row.getToggleExpandedHandler()}
            />
          )}
          {getValue()}
        </span>
      ),
      footer: '합계'
    },
    ...MONTHS.map((m, i) => ({
      accessorKey: m,
      header: `${i + 1}월`,
      size: 150,
      minSize: 80,
      meta: { className: 'isNumber' },
      cell: (info) => fmt(info.getValue()),
      footer: ({ table }) => fmt(table.getCoreRowModel().rows.reduce((sum, r) => sum + r.original[m], 0))
    })),
    {
      id: 'total',
      header: '합계',
      size: 130,
      enableResizing: false,
      accessorFn: rowTotal,
      meta: { className: 'isNumber' },
      cell: (info) => fmt(info.getValue()),
      footer: ({ table }) => fmt(table.getCoreRowModel().rows.reduce((sum, r) => sum + rowTotal(r.original), 0))
    }
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { expanded, columnSizing },
    initialState: { columnPinning: { left: ['name'], right: ['total'] } },
    onExpandedChange: setExpanded,
    onColumnSizingChange: setColumnSizing,
    getSubRows: (row) => row.subRows,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel()
  });

  const cellsOf = (row) => [...row.getLeftVisibleCells(), ...row.getCenterVisibleCells(), ...row.getRightVisibleCells()];

  return (
    <div className="tblSection">
      <div className="tblTop">
        <div className="tblLeft">
          <h3 className="tblTitle">지점별 실적</h3>
          <span className="tblUnit">(단위: 건)</span>
        </div>
        <div className="tblRight">
          <p className="tblGuide">컬럼 경계를 드래그하여 너비를 조절할 수 있습니다.</p>
          <div className="btnGroup sm">
            <button type="button" className="btn outline" onClick={() => table.toggleAllRowsExpanded(true)}>모두 펼치기</button>
            <button type="button" className="btn outline" onClick={() => table.toggleAllRowsExpanded(false)}>모두 접기</button>
            <button type="button" className="btn outline" onClick={() => table.resetColumnSizing()}>너비 초기화</button>
          </div>
        </div>
      </div>

      <div className="dataGridWrap h300">
        <table className="tbl dataGrid isBordered isResizable" style={{ width: table.getTotalSize() }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cx(header.column.columnDef.meta?.className, pinClass(header.column))}
                    style={pinStyle(header.column, header.getSize())}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanResize() && (
                      <div
                        className={cx('resizer', { isResizing: header.column.getIsResizing() })}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onDoubleClick={() => header.column.resetSize()}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={cx({ isSubRow: row.depth > 0 })}>
                {cellsOf(row).map((cell) => (
                  <td
                    key={cell.id}
                    className={cx(cell.column.columnDef.meta?.className, pinClass(cell.column))}
                    style={pinStyle(cell.column)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {table.getFooterGroups().map((fg) => (
              <tr key={fg.id}>
                {fg.headers.map((header) => (
                  <td
                    key={header.id}
                    className={cx(header.column.columnDef.meta?.className, pinClass(header.column))}
                    style={pinStyle(header.column)}
                  >
                    {flexRender(header.column.columnDef.footer, header.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        </table>
      </div>

      <StateView>
        expanded: {JSON.stringify(expanded)}{'\n'}columnSizing: {JSON.stringify(columnSizing)}
      </StateView>
    </div>
  );
}

/* ==========================================================================
   3. 상태 : 로딩 / 빈 데이터
   ========================================================================== */
function StateGrid() {
  const all = useMemo(() => makeMissions(5), []);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const rows = empty ? [] : all;

  const search = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="tblSection">
      <div className="tblTop">
        <div className="tblLeft">
          <h3 className="tblTitle">로딩 / 빈 데이터</h3>
        </div>
        <div className="tblRight">
          <div className="btnGroup sm">
            <button type="button" className="btn dark" onClick={search} disabled={loading}>조회 (1.5초 로딩)</button>
            <button type="button" className="btn outline" onClick={() => setEmpty((v) => !v)}>{empty ? '데이터 채우기' : '데이터 비우기'}</button>
          </div>
        </div>
      </div>
      <div className={cx('dataGridWrap', { isLoading: loading })}>
        <table className="tbl dataGrid isCompact isStriped">
          <thead>
            <tr><th>No.</th><th>미션명</th><th>상태</th><th>등록일자</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="gridEmpty" colSpan={4}>조회된 데이터가 없습니다.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}><td>{r.id}</td><td>{r.title}</td><td>{r.status.label}</td><td>{r.date}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function GridDemo() {
  return (
    <>
      <h3 className="libDemoTitle">1. 정렬 + 행 선택 + 페이지네이션</h3>
      <p className="libHint">헤더(미션명/참여자 수/등록일자)를 클릭하면 정렬, 체크박스로 행 선택, 하단에서 페이지 이동·건수 변경.</p>
      <BasicGrid />
      <h3 className="libDemoTitle">2. 컬럼 고정 + 리사이즈 + 행 펼침 + 합계</h3>
      <p className="libHint">가로·세로 스크롤 시 지점명/합계 컬럼과 헤더·합계 행이 고정됩니다. 헤더 경계 드래그로 너비 조절(더블클릭 시 초기화).</p>
      <AdvancedGrid />
      <h3 className="libDemoTitle">3. 로딩 / 빈 데이터</h3>
      <StateGrid />
    </>
  );
}
