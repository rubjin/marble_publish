import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, LineSeries, AreaSeries, HistogramSeries } from 'lightweight-charts';
import { getChartOptions, getSeriesOptions, formatNumber } from '../../assets/js/chartTheme.js';
import { cx, seeded } from './shared.jsx';

/* ==========================================================================
   데모 데이터
   ========================================================================== */
function makeDaily(n) {
  const rand = seeded(7);
  const end = new Date();
  const join = [], done = [], quit = [];
  let base = 900;
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const time = d.toISOString().slice(0, 10);
    base += (rand() - 0.4) * 80;
    join.push({ time, value: Math.round(base) });
    done.push({ time, value: Math.round(base * (0.55 + rand() * 0.1)) });
    quit.push({ time, value: Math.round(base * (0.08 + rand() * 0.05)) });
  }
  return [join, done, quit];
}

const SERIES_NAMES = ['참여', '완료', '포기'];
const PERIODS = [7, 30, 90];

/* ==========================================================================
   라인 차트 : 기간 전환 + 범례 토글 + 툴팁
   ========================================================================== */
function LineChartBox() {
  const areaRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef([]);
  const [period, setPeriod] = useState(30);
  const [off, setOff] = useState([false, false, true]);
  const [tooltip, setTooltip] = useState(null);

  // 차트 생성 (1회)
  useEffect(() => {
    const chart = createChart(areaRef.current, getChartOptions());
    seriesRef.current = SERIES_NAMES.map((_, i) => chart.addSeries(LineSeries, getSeriesOptions('line', i)));
    chartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      const el = areaRef.current;
      if (!el || !param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        setTooltip(null);
        return;
      }
      const rows = seriesRef.current
        .map((s, i) => ({ i, d: param.seriesData.get(s), visible: s.options().visible }))
        .filter((r) => r.d && r.visible);
      setTooltip({ time: String(param.time).replace(/-/g, '.'), rows, x: param.point.x, y: param.point.y, w: el.clientWidth, h: el.clientHeight });
    });

    return () => chart.remove();
  }, []);

  // 기간 변경 시 데이터 교체
  useEffect(() => {
    const data = makeDaily(period);
    seriesRef.current.forEach((s, i) => s.setData(data[i]));
    chartRef.current.timeScale().fitContent();
  }, [period]);

  // 범례 토글
  useEffect(() => {
    seriesRef.current.forEach((s, i) => s.applyOptions({ visible: !off[i] }));
  }, [off]);

  // 툴팁 위치: 커서 오른쪽, 넘치면 왼쪽
  const tipRef = useRef(null);
  let tipStyle;
  if (tooltip && tipRef.current) {
    const tw = tipRef.current.offsetWidth, th = tipRef.current.offsetHeight;
    let x = tooltip.x + 16;
    if (x + tw > tooltip.w) x = tooltip.x - tw - 16;
    tipStyle = { left: x, top: Math.max(0, Math.min(tooltip.y - th / 2, tooltip.h - th)) };
  }

  return (
    <div className="chartBox span2">
      <div className="chartHeader">
        <div className="chartTitleWrap">
          <h3 className="chartTitle">일별 미션 참여 추이</h3>
          <p className="chartDesc">최근 {period}일 기준 (가상 데이터)</p>
        </div>
        <div className="chartActions">
          <div className="btnGroup sm">
            {PERIODS.map((p) => (
              <button key={p} type="button" className={cx('btn light', { isActive: period === p })} onClick={() => setPeriod(p)}>{p}일</button>
            ))}
          </div>
        </div>
      </div>

      <ul className="chartLegend">
        {SERIES_NAMES.map((name, i) => (
          <li key={name}>
            <button
              type="button"
              className={cx('legendItem', `series${i + 1}`, { isOff: off[i] })}
              onClick={() => setOff((prev) => prev.map((v, j) => (j === i ? !v : v)))}
            >
              <span className="legendMarker line"></span>{name}
            </button>
          </li>
        ))}
      </ul>

      <div className="chartArea h360" ref={areaRef}>
        <div ref={tipRef} className={cx('chartTooltip', { isOpen: !!tooltip })} style={tipStyle}>
          {tooltip && (
            <>
              <span className="tooltipDate">{tooltip.time}</span>
              <ul className="tooltipList">
                {tooltip.rows.map(({ i, d }) => (
                  <li key={i} className={cx('tooltipItem', `series${i + 1}`)}>
                    <span className="legendMarker"></span>{SERIES_NAMES[i]}<span className="tooltipValue">{formatNumber(d.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   영역 / 막대 차트 (로딩·빈 데이터 토글)
   ========================================================================== */
function SimpleChartBox({ title, value, unit, rate, type, makeData, bottomLegend }) {
  const areaRef = useRef(null);
  const [state, setState] = useState('data'); // data | loading | empty
  const data = useMemo(makeData, [makeData]);

  useEffect(() => {
    if (state !== 'data') return undefined;
    const isArea = type === 'area';
    const chart = createChart(areaRef.current, getChartOptions(isArea ? { rightPriceScale: { visible: false }, crosshair: { horzLine: { visible: false } } } : undefined));
    chart.addSeries(isArea ? AreaSeries : HistogramSeries, getSeriesOptions(isArea ? 'area' : 'histogram', 0)).setData(data);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [state, type, data]);

  const reload = () => {
    setState('loading');
    setTimeout(() => setState('data'), 1200);
  };

  return (
    <div className="chartBox">
      <div className="chartHeader">
        <div className="chartTitleWrap">
          <h3 className="chartTitle">{title}</h3>
          <p className="chartValue">
            {value}<span className="unit">{unit}</span>
            <span className={cx('rate', rate.up ? 'isUp' : 'isDown')}>{rate.up ? '▲' : '▼'} {rate.value}</span>
          </p>
        </div>
        <div className="chartActions">
          <div className="btnGroup sm">
            <button type="button" className="btn light" onClick={reload}>로딩</button>
            <button type="button" className={cx('btn light', { isActive: state === 'empty' })} onClick={() => setState((s) => (s === 'empty' ? 'data' : 'empty'))}>빈 데이터</button>
          </div>
        </div>
      </div>
      <div className={cx('chartArea h200', { isLoading: state === 'loading', isEmpty: state === 'empty' })} ref={state === 'data' ? areaRef : undefined}>
        {state === 'empty' && <p className="chartEmpty">조회 기간에 해당하는 데이터가 없습니다.</p>}
      </div>
      {bottomLegend && (
        <ul className="chartLegend isBottom">
          <li className="legendItem series1"><span className="legendMarker"></span>{bottomLegend}</li>
        </ul>
      )}
    </div>
  );
}

const makeArea = () => {
  const rand = seeded(3);
  let acc = 42000;
  return makeDaily(30)[0].map((d) => {
    acc += Math.round(rand() * 400);
    return { time: d.time, value: acc };
  });
};

const makeBar = () => {
  const rand = seeded(9);
  return ['2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01'].map((time) => ({ time, value: Math.round(2600 + rand() * 900) }));
};

export default function ChartDemo() {
  return (
    <>
      <p className="libHint">기간 버튼으로 데이터 전환, 범례 클릭으로 시리즈 표시/숨김, 차트 위에 마우스를 올리면 툴팁이 따라다닙니다.</p>
      <div className="chartGrid">
        <LineChartBox />
        <SimpleChartBox title="누적 가입자" value="48,210" unit="명" rate={{ up: true, value: '12.4%' }} type="area" makeData={makeArea} />
        <SimpleChartBox title="월별 리워드 지급" value="3,120" unit="만원" rate={{ up: false, value: '4.1%' }} type="bar" makeData={makeBar} bottomLegend="지급액" />
      </div>
    </>
  );
}
