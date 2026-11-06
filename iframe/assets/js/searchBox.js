/**
 * ==========================================================================
 * [Standalone] 조회 컨트롤 박스 (searchBox.js)
 * iframe 단독 사용용 스크립트
 *  - 기간 숏컷 세그먼트 선택 상태 토글
 *  - 초기화: 폼 기본값 복원 + 세그먼트 첫 항목 선택
 *  - 조회: 검색 조건을 부모 창으로 postMessage 전달
 *  - 높이 변경 시 부모 창으로 높이 전달 (iframe 자동 높이 맞춤용, 열린 캘린더 레이어 포함)
 *  ※ 캘린더 동작은 datePicker.js (searchBox.js 보다 먼저 로드)
 *
 * 부모 창 수신 예시:
 *   window.addEventListener('message', function (e) {
 *     if (!e.data) return;
 *     if (e.data.type === 'searchBox:resize') iframe.style.height = e.data.height + 'px';
 *     if (e.data.type === 'searchBox:search') console.log(e.data.filters);
 *     if (e.data.type === 'searchBox:reset')  console.log('reset');
 *   });
 * ==========================================================================
 */
(function () {
  'use strict';

  // [D] 운영 시 부모 창 origin 으로 지정 권장 (예: 'https://admin.example.com')
  var TARGET_ORIGIN = '*';

  var form = document.getElementById('searchBox');
  if (!form) return;

  function postToParent(type, payload) {
    if (window.parent === window) return; // iframe 이 아닐 때는 전달하지 않음
    var message = { type: type };
    for (var key in payload) message[key] = payload[key];
    window.parent.postMessage(message, TARGET_ORIGIN);
  }

  // 세그먼트 선택 상태 토글
  function setSegmentActive(btn) {
    var segment = btn.closest('.segment');
    segment.querySelectorAll('.segmentItem').forEach(function (item) {
      item.classList.remove('isActive');
    });
    btn.classList.add('isActive');
  }

  form.addEventListener('click', function (e) {
    var btn = e.target.closest('.segment .segmentItem:not(label)');
    if (btn) setSegmentActive(btn);
  });

  // 검색 조건 수집 (name 속성 기준 + 선택된 기간 숏컷)
  function getFilters() {
    var filters = {};
    new FormData(form).forEach(function (value, key) {
      filters[key] = value;
    });
    var activePeriod = form.querySelector('.segment .segmentItem.isActive');
    filters.period = activePeriod ? activePeriod.getAttribute('data-period') : '';
    return filters;
  }

  // 조회
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    postToParent('searchBox:search', { filters: getFilters() });
  });

  // 초기화 (type="reset" 기본 동작으로 입력값 복원 후 세그먼트 처리)
  form.addEventListener('reset', function () {
    setTimeout(function () {
      form.querySelectorAll('.segment').forEach(function (segment) {
        var first = segment.querySelector('.segmentItem');
        if (first) setSegmentActive(first);
      });
      postToParent('searchBox:reset', {});
    }, 0);
  });

  // iframe 높이 자동 맞춤
  // 열린 캘린더 레이어(absolute)는 문서 높이에 포함되지 않으므로 레이어 하단까지 따로 계산
  var LAYER_GAP = 8; // 레이어 그림자 여유
  var lastHeight = 0;

  function sendHeight() {
    var height = document.documentElement.getBoundingClientRect().height;
    var layer = document.querySelector('.isOpen > .datePickerLayer');
    if (layer) {
      height = Math.max(height, layer.getBoundingClientRect().bottom + window.scrollY + LAYER_GAP);
    }
    height = Math.ceil(height);
    if (height === lastHeight) return;
    lastHeight = height;
    postToParent('searchBox:resize', { height: height });
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(sendHeight).observe(document.body);
  } else {
    window.addEventListener('resize', sendHeight);
  }
  window.addEventListener('load', sendHeight);
  document.addEventListener('datepicker:render', sendHeight); // 캘린더 열기 / 월 이동 / 닫기
})();
