import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateSuperAdminDto, LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { EskizService } from 'src/common/service/sms';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private smsService: EskizService
    ) { }
    async userLogin(payload: LoginDto) {
        let clean = (payload.phone || "").trim();
        let stripped = clean;
        if (clean.startsWith("+998")) {
            stripped = clean.slice(4);
        } else if (clean.startsWith("998")) {
            stripped = clean.slice(3);
        }
        const variants = [clean, stripped, `+998${stripped}`, `998${stripped}`];

        const user =
            await this.prisma.user.findFirst({ where: { phone: { in: variants } } }) ||
            await this.prisma.teacher.findFirst({ where: { phone: { in: variants } } }) ||
            await this.prisma.student.findFirst({ where: { phone: { in: variants } } });

        if (!user) {
            throw new UnauthorizedException("Invalid phone or password");
        }

        const isMatch = await bcrypt.compare(payload.password, user.password);
        if (!isMatch) {
            throw new UnauthorizedException("Invalid phone or password");
        }

        const tokens = await this.generateTokenPair(user);

        return {
            success: true,
            message: "You're logged",
            role: user.role,
            ...tokens
        };
    }

    private async generateTokenPair(account: any) {
        const payload = {
            id: account.id,
            role: account.role,
            first_name: account.first_name,
            last_name: account.last_name,
            photo: account.photo,
            email: account.email
        };

        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const tokenData: any = {
            token: refreshToken,
            expires_at: expiresAt,
        };

        if (account.role === 'STUDENT') {
            tokenData.studentId = account.id;
        } else if (account.role === 'TEACHER') {
            tokenData.teacherId = account.id;
        } else {
            tokenData.userId = account.id;
        }

        await this.prisma.refreshToken.create({
            data: tokenData
        });

        return { accessToken, refreshToken };
    }

    async googleLogin(googleUser: any) {
        const queries = [
            this.prisma.student.findUnique({ where: { email: googleUser.email } }),
            this.prisma.user.findUnique({ where: { email: googleUser.email } }),
            this.prisma.teacher.findUnique({ where: { email: googleUser.email } }),
        ];

        const [student, user, teacher] = await Promise.all(queries);
        const account = student || user || teacher;

        if (!account) {
            throw new UnauthorizedException("You don't have access to login");
        }

        return this.generateTokenPair(account);
    }

    async refreshTokens(refreshToken: string) {
        try {
            const payload = await this.jwtService.verify(refreshToken);
            if (!payload) {
                throw new UnauthorizedException("Invalid refresh token");
            }

            const tokenRecord = await this.prisma.refreshToken.findUnique({
                where: { token: refreshToken }
            });

            if (!tokenRecord) {
                throw new UnauthorizedException("Refresh token not found or already used");
            }

            if (tokenRecord.expires_at < new Date()) {
                await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
                throw new UnauthorizedException("Refresh token expired");
            }

            // Check if user still exists
            let account: any = null;
            if (payload.role === 'STUDENT') {
                account = await this.prisma.student.findUnique({ where: { id: payload.id } });
            } else if (payload.role === 'TEACHER') {
                account = await this.prisma.teacher.findUnique({ where: { id: payload.id } });
            } else {
                account = await this.prisma.user.findUnique({ where: { id: payload.id } });
            }

            if (!account || account.status === 'inactive') {
                throw new UnauthorizedException("User no longer exists or is inactive");
            }

            // Token Rotation: Delete old token
            await this.prisma.refreshToken.delete({
                where: { id: tokenRecord.id }
            });

            // Generate new pair
            return this.generateTokenPair(account);
        } catch (error) {
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    async logout(refreshToken: string) {
        try {
            await this.prisma.refreshToken.deleteMany({
                where: { token: refreshToken }
            });
            return { success: true, message: "Logged out successfully" };
        } catch (error) {
            return { success: true, message: "Logged out successfully" };
        }
    }
    async sendResetCode(phone: string) {
        let clean = (phone || "").trim();
        let stripped = clean;
        if (clean.startsWith("+998")) {
            stripped = clean.slice(4);
        } else if (clean.startsWith("998")) {
            stripped = clean.slice(3);
        }
        const variants = [clean, stripped, `+998${stripped}`, `998${stripped}`];

        const student = await this.prisma.student.findFirst({ where: { phone: { in: variants } } });
        const teacher = await this.prisma.teacher.findFirst({ where: { phone: { in: variants } } });
        const user = await this.prisma.user.findFirst({ where: { phone: { in: variants } } });

        if (!student && !teacher && !user) {
            throw new NotFoundException("Bu raqam ro'yxatdan o'tmagan");
        }

        const matchedPhone = student?.phone || teacher?.phone || user?.phone || phone;
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 xonali

        // Remove old reset codes for this phone
        await this.prisma.passwordResetCode.deleteMany({
            where: { phone: matchedPhone }
        });

        await this.prisma.passwordResetCode.create({
            data: {
                phone: matchedPhone,
                code,
                expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 daqiqa
            }
        });

        await this.smsService.sendSms(matchedPhone, `NajotEdu kabinetingiz https://najotedu.softwareengineer.uz/login.\n Login: ${matchedPhone} Parol: ${code}}`);

        return { success: true, message: "Kod yuborildi", phone: matchedPhone };
    }

    async verifyResetCode(phone: string, code: string) {
        const record = await this.prisma.passwordResetCode.findFirst({
            where: { phone, code, used: false },
            orderBy: { created_at: 'desc' }
        });

        if (!record) throw new BadRequestException("Kod noto'g'ri");
        if (record.expires_at < new Date()) throw new BadRequestException("Kod muddati tugagan");

        return { success: true, message: "Kod tasdiqlandi" };
    }

    async resetPassword(phone: string, code: string, newPassword: string) {
        const record = await this.prisma.passwordResetCode.findFirst({
            where: { phone, code, used: false },
            orderBy: { created_at: 'desc' }
        });

        if (!record) throw new BadRequestException("Kod noto'g'ri");
        if (record.expires_at < new Date()) throw new BadRequestException("Kod muddati tugagan");

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        let clean = (phone || "").trim();
        let stripped = clean;
        if (clean.startsWith("+998")) {
            stripped = clean.slice(4);
        } else if (clean.startsWith("998")) {
            stripped = clean.slice(3);
        }
        const variants = [clean, stripped, `+998${stripped}`, `998${stripped}`];

        const students = await this.prisma.student.findMany({ where: { phone: { in: variants } } });
        const teachers = await this.prisma.teacher.findMany({ where: { phone: { in: variants } } });
        const users = await this.prisma.user.findMany({ where: { phone: { in: variants } } });

        if (students.length === 0 && teachers.length === 0 && users.length === 0) {
            throw new NotFoundException("Foydalanuvchi topilmadi");
        }

        for (const student of students) {
            await this.prisma.student.update({
                where: { id: student.id },
                data: { password: hashedPassword }
            });
        }
        for (const teacher of teachers) {
            await this.prisma.teacher.update({
                where: { id: teacher.id },
                data: { password: hashedPassword }
            });
        }
        for (const user of users) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
        }

        await this.prisma.passwordResetCode.update({
            where: { id: record.id },
            data: { used: true }
        });

        return { success: true, message: "Parol muvaffaqiyatli o'zgartirildi" };
    }
}
