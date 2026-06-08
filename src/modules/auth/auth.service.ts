import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateSuperAdminDto, LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    async userLogin(payload: LoginDto) {
        const user =
            await this.prisma.user.findUnique({ where: { phone: payload.phone } }) ||
            await this.prisma.teacher.findUnique({ where: { phone: payload.phone } }) ||
            await this.prisma.student.findUnique({ where: { phone: payload.phone } });
        if (!user) {
            throw new UnauthorizedException("Invalid phone or password");
        }

        const isMatch = await bcrypt.compare(payload.password, user.password);
        if (!isMatch) {
            throw new UnauthorizedException("Invalid phone or password");
        }

        return {
            success: true,
            message: "You're logged",
            accessToken: this.jwtService.sign({
                first_name: user.first_name,
                id: user.id,
                email: user.email,
                role: user.role
            })
        };
    }
}
