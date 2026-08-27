/* =========================================================
  화면리스트 데이터
  - 이 파일만 수정하면 screen-list.html에 자동 반영됩니다.
  - 형식은 JSON과 동일하며, 값만 채우고 구조는 그대로 유지해주세요.

  [필드 설명]
  depth1~depth4 : 화면 계층 (하위 depth가 없으면 "" 빈 값)
  screenId      : 화면 코드 (예: MB_CM_01_001)
  screenName    : 화면명
  type          : 화면 형태 (예: 팝업, 바텀시트, 풀페이지, 컴포넌트 등)
  status        : 작업상태 (대기 | 진행중 | 완료 | 보류)
  worker        : 작업자
  issue         : 이슈/특이사항 (없으면 "")
========================================================= */
const screenListData = [
  {
    "depth1": "오퍼링",
    "depth2": "홈",
    "depth3": "",
    "depth4": "",
    "screenId": "MB_CM_01_001",
    "screenName": "화면1",
    "type": "",
    "status": "완료",
    "worker": "신수지",
    "issue": "",
    "path": "CM/MB_CM_01_001"
  },
  {
    "depth1": "오퍼링",
    "depth2": "홈",
    "depth3": "화면2",
    "depth4": "",
    "screenId": "",
    "screenName": "",
    "type": "",
    "status": "진행중",
    "worker": "",
    "issue": "대기",
    "path": ""
  },
  {
    "depth1": "오퍼링",
    "depth2": "",
    "depth3": "",
    "depth4": "",
    "screenId": "",
    "screenName": "",
    "type": "바텀시트",
    "status": "대기",
    "worker": "",
    "issue": "",
    "path": ""
  },
  {
    "depth1": "오퍼링",
    "depth2": "",
    "depth3": "",
    "depth4": "",
    "screenId": "",
    "screenName": "",
    "type": "",
    "status": "대기",
    "worker": "",
    "issue": "기획서 v2 반영 필요",
    "path": ""
  },
  {
    "depth1": "오퍼링",
    "depth2": "",
    "depth3": "",
    "depth4": "",
    "screenId": "",
    "screenName": "",
    "type": "팝업",
    "status": "보류",
    "worker": "",
    "issue": "정책 확정 전",
    "path": ""
  },
  {
    "depth1": "오퍼링",
    "depth2": "",
    "depth3": "",
    "depth4": "",
    "screenId": "",
    "screenName": "",
    "type": "",
    "status": "완료",
    "worker": "",
    "issue": "",
    "path": ""
  }
];