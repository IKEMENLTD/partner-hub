import { Controller, Get, Query, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditAction } from './entities/audit-log.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all audit logs with pagination and filtering' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: AuditAction,
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'entityName',
    required: false,
    type: String,
    description: 'Filter by entity name',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by start date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by end date (ISO format)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityName') entityName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId,
      action,
      entityName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('entity/:entityName/:entityId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiParam({ name: 'entityName', description: 'Entity name (e.g., Partner, Project, Task)' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiResponse({ status: 200, description: 'List of audit logs for the entity' })
  async findByEntity(@Param('entityName') entityName: string, @Param('entityId') entityId: string) {
    return this.auditService.findByEntity(entityName, entityId);
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of logs to return (default: 100)',
  })
  @ApiResponse({ status: 200, description: 'List of audit logs for the user' })
  async findByUser(@Param('userId', ParseUUIDPipe) userId: string, @Query('limit') limit?: string) {
    return this.auditService.findByUser(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('recent')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get recent audit logs' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of logs to return (default: 50)',
  })
  @ApiResponse({ status: 200, description: 'List of recent audit logs' })
  async getRecentLogs(@Query('limit') limit?: string) {
    return this.auditService.getRecentLogs(limit ? parseInt(limit, 10) : undefined);
  }

  @Get('date-range')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit logs within a date range' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Start date (ISO format)',
  })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (ISO format)' })
  @ApiResponse({ status: 200, description: 'List of audit logs within the date range' })
  async findByDateRange(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.auditService.findByDateRange(new Date(startDate), new Date(endDate));
  }
}
