import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRewardRequest, UserRewardRequestDocument } from '../schemas/user-reward-request.schema';
import { Event, EventDocument} from '../../events/schemas/event.schema';
import { Reward } from '../../events/schemas/reward.schema';

interface MockAuthService {
  isUserActive(userId: string): Promise<boolean>;
}
interface MockGameDataService {
  checkConditions(userId: string, conditions: any): Promise<boolean>;
}
interface MockRewardFulfillmentService {
  grantReward(userId: string, rewardDetails: Reward): Promise<{ success: boolean; transactionId?: string; failureReason?: string }>;
  // compensateGrantedReward(userId: string, rewardDetails: Reward, grantTransactionId?: string): Promise<boolean>; // 보상 트랜잭션용
}

@Injectable()
export class EventClaimsService {
  private readonly logger = new Logger(EventClaimsService.name);

  // Mock 서비스 인스턴스 (실제로는 외부 서비스 클라이언트 주입)
  private mockAuthService: MockAuthService = {
    isUserActive: async (userId: string) => {
      this.logger.debug(`[MockAuthService] Checking status for user: ${userId}`);
      if (userId === 'inactiveUser_test') {
        this.logger.warn(`[MockAuthService] User ${userId} is inactive.`);
        return false;
      }
      return true;
    },
  };
  private mockGameDataService: MockGameDataService = {
    checkConditions: async (userId: string, conditions: any) => {
      this.logger.debug(`[MockGameDataService] Checking conditions for user ${userId}: ${JSON.stringify(conditions)}`);
      if (conditions && conditions.type === "ALWAYS_TRUE") return true;
      if (conditions && conditions.type === "ALWAYS_FALSE") return false;
      if (conditions && conditions.type === "USER_SPECIFIC_CONDITION" && userId === "user_who_meets_condition") return true;
      if (conditions && conditions.type === "USER_SPECIFIC_CONDITION" && userId !== "user_who_meets_condition") return false;
      return true;
    },
  };
  private mockRewardFulfillmentService: MockRewardFulfillmentService = {
    grantReward: async (userId: string, rewardDetails: Reward) => {
      this.logger.debug(`[MockRewardFulfillmentService] Granting reward to user ${userId}: ${rewardDetails.rewardName}`);
      if (rewardDetails.rewardName === '실패하는_테스트_보상') {
        return { success: false, failureReason: '외부 시스템 지급 실패 (Mock)' };
      }
      return { success: true, transactionId: `mock_tx_${new Date().getTime()}` };
    },
  };

