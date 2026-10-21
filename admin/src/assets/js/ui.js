/**
 * ==========================================================================
 * [UI Component Interactions]
 * 실제 서비스 화면 및 컴포넌트 동작에 사용되는 공통 UI 스크립트
 * ==========================================================================
 */

(function() {
  'use strict';

  // ==========================================
  // 세그먼트 (Segment) 컴포넌트
  // ==========================================
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.segment .segmentItem:not(label)');
    if (btn) {
      var segment = btn.closest('.segment');
      if (segment) {
        segment.querySelectorAll('.segmentItem').forEach(function(item) {
          item.classList.remove('isActive');
        });
        btn.classList.add('isActive');
      }
    }
  });

  // ==========================================
  // 파일 업로드 & 드래그 앤 드롭 (File Upload & Dropzone)
  // ==========================================

  // 파일 크기 포맷 유틸
  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // 드롭존 파일 동적 추가
  function handleFileUpload(files, dropzone) {
    if (!files || files.length === 0) return;
    var fileList = dropzone.querySelector('.fileList');
    if (!fileList) {
      fileList = document.createElement('ul');
      fileList.className = 'fileList';
      dropzone.appendChild(fileList);
    }

    Array.from(files).forEach(function(file) {
      var li = document.createElement('li');
      li.className = 'fileItem';
      li.innerHTML = 
        '<div class="fileInfo">' +
          '<span class="fileIcon">' +
            '<svg viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>' +
          '</span>' +
          '<span class="fileName">' + file.name + '</span>' +
          '<span class="fileSize">(' + formatFileSize(file.size) + ')</span>' +
        '</div>' +
        '<button type="button" class="fileDelete" aria-label="삭제">' +
          '<svg viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>' +
        '</button>';
      fileList.appendChild(li);
    });
  }

  // 드롭존 드래그 오버/리브
  document.addEventListener('dragover', function(e) {
    var dropzone = e.target.closest('.fileDropzone');
    if (dropzone) {
      e.preventDefault();
      dropzone.classList.add('isDragOver');
    }
  });

  document.addEventListener('dragleave', function(e) {
    var dropzone = e.target.closest('.fileDropzone');
    if (dropzone) {
      dropzone.classList.remove('isDragOver');
    }
  });

  // 드롭존 드롭 (파일 추가)
  document.addEventListener('drop', function(e) {
    var dropzone = e.target.closest('.fileDropzone');
    if (dropzone) {
      e.preventDefault();
      dropzone.classList.remove('isDragOver');
      var files = e.dataTransfer ? e.dataTransfer.files : null;
      handleFileUpload(files, dropzone);
    }
  });

  // 드롭존 파일 선택창(Change)으로 파일 추가
  document.addEventListener('change', function(e) {
    if (e.target.matches('.fileDropzone input[type="file"]')) {
      var dropzone = e.target.closest('.fileDropzone');
      handleFileUpload(e.target.files, dropzone);
      e.target.value = ''; // 재선택 가능하도록 초기화
    }
  });

  // 파일 목록 개별 삭제 (X 버튼)
  document.addEventListener('click', function(e) {
    var delBtn = e.target.closest('.fileDelete');
    if (delBtn) {
      var item = delBtn.closest('.fileItem');
      if (item) item.remove();
    }
  });

  // ==========================================
  // 사이드바 (Sidebar Collapse & Menu Toggle)
  // 사이드바 접기/펼치기 토글
  document.addEventListener('click', function(e) {
    var foldBtn = e.target.closest('.boSidebar .btnFold');
    if (foldBtn) {
      var sidebar = foldBtn.closest('.boSidebar');
      if (sidebar) {
        sidebar.classList.toggle('isCollapsed');
      }
    }
  });

  // 현재 페이지와 같은 링크의 서브메뉴 활성화 (+ 상위 메뉴 펼침)
  // 연결된 화면이 없으면 마크업에 지정된 isActive / isOpen 상태 유지
  (function() {
    var current = location.pathname;
    var links = document.querySelectorAll('.boSubMenu a[href]:not([href="#"])');
    var matched = null;
    links.forEach(function(link) {
      if (new URL(link.href, location.href).pathname === current) matched = link;
    });
    if (!matched) return;

    document.querySelectorAll('.boSubMenu a.isActive').forEach(function(link) {
      link.classList.remove('isActive');
    });
    document.querySelectorAll('.boMenu > li.isOpen').forEach(function(li) {
      li.classList.remove('isOpen');
    });
    matched.classList.add('isActive');
    matched.closest('.boMenu > li').classList.add('isOpen');
  })();

  // 1depth 메뉴 아코디언 토글 (사이드바 펼침 상태 + 서브메뉴가 있는 경우)
  document.addEventListener('click', function(e) {
    var menuLink = e.target.closest('.boMenu > li > a');
    if (menuLink) {
      var sidebar = menuLink.closest('.boSidebar');
      var isCollapsed = sidebar && sidebar.classList.contains('isCollapsed');
      var li = menuLink.parentElement;
      var subMenu = li.querySelector('.boSubMenu');

      if (!isCollapsed && subMenu) {
        e.preventDefault();
        li.classList.toggle('isOpen');
      }
    }
  });

  // ==========================================
  // 모달 팝업 (Modal Popup Open/Close)
  // ==========================================
  window.openPopup = function(id) {
    var popup = document.getElementById(id);
    if (popup) {
      popup.classList.add('isOpen');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closePopup = function(id) {
    var popup = typeof id === 'string' ? document.getElementById(id) : (id ? id.closest('.popupDimmed') : null);
    if (popup) {
      popup.classList.remove('isOpen');
      document.body.style.overflow = '';
    }
  };

  // 닫기 버튼 및 딤드 영역 클릭 시 닫기 & data-popup 속성으로 열기
  document.addEventListener('click', function(e) {
    // 닫기 버튼
    if (e.target.closest('.popupDimmed .btnClose') || e.target.classList.contains('popupDimmed')) {
      var popup = e.target.closest('.popupDimmed');
      if (popup) {
        window.closePopup(popup);
      }
    }

    // 팝업 열기 버튼 (data-popup="popupId" 속성 지원)
    var openBtn = e.target.closest('[data-popup]');
    if (openBtn) {
      var targetId = openBtn.getAttribute('data-popup');
      window.openPopup(targetId);
    }
  });

  // ==========================================
  // 페이지 즐겨찾기 버튼 토글 (Favorite Button)
  // ==========================================
  document.addEventListener('click', function(e) {
    var favBtn = e.target.closest('.btnFavorite');
    if (favBtn) {
      favBtn.classList.toggle('isActive');
    }
  });

  // ==========================================
  // 툴팁 (Tooltip) - 스크롤 영역 안에서 잘림 방지
  // .tblWrap / .popupBody 는 overflow 가 있어 absolute 말풍선이 잘리므로
  // 열릴 때 화면(viewport) 기준 fixed 좌표로 띄움 (.tooltipContent.isFixed)
  // ==========================================
  var TOOLTIP_GAP = 8;   // 트리거와 말풍선 간격 (_tooltip.scss 의 calc(100% + 8px) 와 동일)
  var VIEWPORT_PAD = 8;  // 화면 가장자리 최소 여백
  var activeTooltip = null;

  function findScrollTooltip(target) {
    var wrap = target.closest ? target.closest('.tooltipWrap') : null;
    return wrap && wrap.closest('.tblWrap, .popupBody') ? wrap : null;
  }

  function placeTooltip(wrap) {
    var content = wrap.querySelector('.tooltipContent');
    if (!content) return;
    var rect = wrap.getBoundingClientRect();
    var style = content.style;

    content.classList.add('isFixed');
    style.top = style.right = style.bottom = style.left = 'auto';
    style.removeProperty('--arrowShift');

    // 좌측 / 우측 : 세로 중앙 정렬
    if (wrap.classList.contains('left') || wrap.classList.contains('right')) {
      style.top = (rect.top + rect.height / 2) + 'px';
      if (wrap.classList.contains('left')) {
        style.right = (window.innerWidth - rect.left + TOOLTIP_GAP) + 'px';
      } else {
        style.left = (rect.right + TOOLTIP_GAP) + 'px';
      }
      return;
    }

    // 상단(기본) / 하단 : 가로 중앙 정렬, 화면 밖으로 나가면 안쪽으로 밀고 꼬리는 트리거 위치 유지
    var center = rect.left + rect.width / 2;
    var half = content.offsetWidth / 2;
    var x = Math.min(Math.max(center, half + VIEWPORT_PAD), window.innerWidth - half - VIEWPORT_PAD);
    style.left = x + 'px';
    style.setProperty('--arrowShift', (center - x) + 'px');
    if (wrap.classList.contains('bottom')) {
      style.top = (rect.bottom + TOOLTIP_GAP) + 'px';
    } else {
      style.bottom = (window.innerHeight - rect.top + TOOLTIP_GAP) + 'px';
    }
  }

  function openScrollTooltip(e) {
    var wrap = findScrollTooltip(e.target);
    if (wrap) {
      activeTooltip = wrap;
      placeTooltip(wrap);
    }
  }

  document.addEventListener('mouseover', openScrollTooltip);
  document.addEventListener('focusin', openScrollTooltip);

  // 스크롤 / 리사이즈 시 열려 있는 툴팁 위치 갱신 (테이블 가로 스크롤 포함 → capture)
  function updateActiveTooltip() {
    if (activeTooltip) placeTooltip(activeTooltip);
  }
  window.addEventListener('scroll', updateActiveTooltip, true);
  window.addEventListener('resize', updateActiveTooltip);

  // ==========================================
  // 라디오 카드 (Radio Card) 활성화 상태 동기화
  // ==========================================
  document.addEventListener('change', function(e) {
    if (e.target.matches('.formRadioCard input[type="radio"]')) {
      var name = e.target.name;
      if (name) {
        document.querySelectorAll('input[type="radio"][name="' + name + '"]').forEach(function(radio) {
          var card = radio.closest('.formRadioCard');
          if (card) {
            if (radio.checked) {
              card.classList.add('isActive');
            } else {
              card.classList.remove('isActive');
            }
          }
        });
      }
    }
  });

})();

