# �ý��� ��Ű��ó �� ���� ����

## A. ���� �ý��� ��Ű��ó (���� API ���)

```mermaid
graph TD
    Client[Ŭ���̾�Ʈ] --> Gateway[Gateway Server��Ʈ 3000]
    Gateway --> |HTTP API �����| Auth[Auth Server��Ʈ 3001]
    Auth --> |����/��ȸ| AuthDB[(MongoDB auth_db)]
    Gateway --> |HTTP API �����| Event[Event Server ��Ʈ 3002]
    Event --> |����/��ȸ| EventDB[(MongoDB event_db)]
    Event --> |����� ����| Auth

```

### �ֿ� �帧 (����)

1. ��� Ŭ���̾�Ʈ ��û�� Gateway Server�� ���� �� ��� ����(Auth Server, Event Server)�� ����õ�
2. ���� �� ����� �ַ� ����� HTTP API ȣ���� ���
    - ��: Event Server�� ���� ��û ó�� �� Auth Server�� ����� ��ȿ�� ���� API ȣ��
    - ��: Event Server�� �̺�Ʈ ���� ������ ���� (������) Game Data API�� ȣ���ϰų�, ���� ������ ���� (������) Item/Point System API�� ȣ��
3. �� ������ �ڽ��� �����͸� MongoDB�� �����ϰ� ��ȸ

## B. �� ������ å��(Responsibilities) ����

### 1. Gateway Server

- **API ������**: ��� �ܺ� HTTP ��û�� ���� ������ ����
- **����**: Auth Server���� �߱޵� JWT ��ū ��ȿ�� ���� (`@nestjs/passport`, `passport-jwt` Ȱ��)
- **���� �ο�**: ������ ����� ����(Role)�� ����� API ���� ���� �˻� (NestJS�� `Guards` Ȱ��)
- **��û �����**: ����/���� �˻縦 ����� ��û�� ������ ���� ����ũ�μ��񽺷� ����

### 2. Auth Server

- **����� ���� ����**: ���� ����, ��ȸ, ����, ����(���� ����) (��й�ȣ�� �ؽ÷� ����)
- **����� ����**: �α��� ��û ó�� (����� ���� ���� �� JWT �߱�)
- **���� ����**: ����ڿ��� ����(USER, OPERATOR, AUDITOR, ADMIN) ���� ����
- **JWT ����**: JWT ��ū ����, (�ʿ��) �������� ��ū ����
- **DB**: `auth_db` ��� (��: `users` �÷���)

### 3. Event Server

- **�̺�Ʈ ����**: �̺�Ʈ ����, ��ȸ(���/��), ����, ���� ����(Ȱ��/��Ȱ��/���� ��)
- **���� ����**: �̺�Ʈ�� ����� ���� ����(����, ����, ���� ��) ���, ��ȸ, ����
- **���� ���� ����**: ����� �̺�Ʈ ���� �޼� ���� ���� (�� ���������� Mock �Ǵ� �ܼ�ȭ�� �������� ó��)
- **����� ���� ��û ó��**: ���� ��û ����, ���� ����, ��� Ȯ��, ���� ����, ��û ���� ��� **(�� �� Saga ���� ���� �ٽ� ����)**
- **���� ��û �̷� ����**: ����� ���� ��û ����/���� �̷� ���� �� ��ȸ
- **DB**: `event_db` ��� (��: `events`, `rewards`, `user_reward_requests` �÷���)

## C. ���� Ȯ�强�� ����� ��Ű��ó (Kafka ���� �ó�����)

����� �ٽ� ��� ������ ����������, ������ ���� ��Ȳ���� �޽��� ť �ý���(Kafka) ������ ����� �� ����.

### ��� ��Ȳ

1. **�ΰ��� �̺�Ʈ ����**: ���� �������� �߻��ϴ� �뷮�� Ȱ�� ������(����, ����Ʈ �Ϸ�, ������ ȹ��/���, ������ ��)�� �ǽð����� �����Ͽ� �̺�Ʈ ���� �޼� ���� ������ Ȱ���ؾ� �� ��
2. **�񵿱� ó�� ��ȭ**: ������ ���� ���� ���μ����� ����� �˸� �߼� ���� �񵿱������� ó���� API ���� �ð��� �����ϰ� �ý��� ó������ ������ �� ��
3. **���� �� ������ ��ȭ ����**: Ư�� ���� ��ְ� �ٸ� ���񽺿� ������ �ּ�ȭ�ϰ�, �� ���񽺰� ���������� Ȯ��/������ �� �ִ� ������ Ȯ���� �ʿ��� ��

### Kafka ���� �� ���� ��Ű��ó (���䵵)

```mermaid
graph TD
    Client[Ŭ���̾�Ʈ] --> Gateway[Gateway Server]
    Gateway --> |API| Auth[Auth Server]
    Auth --> |Event: UserStatusChanged| Kafka[KAFKA]
    Gateway --> |API| Event[Event Server]
    Auth --> |Event: UserRegistered| Kafka
    GameServer[Game Server - ����] --> |Produce Event| Kafka
    Kafka --> |Consume Event: UserActivityEvent| Event
    Event --> |Produce: GrantRewardCommand| Kafka
    Kafka --> |Consume: GrantResultEvent| Event
    Kafka --> RewardService[Reward Fulfillment Service ���� ������/����Ʈ ���� ó��]
    Gateway --> MongoDB[(MongoDB)]
    Auth --> MongoDB
    Event --> MongoDB

```

### �ֿ� ���� �� ��� ȿ��

- **Game Server �� Kafka �� Event Server**: ���� �� Ȱ�� �����Ͱ� Kafka�� ���� Event Server�� �񵿱� ����. �̷� ���� API ȣ�� �δ� ���� �� �뷮 �̺�Ʈ ������ ó�� ����
- **Auth Server �� Kafka �� Event Server**: ����� ���� ����(Ż��, �� ��) �̺�Ʈ�� Kafka�� �����Ͽ� Event Server�� ���� �� ���� ���� �񵿱� ����
- **Event Server ���� ���� �񵿱�ȭ**: ���� ���� ��û ���� �� ���� ���� ó���� ���� Ŀ�ǵ强 �̺�Ʈ�� Kafka�� �����Ͽ� ���� ���� API ���伺 ��� �� �ܺ� �ý��� ��� �ı� ȿ�� ����

### Kafka ���� �� �߰� �������

- �޽��� ��Ű�� ���� �� ���� (Avro)
- �������� �� ����
- Dead Letter Queue (DLQ) ó�� ����
- ī��ī Ŭ������ � �� ����͸�
- Ʈ����� ���� ���⼺ ���� (Ư�� Choreography ��� Saga)

**���: ����� ����� API ������� �ٽ� ��� �����ϵ�, Ȯ�� �ó������� ���ο� �ΰ� API �������̽��� ���� ������ ������ ���� �޽�¡ �ý����� ���������� ������ �� �ִ� ��� ������ �߿���.**
