# API 엔드포인트 목록

## 1. Auth Server (인증/사용자 관리)

| 엔드포인트 | 메서드 | 설명 | 인증 |
| --- | --- | --- | --- |
| `/auth/register` | POST | 신규 사용자 등록 | 불필요 |
| `/auth/login` | POST | 사용자 로그인 및 JWT 발급 | 불필요 |
| `/users/me` | GET | 현재 로그인된 사용자 정보 조회 | JWT 필요 (모든 역할) |

### 상세 정보

### `POST /auth/register`

```
요청: {"username": "testuser", "password": "password123"}
응답: {"userId": "uuid-string", "username": "testuser"} (201 Created)

```

### `POST /auth/login`

```
요청: {"username": "testuser", "password": "password123"}
응답: {"accessToken": "jwt_token_string"} (200 OK)

```

### `GET /users/me`

```
요청: Headers: Authorization: Bearer {jwt_token}
응답: {"userId": "uuid-string", "username": "testuser", "roles": ["USER"]} (200 OK)

```

## 2. Event Server (Gateway 경유)

| 엔드포인트 | 메서드 | 설명 | 인증 |
| --- | --- | --- | --- |
| `/events` | POST | 신규 이벤트 생성 | JWT (OPERATOR, ADMIN) |
| `/events` | GET | 이벤트 목록 조회 | JWT (모든 역할) |
| `/events/{eventId}` | GET | 이벤트 상세 조회 | JWT (모든 역할) |
| `/events/{eventId}` | PUT | 이벤트 정보 수정 | JWT (OPERATOR, ADMIN) |
| `/events/{eventId}` | DELETE | 이벤트 삭제 | JWT (OPERATOR, ADMIN) |
| `/users/me/event-claims/{eventId}` | POST | 사용자 보상 요청 | JWT (USER) |
| `/users/me/event-claims` | GET | 사용자 보상 요청 내역 | JWT (USER) |
| `/admin/event-claims` | GET | 전체 보상 요청 내역 | JWT (OPERATOR+) |

### 상세 정보

### `POST /events`

```
요청: {
  "eventName": "출석 이벤트",
  "description": "매일 출석하고 보상 받으세요!",
  "startDate": "2025-06-01T00:00:00Z",
  "endDate": "2025-06-30T23:59:59Z",
  "conditions": {"type": "DAILY_LOGIN", "consecutiveDays": 7},
  "rewards": [{
    "rewardType": "POINT",
    "rewardName": "100 포인트",
    "details": {"points": 100},
    "quantityPerUser": 1,
    "totalStock": -1
  }]
}
응답: 생성된 이벤트 정보 (201 Created)

```

### `GET /events`

```
요청: ?status=ACTIVE&page=1&limit=10
응답: 이벤트 목록 배열 (200 OK)

```

### `GET /events/{eventId}`

```
응답: 단일 이벤트 정보 (200 OK)

```

### `PUT /events/{eventId}`

```
요청: {"description": "수정된 설명", "endDate": "2025-07-07T23:59:59Z"}
응답: 수정된 이벤트 정보 (200 OK)

```

### `DELETE /events/{eventId}`

```
응답: 204 No Content 또는 200 OK with updated event

```

### `POST /users/me/event-claims/{eventId}`

```
헤더: X-Idempotency-Key: <client-generated-uuid-string> (필수)
응답(성공):
- 동기: {"requestId": "uuid", "status": "SUCCESS_ALL_GRANTED", "message": "보상이 성공적으로 지급되었습니다.", "grantedRewards": [...]} (200 OK)
- 비동기: {"requestId": "uuid", "status": "PENDING_PROCESSING", "message": "보상 요청이 접수되었으며 처리 중입니다."} (202 Accepted)
응답(실패): {"statusCode": xxx, "message": "실패 사유", "error": "..."} (4xx/5xx)

```

### `GET /users/me/event-claims`

```
요청: ?status=SUCCESS&page=1&limit=10
응답: user_reward_requests 목록 배열 (200 OK)

```

### `GET /admin/event-claims`

```
요청: ?userId=xxx&eventId=yyy&status=FAILED&page=1&limit=20
응답: user_reward_requests 목록 배열 (200 OK)

```
