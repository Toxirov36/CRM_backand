import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/create.dto';
import * as bcrypt from "bcrypt"
import { Status } from '@prisma/client';
import { EmailService } from 'src/common/email/email.service';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class StudentsService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService
    ) { }

    async getMyGroups(currentUser: { id: number }) {
        const myGroups = await this.prisma.studentGroup.findMany({
            where: {
                student_id: currentUser.id
            },
            select: {
                groups: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        return {
            success: true,
            data: myGroups.map(el => el.groups)
        }
    }

    async getAllStudents(pagination: PaginationDto) {
        const { page, limit } = pagination
        const students = await this.prisma.student.findMany({
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
            skip: (limit ? +limit : 10) * (page ? +page - 1 : 0),
            take: limit ? +limit : 10
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

        await this.prisma.student.create({
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

        return {
            success: true,
            message: "Student created"
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
}
