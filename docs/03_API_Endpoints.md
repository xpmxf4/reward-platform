# API 엔드포인트 목록 (Gateway 기준)

본 문서는 API Gateway (`gateway-server`)를 통해 외부로 노출되는 최종 API 엔드포인트를 기준으로 작성되었습니다.

내부 마이크로서비스(Auth Server, Event Server)의 API 경로는 Gateway의 프록시 설정을 통해 매핑됩니다.

## 1. 인증 및 사용자 관련 API (Auth Server 프록시)

- **Gateway 기본 경로:** `/api/auth`
- **담당 프록시 컨트롤러:** `AuthProxyController`

| 외부 노출 엔드포인트 (Gateway) | 메서드 | 내부 전달 경로 (Auth Server) | 설명 | 인증 | 필요한 역할 |
| --- | --- | --- | --- | --- | --- |
| `/api/auth/register` | POST | `/auth/register` | 신규 사용자 등록 | 불필요 | - |
| `/api/auth/login` | POST | `/auth/login` | 사용자 로그인 및 JWT 발급 | 불필요 | - |
| `/api/auth/profile` | GET | `/auth/profile` | 현재 로그인된 사용자 정보 조회 | JWT 필요 (Gateway 검증) | USER, OPERATOR, AUDITOR, ADMIN |

### 상세 정보

### `POST /api/auth/register`

- **설명:** 새로운 사용자를 시스템에 등록합니다.
- **요청 바디 예시:**

    ```json
    {
      "username": "newuser",
      "password": "password12345",
      "roles": ["USER"]
    }
    
    ```

- **응답 성공 (201 Created) 예시 (Auth Server 반환):**

    ```json
    {
      "_id": "generated-user-id",
      "username": "newuser",
      "roles": ["USER"],
      "isActive": true,
      "createdAt": "iso-date",
      "updatedAt": "iso-date"
    }
    
    ```

- **주요 실패 응답:** `400 Bad Request` (유효성 실패), `409 Conflict` (사용자명 중복)

### `POST /api/auth/login`

- **설명:** 사용자명과 비밀번호로 로그인하여 JWT 액세스 토큰을 발급받습니다.
- **요청 바디 예시:**

    ```json
    {
      "username": "newuser",
      "password": "password12345"
    }
    
    ```

- **응답 성공 (200 OK) 예시 (Auth Server 반환):**

    ```json
    {
      "accessToken": "your_jwt_access_token_string"
    }
    
    ```

- **주요 실패 응답:** `401 Unauthorized` (로그인 정보 불일치)

### `GET /api/auth/profile`

- **설명:** 현재 인증된 사용자의 프로필 정보를 조회합니다.
- **요청 헤더:** `Authorization: Bearer <accessToken>`
- **응답 성공 (200 OK) 예시 (Auth Server 반환):**

    ```json
    {
      "userId": "user-id-from-jwt-sub", // 또는 _id
      "username": "newuser",
      "roles": ["USER"]
      // JwtStrategy.validate에서 반환하는 객체 구조에 따름
    }
    
    ```

- **주요 실패 응답:** `401 Unauthorized` (유효하지 않은 토큰 또는 토큰 없음)

## 2. 이벤트 관리 API (Event Server 프록시 - Events)

- **Gateway 기본 경로:** `/api/events`
- **담당 프록시 컨트롤러:** `EventProxyController`
- **기본 인증:** 이 경로의 API는 Gateway의 `JwtAuthGuard`에 의해 기본적으로 JWT 인증이 필요합니다. (공개 API는 추후 `@Public` 등으로 예외 처리 필요)

| 외부 노출 엔드포인트 (Gateway) | 메서드 | 내부 전달 경로 (Event Server) | 설명 | 인증 | 필요한 역할 (Event Server에서 최종 결정) |
| --- | --- | --- | --- | --- | --- |
| `/api/events` | POST | `/events` | 신규 이벤트 생성 | JWT 필요 (Gateway 검증) | OPERATOR, ADMIN |
| `/api/events` | GET | `/events` | 이벤트 목록 조회 | JWT 필요 (Gateway 검증) | USER, OPERATOR, AUDITOR, ADMIN |
| `/api/events/:eventId` | GET | `/events/:eventId` | 특정 이벤트 상세 정보 조회 | JWT 필요 (Gateway 검증) | USER, OPERATOR, AUDITOR, ADMIN |
| `/api/events/:eventId` | PUT | `/events/:eventId` | 특정 이벤트 정보 수정 | JWT 필요 (Gateway 검증) | OPERATOR, ADMIN |
| `/api/events/:eventId/status` | PATCH | `/events/:eventId/status` | 특정 이벤트 상태 변경 | JWT 필요 (Gateway 검증) | OPERATOR, ADMIN |
| `/api/events/:eventId` | DELETE | `/events/:eventId` | 특정 이벤트 삭제(논리적) | JWT 필요 (Gateway 검증) | ADMIN |

### 상세 정보 (주요 API 예시)

### `POST /api/events`

- **설명:** 새로운 이벤트를 생성합니다. (`createdBy`는 Gateway가 주입한 `X-User-ID` 헤더를 Event Server에서 사용)
- **요청 헤더:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **요청 바디 예시 (`CreateEventDto`):**

    ```json
    {
      "eventName": "새로운 여름 출석 이벤트",
      "description": "매일 출석하고 시원한 보상을 받으세요!",
      "startDate": "2025-07-01T00:00:00Z",
      "endDate": "2025-07-31T23:59:59Z",
      "conditions": {"type": "DAILY_LOGIN_STREAK", "daysRequired": 7},
      "rewards": [
        {
          "rewardType": "POINT",
          "rewardName": "1000 여름 포인트",
          "details": {"points": 1000},
          "quantityPerUser": 1,
          "totalStock": -1
        }
      ]
    }
    
    ```

