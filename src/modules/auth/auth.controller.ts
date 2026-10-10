import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CreateSuperAdminDto, LoginDto, ForgotPasswordDto, VerifyCodeDto, ResetPasswordDto, RefreshTokenDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService : AuthService){}

    @Post("login")
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    userLogin(@Body() payload : LoginDto){
        return this.authService.userLogin(payload)
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    googleAuth() {}

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthCallback(@Req() req: any, @Res() res: any) {
        const result = await this.authService.googleLogin(req.user);
        const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
        res.redirect(`${baseUrl}/auth/callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`);
    }

    @Post("refresh")
    refreshTokens(@Body() body: RefreshTokenDto) {
        return this.authService.refreshTokens(body.refreshToken);
    }

    @Post("logout")
    logout(@Body() body: RefreshTokenDto) {
        return this.authService.logout(body.refreshToken);
    }

    @Post('forgot-password')
    sendCode(@Body() body: ForgotPasswordDto) {
        return this.authService.sendResetCode(body.phone);
    }

    @Post('verify-code')
    verifyCode(@Body() body: VerifyCodeDto) {
        return this.authService.verifyResetCode(body.phone, body.code);
    }

    @Post('reset-password')
    resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.phone, body.code, body.newPassword);
    }
}
 
