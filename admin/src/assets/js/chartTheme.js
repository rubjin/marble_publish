/**
 * ==========================================================================
 * [Chart Theme] lightweight-charts v5 공통 테마
 * - 색상/폰트의 기준은 SCSS(components/chart.scss)의 CSS 변수(--chart-*)입니다.
 *   이 파일은 해당 값을 읽어 lightweight-charts 옵션 객체로 변환만 합니다.
 * - React 사용 예:
 *
 *   import { createChart, LineSeries } from 'lightweight-charts';
 *   import { getChartOptions, getSeriesOptions } from '@/assets/js/chartTheme';
 *
 *   const chart = createChart(containerRef.current, getChartOptions());
 *   const series = chart.addSeries(LineSeries, getSeriesOptions('line', 0));
 *   series.setData(data);
 *   // unmount 시 chart.remove();
 * ==========================================================================
 */

// CSS 변수를 읽지 못할 경우(SSR, 스타일 미로드) 사용하는 기본값 - chart.scss 와 동일
var FALLBACK = {
  '--chart-bg': '#FFFFFF',
  '--chart-text': '#8D919B',
  '--chart-font-family': "'KBFG Text', sans-serif",
  '--chart-font-size': '12',
  '--chart-grid': '#F0F0F3',
  '--chart-border': '#E7E9ED',
  '--chart-crosshair': '#8D919B',
  '--chart-label-bg': '#2F3034',
  '--chart-series-1': '#287EFF',
  '--chart-series-2': '#FFC72B',
  '--chart-series-3': '#05CD99',
  '--chart-series-4': '#EE5D50',
  '--chart-series-5': '#4F535A',
  '--chart-series-6': '#639DFF',
  '--chart-up': '#EF4444',
  '--chart-down': '#287EFF'
};

var SERIES_COUNT = 6;

// lightweight-charts enum 값 (import 없이 사용하기 위해 숫자로 지정)
var LINE_STYLE_DASHED = 2;   // LineStyle.Dashed
var CROSSHAIR_NORMAL = 0;    // CrosshairMode.Normal

/** CSS 변수 값 읽기 */
export function readVar(name, el) {
  if (typeof window === 'undefined') return FALLBACK[name];
  var target = el || document.documentElement;
  var value = getComputedStyle(target).getPropertyValue(name).trim();
  return value || FALLBACK[name];
}

/** 시리즈 색상 (index: 0부터, 6개 팔레트 순환) - 범례 .series{index+1} 과 동일 */
export function getSeriesColor(index) {
  var i = ((index || 0) % SERIES_COUNT) + 1;
  return readVar('--chart-series-' + i);
}

/** HEX → rgba (영역 차트 그라데이션용) */
export function withAlpha(hex, alpha) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  var r = parseInt(h.substring(0, 2), 16);
  var g = parseInt(h.substring(2, 4), 16);
  var b = parseInt(h.substring(4, 6), 16);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

/** 숫자 천 단위 콤마 */
export function formatNumber(value) {
  return Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function merge(target, source) {
  if (!source) return target;
  Object.keys(source).forEach(function (key) {
    var v = source[key];
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v !== 'function') {
      target[key] = merge(target[key] || {}, v);
    } else {
      target[key] = v;
    }
  });
  return target;
}

/**
 * 차트 공통 옵션 (createChart 두 번째 인자)
 * @param {object} overrides 화면별 추가/덮어쓰기 옵션
 */
export function getChartOptions(overrides) {
  var crosshair = readVar('--chart-crosshair');
  var labelBg = readVar('--chart-label-bg');
  var border = readVar('--chart-border');

  var base = {
    // 컨테이너(.chartArea) 크기를 자동으로 따라감 - 컨테이너 높이 필수
    autoSize: true,
    layout: {
      background: { type: 'solid', color: readVar('--chart-bg') },
      textColor: readVar('--chart-text'),
      fontFamily: readVar('--chart-font-family'),
      fontSize: Number(readVar('--chart-font-size')),
      attributionLogo: false
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: readVar('--chart-grid') }
    },
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.12, bottom: 0.08 }
    },
    timeScale: {
      borderColor: border,
      fixLeftEdge: true,
      fixRightEdge: true,
      lockVisibleTimeRangeOnResize: true
    },
    crosshair: {
      mode: CROSSHAIR_NORMAL,
      vertLine: { color: crosshair, width: 1, style: LINE_STYLE_DASHED, labelBackgroundColor: labelBg },
      horzLine: { color: crosshair, width: 1, style: LINE_STYLE_DASHED, labelBackgroundColor: labelBg }
    },
    localization: {
      locale: 'ko-KR',
      dateFormat: 'yyyy.MM.dd',
      priceFormatter: formatNumber
    },
    // 대시보드 조회용: 드래그/휠 이동·확대 비활성 (필요 화면에서 overrides 로 true)
    handleScroll: false,
    handleScale: false
  };

  return merge(base, overrides);
}

/**
 * 시리즈 타입별 옵션 (chart.addSeries(Definition, 옵션))
 * @param {'line'|'area'|'histogram'|'candlestick'} type
 * @param {number} index 팔레트 순번 (0부터)
 * @param {object} overrides
 */
export function getSeriesOptions(type, index, overrides) {
  var color = getSeriesColor(index);
  var up = readVar('--chart-up');
  var down = readVar('--chart-down');
  var bg = readVar('--chart-bg');

  var common = {
    priceLineVisible: false,
    lastValueVisible: false
  };

  var marker = {
    crosshairMarkerRadius: 4,
    crosshairMarkerBorderColor: bg,
    crosshairMarkerBorderWidth: 2
  };

  var presets = {
    line: merge({ color: color, lineWidth: 2 }, marker),
    area: merge({
      lineColor: color,
      lineWidth: 2,
      topColor: withAlpha(color, 0.24),
      bottomColor: withAlpha(color, 0)
    }, marker),
    histogram: { color: color },
    candlestick: {
      upColor: up,
      downColor: down,
      wickUpColor: up,
      wickDownColor: down,
      borderVisible: false
    }
  };

  return merge(merge(common, presets[type] || presets.line), overrides);
}
