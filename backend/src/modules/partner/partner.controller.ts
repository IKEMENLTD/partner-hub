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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import { PartnerInvitationService } from './services/partner-invitation.service';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
  QueryPartnerDto,
  UpdatePartnerStatusDto,
  UpdatePartnerRatingDto,
  AcceptInvitationDto,
  RegisterWithInvitationDto,
  InvitationRegisterResponseDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PartnerAccessGuard } from './guards/partner-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Partners')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('partners')
export class PartnerController {
  constructor(
    private readonly partnerService: PartnerService,
    private readonly partnerInvitationService: PartnerInvitationService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created successfully' })
  @ApiResponse({ status: 409, description: 'Partner already exists' })
  async create(@Body() createPartnerDto: CreatePartnerDto, @CurrentUser('id') userId: string) {
    return this.partnerService.create(createPartnerDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all partners with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of partners' })
  async findAll(@Query() queryDto: QueryPartnerDto) {
    return this.partnerService.findAll(queryDto);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get partner statistics' })
  @ApiResponse({ status: 200, description: 'Partner statistics' })
  async getStatistics() {
    return this.partnerService.getPartnerStatistics();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active partners' })
  @ApiResponse({ status: 200, description: 'List of active partners' })
  async getActivePartners() {
    return this.partnerService.getActivePartners();
  }

  @Get('by-skills')
  @ApiOperation({ summary: 'Get partners by skills' })
  @ApiResponse({ status: 200, description: 'List of partners matching skills' })
  async getBySkills(@Query('skills') skills: string) {
    const skillsArray = skills.split(',').map((s) => s.trim());
    return this.partnerService.getPartnersBySkills(skillsArray);
  }

  @Get(':id/projects')
  @UseGuards(PartnerAccessGuard)
  @ApiOperation({ summary: 'Get projects associated with a partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'List of projects for the partner' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPartnerProjects(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerService.getProjectsByPartner(id);
  }

  @Get(':id')
  @UseGuards(PartnerAccessGuard)
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner details' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PartnerAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner updated successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updatePartnerDto: UpdatePartnerDto) {
    return this.partnerService.update(id, updatePartnerDto);
  }

  @Patch(':id/status')
  @UseGuards(PartnerAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update partner status' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner status updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdatePartnerStatusDto,
  ) {
    return this.partnerService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/rating')
  @UseGuards(PartnerAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update partner rating' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner rating updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 400, description: 'Invalid rating value (must be 1-5)' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateRating(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRatingDto: UpdatePartnerRatingDto,
  ) {
    return this.partnerService.updateRating(id, updateRatingDto.rating);
  }

  // ==================== Invitation Endpoints ====================

  @Post(':id/invite')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Send invitation email to partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 409, description: 'Partner already has a linked account' })
  async sendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const invitation = await this.partnerInvitationService.sendInvitation(id, userId);
    return {
      message: 'Invitation sent successfully',
      expiresAt: invitation.expiresAt,
    };
  }

  @Get('invitation/verify')
  @Public()
  @ApiOperation({ summary: 'Verify invitation token' })
  @ApiQuery({ name: 'token', required: true, description: 'Invitation token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 400, description: 'Token expired or already used' })
  @ApiResponse({ status: 404, description: 'Invalid token' })
  async verifyInvitation(@Query('token') token: string) {
    const { partner } = await this.partnerInvitationService.verifyToken(token);
    return {
      valid: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        companyName: partner.companyName,
      },
    };
  }

  @Public()
  @Post('invitation/accept')
  @ApiOperation({ summary: 'Accept invitation and link partner to user account' })
  @ApiResponse({ status: 200, description: 'Invitation accepted, partner linked' })
  @ApiResponse({ status: 400, description: 'Token expired, already used, or email mismatch' })
  @ApiResponse({ status: 404, description: 'Invalid token' })
  @ApiResponse({ status: 409, description: 'Partner already linked' })
  async acceptInvitation(@Body() acceptDto: AcceptInvitationDto) {
    const partner = await this.partnerInvitationService.acceptInvitation(
      acceptDto.token,
      acceptDto.userId,
    );
    return {
      message: 'Invitation accepted successfully',
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
      },
    };
  }

  @Public()
  @Post('invitation/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register new user via invitation (skips email verification)',
    description: 'Creates a new user account with email verification skipped, links to partner, and returns a login session.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered and linked to partner successfully',
    type: InvitationRegisterResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data, token expired, or email mismatch' })
  @ApiResponse({ status: 404, description: 'Invalid invitation token' })
  @ApiResponse({ status: 409, description: 'Partner already linked or email already registered' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async registerWithInvitation(
    @Body() registerDto: RegisterWithInvitationDto,
  ): Promise<InvitationRegisterResponseDto> {
    return this.partnerInvitationService.registerWithInvitation(registerDto);
  }

  @Post(':id/resend-invitation')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Resend invitation email to partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 201, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 409, description: 'Partner already has a linked account' })
  async resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const invitation = await this.partnerInvitationService.resendInvitation(id, userId);
    return {
      message: 'Invitation resent successfully',
      expiresAt: invitation.expiresAt,
    };
  }

  // ==================== Delete Endpoint ====================

  @Delete(':id')
  @UseGuards(PartnerAccessGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.partnerService.remove(id);
    return { message: 'Partner deleted successfully' };
  }
}
