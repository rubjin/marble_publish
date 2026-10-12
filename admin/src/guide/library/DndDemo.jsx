import React, { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors
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
   테이블 행 순서 변경 (행 자체가 이동 - 이동 중인 행 .isOverlay)
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
    { id: 'c1', name: '리스트1', visible: true },
    { id: 'c2', name: '리스트2', visible: true },
    { id: 'c3', name: '리스트3', visible: false },
    { id: 'c4', name: '리스트4', visible: true }
  ]);

  return (
    <>
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
                <th>제목</th>
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
      <StateView>order: {rows.map((r) => r.name).join(' → ')}</StateView>
    </>
  );
}

export default function DndDemo() {
  return (
    <>
      <p className="libHint">핸들(⠿)을 잡고 끌어서 행 순서를 바꿉니다. 키보드: 핸들에 포커스 후 Space로 잡고 방향키로 이동, Space로 놓기.</p>
      <h3 className="libDemoTitle">테이블 행 순서 변경</h3>
      <TableRowDemo />
    </>
  );
}
