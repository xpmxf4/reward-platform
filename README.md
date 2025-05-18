# �̺�Ʈ / ���� ���� �÷��� ���� (�����ý��丮 PC �鿣�� ����)

�� ������Ʈ�� �����ý��丮 PC �鿣�� �����Ͼ� ������ "�̺�Ʈ / ���� ���� �÷���"�� �����ϴ� ���� ��ǥ�� �մϴ�.
�� ����� Gateway, Auth Server, Event Server ���� ����� API ����� ������� �ϸ�, ���� Ȯ�强�� ����� ���踦 �����մϴ�.

## �ֿ� ��� ����
- Node.js 18
- NestJS (�ֽ�)
- MongoDB
- TypeScript
- Docker, Docker Compose
- JWT (����)

## ���� ���

1. ������Ʈ ��Ʈ ���丮���� �Ʒ� ��ɾ �����Ͽ� ��� ���񽺸� �����ϰ� �����մϴ�. (���� ���� �� �Ǵ� ������� ���� �� `--build` �ɼ� ����)
   ```bash
   docker-compose up --build -d
   ```
2. ���� ���� �� �����̳�/��Ʈ��ũ ������ �Ʒ� ��ɾ ����մϴ�.
   ```bash
   docker-compose down
   ```
3. (����) ������ �������� ������ �����Ϸ��� �Ʒ� ��ɾ ����մϴ�. (����: MongoDB �����Ͱ� �����˴ϴ�.)
   ```bash
   docker-compose down -v
   ```

### ���� ��Ʈ ����
- Gateway Server: `http://localhost:3000`
- Auth Server: (���� ��ſ�, �⺻ ��Ʈ 3001 ����)
- Event Server: (���� ��ſ�, �⺻ ��Ʈ 3002 ����)
- MongoDB: `mongodb://localhost:27017` (���ÿ��� ���� ���� ��, DB �̸��� `auth_db`, `event_db`)

## ���� ����
- [���� �м�](./docs/00_Assignment_Analysis.md)
- [�ý��� ��Ű��ó (���� �� ���� Ȯ��)](./docs/01_System_Architecture.md)
- [������ ��](./docs/02_Data_Model.md)
- [API ��������Ʈ](./docs/03_API_Endpoints.md)
- [Saga �� �� ����](./docs/04_Saga_And_Idempotency.md) (���� ����)
