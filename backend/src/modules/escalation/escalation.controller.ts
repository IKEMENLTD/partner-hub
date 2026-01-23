import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { EscalationService } from './escalation.service';
import {
  CreateEscalationRuleDto,
  UpdateEscalationRuleDto,
  QueryEscalationRuleDto,
  QueryEscalationLogDto,
  TriggerEscalationCheckDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Escalations')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('escalations')
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  // ========================
  // Rules Endpoints
  // ========================

  @Get('rules')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all escalation rules with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of escalation rules' })
  async findAllRules(@Query() queryDto: QueryEscalationRuleDto) {
    return this.escalationService.findAllRules(queryDto);
  }

  @Get('rules/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get escalation rule by ID' })
  @ApiParam({ name: 'id', description: 'Escalation Rule ID' })
  @ApiResponse({ status: 200, description: 'Escalation rule details' })
  @ApiResponse({ status: 404, description: 'Escalation rule not found' })
  async findRuleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.escalationService.findRuleById(id);
  }

  @Post('rules')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new escalation rule' })
  @ApiResponse({ status: 201, description: 'Escalation rule created successfully' })
  async createRule(
    @Body() createRuleDto: CreateEscalationRuleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.escalationService.createRule(createRuleDto, userId);
  }

  @Patch('rules/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update escalation rule' })
  @ApiParam({ name: 'id', description: 'Escalation Rule ID' })
  @ApiResponse({ status: 200, description: 'Escalation rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Escalation rule not found' })
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRuleDto: UpdateEscalationRuleDto,
  ) {
    return this.escalationService.updateRule(id, updateRuleDto);
  }

  @Delete('rules/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete escalation rule' })
  @ApiParam({ name: 'id', description: 'Escalation Rule ID' })
  @ApiResponse({ status: 204, description: 'Escalation rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Escalation rule not found' })
  async deleteRule(@Param('id', ParseUUIDPipe) id: string) {
    await this.escalationService.deleteRule(id);
  }

  // ========================
  // Logs Endpoints
  // ========================

  @Get('logs')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all escalation logs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of escalation logs' })
  async findAllLogs(@Query() queryDto: QueryEscalationLogDto) {
    return this.escalationService.findAllLogs(queryDto);
  }

  @Get('logs/project/:projectId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get escalation history for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Escalation history for the project' })
  async getEscalationHistory(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.escalationService.getEscalationHistory(projectId);
  }

  // ========================
  // Escalation Check Endpoints
  // ========================

  @Post('check')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Manually trigger escalation check' })
  @ApiResponse({
    status: 200,
    description: 'Escalation check completed',
    schema: {
      properties: {
        tasksChecked: { type: 'number' },
        escalationsTriggered: { type: 'number' },
        logs: { type: 'array' },
      },
    },
  })
  async triggerCheck(@Body() checkDto: TriggerEscalationCheckDto) {
    return this.escalationService.triggerEscalationCheck(checkDto);
  }

  // ========================
  // Statistics Endpoint
  // ========================

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get escalation statistics' })
  @ApiResponse({ status: 200, description: 'Escalation statistics' })
  async getStatistics() {
    return this.escalationService.getEscalationStatistics();
  }
}
