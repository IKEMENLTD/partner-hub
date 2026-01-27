import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Project } from '../project/entities/project.entity';
import { Partner } from '../partner/entities/partner.entity';
import { Task } from '../task/entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Partner, Task])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