  constructor(
    @InjectModel(UserRewardRequest.name) private readonly userRewardRequestModel: Model<UserRewardRequestDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {}

  async initiateClaim(
    userId: string,
    userRoles: string[],
    username: string,
    eventIdString: string,
    idempotencyKey: string,
  ): Promise<UserRewardRequestDocument | null> {
    this.logger.log(`Initiating reward claim for userId: ${userId}, eventId: ${eventIdString}, idempotencyKey: ${idempotencyKey}`);

    let existingRequest = await this.userRewardRequestModel.findOne({ requestId: idempotencyKey }).exec();
    if (existingRequest) {
      this.logger.warn(`Idempotency key ${idempotencyKey} already processed. Returning existing request with status: ${existingRequest.status}`);
      return existingRequest;
    }

    if (!Types.ObjectId.isValid(eventIdString)) {
      throw new BadRequestException('유효하지 않은 이벤트 ID 형식입니다.');
    }
    const eventObjectId = new Types.ObjectId(eventIdString);
    const event = await this.eventModel.findById(eventObjectId).exec();
    if (!event) {
      throw new NotFoundException(`이벤트(ID: ${eventIdString})를 찾을 수 없습니다.`);
    }

    const newRequestDoc = new this.userRewardRequestModel({
      requestId: idempotencyKey,
      userId,
      eventId: eventObjectId,
      eventSnapshot: {
        eventName: event.eventName,
        conditions: event.conditions,
        rewards: event.rewards.map(r => r.toObject ? r.toObject() : r)
      },
      status: 'PENDING_VALIDATION',
      currentSagaStep: 'S0_REQUEST_INITIALIZED',
      rewardsToProcess: event.rewards.map(reward => ({
        rewardDetailsSnapshot: reward.toObject ? reward.toObject() : reward,
        grantStatus: 'PENDING',
      })),
    });

    try {
      existingRequest = await newRequestDoc.save();
      this.logger.log(`New reward request created: ${existingRequest.requestId}, Status: ${existingRequest.status}`);
    } catch (error) {
      if (error.code === 11000) {
        this.logger.warn(`Race condition for idempotency key ${idempotencyKey}. Fetching existing.`);
        existingRequest = await this.userRewardRequestModel.findOne({ requestId: idempotencyKey }).exec();
        if (!existingRequest) {
          this.logger.error(`Failed to save or find request for ${idempotencyKey} after race condition.`);
          throw new InternalServerErrorException('보상 요청 처리 중 오류가 발생했습니다 (IDP_RC_ERR).');
        }
        return existingRequest;
      }
      this.logger.error(`Error saving new reward request: ${error.message}`, error.stack);
      throw new InternalServerErrorException('보상 요청 저장 중 오류가 발생했습니다.');
    }

    try {
      await this.processRewardClaimSaga(existingRequest);
    } catch (sagaError) {
      this.logger.error(`Saga processing for ${existingRequest.requestId} threw an unhandled error: ${sagaError.message}`, sagaError.stack);
      // DB에서 최신 문서를 다시 읽어와서 상태를 업데이트하는 것이 더 안전할 수 있습니다.
      const finalFailedRequest = await this.userRewardRequestModel.findById(existingRequest._id).exec();
      if (finalFailedRequest && !finalFailedRequest.status.startsWith("SUCCESS_") && !finalFailedRequest.status.startsWith("FAILED_") && finalFailedRequest.status !== 'COMPENSATION_FAILED_MANUAL_INTERVENTION_REQUIRED') {
        finalFailedRequest.status = 'COMPENSATION_FAILED_MANUAL_INTERVENTION_REQUIRED';
        finalFailedRequest.failureReason = `Saga execution unhandled error: ${sagaError.message}`;
        await finalFailedRequest.save().catch(saveErr => this.logger.error(`Failed to save CRITICAL error state for ${finalFailedRequest.requestId}`, saveErr.stack));
        return finalFailedRequest;
      }
      // 만약 위에서 existingRequest가 어떤 이유로든 null이 되었다면 (거의 불가능하지만)
      if (!finalFailedRequest && existingRequest) { // existingRequest는 newRequestDoc.save()의 결과이므로 null이 아님
        existingRequest.status = 'COMPENSATION_FAILED_MANUAL_INTERVENTION_REQUIRED';
        existingRequest.failureReason = `Saga execution unhandled error (original doc not found post-error): ${sagaError.message}`;
        await existingRequest.save().catch(saveErr => this.logger.error(`Failed to save CRITICAL error state for ${existingRequest.requestId} (fallback)`, saveErr.stack));
      }
    }

    return this.userRewardRequestModel.findById(existingRequest._id).exec();
  }

  async findByUserId(
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{ data: UserRewardRequestDocument[], total: number, currentPage: number, totalPages: number }> {
    if (!userId) {
      throw new BadRequestException('사용자 ID는 필수입니다.');
    }
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const total = await this.userRewardRequestModel.countDocuments(query).exec();

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const data = await this.userRewardRequestModel
    .find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .select('-eventSnapshot -compensatingActionsLog -rewardsToProcess.rewardDetailsSnapshot') // 응답에서 민감하거나 너무 큰 필드 제외
    .populate('eventId', 'eventName status') // 이벤트 ID로 이벤트 이름, 상태 함께 조회 (선택적)
    .exec();

    this.logger.log(`Finding claims for userId: ${userId}. Status: ${status}, Page: ${page}, Limit: ${limit}. Found: <span class="math-inline">\{data\.length\}/</span>{total}`);
    return { data, total, currentPage: page, totalPages: Math.ceil(total / limit) };
  }

  private async processRewardClaimSaga(requestDoc: UserRewardRequestDocument): Promise<void> {
    let currentRequest = requestDoc;
    this.logger.log(`[Saga:${currentRequest.requestId}] Starting. Step: ${currentRequest.currentSagaStep}, Status: ${currentRequest.status}`);

    try {
      // S1: 사용자 및 이벤트 유효성 검증
      if (currentRequest.status === 'PENDING_VALIDATION') {
        currentRequest.currentSagaStep = 'S1_VALIDATE_USER_EVENT';
        const isActiveUser = await this.mockAuthService.isUserActive(currentRequest.userId);
        if (!isActiveUser) {
          currentRequest.status = 'VALIDATION_FAILED_USER_INACTIVE';
          currentRequest.failureReason = '사용자가 비활성 상태입니다.';
          await currentRequest.save();
          this.logger.warn(`[Saga:${currentRequest.requestId}] ${currentRequest.failureReason}`);
          return;
        }

        const event = await this.eventModel.findById(currentRequest.eventId).exec();
        if (!event || event.status !== 'ACTIVE' || new Date() < event.startDate || new Date() > event.endDate) {
          currentRequest.status = 'VALIDATION_FAILED_EVENT_NOT_ACTIVE';
          currentRequest.failureReason = '이벤트가 활성 상태가 아니거나 기간이 유효하지 않습니다.';
          await currentRequest.save();
          this.logger.warn(`[Saga:${currentRequest.requestId}] ${currentRequest.failureReason}`);
          return;
        }
        const alreadyClaimed = await this.userRewardRequestModel.findOne({
          userId: currentRequest.userId, eventId: currentRequest.eventId, status: 'SUCCESS_ALL_GRANTED',
        }).exec();
        if (alreadyClaimed) {
          currentRequest.status = 'VALIDATION_FAILED_ALREADY_CLAIMED';
          currentRequest.failureReason = '이미 해당 이벤트의 보상을 수령했습니다.';
          await currentRequest.save();
          this.logger.warn(`[Saga:${currentRequest.requestId}] ${currentRequest.failureReason}`);
          return;
        }
        currentRequest.status = 'PENDING_CONDITION_CHECK';
        await currentRequest.save();
        this.logger.log(`[Saga:${currentRequest.requestId}] S1: User/Event validation successful. Status: ${currentRequest.status}`);
      }

      // S2: 조건 달성 여부 검증
      if (currentRequest.status === 'PENDING_CONDITION_CHECK') {
        currentRequest.currentSagaStep = 'S2_CHECK_CONDITIONS';
        const eventConditions = (currentRequest.eventSnapshot as any)?.conditions;
        if (!eventConditions) {
          this.logger.error(`[Saga:${currentRequest.requestId}] Event conditions not found in snapshot for S2.`);
          currentRequest.status = 'CONDITION_CHECK_FAILED_EXTERNAL'; // 또는 다른 적절한 에러 상태
          currentRequest.failureReason = '이벤트 조건 정보를 스냅샷에서 찾을 수 없습니다.';
          await currentRequest.save();
          return;
        }
        const conditionsMet = await this.mockGameDataService.checkConditions(currentRequest.userId, eventConditions);
        if (!conditionsMet) {
          currentRequest.status = 'CONDITION_NOT_MET';
          currentRequest.failureReason = '이벤트 조건을 충족하지 못했습니다.';
          await currentRequest.save();
          this.logger.warn(`[Saga:${currentRequest.requestId}] ${currentRequest.failureReason}`);
          return;
        }

        const hasLimitedStockReward = currentRequest.rewardsToProcess.some(
          pReward => (pReward.rewardDetailsSnapshot as Reward).totalStock !== -1 && (pReward.rewardDetailsSnapshot as Reward).totalStock !== null
        );
        currentRequest.status = hasLimitedStockReward ? 'PENDING_INVENTORY_ALLOCATION' : 'PENDING_REWARD_GRANT';
        await currentRequest.save();
        this.logger.log(`[Saga:${currentRequest.requestId}] S2: Condition check successful. Status: ${currentRequest.status}`);
      }

      // S3: 보상 재고 확인 및 반영 (단순화)
      if (currentRequest.status === 'PENDING_INVENTORY_ALLOCATION') {
        currentRequest.currentSagaStep = 'S3_ALLOCATE_INVENTORY';
        // S3 시작 시 최신 이벤트 정보 다시 로드 (재고 정확성 위해)
        const eventForInventory = await this.eventModel.findById(currentRequest.eventId).exec();
        if (!eventForInventory) {
          this.logger.error(`[Saga:${currentRequest.requestId}] Event ${currentRequest.eventId} not found during S3 for inventory check.`);
          currentRequest.status = 'INVENTORY_ALLOCATION_ERROR';
          currentRequest.failureReason = '재고 확인 중 대상 이벤트를 찾을 수 없습니다.';
          await currentRequest.save();
          return;
        }

        let allStockAllocated = true;
        for (const rewardToProcess of currentRequest.rewardsToProcess) {
          const snapshotReward = rewardToProcess.rewardDetailsSnapshot as Reward & { _id?: Types.ObjectId };
          const eventReward = eventForInventory.rewards.find(r => r._id && snapshotReward._id && r._id.equals(snapshotReward._id));

          if (!eventReward) {
            this.logger.error(`[Saga:${currentRequest.requestId}] Reward ID ${snapshotReward._id} from snapshot not found in current event. Critical data mismatch.`);
            rewardToProcess.grantStatus = 'FAILED_INVENTORY_ERROR';
            rewardToProcess.failureReason = `원본 이벤트에서 보상 ID ${snapshotReward._id}(이름: ${snapshotReward.rewardName})를 찾을 수 없습니다.`;
            allStockAllocated = false;
            break;
          }

          if (eventReward.totalStock !== -1 && eventReward.totalStock !== null) { // 한정 수량 보상
            if (typeof eventReward.remainingStock === 'number' && eventReward.remainingStock > 0) {
              const updateResult = await this.eventModel.updateOne(
                { _id: eventForInventory._id, 'rewards._id': eventReward._id, 'rewards.remainingStock': { $gte: 1 } }, // $gte: 1 로 변경
                { $inc: { 'rewards.$.remainingStock': -1 } }
              ).exec();
              if (updateResult.modifiedCount > 0) {
                rewardToProcess.grantStatus = 'INVENTORY_ALLOCATED';
                this.logger.log(`[Saga:${currentRequest.requestId}] Inventory allocated for reward: ${eventReward.rewardName}`);
              } else {
                this.logger.warn(`[Saga:${currentRequest.requestId}] Out of stock or update race for reward: ${eventReward.rewardName}. DB remainingStock was likely <= 0 or changed.`);
                rewardToProcess.grantStatus = 'FAILED_OUT_OF_STOCK';
                allStockAllocated = false; break;
              }
            } else {
              this.logger.warn(`[Saga:${currentRequest.requestId}] Out of stock (remaining: ${eventReward.remainingStock}) for reward: ${eventReward.rewardName}`);
              rewardToProcess.grantStatus = 'FAILED_OUT_OF_STOCK';
              allStockAllocated = false; break;
            }
          } else { // 무제한 보상
            rewardToProcess.grantStatus = 'INVENTORY_ALLOCATED';
          }
        }
        currentRequest.markModified('rewardsToProcess');

        if (!allStockAllocated) {
          currentRequest.status = 'INVENTORY_ALLOCATION_FAILED_OUT_OF_STOCK';
          currentRequest.failureReason = currentRequest.failureReason || '일부 보상의 재고가 부족하거나 할당 중 오류가 발생했습니다.';
          await this.compensateInventory(currentRequest, eventForInventory); // eventForInventory 전달
          currentRequest.status = 'FAILED_ROLLED_BACK';
          await currentRequest.save();
          this.logger.warn(`[Saga:${currentRequest.requestId}] ${currentRequest.failureReason}. Inventory compensated.`);
          return;
        }
        currentRequest.status = 'PENDING_REWARD_GRANT';
        await currentRequest.save();
        this.logger.log(`[Saga:${currentRequest.requestId}] S3: Inventory allocation successful. Status: ${currentRequest.status}`);
      }

      // S4: 실제 보상 지급 (Mock)
      if (currentRequest.status === 'PENDING_REWARD_GRANT') {
        currentRequest.currentSagaStep = 'S4_GRANT_REWARDS';
        let allRewardsGrantedSuccessfully = true;
        for (const rewardToProcess of currentRequest.rewardsToProcess) {
          if (rewardToProcess.grantStatus === 'INVENTORY_ALLOCATED') {
            const isActiveUser = await this.mockAuthService.isUserActive(currentRequest.userId);
            if (!isActiveUser) {
              currentRequest.status = 'REWARD_GRANT_FAILED_USER_INACTIVE';
              currentRequest.failureReason = '보상 지급 직전 사용자 비활성화됨.';
              allRewardsGrantedSuccessfully = false; break;
            }
            const grantResult = await this.mockRewardFulfillmentService.grantReward(currentRequest.userId, rewardToProcess.rewardDetailsSnapshot as Reward);
            if (grantResult.success) {
              rewardToProcess.grantStatus = 'SUCCESS';
              rewardToProcess.processedAt = new Date();
              this.logger.log(`[Saga:${currentRequest.requestId}] Reward granted: ${(rewardToProcess.rewardDetailsSnapshot as Reward).rewardName}`);
            } else {
              rewardToProcess.grantStatus = 'FAILED_EXTERNAL';
              rewardToProcess.failureReason = grantResult.failureReason;
              allRewardsGrantedSuccessfully = false;
              this.logger.warn(`[Saga:${currentRequest.requestId}] Failed to grant reward: ${(rewardToProcess.rewardDetailsSnapshot as Reward).rewardName}. Reason: ${grantResult.failureReason}`);
              break;
            }
          } else if (rewardToProcess.grantStatus !== 'SUCCESS') {
            allRewardsGrantedSuccessfully = false;
          }
        }
        currentRequest.markModified('rewardsToProcess');

        if (!allRewardsGrantedSuccessfully) {
          if (currentRequest.status !== 'REWARD_GRANT_FAILED_USER_INACTIVE') {
            currentRequest.status = 'REWARD_GRANT_FAILED_EXTERNAL';
            currentRequest.failureReason = currentRequest.failureReason || '일부 보상 지급에 실패했습니다.';
          }
          const eventForCompensationOnGrantFail = await this.eventModel.findById(currentRequest.eventId).exec();
          if (eventForCompensationOnGrantFail) {
            await this.compensateInventory(currentRequest, eventForCompensationOnGrantFail, true);
          } else {
            this.logger.error(`[Saga:${currentRequest.requestId}] Event not found for inventory compensation after grant failure.`);
          }
          currentRequest.status = 'FAILED_ROLLED_BACK';
          await currentRequest.save();
          this.logger.warn(`[Saga:${currentRequest.requestId}] ${currentRequest.failureReason}. Rewards and inventory compensated.`);
          return;
        }
        currentRequest.status = 'SUCCESS_ALL_GRANTED';
        currentRequest.rewardsGrantedAt = new Date();
        await currentRequest.save();
        this.logger.log(`[Saga:${currentRequest.requestId}] S4: All rewards granted successfully! Status: ${currentRequest.status}`);
      }

      // S5: 최종 처리
      if (currentRequest.status === 'SUCCESS_ALL_GRANTED' || currentRequest.status.startsWith("FAILED_") || currentRequest.status.startsWith("COMPENSATED_") || currentRequest.status === 'REWARD_PARTIALLY_GRANTED') {
        currentRequest.currentSagaStep = 'S5_COMPLETED';
        this.logger.log(`[Saga:${currentRequest.requestId}] Saga completed. Final Status: ${currentRequest.status}`);
        await currentRequest.save();
      }

    } catch (error) {
      this.logger.error(`[Saga:${currentRequest.requestId}] Unhandled exception in Saga process. Current Step: ${currentRequest.currentSagaStep}, Status: ${currentRequest.status}. Error: ${error.message}`, error.stack);
      try {
        const freshRequest = await this.userRewardRequestModel.findById(currentRequest._id).exec();
        if (freshRequest) {
          if (!freshRequest.status.startsWith("SUCCESS_") && !freshRequest.status.startsWith("FAILED_") && freshRequest.status !== 'COMPENSATION_FAILED_MANUAL_INTERVENTION_REQUIRED') {
            freshRequest.status = 'COMPENSATION_FAILED_MANUAL_INTERVENTION_REQUIRED';
            freshRequest.failureReason = `Saga 중 예기치 않은 심각한 오류: ${error.message}`;
            freshRequest.currentSagaStep = freshRequest.currentSagaStep || 'UNKNOWN_ERROR_STEP_AT_EXCEPTION';
            freshRequest.markModified('rewardsToProcess');
            await freshRequest.save();
          }
        } else {
          this.logger.error(`CRITICAL: Request document ${currentRequest.requestId} not found during unhandled exception finalization.`);
        }
      } catch (saveError) {
        this.logger.error(`Failed to save CRITICAL error state for ${currentRequest.requestId} after unhandled exception: ${saveError.message}`, saveError.stack);
      }
    }
  }

  private async compensateInventory(request: UserRewardRequestDocument, event: EventDocument, isGrantFailureRollback: boolean = false): Promise<void> {
    this.logger.warn(`[Saga:${request.requestId}] Attempting to compensate inventory. isGrantFailureRollback: ${isGrantFailureRollback}`);
    let inventoryActuallyChangedDuringSaga = false; // 실제 Saga 중 재고가 변경되었던 항목이 있는지
    for (const rewardToProcess of request.rewardsToProcess) {
      // S3에서 INVENTORY_ALLOCATED로 마킹되었거나 (즉, 이 Saga에서 재고를 줄였거나),
      // S4에서 SUCCESS로 마킹된 후 롤백하는 경우 (즉, 이 Saga에서 재고를 줄였고, 지급도 성공했다고 마킹했지만 전체 롤백 대상)
      const wasStockAllocatedInThisSaga = rewardToProcess.grantStatus === 'INVENTORY_ALLOCATED' ||
        (isGrantFailureRollback && rewardToProcess.grantStatus === 'SUCCESS');

      if (wasStockAllocatedInThisSaga) {
        const snapshotReward = rewardToProcess.rewardDetailsSnapshot as Reward & { _id?: Types.ObjectId };
        // 이벤트의 최신 보상 목록에서 해당 보상을 다시 찾음 (롤백 시점의 정확한 재고 반영 위해)
        const currentEventRewardInDB = event.rewards.find(r => r._id && snapshotReward._id && r._id.equals(snapshotReward._id));

        if (currentEventRewardInDB && currentEventRewardInDB.totalStock !== -1 && currentEventRewardInDB.totalStock !== null) { // 한정 수량 보상만 롤백
          // remainingStock이 totalStock을 초과하지 않도록 주의하며 롤백
          // 하지만 단순히 +1 하는 것이 일반적인 보상 트랜잭션
          await this.eventModel.updateOne(
            { _id: event._id, 'rewards._id': currentEventRewardInDB._id },
            { $inc: { 'rewards.$.remainingStock': 1 } }
          ).exec();
          this.logger.log(`[Saga:${request.requestId}] Inventory +1 for reward: ${currentEventRewardInDB.rewardName}`);
          inventoryActuallyChangedDuringSaga = true;
        }
        rewardToProcess.grantStatus = 'ROLLED_BACK_INVENTORY';
      }
    }
    if (inventoryActuallyChangedDuringSaga) {
      request.markModified('rewardsToProcess');
    }
  }
}