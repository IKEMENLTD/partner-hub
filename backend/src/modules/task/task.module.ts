import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskAccessGuard } from './guards/task-access.guard';
import { Task } from './entities/task.entity';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    forwardRef(() => ProjectModule),
  ],
  controllers: [TaskController],
  providers: [TaskService, TaskAccessGuard],
  exports: [TaskService, TaskAccessGuard],
})
export class TaskModule {}
