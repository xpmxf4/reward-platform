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

## 설계 문서
- [과제 분석](./docs/00_Assignment_Analysis.md)
- [시스템 아키텍처 (현재 및 향후 확장)](./docs/01_System_Architecture.md)
- [데이터 모델](./docs/02_Data_Model.md)
- [API 엔드포인트](./docs/03_API_Endpoints.md)
- [Saga 및 멱등성 설계](./docs/04_Saga_And_Idempotency.md) (추후 생성)
