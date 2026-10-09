import React, { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { ko } from 'react-day-picker/locale';
import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  isSameDay
} from 'date-fns';
import { cx, StateView } from './shared.jsx';

const fmt = (d) => (d ? format(d, 'yyyy.MM.dd') : '');
const today = () => new Date(new Date().setHours(0, 0, 0, 0));

// 가이드 권장 공통 옵션 (src/components/calendar.html)
const COMMON = {
  locale: ko,
  weekStartsOn: 0,
  navLayout: 'around',
  formatters: { formatCaption: (d) => format(d, 'yyyy년 M월') }
};

/** 레이어 바깥 클릭 시 닫기 */
function useOutsideClose(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, open, onClose]);
}

/* ==========================================================================
   1. 단일 날짜 선택 (입력창 + 레이어)
   ========================================================================== */
function SinglePicker() {
  const ref = useRef(null);
  const [value, setValue] = useState(today());
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(value);
  const [open, setOpen] = useState(false);

  const openLayer = () => {
    setDraft(value);
    setMonth(value);
    setOpen(true);
  };
  const close = () => setOpen(false);
  useOutsideClose(ref, open, close);

  return (
    <div>
      <div ref={ref} className={cx('formDatepicker', { isOpen: open })}>
        <input type="text" className="formControl" value={fmt(value)} readOnly aria-label="날짜 선택" onClick={() => (open ? close() : openLayer())} />
        <button type="button" className="btnCalendar" aria-label={open ? '달력 닫기' : '달력 열기'} aria-expanded={open} onClick={() => (open ? close() : openLayer())} />

        {open && (
          <div className="datePickerLayer" role="dialog" aria-label="날짜 선택">
            <div className="datePickerBody">
              <div className="datePickerMain">
                <DayPicker
                  {...COMMON}
                  mode="single"
                  showOutsideDays
                  required
                  selected={draft}
                  onSelect={setDraft}
                  month={month}
                  onMonthChange={setMonth}
                  disabled={{ after: today() }}
                />
              </div>
              <div className="datePickerFooter">
                <button type="button" className="btn ghost sm" onClick={() => { setDraft(today()); setMonth(today()); }}>오늘</button>
                <div className="btnGroup sm">
                  <button type="button" className="btn outline" onClick={close}>취소</button>
                  <button type="button" className="btn dark" onClick={() => { setValue(draft); close(); }}>적용</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <StateView>value: {fmt(value)}{'\n'}오늘 이후 날짜는 선택 불가 (disabled)</StateView>
    </div>
  );
}

/* ==========================================================================
   2. 기간 선택 (빠른 선택 + 2개월)
   ========================================================================== */
function getPresets() {
  const t = today();
  const lastMonth = subMonths(t, 1);
  return [
    { label: '오늘', range: { from: t, to: t } },
    { label: '최근 7일', range: { from: subDays(t, 6), to: t } },
    { label: '최근 1개월', range: { from: subMonths(t, 1), to: t } },
    { label: '최근 3개월', range: { from: subMonths(t, 3), to: t } },
    { label: '이번 달', range: { from: startOfMonth(t), to: t } },
    { label: '지난 달', range: { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) } }
  ];
}

const sameRange = (a, b) => a?.from && a?.to && b?.from && b?.to && isSameDay(a.from, b.from) && isSameDay(a.to, b.to);

function RangePicker() {
  const ref = useRef(null);
  const presets = getPresets();
  const [value, setValue] = useState(presets[2].range);
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(subMonths(today(), 1));
  const [open, setOpen] = useState(false);

  const openLayer = () => {
    setDraft(value);
    setMonth(startOfMonth(value.to ? subMonths(value.to, 1) : today()));
    setOpen(true);
  };
  const close = () => setOpen(false);
  useOutsideClose(ref, open, close);

  // 시작일만 고른 상태면 종료일 입력창에 포커스 표시
  const editingEnd = open && draft?.from && !draft?.to;
  const complete = draft?.from && draft?.to;

  return (
    <div>
      <div ref={ref} className={cx('formDateRange', { isOpen: open })}>
        <div className={cx('formDatepicker', { isActive: open && !editingEnd })}>
          <input type="text" className="formControl" value={fmt(value.from)} readOnly aria-label="시작일" onClick={openLayer} />
          <button type="button" className="btnCalendar" aria-label="달력 열기" onClick={openLayer} />
        </div>
        <span className="dateSeparator">~</span>
        <div className={cx('formDatepicker', { isActive: editingEnd })}>
          <input type="text" className="formControl" value={fmt(value.to)} readOnly aria-label="종료일" onClick={openLayer} />
          <button type="button" className="btnCalendar" aria-label="달력 열기" onClick={openLayer} />
        </div>

        {open && (
          <div className="datePickerLayer" role="dialog" aria-label="기간 선택">
            <div className="datePickerPreset">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={cx('presetBtn', { isActive: sameRange(draft, p.range) })}
                  onClick={() => { setDraft(p.range); setMonth(startOfMonth(subMonths(p.range.to, 1))); }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="datePickerBody">
              <div className="datePickerMain">
                <DayPicker
                  {...COMMON}
                  mode="range"
                  numberOfMonths={2}
                  selected={draft}
                  onSelect={setDraft}
                  month={month}
                  onMonthChange={setMonth}
                  disabled={{ after: today() }}
                />
              </div>
              <div className="datePickerFooter">
                <p className="datePickerValue">
                  {complete ? (
                    <><strong>{fmt(draft.from)} ~ {fmt(draft.to)}</strong> ({differenceInCalendarDays(draft.to, draft.from) + 1}일)</>
                  ) : draft?.from ? (
                    <><strong>{fmt(draft.from)} ~</strong> 종료일을 선택하세요</>
                  ) : '시작일을 선택하세요'}
                </p>
                <div className="btnGroup sm">
                  <button type="button" className="btn outline" onClick={close}>취소</button>
                  <button type="button" className="btn dark" disabled={!complete} onClick={() => { setValue(draft); close(); }}>적용</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <StateView>value: {fmt(value.from)} ~ {fmt(value.to)}</StateView>
    </div>
  );
}

/* ==========================================================================
   3. 인라인 캘린더 (연/월 드롭다운 + 다중 선택)
   ========================================================================== */
function InlineCalendar() {
  const [days, setDays] = useState([]);
  return (
    <div>
      <div className="calendarBox">
        <DayPicker
          {...COMMON}
          mode="multiple"
          showOutsideDays
          captionLayout="dropdown"
          startMonth={new Date(2025, 0)}
          endMonth={new Date(2027, 11)}
          formatters={{ formatMonthDropdown: (d) => format(d, 'M월'), formatYearDropdown: (d) => format(d, 'yyyy년') }}
          selected={days}
          onSelect={(v) => setDays(v || [])}
        />
      </div>
      <StateView>selected: {days.length ? days.map(fmt).join(', ') : '(없음)'}</StateView>
    </div>
  );
}

export default function CalendarDemo() {
  return (
    <>
      <p className="libHint">입력창 또는 달력 아이콘을 클릭하면 레이어가 열립니다. 바깥을 클릭하거나 취소하면 닫힙니다.</p>
      <div className="libRow libCalendarSlot">
        <div>
          <h3 className="libDemoTitle">1. 단일 날짜</h3>
          <SinglePicker />
        </div>
        <div>
          <h3 className="libDemoTitle">2. 기간 (빠른 선택 + 2개월)</h3>
          <RangePicker />
        </div>
      </div>
      <h3 className="libDemoTitle">3. 인라인 캘린더 (연/월 드롭다운, 다중 선택)</h3>
      <InlineCalendar />
    </>
  );
}
