/**
 * ==========================================================================
 * [Standalone] 기간 선택 데이트피커 (datePicker.js)
 * React 없이 admin 캘린더(react-day-picker)와 같은 .rdp-* 마크업을 그림
 *
 * 마크업:
 *   <div class="formDateRange" data-datepicker="range" [data-max-date="today | yyyy.MM.dd"]>
 *     <div class="formDatepicker">
 *       <input type="text" class="formControl" value="2026.07.01" readonly />
 *       <button type="button" class="btnCalendar"></button>
 *     </div>
 *     <span class="dateSeparator">~</span>
 *     <div class="formDatepicker"> ... 종료일 ... </div>
 *   </div>
 *
 * 동작:
 *  - 입력창 / 달력 아이콘 클릭 → 레이어 열기 (빠른 선택 + 2개월 + 취소/적용)
 *  - 시작일 → 종료일 순서로 클릭 (시작일보다 앞 날짜를 고르면 앞뒤를 바꿔 기간 지정)
 *  - 적용: 입력창 값 변경 + change 이벤트 / 취소·바깥 클릭·ESC: 변경 없이 닫기
 *  - 레이어를 그리거나 닫을 때 document 에 'datepicker:render' 이벤트 발생 (iframe 높이 갱신용)
 * ==========================================================================
 */
