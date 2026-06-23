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

        return {
            success: true,
            message: "You're logged",
            role: user.role,
            accessToken: this.jwtService.sign({
                first_name: user.first_name,
                last_name: user.last_name,
                photo: user.photo,
                id: user.id,
                email: user.email,
                role: user.role
            })
        };
    }

    async googleLogin(googleUser: any) {
        const student = await this.prisma.student.findUnique({
            where: { email: googleUser.email }
        });

        if (student) {
            return {
                accessToken: this.jwtService.sign({
                    id: student.id,
                    role: student.role,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    photo: student.photo,
                    email: student.email
                })
            };
        }

        const user = await this.prisma.user.findUnique({
            where: { email: googleUser.email }
        });

        if (user) {
            return {
                accessToken: this.jwtService.sign({
                    id: user.id,
                    role: user.role,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    photo: user.photo,
                    email: user.email
                })
            };
        }

        const teacher = await this.prisma.teacher.findUnique({
            where: { email: googleUser.email }
        });

        if (teacher) {
            return {
                accessToken: this.jwtService.sign({
                    id: teacher.id,
                    role: teacher.role,
                    first_name: teacher.first_name,
                    last_name: teacher.last_name,
                    photo: teacher.photo,
                    email: teacher.email
                })
            };
        }

        throw new UnauthorizedException("You don't have access to login");
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
