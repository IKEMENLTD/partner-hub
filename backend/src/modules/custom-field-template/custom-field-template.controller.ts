import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CustomFieldTemplateService } from './custom-field-template.service';
import { CreateCustomFieldTemplateDto, QueryCustomFieldTemplateDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Custom Field Templates')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('custom-field-templates')
export class CustomFieldTemplateController {
  constructor(private readonly templateService: CustomFieldTemplateService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'カスタムフィールドテンプレートを作成' })
  @ApiResponse({ status: 201, description: 'テンプレートが作成されました' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  async create(@Body() createDto: CreateCustomFieldTemplateDto, @CurrentUser() user: UserProfile) {
    return this.templateService.create(createDto, user.id, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'カスタムフィールドテンプレート一覧を取得' })
  @ApiResponse({ status: 200, description: 'テンプレート一覧' })
  async findAll(@Query() queryDto: QueryCustomFieldTemplateDto, @CurrentUser() user: UserProfile) {
    return this.templateService.findAll(queryDto, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'カスタムフィールドテンプレート詳細を取得' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiResponse({ status: 200, description: 'テンプレート詳細' })
  @ApiResponse({ status: 404, description: 'テンプレートが見つかりません' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templateService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'カスタムフィールドテンプレートを削除' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiResponse({ status: 204, description: 'テンプレートが削除されました' })
  @ApiResponse({ status: 404, description: 'テンプレートが見つかりません' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.templateService.remove(id);
  }

  @Post(':id/increment-usage')
  @ApiOperation({ summary: 'テンプレートの使用回数をインクリメント' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiResponse({ status: 200, description: '使用回数が更新されました' })
  @ApiResponse({ status: 404, description: 'テンプレートが見つかりません' })
  async incrementUsage(@Param('id', ParseUUIDPipe) id: string) {
    return this.templateService.incrementUsageCount(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'テンプレートを非アクティブ化' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiResponse({ status: 200, description: 'テンプレートが非アクティブ化されました' })
  @ApiResponse({ status: 404, description: 'テンプレートが見つかりません' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templateService.deactivate(id);
  }
}
