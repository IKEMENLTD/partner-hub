import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService, SearchResults } from './search.service';
import { SearchQueryDto, SearchType } from './dto/search-query.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.PARTNER)
  @ApiOperation({
    summary: 'Global search across projects, partners, and tasks',
    description:
      'Searches for projects, partners, and tasks based on the provided keyword. Results are filtered based on user role and organization.',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search keyword',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'type',
    description: 'Type of resources to search',
    required: false,
    enum: SearchType,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results per type',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results grouped by type',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            projects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', example: 'project' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string' },
                  relevance: { type: 'number' },
                  metadata: { type: 'object' },
                },
              },
            },
            partners: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', example: 'partner' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string' },
                  relevance: { type: 'number' },
                  metadata: { type: 'object' },
                },
              },
            },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', example: 'task' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string' },
                  relevance: { type: 'number' },
                  metadata: { type: 'object' },
                },
              },
            },
            total: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(
    @Query() query: SearchQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<SearchResults> {
    return this.searchService.search(query, userId, userRole, organizationId);
  }
}
