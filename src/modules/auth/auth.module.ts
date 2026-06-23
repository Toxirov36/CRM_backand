import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './google.strategy';
import { EskizService } from 'src/common/service/sms';

@Module({
  imports:[
    PassportModule,
    JwtModule.register({
      secret:"shapltoli",
      signOptions:{
        expiresIn:"1h"
      },
      global:true
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, EskizService]
})
export class AuthModule {}
