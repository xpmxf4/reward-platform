# 이벤트 / 보상 관리 플랫폼 구축 (메이플스토리 PC 백엔드 과제)

본 프로젝트는 메이플스토리 PC 백엔드 엔지니어 과제인 "이벤트 / 보상 관리 플랫폼"을 구축하는 것을 목표로 합니다. 마이크로서비스 아키텍처(MSA)를 기반으로 Gateway, Auth Server, Event Server 간의 동기식 API 통신을 기본으로 구현하였으며, 실제 프로덕션 환경에서의 안정성, 데이터 일관성 및 향후 확장성을 심도 있게 고려하여 설계했습니다.

## 주요 기술 스택

- Node.js 18
- NestJS (최신 버전)
- MongoDB
- TypeScript
- Docker, Docker Compose
- JWT (JSON Web Token) 기반 인증

## 실행 방법

1. 프로젝트 루트 디렉토리에서 아래 명령어를 실행하여 모든 서비스를 빌드하고 실행합니다. (최초 실행 시 또는 변경사항 있을 시 `-build` 옵션 포함)
    
    ```bash
    docker-compose up --build -d
    
    ```
    
2. 서비스 중지 및 컨테이너/네트워크 삭제는 아래 명령어를 사용합니다.
    
    ```bash
    docker-compose down
    
    ```
    
3. (선택) 데이터 볼륨까지 완전히 삭제하려면 아래 명령어를 사용합니다. (주의: MongoDB 데이터가 삭제됩니다.)
    
    ```bash
    docker-compose down -v
    
    ```
    

### 서비스 포트 정보

- **Gateway Server:** `http://localhost:3000` (클라이언트 요청 진입점)
- **Auth Server:** 내부 통신용 (Docker 네트워크 내 `http://auth-server:3001`, 외부 노출은 `docker-compose.yml` 설정에 따름)
- **Event Server:** 내부 통신용 (Docker 네트워크 내 `http://event-server:3002`, 외부 노출은 `docker-compose.yml` 설정에 따름)
- **MongoDB:** `mongodb://localhost:27017` (호스트에서 직접 접근 시, DB 이름은 `auth_db`, `event_db`)

## 설계 문서

본 프로젝트의 상세 설계 내용은 `docs` 폴더 내 각 문서를 참고해주시기 바랍니다.

