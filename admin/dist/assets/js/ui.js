/**
 * ==========================================================================
 * [UI Component Interactions]
 * 실제 서비스 화면 및 컴포넌트 동작에 사용되는 공통 UI 스크립트
 * ==========================================================================
 */

(function() {
  'use strict';

  // ==========================================
  // 1. 세그먼트 (Segment) 컴포넌트
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
  // 2. 파일 업로드 & 드래그 앤 드롭 (File Upload & Dropzone)
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
  // 3. 사이드바 (Sidebar Collapse & Menu Toggle)
  // ==========================================
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

  // 1depth 메뉴 아코디언 토글 (서브메뉴가 있는 경우)
  document.addEventListener('click', function(e) {
    var menuLink = e.target.closest('.boMenu > li > a');
    if (menuLink) {
      var li = menuLink.parentElement;
      var subMenu = li.querySelector('.boSubMenu');
      if (subMenu) {
        e.preventDefault();
        li.classList.toggle('isOpen');
      }
    }
  });

})();
