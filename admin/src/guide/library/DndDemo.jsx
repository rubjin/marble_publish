import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cx, StateView } from './shared.jsx';

/** 공통 센서 (마우스 5px 이동 후 드래그 시작 - 클릭과 구분 / 키보드: Space 로 잡고 방향키 이동) */
function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}

/** 드래그 중 body.isDndActive (전역 커서 / 텍스트 선택 방지) */
const dndActive = (on) => document.body.classList.toggle('isDndActive', on);

/* ==========================================================================
   1. 정렬 리스트 (핸들 드래그 + DragOverlay)
   ========================================================================== */
const BANNERS = [
  { id: 'b1', title: '메인 배너 - 가을 적금 이벤트', desc: '2026.09.01 ~ 2026.10.31', status: { key: 'ing', label: '노출중' } },
  { id: 'b2', title: '미션 배너 - 만보 걷기', desc: '2026.09.10 ~ 2026.09.30', status: { key: 'ing', label: '노출중' } },
  { id: 'b3', title: '공지 배너 - 시스템 점검 안내', desc: '2026.09.20 ~ 2026.09.21', status: { key: 'ready', label: '대기' } },
  { id: 'b4', title: '이벤트 배너 - 친구 초대', desc: '2026.10.01 ~ 2026.10.31', status: { key: 'ready', label: '대기' } },
  { id: 'b5', title: '고정 배너 - 순서 변경 불가', desc: '상시 노출', status: { key: 'end', label: '고정' }, disabled: true }
];

function BannerContent({ item, order, handleProps }) {
  return (
    <>
      <button type="button" className="dndHandle" aria-label="순서 변경" disabled={item.disabled} {...handleProps} />
      <span className="dndOrder">{order}</span>
      <div className="dndContent">
        <strong className="dndTitle">{item.title}</strong>
        <span className="dndDesc">{item.desc}</span>
      </div>
      <div className="dndActions">
        <span className={cx('statusDot', item.status.key)}>{item.status.label}</span>
        <button type="button" className="btn outline sm">수정</button>
      </div>
    </>
  );
}

function SortableBanner({ item, order }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: item.id, disabled: item.disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx('dndItem', { isDragging, isDisabled: item.disabled })}
    >
      <BannerContent item={item} order={order} handleProps={{ ref: setActivatorNodeRef, ...attributes, ...listeners }} />
    </li>
  );
}

function SortableListDemo() {
  const sensors = useDndSensors();
  const [items, setItems] = useState(BANNERS);
  const [activeId, setActiveId] = useState(null);
  const activeIndex = items.findIndex((i) => i.id === activeId);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => { setActiveId(active.id); dndActive(true); }}
        onDragCancel={() => { setActiveId(null); dndActive(false); }}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          dndActive(false);
          if (!over || active.id === over.id) return;
          const to = items.findIndex((i) => i.id === over.id);
          if (items[to].disabled) return; // 고정 아이템 자리로는 이동 불가
          setItems((list) => arrayMove(list, list.findIndex((i) => i.id === active.id), to));
        }}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ul className="dndList">
            {items.map((item, i) => <SortableBanner key={item.id} item={item} order={i + 1} />)}
          </ul>
        </SortableContext>
        <DragOverlay>
          {activeIndex >= 0 && (
            <div className="dndItem isOverlay">
              <BannerContent item={items[activeIndex]} order={activeIndex + 1} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <StateView>order: {items.map((i) => i.id).join(' → ')}</StateView>
    </>
  );
}

/* ==========================================================================
   2. 가로 정렬 (칩 - 아이템 전체가 핸들)
   ========================================================================== */
function SortableChip({ chip }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: chip });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx('dndItem isHandle', { isDragging })}
      {...attributes}
      {...listeners}
    >
      <span className="dndHandle" aria-hidden="true"></span>
      <span className="dndTitle">{chip}</span>
    </li>
  );
}

function ChipDemo() {
  const sensors = useDndSensors();
  const [chips, setChips] = useState(['건강', '금융', '생활', '학습', '여행', '쇼핑']);
  const [activeId, setActiveId] = useState(null);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => { setActiveId(active.id); dndActive(true); }}
        onDragCancel={() => { setActiveId(null); dndActive(false); }}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          dndActive(false);
          if (over && active.id !== over.id) setChips((list) => arrayMove(list, list.indexOf(active.id), list.indexOf(over.id)));
        }}
      >
        <SortableContext items={chips} strategy={horizontalListSortingStrategy}>
          <ul className="dndList horizontal">
            {chips.map((c) => <SortableChip key={c} chip={c} />)}
          </ul>
        </SortableContext>
        <DragOverlay>
          {activeId && (
            <div className="dndList horizontal">
              <div className="dndItem isHandle isOverlay"><span className="dndHandle" aria-hidden="true"></span><span className="dndTitle">{activeId}</span></div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <StateView>order: {chips.join(' → ')}</StateView>
    </>
  );
}

