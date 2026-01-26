import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomFieldTemplate } from './entities/custom-field-template.entity';
import { CustomFieldTemplateService } from './custom-field-template.service';
import { CustomFieldTemplateController } from './custom-field-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomFieldTemplate])],
  controllers: [CustomFieldTemplateController],
  providers: [CustomFieldTemplateService],
  exports: [CustomFieldTemplateService],
})
export class CustomFieldTemplateModule {}