(function () {
  'use strict';

  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var CHEVRON_LEFT = '<svg class="rdp-chevron" viewBox="0 0 24 24" aria-hidden="true"><polygon points="16 18.112 9.81111111 12 16 5.87733333 14.0888889 4 6 12 14.0888889 20"></polygon></svg>';
  var CHEVRON_RIGHT = '<svg class="rdp-chevron" viewBox="0 0 24 24" aria-hidden="true"><polygon points="8 18.112 14.18888889 12 8 5.87733333 9.91111111 4 18 12 9.91111111 20"></polygon></svg>';

  // ==========================================
  // 날짜 유틸
  // ==========================================
  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function fmt(d) {
    return d ? d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) : '';
  }

  function parse(str) {
    var m = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/.exec((str || '').trim());
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function today() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function addMonths(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  }

  // 월 이동 시 말일 보정 (예: 3/31 - 1개월 → 2/28)
  function subMonthsKeepDay(d, n) {
    var last = new Date(d.getFullYear(), d.getMonth() - n + 1, 0).getDate();
    return new Date(d.getFullYear(), d.getMonth() - n, Math.min(d.getDate(), last));
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  function sameDay(a, b) {
    return !!(a && b) && a.getTime() === b.getTime();
  }

  function diffDays(a, b) {
    return Math.round((b - a) / 86400000);
  }

  function getPresets() {
    var t = today();
    var lastMonth = addMonths(t, -1);
    return [
      { label: '오늘', from: t, to: t },
      { label: '최근 7일', from: addDays(t, -6), to: t },
      { label: '최근 1개월', from: subMonthsKeepDay(t, 1), to: t },
      { label: '최근 3개월', from: subMonthsKeepDay(t, 3), to: t },
      { label: '이번 달', from: startOfMonth(t), to: t },
      { label: '지난 달', from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    ];
  }

  function notifyRender() {
    document.dispatchEvent(new CustomEvent('datepicker:render'));
  }

  // ==========================================
  // 기간 선택 데이트피커
  // ==========================================
  function RangePicker(root) {
    var pickers = root.querySelectorAll('.formDatepicker');
    this.root = root;
    this.startPicker = pickers[0];
    this.endPicker = pickers[1];
    this.startInput = pickers[0].querySelector('.formControl');
    this.endInput = pickers[1].querySelector('.formControl');
    this.layer = null;
    this.draft = { from: null, to: null };
    this.month = null;

    var maxAttr = root.getAttribute('data-max-date');
    this.maxDate = maxAttr === 'today' ? today() : parse(maxAttr);

    this.bind();
  }

  RangePicker.prototype.isOpen = function () {
    return this.root.classList.contains('isOpen');
  };

  RangePicker.prototype.bind = function () {
    var self = this;

    // 입력창 / 달력 아이콘 클릭 → 열기 / 닫기
    [this.startPicker, this.endPicker].forEach(function (picker) {
      picker.addEventListener('click', function (e) {
        if (!e.target.closest('.formControl, .btnCalendar')) return;
        self.isOpen() ? self.close() : self.open();
      });
    });

    // 바깥 클릭 → 닫기
    document.addEventListener('mousedown', function (e) {
      if (self.isOpen() && !self.root.contains(e.target)) self.close();
    });

    // ESC → 닫기
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.isOpen()) self.close();
    });

    // 폼 초기화 시 닫기
    var form = this.root.closest('form');
    if (form) {
      form.addEventListener('reset', function () {
        self.close();
      });
    }
  };

  RangePicker.prototype.open = function () {
    var from = parse(this.startInput.value);
    var to = parse(this.endInput.value);
    this.draft = { from: from, to: to };
    // 종료일이 오른쪽 달에 오도록 (종료일 전달 ~ 종료일 달)
    this.month = startOfMonth(addMonths(to || from || today(), -1));

    if (!this.layer) {
      this.layer = document.createElement('div');
      this.layer.className = 'datePickerLayer';
      this.layer.setAttribute('role', 'dialog');
      this.layer.setAttribute('aria-label', '기간 선택');
      this.layer.addEventListener('click', this.onLayerClick.bind(this));
      this.root.appendChild(this.layer);
    }

    this.root.classList.add('isOpen');
    this.render();
  };

  RangePicker.prototype.close = function () {
    if (!this.isOpen()) return;
    this.root.classList.remove('isOpen');
    this.startPicker.classList.remove('isActive');
    this.endPicker.classList.remove('isActive');
    notifyRender();
  };

  RangePicker.prototype.apply = function () {
    if (!this.draft.from || !this.draft.to) return;
    this.setValue(this.startInput, fmt(this.draft.from));
    this.setValue(this.endInput, fmt(this.draft.to));
    this.close();
  };

  RangePicker.prototype.setValue = function (input, value) {
    if (input.value === value) return;
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  RangePicker.prototype.selectDay = function (day) {
    var from = this.draft.from;
    var to = this.draft.to;

    if (!from || to) {
      // 새 기간 시작
      this.draft = { from: day, to: null };
    } else if (day < from) {
      // 시작일보다 앞 날짜 → 앞뒤 바꿔 기간 지정
      this.draft = { from: day, to: from };
    } else {
      this.draft = { from: from, to: day };
    }
    this.render();
  };

  RangePicker.prototype.onLayerClick = function (e) {
    var target = e.target.closest('button');
    if (!target || target.disabled) return;

    if (target.hasAttribute('data-date')) {
      this.selectDay(parse(target.getAttribute('data-date')));
      return;
    }

    if (target.hasAttribute('data-preset')) {
      var preset = getPresets()[+target.getAttribute('data-preset')];
      this.draft = { from: preset.from, to: preset.to };
      this.month = startOfMonth(addMonths(preset.to, -1));
      this.render();
      return;
    }

    switch (target.getAttribute('data-action')) {
      case 'prev':
        this.month = addMonths(this.month, -1);
        this.render();
        break;
      case 'next':
        this.month = addMonths(this.month, 1);
        this.render();
        break;
      case 'cancel':
        this.close();
        break;
      case 'apply':
        this.apply();
        break;
    }
  };

  // ==========================================
  // 렌더링
  // ==========================================
  RangePicker.prototype.render = function () {
    var draft = this.draft;
    var complete = draft.from && draft.to;

    // 시작일만 고른 상태면 종료일 입력창에 포커스 표시
    var editingEnd = draft.from && !draft.to;
    this.startPicker.classList.toggle('isActive', !editingEnd);
    this.endPicker.classList.toggle('isActive', !!editingEnd);

    this.layer.innerHTML =
      this.renderPresets() +
      '<div class="datePickerBody">' +
        '<div class="datePickerMain">' +
          '<div class="rdp-root" data-nav-layout="around" data-mode="range">' +
            '<div class="rdp-months">' +
              this.renderMonth(this.month, { prev: true }) +
              this.renderMonth(addMonths(this.month, 1), { next: true }) +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="datePickerFooter">' +
          '<p class="datePickerValue">' + this.renderValue() + '</p>' +
          '<div class="btnGroup sm">' +
            '<button type="button" class="btn outline" data-action="cancel">취소</button>' +
            '<button type="button" class="btn dark" data-action="apply"' + (complete ? '' : ' disabled') + '>적용</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    notifyRender();
  };

  RangePicker.prototype.renderPresets = function () {
    var draft = this.draft;
    var html = '<div class="datePickerPreset">';
    getPresets().forEach(function (p, i) {
      var active = sameDay(draft.from, p.from) && sameDay(draft.to, p.to);
      html += '<button type="button" class="presetBtn' + (active ? ' isActive' : '') + '" data-preset="' + i + '">' + p.label + '</button>';
    });
    return html + '</div>';
  };

  RangePicker.prototype.renderValue = function () {
    var from = this.draft.from;
    var to = this.draft.to;
    if (from && to) {
      return '<strong>' + fmt(from) + ' ~ ' + fmt(to) + '</strong> (' + (diffDays(from, to) + 1) + '일)';
    }
    if (from) {
      return '<strong>' + fmt(from) + ' ~</strong> 종료일을 선택하세요';
    }
    return '시작일을 선택하세요';
  };

  RangePicker.prototype.renderMonth = function (month, nav) {
    var year = month.getFullYear();
    var m = month.getMonth();
    var caption = year + '년 ' + (m + 1) + '월';
    var html = '<div class="rdp-month">';

    if (nav.prev) {
      html += '<button type="button" class="rdp-button_previous" data-action="prev" aria-label="이전 달">' + CHEVRON_LEFT + '</button>';
    }
    html += '<div class="rdp-month_caption"><span class="rdp-caption_label" role="status" aria-live="polite">' + caption + '</span></div>';
    if (nav.next) {
      html += '<button type="button" class="rdp-button_next" data-action="next" aria-label="다음 달">' + CHEVRON_RIGHT + '</button>';
    }

    html += '<table class="rdp-month_grid" role="grid" aria-label="' + caption + '">';
    html += '<thead><tr class="rdp-weekdays">';
    WEEKDAYS.forEach(function (w) {
      html += '<th class="rdp-weekday" scope="col">' + w + '</th>';
    });
    html += '</tr></thead><tbody class="rdp-weeks">';

    // 일요일 시작 기준 첫 주 시작일 ~ 마지막 주 토요일까지
    var first = new Date(year, m, 1);
    var cursor = addDays(first, -first.getDay());
    var last = endOfMonth(first);
    var end = addDays(last, 6 - last.getDay());

    while (cursor <= end) {
      html += '<tr class="rdp-week">';
      for (var i = 0; i < 7; i++) {
        html += this.renderDay(cursor, m);
        cursor = addDays(cursor, 1);
      }
      html += '</tr>';
    }

    return html + '</tbody></table></div>';
  };

  RangePicker.prototype.renderDay = function (day, month) {
    // 2개월 표시이므로 이전/다음 달 날짜는 숨김 (react-day-picker showOutsideDays=false 와 동일)
    if (day.getMonth() !== month) {
      return '<td class="rdp-day rdp-outside rdp-hidden"></td>';
    }

    var from = this.draft.from;
    var to = this.draft.to;
    var cls = ['rdp-day'];
    var disabled = !!(this.maxDate && day > this.maxDate);

    if (sameDay(day, today())) cls.push('rdp-today');
    if (disabled) cls.push('rdp-disabled');

    if (from && to) {
      if (day >= from && day <= to) cls.push('rdp-selected');
      if (sameDay(day, from)) cls.push('rdp-range_start');
      if (sameDay(day, to)) cls.push('rdp-range_end');
      if (day > from && day < to) cls.push('rdp-range_middle');
    } else if (sameDay(day, from)) {
      cls.push('rdp-selected', 'rdp-range_start', 'rdp-range_end');
    }

    var label = day.getFullYear() + '년 ' + (day.getMonth() + 1) + '월 ' + day.getDate() + '일';
    return '<td class="' + cls.join(' ') + '" role="gridcell">' +
      '<button type="button" class="rdp-day_button" data-date="' + fmt(day) + '" aria-label="' + label + '"' + (disabled ? ' disabled' : '') + '>' + day.getDate() + '</button>' +
    '</td>';
  };

  // ==========================================
  // 초기화
  // ==========================================
  document.querySelectorAll('.formDateRange[data-datepicker="range"]').forEach(function (root) {
    new RangePicker(root);
  });
})();