- **응답 성공 (201 Created) 예시 (Event Server 반환):** 생성된 이벤트 객체 (`_id`, `createdBy` 등 포함)
- **주요 실패 응답:** `400 Bad Request` (유효성 실패), `401 Unauthorized` (인증 실패), `403 Forbidden` (권한 없음 - Event Server에서 처리 시)

### `GET /api/events`

- **설명:** 이벤트 목록을 조회합니다. (페이지네이션 및 필터링 지원)
- **요청 헤더:** `Authorization: Bearer <accessToken>`
- **쿼리 파라미터 예시:** `?status=ACTIVE&page=1&limit=5&sortBy=startDate&sortOrder=asc`
- **응답 성공 (200 OK) 예시 (Event Server 반환):**

    ```json
    {
      "data": [ /* 이벤트 객체 배열 */ ],
      "total": 20,
      "currentPage": 1,
      "totalPages": 4
    }
    
    ```

- **주요 실패 응답:** `401 Unauthorized`

## 3. 사용자 보상 요청 API (Event Server 프록시 - Event Claims)

- **Gateway 기본 경로:** `/api/event-claims`
- **담당 프록시 컨트롤러:** `EventClaimProxyController`
- **기본 인증:** 이 경로의 API는 Gateway의 `JwtAuthGuard`에 의해 기본적으로 JWT 인증이 필요합니다.

| 외부 노출 엔드포인트 (Gateway) | 메서드 | 내부 전달 경로 (Event Server) | 설명 | 인증 | 필요한 역할 (Event Server에서 최종 결정) |
| --- | --- | --- | --- | --- | --- |
| `/api/event-claims/{eventId}/claim` | POST | `/event-claims/{eventId}/claim` | 특정 이벤트에 대한 사용자 보상 요청 (Saga 시작) | JWT 필요 (Gateway 검증) | USER |
| `/api/event-claims/me` | GET | `/event-claims/me` | 사용자 본인의 보상 요청 내역 조회 | JWT 필요 (Gateway 검증) | USER |
| `/api/event-claims/user/{userId}` | GET | `/event-claims/user/{userId}` | (운영자용) 특정 사용자 보상 요청 내역 조회 | JWT 필요 (Gateway 검증) | OPERATOR, ADMIN, AUDITOR |
| `/api/event-claims/event/{eventId}` | GET | `/event-claims/event/{eventId}` | (운영자용) 특정 이벤트의 모든 보상 요청 내역 | JWT 필요 (Gateway 검증) | OPERATOR, ADMIN, AUDITOR |
| `/api/event-claims/{requestId}` | GET | `/event-claims/{requestId}` | (운영자용) 단일 보상 요청 상세 조회 | JWT 필요 (Gateway 검증) | OPERATOR, ADMIN, AUDITOR |

### 상세 정보 (주요 API 예시)

### `POST /api/event-claims/{eventId}/claim`

- **설명:** 사용자가 특정 이벤트(`eventId`)에 대해 보상을 요청합니다. 이 요청은 Event Server에서 Saga 트랜잭션으로 처리됩니다. **멱등성 보장을 위해 `X-Idempotency-Key` 헤더가 필수입니다.**
- **요청 헤더:**
    - `Authorization: Bearer <accessToken>`
    - `X-Idempotency-Key: <client-generated-uuid-string>` (필수)
    - `Content-Type: application/json` (만약 요청 바디가 있다면)
- **요청 바디 예시 (`CreateEventClaimDto` - 현재는 간단):**

    ```json
    {
      "notes": "첫 번째 보상 요청입니다!"
    }
    
    ```

- **응답 성공 (202 Accepted - 비동기 처리 가정) 예시 (Event Server 반환):**
  또는 최종 결과를 동기적으로 반환한다면 200 OK와 함께 `UserRewardRequest` 문서 반환.

    ```json
    {
        "message": "보상 요청이 접수되었으며 처리 중입니다. 최종 결과는 별도로 확인해주세요.",
        "requestId": "client-generated-uuid-string", // X-Idempotency-Key 값
        "status": "PENDING_VALIDATION" // Saga 초기 상태
    }
    
    ```

- **주요 실패 응답:**
    - `400 Bad Request` (필수 헤더 누락, 유효하지 않은 `eventId` 형식, 요청 바디 유효성 실패)
    - `401 Unauthorized` (인증 실패)
    - `404 Not Found` (존재하지 않는 이벤트)
    - `409 Conflict` (멱등성 키 중복 처리 중이거나 이미 실패/성공한 경우)
    - `503 Service Unavailable` (내부 서비스 오류 시)

### `GET /api/event-claims/me`

- **설명:** 현재 인증된 사용자의 모든 보상 요청 내역을 조회합니다. (페이지네이션 및 필터링 지원)
- **요청 헤더:** `Authorization: Bearer <accessToken>`
- **쿼리 파라미터 예시:** `?status=SUCCESS_ALL_GRANTED&page=1&limit=10&sortBy=createdAt&sortOrder=desc`
- **응답 성공 (200 OK) 예시 (Event Server 반환):**

    ```json
    {
      "data": [ /* UserRewardRequest 객체 배열 (eventSnapshot 등 제외된 형태) */ ],
      "total": 5,
      "currentPage": 1,
      "totalPages": 1
    }
    
    ```

- **주요 실패 응답:** `401 Unauthorized`