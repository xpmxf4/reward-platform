# ������ �� (MongoDB ��Ű��)

## 1. Auth Server (`auth_db`)

### `users` �÷���

```
{
  _id: ObjectId,              // PK
  username: String,           // Unique, �α��� ID
  password: String,           // �ؽõ� ��й�ȣ (BCrypt)
  roles: [String],            // ["USER", "OPERATOR", "AUDITOR", "ADMIN"], �⺻��: ["USER"]
  createdAt: Date,            // �⺻��: Date.now
  updatedAt: Date,            // �⺻��: Date.now
  isActive: Boolean           // �⺻��: true, ���� Ȱ��ȭ ����
}

```

## 2. Event Server (`event_db`)

### `events` �÷���

```
{
  _id: ObjectId,              // PK
  eventName: String,          // �̺�Ʈ �̸�
  description: String,        // �̺�Ʈ ����
  startDate: Date,            // �����Ͻ�
  endDate: Date,              // �����Ͻ�
  conditions: Object,         // �̺�Ʈ ���� (JSON)
                              // ��: {"type": "LOGIN_STREAK", "days": 7} �Ǵ�
                              // {"type": "AND", "subConditions": [...]}
  status: String,             // "DRAFT", "ACTIVE", "INACTIVE", "EXPIRED", "ARCHIVED"
  rewards: [                  // ���� ���� ���
    {
      rewardId: ObjectId,     // ���� �׸� ID (�ڵ� �Ǵ� ���� ����)
      rewardType: String,     // "POINT", "ITEM", "COUPON", "VIRTUAL_CURRENCY"
      rewardName: String,     // ��: "1000 ����������Ʈ"
      details: Object,        // ���� ���� ����
                              // ���� POINT: {"points": 1000}
                              // ���� ITEM: {"itemId": "item_code_123", "itemName": "���� ����", "itemGrade": "RARE"}
                              // ���� COUPON: {"couponCode": "WELCOME2025", "discountRate": 0.1, "description": "10% ���� ����"}
      quantityPerUser: Number,// ����ڴ� ���� ����
      totalStock: Number,     // ���� ����(-1 �Ǵ� null�̸� ������)
      remainingStock: Number  // ���� ���
    }
  ],
  createdBy: String,          // ������ ���/������ ID
  createdAt: Date,            // �⺻��: Date.now
  updatedAt: Date             // �⺻��: Date.now
}

```

### `user_reward_requests` �÷��� (Saga ���� ����)

```
{
  _id: ObjectId,              // PK
  requestId: String,          // UUID, Saga ID, �� Ű
  userId: String,             // ����� ID
  eventId: ObjectId,          // �̺�Ʈ ID
  eventSnapshot: Object,      // ��û ���� �̺�Ʈ ���� ������

  // Saga ���°�
  status: String,             // ���°�:
                              // "PENDING_VALIDATION"                       - ��ȿ�� ���� ���
                              // "VALIDATION_FAILED_USER_INACTIVE"          - ����� ��Ȱ������ ���� ����
                              // "VALIDATION_FAILED_EVENT_NOT_ACTIVE"       - �̺�Ʈ ��Ȱ��/����� ���� ����
                              // "VALIDATION_FAILED_ALREADY_CLAIMED"        - �̹� ���� �������� ���� ����
                              // "PENDING_CONDITION_CHECK"                  - ���� Ȯ�� ���
                              // "CONDITION_CHECK_FAILED_EXTERNAL"          - �ܺ� �ý��� ������ ���� Ȯ�� ����
                              // "CONDITION_NOT_MET"                        - ���� �̴޼�
                              // "PENDING_INVENTORY_ALLOCATION"             - ��� �Ҵ� ���
                              // "INVENTORY_ALLOCATION_FAILED_OUT_OF_STOCK" - ��� �������� �Ҵ� ����
                              // "INVENTORY_ALLOCATION_FAILED_CONCURRENCY"  - ���ü� ������ �Ҵ� ����
                              // "INVENTORY_ALLOCATION_ERROR"               - ��Ÿ ��� �Ҵ� ����
                              // "INVENTORY_ALLOCATED"                      - ��� �Ҵ� �Ϸ�
                              // "PENDING_REWARD_GRANT"                     - ���� ���� ���
                              // "REWARD_GRANT_FAILED_EXTERNAL"             - �ܺ� �ý��� ������ ���� ����
                              // "REWARD_GRANT_FAILED_USER_INACTIVE"        - ����� ��Ȱ��ȭ�� ���� ����
                              // "REWARD_PARTIALLY_GRANTED"                 - �Ϻ� ���� ���޵�
                              // "SUCCESS_ALL_GRANTED"                      - ��� ���� ���� �Ϸ�
                              // "PENDING_COMPENSATION_INVENTORY"           - ��� �ѹ� ���
                              // "COMPENSATED_INVENTORY"                    - ��� �ѹ� �Ϸ�
                              // "PENDING_COMPENSATION_REWARD"              - ���޵� ���� ȸ�� ���
                              // "COMPENSATED_REWARD"                       - ���޵� ���� ȸ�� �Ϸ�
                              // "FAILED_ROLLED_BACK"                       - ���� �߻� �� �ѹ��
                              // "COMPENSATION_FAILED_MANUAL_INTERVENTION_REQUIRED" - ���� ���� �ʿ�
                              // �⺻��: "PENDING_VALIDATION"

  currentSagaStep: String,    // ���� Saga �ܰ�� (���� �뵵)
                              // ��: "VALIDATE_USER_AND_EVENT", "ALLOCATE_INVENTORY"

  rewardsToProcess: [         // ���� ��� ���� ���� �� ó�� ����
    {
      rewardDefinition: Object, // events.rewards ����
      grantStatus: String,    // "PENDING_GRANT", "SUCCESS", "FAILED_EXTERNAL"
      attemptCount: Number,
      lastFailureReason: String
    }
  ],

  failureReason: String,      // ���� ����
  retryCount: Number,         // ��õ� Ƚ��
  compensatingActionsLog: [   // ���� Ʈ����� �α�
    {
      step: String,           // ��: "ALLOCATE_INVENTORY"
      action: String,         // ��: "INCREMENT_STOCK"
      rewardId: String,
      timestamp: Date
    }
  ],
  claimedAt: Date,            // ���� �Ϸ� �ð�
  createdAt: Date,            // ��û ���� �ð�
  updatedAt: Date             // ���� ���� �ð�
}

```