/* ==========================================================================
   3. 테이블 행 순서 변경 (행 자체가 이동 - 이동 중인 행 .isOverlay)
   ========================================================================== */
function SortableRow({ row, order }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: row.id });
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, position: 'relative', zIndex: isDragging ? 1 : undefined }}
      className={cx({ isOverlay: isDragging })}
    >
      <td className="colDrag">
        <button type="button" className="dndHandle" aria-label="순서 변경" ref={setActivatorNodeRef} {...attributes} {...listeners} />
      </td>
      <td>{order}</td>
      <td className="textLeft">{row.name}</td>
      <td>{row.visible ? '노출' : '미노출'}</td>
    </tr>
  );
}

function TableRowDemo() {
  const sensors = useDndSensors();
  const [rows, setRows] = useState([
    { id: 'c1', name: '건강 챌린지', visible: true },
    { id: 'c2', name: '금융 챌린지', visible: true },
    { id: 'c3', name: '생활 챌린지', visible: false },
    { id: 'c4', name: '학습 챌린지', visible: true }
  ]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => dndActive(true)}
      onDragCancel={() => dndActive(false)}
      onDragEnd={({ active, over }) => {
        dndActive(false);
        if (over && active.id !== over.id) {
          setRows((list) => arrayMove(list, list.findIndex((r) => r.id === active.id), list.findIndex((r) => r.id === over.id)));
        }
      }}
    >
      <div className="tblWrap">
        <table className="tbl">
          <colgroup>
            <col className="colDrag" />
            <col style={{ width: 80 }} />
            <col />
            <col style={{ width: 140 }} />
          </colgroup>
          <thead>
            <tr>
              <th className="colDrag"><span className="srOnly">순서 변경</span></th>
              <th>순서</th>
              <th>카테고리명</th>
              <th>노출 여부</th>
            </tr>
          </thead>
          <tbody>
            <SortableContext items={rows} strategy={verticalListSortingStrategy}>
              {rows.map((r, i) => <SortableRow key={r.id} row={r} order={i + 1} />)}
            </SortableContext>
          </tbody>
        </table>
      </div>
    </DndContext>
  );
}

/* ==========================================================================
   4. 보드 (영역 간 이동)
   ========================================================================== */
const COLUMNS = [
  { id: 'wait', title: '대기' },
  { id: 'review', title: '검수중' },
  { id: 'done', title: '완료' }
];

function BoardCard({ card }) {
  return (
    <div className="dndContent">
      <strong className="dndTitle">{card.title}</strong>
      <span className="dndDesc">담당: {card.owner}</span>
    </div>
  );
}

function SortableCard({ card }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: card.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx('dndItem isHandle', { isDragging })}
      {...attributes}
      {...listeners}
    >
      <BoardCard card={card} />
    </li>
  );
}

function BoardColumn({ column, cards, isOver }) {
  const { setNodeRef } = useDroppable({ id: column.id });
  return (
    <section ref={setNodeRef} className={cx('dndColumn', { isOver })}>
      <div className="dndColumnHeader">
        <h4 className="dndColumnTitle">{column.title}</h4>
        <span className="dndCount">{cards.length}</span>
      </div>
      <SortableContext items={cards} strategy={verticalListSortingStrategy}>
        {cards.length === 0 ? (
          <div className="dndDropzone">여기로 끌어다 놓으세요</div>
        ) : (
          <ul className="dndList">
            {cards.map((c) => <SortableCard key={c.id} card={c} />)}
          </ul>
        )}
      </SortableContext>
    </section>
  );
}

