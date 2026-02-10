import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskAccessGuard } from './guards/task-access.guard';
import { Task } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';
import { TaskComment } from './entities/task-comment.entity';
import { ProjectModule } from '../project/project.module';
import { NotificationModule } from '../notification/notification.module';
import { Partner } from '../partner/entities/partner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Subtask, TaskComment, Partner]),
    forwardRef(() => ProjectModule),
    NotificationModule,
  ],
  controllers: [TaskController],
  providers: [TaskService, TaskAccessGuard],
  exports: [TaskService, TaskAccessGuard],
})
export class TaskModule {}
