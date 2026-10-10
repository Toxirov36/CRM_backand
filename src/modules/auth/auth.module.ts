import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './google.strategy';
import { EskizService } from 'src/common/service/sms';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports:[
    PassportModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is required');
        return { secret, signOptions: { expiresIn: '1h' } };
      },
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, EskizService]
})
export class AuthModule {}
