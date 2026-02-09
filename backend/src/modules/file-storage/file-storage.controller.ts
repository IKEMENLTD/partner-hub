import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileStorageService } from './file-storage.service';
import { UploadFileDto, FileResponseDto, SignedUrlResponseDto } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { FileCategory } from './enums/file-category.enum';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Post('files/upload')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'projectId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'Project ID',
        },
        taskId: {
          type: 'string',
          format: 'uuid',
          description: 'Task ID (optional)',
        },
        category: {
          type: 'string',
          enum: ['document', 'image', 'other'],
          description: 'File category',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Body('taskId') taskId: string,
    @Body('category') category: string,
    @CurrentUser('id') userId: string,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new BusinessException('VALIDATION_001', {
        message: 'ファイルが指定されていません',
        userMessage: 'ファイルが提供されていません',
      });
    }

    if (!projectId) {
      throw new BusinessException('VALIDATION_001', {
        message: '案件IDは必須です',
        userMessage: 'プロジェクトIDが必要です',
      });
    }

    const fileCategory = category as FileCategory | undefined;

    const projectFile = await this.fileStorageService.uploadFile(
      file,
      projectId,
      userId,
      taskId || undefined,
      fileCategory,
    );

    return this.toResponseDto(projectFile);
  }

  @Get('projects/:projectId/files')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get files for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of files',
    type: [FileResponseDto],
  })
  async getFilesByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<FileResponseDto[]> {
    const files = await this.fileStorageService.getFilesByProject(projectId);
    return files.map((file) => this.toResponseDto(file));
  }

  @Get('tasks/:taskId/files')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get files for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'List of files',
    type: [FileResponseDto],
  })
  async getFilesByTask(@Param('taskId', ParseUUIDPipe) taskId: string): Promise<FileResponseDto[]> {
    const files = await this.fileStorageService.getFilesByTask(taskId);
    return files.map((file) => this.toResponseDto(file));
  }

  @Get('files/:id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File details',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param('id', ParseUUIDPipe) id: string): Promise<FileResponseDto> {
    const file = await this.fileStorageService.getFileById(id);
    return this.toResponseDto(file);
  }

  @Delete('files/:id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.fileStorageService.deleteFile(id);
  }

  @Get('files/:id/download')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get signed download URL for a file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({
    name: 'expiresIn',
    required: false,
    type: Number,
    description: 'URL expiration time in seconds (default: 3600)',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated',
    type: SignedUrlResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('expiresIn') expiresIn?: number,
  ): Promise<SignedUrlResponseDto> {
    const expirationSeconds = expiresIn ? Number(expiresIn) : 3600;
    return this.fileStorageService.generateSignedUrl(id, expirationSeconds);
  }

  private toResponseDto(file: any): FileResponseDto {
    return {
      id: file.id,
      projectId: file.projectId,
      taskId: file.taskId,
      uploaderId: file.uploaderId,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: Number(file.fileSize),
      storagePath: file.storagePath,
      publicUrl: file.publicUrl,
      category: file.category,
      createdAt: file.createdAt,
      uploader: file.uploader
        ? {
            id: file.uploader.id,
            firstName: file.uploader.firstName,
            lastName: file.uploader.lastName,
            email: file.uploader.email,
          }
        : undefined,
    };
  }
}