- [**0. 과제 분석](https://www.notion.so/docs/00_Assignment_Analysis.md):** 과제 요구사항 분석 및 목표 설정
- [**1. 시스템 아키텍처](https://www.notion.so/docs/01_System_Architecture.md):** 현재 동기 API 기반 아키텍처 및 향후 Kafka 도입을 고려한 확장 아키텍처
- [**2. 데이터 모델](https://www.notion.so/docs/02_Data_Model.md):** MongoDB 컬렉션 스키마 정의 (User, Event, Reward, UserRewardRequest)
- [**3. API 엔드포인트 명세](https://www.notion.so/docs/03_API_Endpoints.md):** Gateway 기준 주요 API 명세
- [**4. Saga 패턴 및 멱등성 설계](https://www.notion.so/docs/04_Saga_And_Idempotency.md):** 사용자 보상 요청 처리 Saga, 멱등성, 엣지 케이스 및 Kafka 확장 방안 심층 분석 (본 과제의 핵심 설계)

## 핵심 설계 결정 사항

본 프로젝트는 "실제 프로덕션에서 이 코드를 돌려도 될까?"라는 질문을 핵심 가이드라인으로 삼아, 다음과 같은 주요 설계 원칙과 패턴을 적용하여 안정성과 확장성을 확보하고자 노력했습니다.

### 1. 마이크로서비스 아키텍처 (MSA) 채택

- **Gateway, Auth Server, Event Server**로 서비스를 분리하여 각 서비스의 책임과 역할을 명확히 했습니다. ([참고: 시스템 아키텍처](https://www.notion.so/docs/01_System_Architecture.md))
- 이를 통해 기능별 독립적인 개발, 배포, 확장이 가능하며, 한 서비스의 장애가 다른 서비스에 미치는 영향을 최소화할 수 있는 기반을 마련했습니다.

### 2. 사용자 보상 요청 처리 - Saga 패턴 (Orchestration) 적용

- 분산 환경에서 여러 단계의 로컬 트랜잭션으로 구성되는 "사용자 보상 요청" 기능의 데이터 일관성을 보장하기 위해 **Saga 패턴(Orchestration 방식)**을 채택했습니다.
- **Event Server의 `EventClaimsService`가 Orchestrator 역할**을 수행하며, 다음의 주요 단계를 순차적으로 진행하고 각 단계의 성공/실패를 `UserRewardRequest` 문서에 기록합니다.
    1. **S0: 요청 접수 및 초기화:** 멱등성 키 검증, `UserRewardRequest` 문서 생성 (`PENDING_VALIDATION` 상태).
    2. **S1: 사용자 및 이벤트 유효성 검증:** Auth Server를 통해 사용자 상태 확인(Mock), Event DB에서 이벤트 상태/기간/중복수령 확인.
    3. **S2: 이벤트 조건 달성 검증:** Game Data Service(Mock)를 통해 조건 충족 여부 확인.
    4. **S3: 보상 재고 확인 및 반영:** 한정 수량 보상의 경우 Event DB에서 재고 조건부 차감 (단순화된 방식).
    5. **S4: 실제 보상 지급:** Reward Fulfillment Service(Mock)를 통해 보상 지급 시도.
    6. **S5: 최종 처리:** Saga 성공 또는 실패(롤백 완료) 상태 확정.
- **롤백(보상 트랜잭션):** 각 단계 실패 시, `EventClaimsService`는 이미 완료된 이전 단계의 작업을 되돌리는 보상 트랜잭션(예: `compensateInventory`)을 실행하여 데이터 정합성을 유지합니다.
- **상세 설계:** [Saga 패턴 및 멱등성 설계 문서](https://www.notion.so/docs/04_Saga_And_Idempotency.md)의 "2. 사용자 보상 요청 처리 Saga" 섹션에서 전체 흐름도, 상태 전이 다이어그램, 각 단계별 상세 로직 및 실패 시나리오별 보상 트랜잭션 흐름을 확인할 수 있습니다.

### 3. API 멱등성(Idempotency) 확보

- 시스템 상태를 변경하는 주요 API, 특히 `POST /api/event-claims/{eventId}/claim` (사용자 보상 요청)에 대해 **`X-Idempotency-Key` HTTP 헤더**를 사용하여 멱등성을 보장합니다.
- 클라이언트는 최초 요청 시 고유한 멱등성 키를 생성하여 전달하며, 네트워크 오류 등으로 재시도 시 동일한 키를 사용합니다.
- 서버(`EventClaimsService.initiateClaim`)는 수신된 멱등성 키를 `UserRewardRequest`의 `requestId`로 저장하고, 동일 `requestId`의 요청이 이미 처리되었는지(성공/실패) 또는 처리 중인지 확인하여 중복 실행을 방지하고 일관된 응답을 반환합니다.
- **상세 설계:** [Saga 패턴 및 멱등성 설계 문서](https://www.notion.so/docs/04_Saga_And_Idempotency.md)의 "3. API 멱등성 확보 전략" 섹션 참조.

### 4. 주요 엣지 케이스(Edge Case) 고려 및 대응

- 사용자 보상 요청 Saga 진행 중 발생할 수 있는 다양한 엣지 케이스(예: 사용자 탈퇴/밴, 이벤트 비활성/종료, 한정 수량 보상 재고 소진, 외부 시스템(Mock) 오류/타임아웃, 서버 예기치 않은 재시작, DB 오류, 보상 트랜잭션 자체 실패 등)를 식별하고, 각 상황에 대한 대응 전략 및 `UserRewardRequest`의 최종 상태를 정의했습니다.
- **상세 내용:** [Saga 패턴 및 멱등성 설계 문서](https://www.notion.so/docs/04_Saga_And_Idempotency.md)의 "4. 주요 엣지 케이스 및 대응 방안 (표)" 참조.

### 5. 재고 관리 방식 및 향후 개선 고려

- **현재 구현:** 한정 수량 보상의 재고 관리는 `EventClaimsService`에서 MongoDB의 조건부 업데이트 (`updateOne`과 `$inc` 연산자)를 사용하는 **단순화된 방식**으로 구현되었습니다. 이는 단일 요청에 대한 원자성은 보장하지만, 매우 높은 동시성 환경에서는 레이스 컨디션으로 인한 미세한 재고 불일치 가능성이 존재합니다.
- **향후 개선 방안 (분산 락 도입):** 이 한계점을 인지하고 있으며, 실제 프로덕션 환경에서는 보다 강력한 동시성 제어를 위해 **Redis 등을 활용한 분산 락(Distributed Lock)** 메커니즘을 Saga의 S3(재고 반영) 단계에 도입할 것을 고려합니다. `rewardId`별로 락을 획득한 후 재고를 확인하고 차감/원복함으로써, 여러 서버 인스턴스 환경에서도 데이터 정합성을 더욱 안전하게 보장할 수 있습니다.

### 6. 확장성 고려 - Kafka 도입을 통한 아키텍처 진화 방안 (핵심 고민 사항)

본 과제의 주요 목표 중 하나인 "실무에서 자주 사용되는 패턴 학습" 및 시스템의 장기적인 확장성 확보를 위해, 현재의 동기식 API 기반 아키텍처의 한계점을 분석하고 **Apache Kafka와 같은 메시지 큐를 도입하여 이벤트 기반 아키텍처(EDA)로 진화하는 방안을 심도 있게 고려**했습니다.

- **현재 동기식 Saga의 어려움:**
    - `EventClaimsService`에 집중된 **롤백(보상 트랜잭션) 로직의 복잡성** ("일일이 트랜잭션 다 되돌리는 문제").
    - 외부 서비스 호출로 인한 **서비스 간 강한 결합** 및 특정 서비스 장애/지연 시 **전체 Saga 성능/가용성 저하**.
    - **긴 트랜잭션**으로 인한 시스템 자원 점유 문제.
    - ([참고: Saga 설계 문서 - 2.5절](https://www.notion.so/docs/04_Saga_And_Idempotency.md#25-%ED%98%84%EC%9E%AC-%EC%84%A4%EA%B3%84%EB%8F%99%EA%B8%B0-api-%EA%B8%B0%EB%B0%98-orchestration-saga%EC%9D%98-%EC%96%B4%EB%A0%A4%EC%9B%80-%EB%B0%8F-%ED%95%9C%EA%B3%84%EC%A0%90))
- **Kafka 도입을 통한 개선 효과 및 설계 아이디어:**
    1. **(가상) Game Server → Event Server (사용자 활동 이벤트 수신):** 게임 내 발생하는 대량의 사용자 활동(퀘스트 완료, 레벨업 등)을 Kafka 토픽으로 발행하고, Event Server는 이를 비동기적으로 구독하여 이벤트 조건 달성 상태를 집계합니다. 이를 통해 실시간 API 호출 부하를 제거하고 시스템 간 결합도를 낮출 수 있습니다.
    2. **Auth Server → Event Server (사용자 상태 변경 전파):** 사용자 탈퇴/밴 등의 상태 변경 이벤트를 Kafka로 발행하여, Event Server가 이를 구독하고 진행 중인 보상 요청 Saga를 안전하게 중단시키는 등의 조치를 비동기적으로 수행할 수 있습니다.
    3. **사용자 보상 요청 Saga의 비동기화 (Orchestration + Event 하이브리드 모델):**
        - `EventClaimsService`(Orchestrator)는 Saga의 각 주요 단계를 직접 동기 호출하는 대신, 해당 작업을 요청하는 **커맨드(Command)성 이벤트를 Kafka로 발행**합니다.
        - 각 커맨드를 처리하는 전용 컨슈머(Event Server 내 별도 모듈 또는 다른 서비스)는 작업 완료 후 그 결과를 **결과(Result) 이벤트로 Kafka에 다시 발행**합니다.
        - Orchestrator는 이 결과 이벤트를 구독하여 다음 단계를 진행하거나, 실패 시 **보상 커맨드 이벤트를 Kafka로 발행**하여 각 서비스가 자신의 롤백 로직을 비동기적으로 수행하도록 합니다.
        - 이를 통해 API 초기 응답 시간을 단축하고, 서비스 간 결합도를 낮추며, "일일이 되돌리는" 롤백 로직의 복잡성을 각 담당 서비스로 분산시킬 수 있습니다.
    - **상세 Kafka 도입 아키텍처 및 이벤트 페이로드 예시:** [Saga 설계 문서 - 2.6절](https://www.notion.so/docs/04_Saga_And_Idempotency.md#26-%ED%96%A5%ED%9B%84-%ED%99%95%EC%9E%A5-%EC%84%A4%EA%B3%84-apache-kafka-%EB%8F%84%EC%9E%85%EC%9D%84-%ED%86%B5%ED%95%9C-saga-%EA%B0%9C%EC%84%A0-%EB%B0%A9%EC%95%88) 및 [시스템 아키텍처 문서 - C절](https://www.notion.so/docs/01_System_Architecture.md#c-%ED%96%A5%ED%9B%84-%ED%99%95%EC%9E%A5%EC%84%B1%EC%9D%84-%EA%B3%A0%EB%A0%A4%ED%95%9C-%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98-kafka-%EB%8F%84%EC%9E%85-%EC%8B%9C%EB%82%98%EB%A6%AC%EC%98%A4) 참조.

이러한 Kafka 도입 고려는 현재 시스템의 한계를 명확히 인지하고, 더 나은 아키텍처로 발전시키기 위한 고민의 결과입니다.

### 7. 구현된 범위 및 Mock 처리

- **주요 구현 완료 범위:**
    - Auth Server: 사용자 등록, 로그인(JWT 발급), 프로필 조회 API.
    - Event Server: 이벤트 CRUD API, 사용자 보상 요청 처리 Saga 프로토타입 (`EventClaimsService` - 상태 관리, 주요 성공/실패 분기, 단순 재고 처리 및 롤백 로직 포함), 사용자 본인 보상 요청 내역 조회 API.
    - Gateway Server: Auth Server 및 Event Server 주요 API에 대한 라우팅 및 JWT 기반 인증 프록시.
- **Mock 처리된 부분:**
    - `EventClaimsService` 내의 외부 서비스 연동(Auth Server 사용자 상태 상세 조회, Game Data Service 조건 데이터 조회, Reward Fulfillment Service 실제 보상 지급)은 현재 Mock 인터페이스 및 간단한 Mock 구현체로 대체하여 Saga의 전체적인 흐름과 상태 관리, 엣지 케이스 처리에 집중했습니다.
- **시간 제약으로 인한 미구현/축소된 부분:**
    - 관리자/운영자용 상세 조회 API (사용자별/이벤트별 보상 요청 내역 필터링 등)는 기본 골격만 제시.
    - 완벽한 분산 락을 사용한 재고 처리 대신 단순화된 DB 업데이트 사용 (단, 한계점 및 개선 방안 명시).
    - Kafka 연동은 설계로만 제시.
    - 단위 테스트 및 E2E 테스트 코드 작성은 시간 제약으로 생략 (과제 가이드상 선택 사항).
