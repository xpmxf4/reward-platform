export enum Role {
  USER = 'USER',         // 일반 사용자: 보상 요청만 가능
  OPERATOR = 'OPERATOR', // 운영자: 이벤트/보상 등록 가능
  AUDITOR = 'AUDITOR',   // 감사자: 보상 이력 조회만 가능
  ADMIN = 'ADMIN',       // 관리자: 모든 기능 접근 가능
}