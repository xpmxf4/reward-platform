# 이벤트 / 보상 관리 플랫폼 구축 (메이플스토리 PC 백엔드 과제)

본 프로젝트는 메이플스토리 PC 백엔드 엔지니어 과제인 "이벤트 / 보상 관리 플랫폼"을 구축하는 것을 목표로 합니다.
본 설계는 Gateway, Auth Server, Event Server 간의 동기식 API 통신을 기반으로 하며, 향후 확장성을 고려한 설계를 지향합니다.

## 주요 기술 스택
- Node.js 18
- NestJS (최신)
- MongoDB
- TypeScript
- Docker, Docker Compose
- JWT (인증)

## 실행 방법

1. 프로젝트 루트 디렉토리에서 아래 명령어를 실행하여 모든 서비스를 빌드하고 실행합니다. (최초 실행 시 또는 변경사항 있을 시 `--build` 옵션 포함)
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
- Gateway Server: `http://localhost:3000`
- Auth Server: (내부 통신용, 기본 포트 3001 가정)
- Event Server: (내부 통신용, 기본 포트 3002 가정)
- MongoDB: `mongodb://localhost:27017` (로컬에서 직접 접근 시, DB 이름은 `auth_db`, `event_db`)

## 설계 문서
- [과제 분석](./docs/00_Assignment_Analysis.md)
- [시스템 아키텍처 (현재 및 향후 확장)](./docs/01_System_Architecture.md)
- [데이터 모델](./docs/02_Data_Model.md)
- [API 엔드포인트](./docs/03_API_Endpoints.md)
- [Saga 및 멱등성 설계](./docs/04_Saga_And_Idempotency.md) (추후 생성)
