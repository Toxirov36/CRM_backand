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
        const existUser = await this.prisma.user.findUnique({
            where: {
                phone: payload.phone
            }
        })

        if (!existUser) {
            throw new UnauthorizedException("Invalid phone or password")
        }
        const isMatch = await bcrypt.compare(payload.password, existUser.password)
        if (!isMatch) {
            throw new UnauthorizedException("Invalid username or password")
        }

        return {
            success: true,
            message: "You're logged",
            accessToken: this.jwtService.sign({ first_name: existUser.first_name, id: existUser.id, email: existUser.email, role: existUser.role })
        }
    }

}
