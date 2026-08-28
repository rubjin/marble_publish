/**
 * ==========================================================================
 * [Style Guide Viewer System]
 * UI 스타일 가이드 문서 전용 시스템 스크립트 (guide.js)
 * - 코드 박스 자동 추출 및 Prism.js 하이라이팅
 * - 코드 보기/닫기 토글 및 클립보드 복사
 * - 가이드 탭 네비게이션 및 새로고침 상태 유지 (Hash / localStorage)
 * ==========================================================================
 */

(function() {
  'use strict';

  // ==========================================
  // 1. 코드 박스 자동 생성 & Prism 하이라이팅
  // ==========================================
  document.addEventListener('DOMContentLoaded', function() {
    var boxes = document.querySelectorAll('.guideBox');
    
    boxes.forEach(function(box) {
      if (box.nextElementSibling && box.nextElementSibling.classList.contains('guideCodeWrap')) return;
      
      var htmlCode = '';
      // 레이아웃용 래퍼 클래스 제외 후 순수 컴포넌트 추출
      var targets = Array.from(box.querySelectorAll('*:not(.guideSizeGroup):not(.guideSizeItem):not(.guideSizeLabel)'));

      if (targets.length > 0) {
        var filteredTargets = targets.filter(function(t) {
          var parent = t.parentElement;
          while (parent && parent !== box) {
            var isWrapper = parent.matches('.guideSizeGroup, .guideSizeItem, .guideSizeLabel');
            if (!isWrapper) return false;
            parent = parent.parentElement;
          }
          return true;
        });
        
        htmlCode = filteredTargets.map(function(t) { return t.outerHTML; }).join('\n');
      } else {
        htmlCode = box.innerHTML;
      }
      
      // 들여쓰기 및 줄바꿈 정리
      var lines = htmlCode.split('\n');
      if (lines.length > 0 && lines[0].trim() === '') lines.shift();
      if (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
      
      if (lines.length > 0) {
        var match = lines[0].match(/^(\s+)/);
        if (match) {
          var indent = match[1];
          var regex = new RegExp('^' + indent, 'gm');
          htmlCode = lines.join('\n').replace(regex, '');
        } else {
          htmlCode = lines.join('\n');
        }
      }
      
      var wrap = document.createElement('div');
      wrap.className = 'guideCodeWrap';
      wrap.innerHTML = 
        '<div class="guideCodeHeader">' +
          '<button type="button" class="guideCodeToggle" onclick="toggleCode(this)">' +
            '<span>코드 보기</span>' +
          '</button>' +
          '<button type="button" class="guideCodeCopy" onclick="copyCode(this)">' +
            '<span>코드 복사</span>' +
          '</button>' +
        '</div>' +
        '<pre class="guideCodeBlock"><code class="language-html"></code></pre>';
      
      var codeEl = wrap.querySelector('code');
      codeEl.textContent = htmlCode;
      box.parentNode.insertBefore(wrap, box.nextSibling);
      
      if (window.Prism) {
        Prism.highlightElement(codeEl);
      }
    });
  });

  // ==========================================
  // 2. 가이드 탭 네비게이션 & 상태 유지
  // ==========================================
  window.activateTab = function(targetId) {
    if (!targetId) return;
    var navBtn = document.querySelector('.guideNavItem[data-target="' + targetId + '"]');
    var targetSection = document.getElementById(targetId);
    if (!navBtn || !targetSection) return;

    // 초기 깜빡임 방지용 임시 style 태그 제거
    var initStyle = document.getElementById('guideInitStyle');
    if (initStyle) initStyle.remove();

    // 탭 버튼 활성화 변경
    document.querySelectorAll('.guideNavItem').forEach(function(item) {
      item.classList.remove('isActive');
    });
    navBtn.classList.add('isActive');

    // 타겟 섹션만 노출
    document.querySelectorAll('.guideSection').forEach(function(section) {
      section.style.display = 'none';
    });
    targetSection.style.display = 'block';

    // 상태 저장 (localStorage & URL hash)
    try {
      localStorage.setItem('activeGuideTab', targetId);
    } catch (e) {}

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, null, '#' + targetId);
    }
  };

  // 스티키 네비게이션 클릭 이벤트
  document.addEventListener('click', function(e) {
    var navItem = e.target.closest('.guideNavItem');
    if (navItem) {
      var targetId = navItem.getAttribute('data-target');
      window.activateTab(targetId);
    }
  });

  // 초기 로드 시 저장된 탭 복원
  document.addEventListener('DOMContentLoaded', function() {
    var hash = window.location.hash ? window.location.hash.replace('#', '') : null;
    var savedTab = null;
    try {
      savedTab = localStorage.getItem('activeGuideTab');
    } catch (e) {}

    var initialTab = hash || savedTab || 'sectionButtons';

    if (document.getElementById(initialTab)) {
      window.activateTab(initialTab);
    } else {
      window.activateTab('sectionButtons');
    }
  });

})();

// ==========================================
// 3. 코드 보기 토글 & 복사 전역 함수
// ==========================================
function toggleCode(btn) {
  var wrap = btn.closest('.guideCodeWrap');
  var codeBlock = wrap.querySelector('.guideCodeBlock');
  btn.classList.toggle('isOpen');
  codeBlock.classList.toggle('isOpen');
  var label = btn.querySelector('span') || btn.childNodes[2];
  if (label) {
    label.textContent = codeBlock.classList.contains('isOpen') ? ' 코드 닫기' : ' 코드 보기';
  }
}

function copyCode(btn) {
  var wrap = btn.closest('.guideCodeWrap');
  var code = wrap.querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(function() {
    btn.classList.add('isCopied');
    var label = btn.querySelector('span') || btn.childNodes[2];
    if (label) label.textContent = ' 복사됨';
    setTimeout(function() {
      btn.classList.remove('isCopied');
      if (label) label.textContent = ' 복사';
    }, 2000);
  });
}
