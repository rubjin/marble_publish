/**
 * 라이브러리 동작 확인 페이지
 * - 실제 라이브러리(React)로 퍼블리싱 스킨(SCSS)이 의도대로 동작하는지 확인합니다.
 * - 마크업/클래스는 src/components/*.html 가이드와 동일한 구조를 사용합니다.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import GridDemo from './GridDemo.jsx';
import CalendarDemo from './CalendarDemo.jsx';
import ChartDemo from './ChartDemo.jsx';
import DndDemo from './DndDemo.jsx';

const SECTIONS = [
  { id: 'libGrid', title: 'Data Grid', lib: '@tanstack/react-table v8', Demo: GridDemo },
  { id: 'libCalendar', title: 'Calendar', lib: 'react-day-picker v9', Demo: CalendarDemo },
  { id: 'libChart', title: 'Chart', lib: 'lightweight-charts v5', Demo: ChartDemo },
  { id: 'libDnd', title: 'Drag & Drop', lib: '@dnd-kit', Demo: DndDemo }
];

function App() {
  return (
    <div className="libPage">
      <div className="libHeader">
        <div>
          <h1>라이브러리 동작 확인</h1>
          <p>실제 React 라이브러리에 퍼블리싱 스타일을 적용한 화면입니다. 클릭·드래그·스크롤로 동작을 확인하세요.</p>
        </div>
        <a href="./guide.html" className="btn outline">UI 가이드로 이동</a>
      </div>

      <nav className="libNav">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="btn light sm">{s.title}</a>
        ))}
      </nav>

      {SECTIONS.map(({ id, title, lib, Demo }) => (
        <section key={id} id={id} className="libSection">
          <h2 className="libSectionTitle">{title} <small>{lib}</small></h2>
          <div className="sectionBox">
            <Demo />
          </div>
        </section>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
