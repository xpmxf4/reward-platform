import { Controller, Post, Body, Get, Param, Put, Delete, Query, Patch, ParseIntPipe, DefaultValuePipe, UseGuards, Request as NestRequestDecorator } from '@nestjs/common'; // Request를 NestRequestDecorator로 alias
import { EventsService } from '../services/event.service';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto, EventStatusEnum } from '../dto/update-event.dto';
import { EventDocument } from '../schemas/event.schema';
import { Request as ExpressRequest } from 'express'; // ★★★ Express의 Request 타입을 직접 import ★★★

interface AuthenticatedUser {
  userId: string;
  username: string;
  roles: string[];
}

interface RequestWithUser extends ExpressRequest {
  user?: AuthenticatedUser;
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // @UseGuards(JwtAuthGuard) // 실제로는 Gateway에서 인증 처리 후 사용자 정보 전달받음
  // @Roles('OPERATOR', 'ADMIN')
  @Post()
  async create(@Body() createEventDto: CreateEventDto, @NestRequestDecorator() req: RequestWithUser): Promise<EventDocument> {
    const createdByUserId = req.user?.userId || 'temp-operator-id'; // 임시 ID 또는 req.headers['x-user-id']
    return this.eventsService.create(createEventDto, createdByUserId);
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ): Promise<{ data: EventDocument[], total: number, currentPage: number, totalPages: number }> {
    return this.eventsService.findAll(status, page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EventDocument> {
    return this.eventsService.findOne(id);
  }

  // @UseGuards(JwtAuthGuard)
  // @Roles('OPERATOR', 'ADMIN')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @NestRequestDecorator() req: RequestWithUser
  ): Promise<EventDocument> {
    const updatedByUserId = req.user?.userId || 'temp-operator-id'; // 임시 ID
    return this.eventsService.update(id, updateEventDto, updatedByUserId);
  }

  // @UseGuards(JwtAuthGuard)
  // @Roles('OPERATOR', 'ADMIN')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: EventStatusEnum,
    @NestRequestDecorator() req: RequestWithUser
  ): Promise<EventDocument> {
    const updatedByUserId = req.user?.userId || 'temp-operator-id'; // 임시 ID
    return this.eventsService.updateStatus(id, status, updatedByUserId);
  }

  // @UseGuards(JwtAuthGuard)
  // @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.eventsService.remove(id);
  }
}