# API ��������Ʈ ���

## 1. Auth Server (����/����� ����)

| ��������Ʈ | �޼��� | ���� | ���� |
| --- | --- | --- | --- |
| `/auth/register` | POST | �ű� ����� ��� | ���ʿ� |
| `/auth/login` | POST | ����� �α��� �� JWT �߱� | ���ʿ� |
| `/users/me` | GET | ���� �α��ε� ����� ���� ��ȸ | JWT �ʿ� (��� ����) |

### �� ����

### `POST /auth/register`

```
��û: {"username": "testuser", "password": "password123"}
����: {"userId": "uuid-string", "username": "testuser"} (201 Created)

```

### `POST /auth/login`

```
��û: {"username": "testuser", "password": "password123"}
����: {"accessToken": "jwt_token_string"} (200 OK)

```

### `GET /users/me`

```
��û: Headers: Authorization: Bearer {jwt_token}
����: {"userId": "uuid-string", "username": "testuser", "roles": ["USER"]} (200 OK)

```

## 2. Event Server (Gateway ����)

| ��������Ʈ | �޼��� | ���� | ���� |
| --- | --- | --- | --- |
| `/events` | POST | �ű� �̺�Ʈ ���� | JWT (OPERATOR, ADMIN) |
| `/events` | GET | �̺�Ʈ ��� ��ȸ | JWT (��� ����) |
| `/events/{eventId}` | GET | �̺�Ʈ �� ��ȸ | JWT (��� ����) |
| `/events/{eventId}` | PUT | �̺�Ʈ ���� ���� | JWT (OPERATOR, ADMIN) |
| `/events/{eventId}` | DELETE | �̺�Ʈ ���� | JWT (OPERATOR, ADMIN) |
| `/users/me/event-claims/{eventId}` | POST | ����� ���� ��û | JWT (USER) |
| `/users/me/event-claims` | GET | ����� ���� ��û ���� | JWT (USER) |
| `/admin/event-claims` | GET | ��ü ���� ��û ���� | JWT (OPERATOR+) |

### �� ����

### `POST /events`

```
��û: {
  "eventName": "�⼮ �̺�Ʈ",
  "description": "���� �⼮�ϰ� ���� ��������!",
  "startDate": "2025-06-01T00:00:00Z",
  "endDate": "2025-06-30T23:59:59Z",
  "conditions": {"type": "DAILY_LOGIN", "consecutiveDays": 7},
  "rewards": [{
    "rewardType": "POINT",
    "rewardName": "100 ����Ʈ",
    "details": {"points": 100},
    "quantityPerUser": 1,
    "totalStock": -1
  }]
}
����: ������ �̺�Ʈ ���� (201 Created)

```

### `GET /events`

```
��û: ?status=ACTIVE&page=1&limit=10
����: �̺�Ʈ ��� �迭 (200 OK)

```

### `GET /events/{eventId}`

```
����: ���� �̺�Ʈ ���� (200 OK)

```

### `PUT /events/{eventId}`

```
��û: {"description": "������ ����", "endDate": "2025-07-07T23:59:59Z"}
����: ������ �̺�Ʈ ���� (200 OK)

```

### `DELETE /events/{eventId}`

```
����: 204 No Content �Ǵ� 200 OK with updated event

```

### `POST /users/me/event-claims/{eventId}`

```
���: X-Idempotency-Key: <client-generated-uuid-string> (�ʼ�)
����(����):
- ����: {"requestId": "uuid", "status": "SUCCESS_ALL_GRANTED", "message": "������ ���������� ���޵Ǿ����ϴ�.", "grantedRewards": [...]} (200 OK)
- �񵿱�: {"requestId": "uuid", "status": "PENDING_PROCESSING", "message": "���� ��û�� �����Ǿ����� ó�� ���Դϴ�."} (202 Accepted)
����(����): {"statusCode": xxx, "message": "���� ����", "error": "..."} (4xx/5xx)

```

### `GET /users/me/event-claims`

```
��û: ?status=SUCCESS&page=1&limit=10
����: user_reward_requests ��� �迭 (200 OK)

```

### `GET /admin/event-claims`

```
��û: ?userId=xxx&eventId=yyy&status=FAILED&page=1&limit=20
����: user_reward_requests ��� �迭 (200 OK)

```
