import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';

@Injectable()
export class EventsService {
    constructor(
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    ) {}

    async create(createEventDto: CreateEventDto, createdByUserId: string): Promise<EventDocument> {
        const { eventName, startDate, endDate, conditions, rewards } = createEventDto;

        // 날짜 유효성 검사 (예: 종료일이 시작일보다 이전일 수 없음)
        if (new Date(endDate) <= new Date(startDate)) {
            throw new BadRequestException('이벤트 종료일은 시작일보다 이후여야 합니다.');
        }

        const newEvent = new this.eventModel({
            ...createEventDto,
            rewards: rewards?.map(reward => ({ ...reward, _id: new Types.ObjectId() })) || [], // 각 보상에 _id 수동 할당 예시 (Reward 스키마에 default 없거나 _id:false 시)
            // 현재 Reward 스키마는 _id 자동생성이므로 rewards 그대로 전달해도 됨.
            createdBy: createdByUserId,
            status: 'DRAFT',
        });

        try {
            return await newEvent.save();
        } catch (error) {
            // 예: MongoDB 유니크 인덱스 위반 (eventName이 유니크하다면)
            if (error.code === 11000) {
                throw new ConflictException(`이벤트 이름 '${eventName}'은 이미 사용중입니다.`);
            }
            throw error;
        }
    }

    async findAll(status?: string, page: number = 1, limit: number = 10): Promise<{ data: EventDocument[], total: number, currentPage: number, totalPages: number }> {
        const query: any = {};
        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;
        const total = await this.eventModel.countDocuments(query).exec();
        const data = await this.eventModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

        return {
            data,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findOne(id: string): Promise<EventDocument> {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new NotFoundException(`ID가 '${id}'인 이벤트를 찾을 수 없습니다.`);
        }
        return event;
    }

    async update(id: string, updateEventDto: UpdateEventDto, updatedByUserId: string): Promise<EventDocument> {
        const existingEvent = await this.eventModel.findById(id).exec();
        if (!existingEvent) {
            throw new NotFoundException(`ID가 '${id}'인 이벤트를 찾을 수 없습니다.`);
        }

        // TODO: 이벤트 상태에 따른 수정 제한 로직 추가 (예: ACTIVE 상태에서는 특정 필드만 수정 가능)

        if (updateEventDto.startDate && updateEventDto.endDate && new Date(updateEventDto.endDate) <= new Date(updateEventDto.startDate)) {
            throw new BadRequestException('이벤트 종료일은 시작일보다 이후여야 합니다.');
        } else if (updateEventDto.startDate && !updateEventDto.endDate && existingEvent.endDate <= new Date(updateEventDto.startDate)) {
            throw new BadRequestException('이벤트 종료일은 시작일보다 이후여야 합니다.');
        } else if (!updateEventDto.startDate && updateEventDto.endDate && new Date(updateEventDto.endDate) <= existingEvent.startDate) {
            throw new BadRequestException('이벤트 종료일은 시작일보다 이후여야 합니다.');
        }

        // DTO의 내용으로 이벤트 업데이트
        Object.assign(existingEvent, updateEventDto);
        existingEvent.updatedBy = updatedByUserId; // 마지막 수정자 정보 업데이트

        if (updateEventDto.rewards) {
            existingEvent.rewards = updateEventDto.rewards as Types.DocumentArray<any>; // 타입 단언
        }


        return await existingEvent.save();
    }

    async remove(id: string): Promise<void> { // 또는 논리적 삭제: Promise<EventDocument>
        const result = await this.eventModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0) {
            throw new NotFoundException(`ID가 '${id}'인 이벤트를 찾을 수 없습니다.`);
        }
    }

    async updateStatus(id: string, status: string, updatedByUserId: string): Promise<EventDocument> {
        const event = await this.findOne(id);
        // TODO: 유효한 상태 값인지, 상태 전이 규칙이 맞는지 검증 로직 추가
        const validStatuses = ['DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED', 'ARCHIVED'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException(`유효하지 않은 상태 값입니다: ${status}`);
        }
        event.status = status;
        event.updatedBy = updatedByUserId;
        return event.save();
    }
}