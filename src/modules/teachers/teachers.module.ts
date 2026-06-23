import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { TeacherGroupService } from './teacherGroup/teacherGroup.service';
import { TeacherGroupController } from './teacherGroup/teacherGroup.controller';

@Module({
  controllers: [TeachersController, TeacherGroupController],
  providers: [TeachersService, TeacherGroupService]
})
export class TeachersModule { }
