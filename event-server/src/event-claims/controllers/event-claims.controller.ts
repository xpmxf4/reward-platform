import { Controller, Post, Param, Body, Headers, Logger, BadRequestException, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventClaimsService } from '../services/event-claims.service';
import { CreateEventClaimDto } from '../dto/create-event-claim.dto';
import { UserRewardRequestDocument } from '../schemas/user-reward-request.schema';

interface UserInfoFromGateway {
    userId: string;
    userRoles: string[]; // 쉼표로 구분된 문자열을 배열로 변환
    username: string;
}

@Controller('event-claims')
export class EventClaimsController {
    private readonly logger = new Logger(EventClaimsController.name);

    constructor(private readonly eventClaimsService: EventClaimsService) {}

    /**
     * 사용자가 특정 이벤트에 대한 보상을 요청 (Saga 시작점)
     * @param eventId 대상 이벤트의 ID (URL 파라미터)
     * @param idempotencyKey 클라이언트가 제공하는 멱등성 키 (HTTP 헤더)
     * @param userId Gateway가 제공하는 사용자 ID (HTTP 헤더)
     * @param userRolesCsv Gateway가 제공하는 사용자 역할 (HTTP 헤더, 쉼표로 구분된 문자열)
     * @param username Gateway가 제공하는 사용자 이름 (HTTP 헤더)
     * @param createEventClaimDto 요청 바디 (선택적 추가 정보)
     * @returns 생성/조회된 UserRewardRequest 문서의 초기 상태 또는 간단한 접수 메시지
     */
    @Post(':eventId/claim')
    @HttpCode(HttpStatus.ACCEPTED)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    async claimReward(
        @Param('eventId') eventId: string,
        @Headers('x-idempotency-key') idempotencyKey: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-roles') userRolesCsv: string,
        @Headers('x-user-name') username: string,
        @Body() createEventClaimDto: CreateEventClaimDto,
    ): Promise<UserRewardRequestDocument | { message: string; requestId: string; status: string }> {

        if (!idempotencyKey) {
            throw new BadRequestException('필수 헤더가 누락되었습니다: X-Idempotency-Key');
        }
        if (!userId || !userRolesCsv || !username) {
            throw new BadRequestException('필수 사용자 정보 헤더(X-User-ID, X-User-Roles, X-User-Name)가 누락되었습니다. Gateway 설정을 확인하세요.');
        }
        const userRoles = userRolesCsv.split(',').map(role => role.trim()).filter(role => role.length > 0);
        if (userRoles.length === 0) {
            throw new BadRequestException('사용자 역할 정보(X-User-Roles)가 유효하지 않습니다.');
        }

        this.logger.log(`Reward claim request received for eventId: ${eventId} by userId: ${userId} (Username: <span class="math-inline">\{username\}, Roles\: \[</span>{userRoles.join(', ')}]), IdempotencyKey: ${idempotencyKey}`);
        this.logger.debug(`Request body (CreateEventClaimDto): ${JSON.stringify(createEventClaimDto)}`);

        const requestDocument = await this.eventClaimsService.initiateClaim(
            userId,
            userRoles,
            username,
            eventId,
            idempotencyKey,
            // createEventClaimDto, // 서비스 메서드 시그니처에 맞게 전달 (현재는 서비스에서 DTO 직접 안 받음)
        );

        // API 응답은 Saga의 초기 상태 또는 간단한 접수 확인 메시지
        if (!requestDocument) {
            throw new BadRequestException('보상 요청을 처리하는 중 오류가 발생했습니다.');
        }

        return {
            message: "보상 요청이 접수되었으며 처리 중입니다. 최종 결과는 별도로 확인해주세요.",
            requestId: requestDocument.requestId,
            status: requestDocument.status // 예: PENDING_VALIDATION
        };
    }

}