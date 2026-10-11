import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
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
   보드 (영역 간 이동)
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

export default function DndDemo() {
  return (
    <>
      <p className="libHint">카드를 끌어서 다른 영역으로 옮기거나 같은 영역 안에서 순서를 바꿉니다. 키보드: 카드에 포커스 후 Space로 잡고 방향키로 이동, Space로 놓기.</p>
      <h3 className="libDemoTitle">보드 (영역 간 이동)</h3>
      <BoardDemo />
    </>
  );
}
