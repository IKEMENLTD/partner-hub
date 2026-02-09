import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PartnerEvaluationService } from './services/partner-evaluation.service';
import { CreatePartnerEvaluationDto, QueryPartnerEvaluationDto } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Partner Evaluations')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('partners/:partnerId/evaluation')
export class PartnerEvaluationController {
  constructor(private readonly evaluationService: PartnerEvaluationService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get partner evaluation summary' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({
    status: 200,
    description: 'Partner evaluation summary including auto metrics and manual evaluations',
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getEvaluationSummary(@Param('partnerId', ParseUUIDPipe) partnerId: string) {
    return this.evaluationService.getEvaluationSummary(partnerId);
  }

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get partner evaluation history' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'List of evaluation history' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getEvaluationHistory(
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
    @Query() queryDto: QueryPartnerEvaluationDto,
  ) {
    return this.evaluationService.getEvaluationHistory(partnerId, queryDto);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add a manual evaluation for a partner' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 201, description: 'Evaluation created successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 400, description: 'Invalid evaluation data' })
  async createEvaluation(
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
    @Body() createEvaluationDto: CreatePartnerEvaluationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.evaluationService.createEvaluation(partnerId, userId, createEvaluationDto);
  }

  @Get('auto-metrics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get auto-calculated metrics for a partner' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({
    status: 200,
    description:
      'Auto-calculated metrics including deadline compliance, report submission rate, and response time',
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getAutoMetrics(@Param('partnerId', ParseUUIDPipe) partnerId: string) {
    return this.evaluationService.getAutoMetrics(partnerId);
  }
}
