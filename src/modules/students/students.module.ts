import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { EmailModule } from 'src/common/email/email.module';
import { EskizService } from 'src/common/service/sms';

@Module({
  imports:[EmailModule],
  controllers: [StudentsController],
  providers: [StudentsService, EskizService]
})
export class StudentsModule {}
