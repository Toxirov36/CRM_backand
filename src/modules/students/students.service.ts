import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateStudentDto, UpdateStudentDto, ChangePasswordDto } from './dto/create.dto';
import * as bcrypt from "bcrypt"
import { Role, Status } from '@prisma/client';
import { EmailService } from 'src/common/email/email.service';
import { PaginationDto } from './dto/pagination.dto';
import { group } from 'console';
import { EskizService } from 'src/common/service/sms';

@Injectable()
export class StudentsService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private readonly smsService: EskizService,
    ) { }

    async getMyGroups(currentUser: { id: number }) {
        const myGroups = await this.prisma.studentGroup.findMany({
            where: {
                student_id: currentUser.id
            },
            select: {
                status: true,
                groups: {
                    select: {
                        id: true,
                        name: true,
                        start_date: true,
                        courses: {
                            select: {
                                name: true,
                            }
                        },
                        _count: {
                            select: {
                                groupTeachers: true
                            }
                        }
                    }
                }
            }
        })

        const formattedGroup = myGroups.map(el => ({
            groupName: el.groups.name,
            course: el.groups.courses.name,
            teachersCount: el.groups._count.groupTeachers,
            startDate: el.groups.start_date,
            groupId: el.groups.id
        }))

        console.log(formattedGroup)

        return {
            success: true,
            data: formattedGroup
        }
    }

    async getAllStudents(pagination: PaginationDto) {
        const { page, limit } = pagination
        const take = limit ? +limit : 10;
        const skip = take * (page ? +page - 1 : 0);

        const [students, total] = await Promise.all([
            this.prisma.student.findMany({
                where: {
                    status: Status.active
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    phone: true,
                    photo: true,
                    email: true,
                    address: true,
                    birth_date: true,
                    created_at: true
                },
                skip,
                take
            }),
            this.prisma.student.count({
                where: {
                    status: Status.active
                }
            })
        ]);

        const BASE_URL = "http://localhost:3000";
        const result = students.map(s => ({
            ...s,
            photo: s.photo ? `${BASE_URL}/uploads/${s.photo}` : null,
        }));

        return {
            success: true,
            data: result,
            total
        }
    }

    async getInactiveStudents() {
        const students = await this.prisma.student.findMany({
            where: {
                status: Status.inactive
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                photo: true,
                email: true,
                address: true,
                birth_date: true,
                created_at: true
            }
        })

        const BASE_URL = "http://localhost:3000";
        const result = students.map(s => ({
            ...s,
            photo: s.photo ? `${BASE_URL}/uploads/${s.photo}` : null,
        }));

        return {
            success: true,
            data: result
        }
    }

    async createStudent(payload: CreateStudentDto, filename?: string) {

        const existStudent = await this.prisma.student.findFirst({
            where: {
                OR: [
                    { phone: payload.phone },
                    { email: payload.email }
                ]
            }
        })

        if (existStudent) {

            throw new ConflictException()
        }

        const hashPass = await bcrypt.hash(payload.password, 10)

        const newStudent = await this.prisma.student.create({
            data: {
                first_name: payload.first_name,
                last_name: payload.last_name,
                photo: filename ?? null,
                phone: payload.phone,
                birth_date: new Date(payload.birth_date),
                email: payload.email,
                password: hashPass,
                address: payload.address
            }
        })

        // await this.emailService.sendEmail(payload.email,payload.phone,payload.password)
        await this.smsService.sendSms(payload.phone, `NajotEdu kabinetingiz https://najotedu.softwareengineer.uz/login.\n Login: ${payload.phone} Parol: ${payload.password}}`)

        return {
            success: true,
            message: "Student created",
            data: { id: newStudent.id }
        }
    }

    async deleteStudent(id: number) {

        const existStudent = await this.prisma.student.findUnique({
            where: { id },
        });

        if (!existStudent) {
            throw new BadRequestException("Bunday student mavjud emas");
        }

        await this.prisma.student.update({
            where: {
                id,
            },
            data: {
                status: Status.inactive,
            },
        });

        return {
            success: true,
            message: "Student deleted",
        };
    }

    async updateStudent(id: number, payload: UpdateStudentDto, filename?: string) {
        const existStudent = await this.prisma.student.findUnique({
            where: { id },
        });

        if (!existStudent) {
            throw new BadRequestException("Bunday student mavjud emas");
        }

        // ✅ Parol faqat kelsa hash qilinadi
        const hashPass = payload.password
            ? await bcrypt.hash(payload.password, 10)
            : existStudent.password;

        await this.prisma.student.update({
            where: { id },
            data: {
                first_name: payload.first_name ?? existStudent.first_name,
                last_name: payload.last_name ?? existStudent.last_name,
                photo: filename ?? existStudent.photo,
                phone: payload.phone ?? existStudent.phone,
                email: payload.email ?? existStudent.email,
                password: hashPass,
                address: payload.address ?? existStudent.address,
                birth_date: payload.birth_date     // ✅
                    ? new Date(payload.birth_date).toISOString()
                    : existStudent.birth_date,
            },
        });

        return {
            success: true,
            message: "Student updated",
        };
    }

    async activateStudent(id: number) {
        const student = await this.prisma.student.update({
            where: { id },
            data: { status: Status.active },
        });
        return { success: true, message: "Student activated" };
    }

    async createHomeworkAnswer(homeworkId: number, title: string, id: number, file?: string) {
        const existHomework = await this.prisma.homework.findUnique({
            where: { id: homeworkId },
        });

        if (!existHomework) {
            throw new BadRequestException("Bunday uy ishi mavjud emas");
        }

        const existHomeworkAnswer = await this.prisma.homeworkAnswerStudent.findFirst({
            where: {
                homework_id: homeworkId,
                student_id: id
            }
        });

        if (existHomeworkAnswer) {
            throw new BadRequestException("Bunday uy ishi javobi mavjud");
        }

        await this.prisma.homeworkAnswerStudent.create({
            data: {
                homework_id: homeworkId,
                student_id: id,
                title,
                file
            }
        });

        return { success: true, message: "Homework answer created" };
    }

    async getMyProfile(id: number) {
        const student = await this.prisma.student.findUnique({
            where: { id },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                email: true,
                birth_date: true,
                address: true,
                photo: true,
                status: true,
            }
        });

        if (!student) {
            throw new BadRequestException("Student topilmadi");
        }

        const BASE_URL = "http://localhost:3000";
        return {
            success: true,
            data: {
                ...student,
                photo: student.photo ? `${BASE_URL}/uploads/${student.photo}` : null,
            }
        };
    }

    async changeMyPassword(id: number, payload: ChangePasswordDto) {
        const student = await this.prisma.student.findUnique({
            where: { id },
        });

        if (!student) {
            throw new BadRequestException("Student topilmadi");
        }

        const isMatch = await bcrypt.compare(payload.currentPassword, student.password);
        if (!isMatch) {
            throw new BadRequestException("Amaldagi parol noto'g'ri");
        }

        const hashPass = await bcrypt.hash(payload.newPassword, 10);
        await this.prisma.student.update({
            where: { id },
            data: {
                password: hashPass,
            },
        });

        return {
            success: true,
            message: "Parol muvaffaqiyatli o'zgartirildi",
        };
    }
}
