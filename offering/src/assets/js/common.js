/* =========================================================
  퍼블리싱 확인용 공통 스크립트
  - header/footer를 jQuery load()로 삽입합니다.
  - 실제 Next.js 반영 시에는 사용하지 않습니다. (handoff-guide.md 참고)
========================================================= */
$(function () {
  $('#header').load('/pages/common/header.html');
  // $('#footer').load('/pages/common/footer.html');

  // 공통 모달이 필요한 화면에서만 아래처럼 개별 로드
  // $('#modalWrap').load('/pages/common/modal/modal-confirm.html');
});
