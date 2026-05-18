import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateTeacherDto } from './dto/create.dto';
import * as bcrypt from "bcrypt"
import { Status } from '@prisma/client';

@Injectable()
export class TeachersService {
    constructor(private prisma: PrismaService) { }

    async getAllTeachers() {
        const teachers = await this.prisma.teacher.findMany({
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
                created_at: true,

                groups: {
                    select: {
                        name: true
                    }
                }
            }
        })

        const BASE_URL = "http://localhost:3000";
        const result = teachers.map(s => ({
            ...s,
            photo: s.photo ? `${BASE_URL}/uploads/${s.photo}` : null,
        }));


        return {
            success: true,
            data: result
        }
    }

    async createTeacher(payload: CreateTeacherDto, filename?: string) {

        const existTeacher = await this.prisma.teacher.findFirst({
            where: {
                OR: [
                    { phone: payload.phone },
                    { email: payload.email }
                ]
            }
        })

        if (existTeacher) {

            throw new ConflictException()
        }

        const hashPass = await bcrypt.hash(payload.password, 10)

        await this.prisma.teacher.create({
            data: {
                first_name: payload.first_name,
                last_name: payload.last_name,
                photo: filename ?? null,
                phone: payload.phone,
                email: payload.email,
                password: hashPass,
                address: payload.address
            }
        })

        return {
            success: true,
            message: "Teacher created"
        }
    }

    async deleteTeacher(id: number) {

        const existTeacher = await this.prisma.teacher.findUnique({
            where: { id },
        });

        if (!existTeacher) {
            throw new BadRequestException("Bunday teacher mavjud emas");
        }

        await this.prisma.teacher.update({
            where: {
                id,
            },
            data: {
                status: Status.inactive,
            },
        });

        return {
            success: true,
            message: "Teacher deleted",
        };
    }
}
