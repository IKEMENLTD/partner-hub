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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TemplateService } from './template.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  ApplyTemplateDto,
  QueryTemplateDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Templates')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templateService.create(createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async findAll(@Query() queryDto: QueryTemplateDto) {
    return this.templateService.findAll(queryDto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active templates' })
  @ApiResponse({ status: 200, description: 'List of active templates' })
  async findActiveTemplates() {
    return this.templateService.findActiveTemplates();
  }

  @Get('by-project-type/:projectType')
  @ApiOperation({ summary: 'Get templates by project type' })
  @ApiParam({ name: 'projectType', description: 'Project type' })
  @ApiResponse({ status: 200, description: 'List of templates for the project type' })
  async findByProjectType(@Param('projectType') projectType: string) {
    return this.templateService.findByProjectType(projectType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templateService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templateService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.templateService.remove(id);
  }

  @Post(':id/apply')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Apply template to create a new project with tasks' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 201, description: 'Project created successfully from template' })
  @ApiResponse({ status: 400, description: 'Template is inactive or invalid input' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async applyTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() applyTemplateDto: ApplyTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.templateService.applyTemplate(id, applyTemplateDto, userId);
  }
}