function BoardDemo() {
  const sensors = useDndSensors();
  const [board, setBoard] = useState({
    wait: [
      { id: 'k1', title: '추석 맞이 이벤트', owner: '운영팀' },
      { id: 'k2', title: '신규 가입 웰컴 미션', owner: '기획팀' }
    ],
    review: [{ id: 'k3', title: '연말 적금 챌린지', owner: '상품팀' }],
    done: []
  });
  const [activeId, setActiveId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const findColumn = (id) => (board[id] ? id : Object.keys(board).find((col) => board[col].some((c) => c.id === id)));
  const activeCard = activeId ? board[findColumn(activeId)].find((c) => c.id === activeId) : null;
  const sourceColumn = activeId ? findColumn(activeId) : null;

  // 다른 컬럼 위로 올라가면 즉시 해당 컬럼으로 옮김 (자리 미리보기)
  const handleDragOver = ({ active, over }) => {
    const to = over ? findColumn(over.id) : null;
    setOverColumn(to);
    const from = findColumn(active.id);
    if (!to || !from || from === to) return;
    setBoard((prev) => {
      const card = prev[from].find((c) => c.id === active.id);
      const overIndex = prev[to].findIndex((c) => c.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : prev[to].length;
      const next = [...prev[to]];
      next.splice(insertAt, 0, card);
      return { ...prev, [from]: prev[from].filter((c) => c.id !== active.id), [to]: next };
    });
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    setOverColumn(null);
    dndActive(false);
    if (!over) return;
    const col = findColumn(active.id);
    if (col !== findColumn(over.id)) return;
    const list = board[col];
    const from = list.findIndex((c) => c.id === active.id);
    const to = list.findIndex((c) => c.id === over.id);
    if (to >= 0 && from !== to) setBoard((prev) => ({ ...prev, [col]: arrayMove(prev[col], from, to) }));
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => { setActiveId(active.id); dndActive(true); }}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setActiveId(null); setOverColumn(null); dndActive(false); }}
      >
        <div className="dndBoard">
          {COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              cards={board[col.id]}
              // 원래 있던 컬럼이 아닌 곳 위에 있을 때만 드롭 영역 강조
              isOver={!!activeId && overColumn === col.id && overColumn !== sourceColumn}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard && <div className="dndItem isHandle isOverlay"><BoardCard card={activeCard} /></div>}
        </DragOverlay>
      </DndContext>
      <StateView>{COLUMNS.map((c) => `${c.title}: ${board[c.id].map((k) => k.title).join(', ') || '-'}`).join('\n')}</StateView>
    </>
  );
}

/* ==========================================================================
   5. 드롭 영역 (자유 드래그 → 영역에 놓기)
   ========================================================================== */
function DraggableTag({ tag }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: tag });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), position: 'relative', zIndex: isDragging ? 10 : undefined }}
      className={cx('dndItem isHandle', { isOverlay: isDragging })}
      {...attributes}
      {...listeners}
    >
      <span className="dndHandle" aria-hidden="true"></span>
      <span className="dndTitle">{tag}</span>
    </li>
  );
}

function DropTarget({ dropped }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'dropzone' });
  return (
    <div ref={setNodeRef} className={cx('dndDropzone', { isOver })} style={{ flex: 1 }}>
      {dropped.length ? `추가됨: ${dropped.join(', ')}` : isOver ? '놓으면 추가됩니다' : '항목을 끌어다 놓으세요'}
    </div>
  );
}

function DropzoneDemo() {
  const sensors = useDndSensors();
  const [tags, setTags] = useState(['VIP 고객', '신규 고객', '휴면 고객', '마케팅 동의']);
  const [dropped, setDropped] = useState([]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={() => dndActive(true)}
      onDragCancel={() => dndActive(false)}
      onDragEnd={({ active, over }) => {
        dndActive(false);
        if (over?.id === 'dropzone') {
          setTags((list) => list.filter((t) => t !== active.id));
          setDropped((list) => [...list, active.id]);
        }
      }}
    >
      <div className="flex" style={{ gap: 12, alignItems: 'stretch' }}>
        <ul className="dndList horizontal" style={{ flex: 1, alignContent: 'flex-start' }}>
          {tags.map((t) => <DraggableTag key={t} tag={t} />)}
        </ul>
        <DropTarget dropped={dropped} />
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="button" className="btn ghost sm" onClick={() => { setTags((l) => [...l, ...dropped]); setDropped([]); }}>초기화</button>
      </div>
    </DndContext>
  );
}

export default function DndDemo() {
  return (
    <>
      <p className="libHint">핸들(⠿)을 잡고 끌어서 순서를 바꿉니다. 키보드: 핸들에 포커스 후 Space로 잡고 방향키로 이동, Space로 놓기.</p>
      <h3 className="libDemoTitle">1. 정렬 리스트 (핸들 드래그 + 미리보기 Overlay, 마지막 항목은 고정)</h3>
      <SortableListDemo />
      <h3 className="libDemoTitle">2. 가로 정렬 (칩)</h3>
      <ChipDemo />
      <h3 className="libDemoTitle">3. 테이블 행 순서 변경</h3>
      <TableRowDemo />
      <h3 className="libDemoTitle">4. 보드 (영역 간 이동)</h3>
      <BoardDemo />
      <h3 className="libDemoTitle">5. 드롭 영역</h3>
      <DropzoneDemo />
    </>
  );
}
