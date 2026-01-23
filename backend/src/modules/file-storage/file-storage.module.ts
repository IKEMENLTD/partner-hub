import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { ProjectFile } from './entities/project-file.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectFile]),
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [FileStorageController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
