# 데이터 모델 (MongoDB 스키마)

## 1. Auth Server (`auth_db`)

### `users` 컬렉션

```
{
  _id: ObjectId,              // PK
  username: String,           // Unique, 로그인 ID
  password: String,           // 해시된 비밀번호 (BCrypt)
  roles: [String],            // ["USER", "OPERATOR", "AUDITOR", "ADMIN"], 기본값: ["USER"]
  createdAt: Date,            // 기본값: Date.now
  updatedAt: Date,            // 기본값: Date.now
  isActive: Boolean           // 기본값: true, 계정 활성화 상태
}

```

## 2. Event Server (`event_db`)

### `events` 컬렉션

```
{
  _id: ObjectId,              // PK
  eventName: String,          // 이벤트 이름
  description: String,        // 이벤트 설명
  startDate: Date,            // 시작일시
  endDate: Date,              // 종료일시
  conditions: Object,         // 이벤트 조건 (JSON)
                              // 예: {"type": "LOGIN_STREAK", "days": 7} 또는
                              // {"type": "AND", "subConditions": [...]}
  status: String,             // "DRAFT", "ACTIVE", "INACTIVE", "EXPIRED", "ARCHIVED"
  rewards: [                  // 보상 정보 목록
    {
      rewardId: ObjectId,     // 보상 항목 ID (자동 또는 직접 생성)
      rewardType: String,     // "POINT", "ITEM", "COUPON", "VIRTUAL_CURRENCY"
      rewardName: String,     // 예: "1000 메이플포인트"
      details: Object,        // 보상 세부 정보
                              // 예시 POINT: {"points": 1000}
                              // 예시 ITEM: {"itemId": "item_code_123", "itemName": "빨간 포션", "itemGrade": "RARE"}
                              // 예시 COUPON: {"couponCode": "WELCOME2025", "discountRate": 0.1, "description": "10% 할인 쿠폰"}
      quantityPerUser: Number,// 사용자당 지급 수량
      totalStock: Number,     // 한정 수량(-1 또는 null이면 무제한)
      remainingStock: Number  // 남은 재고
    }
  ],
  createdBy: String,          // 생성한 운영자/관리자 ID
  createdAt: Date,            // 기본값: Date.now
  updatedAt: Date             // 기본값: Date.now
}

```

### `user_reward_requests` 컬렉션 (Saga 상태 추적)

```
{
  _id: ObjectId,              // PK
  requestId: String,          // UUID, Saga ID, 멱등성 키
  userId: String,             // 사용자 ID
  eventId: ObjectId,          // 이벤트 ID
  eventSnapshot: Object,      // 요청 시점 이벤트 정보 스냅샷

  // Saga 상태값
  status: String,             // 상태값:
                              // "PENDING_VALIDATION"                       - 유효성 검증 대기
                              // "VALIDATION_FAILED_USER_INACTIVE"          - 사용자 비활성으로 검증 실패
                              // "VALIDATION_FAILED_EVENT_NOT_ACTIVE"       - 이벤트 비활성/종료로 검증 실패
                              // "VALIDATION_FAILED_ALREADY_CLAIMED"        - 이미 보상 수령으로 검증 실패
                              // "PENDING_CONDITION_CHECK"                  - 조건 확인 대기
                              // "CONDITION_CHECK_FAILED_EXTERNAL"          - 외부 시스템 오류로 조건 확인 실패
                              // "CONDITION_NOT_MET"                        - 조건 미달성
                              // "PENDING_INVENTORY_ALLOCATION"             - 재고 할당 대기
                              // "INVENTORY_ALLOCATION_FAILED_OUT_OF_STOCK" - 재고 부족으로 할당 실패
                              // "INVENTORY_ALLOCATION_FAILED_CONCURRENCY"  - 동시성 문제로 할당 실패
                              // "INVENTORY_ALLOCATION_ERROR"               - 기타 재고 할당 오류
                              // "INVENTORY_ALLOCATED"                      - 재고 할당 완료
                              // "PENDING_REWARD_GRANT"                     - 보상 지급 대기
                              // "REWARD_GRANT_FAILED_EXTERNAL"             - 외부 시스템 오류로 지급 실패
                              // "REWARD_GRANT_FAILED_USER_INACTIVE"        - 사용자 비활성화로 지급 실패
                              // "REWARD_PARTIALLY_GRANTED"                 - 일부 보상만 지급됨
                              // "SUCCESS_ALL_GRANTED"                      - 모든 보상 지급 완료
                              // "PENDING_COMPENSATION_INVENTORY"           - 재고 롤백 대기
                              // "COMPENSATED_INVENTORY"                    - 재고 롤백 완료
                              // "PENDING_COMPENSATION_REWARD"              - 지급된 보상 회수 대기
                              // "COMPENSATED_REWARD"                       - 지급된 보상 회수 완료
                              // "FAILED_ROLLED_BACK"                       - 오류 발생 후 롤백됨
                              // "COMPENSATION_FAILED_MANUAL_INTERVENTION_REQUIRED" - 수동 개입 필요
                              // 기본값: "PENDING_VALIDATION"

  currentSagaStep: String,    // 현재 Saga 단계명 (복구 용도)
                              // 예: "VALIDATE_USER_AND_EVENT", "ALLOCATE_INVENTORY"

  rewardsToProcess: [         // 지급 대상 보상 정보 및 처리 상태
    {
      rewardDefinition: Object, // events.rewards 복사
      grantStatus: String,    // "PENDING_GRANT", "SUCCESS", "FAILED_EXTERNAL"
      attemptCount: Number,
      lastFailureReason: String
    }
  ],

  failureReason: String,      // 실패 사유
  retryCount: Number,         // 재시도 횟수
  compensatingActionsLog: [   // 보상 트랜잭션 로그
    {
      step: String,           // 예: "ALLOCATE_INVENTORY"
      action: String,         // 예: "INCREMENT_STOCK"
      rewardId: String,
      timestamp: Date
    }
  ],
  claimedAt: Date,            // 지급 완료 시간
  createdAt: Date,            // 요청 접수 시간
  updatedAt: Date             // 상태 변경 시간
}

```
