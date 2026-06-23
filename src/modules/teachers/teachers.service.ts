import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/create.dto';
import * as bcrypt from "bcrypt"
import { Status, TeacherGroupStatus } from '@prisma/client';

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

    async getMyGroups(teacherId: number) {
        const groups = await this.prisma.group.findMany({
            where: {
                groupTeachers: {
                    some: {
                        teacher_id: teacherId,
                        status: TeacherGroupStatus.active
                    }
                }
            },
            select: {
                id: true,
                name: true,
                max_student: true,
                start_date: true,
                start_time: true,
                week_day: true,
                courses: {
                    select: {
                        id: true,
                        name: true,
                        duration_month: true
                    }
                },
                rooms: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                groupTeachers: {
                    select: {
                        teacher: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                photo: true
                            }
                        }
                    }
                },
                studentGroups: {
                    where: {
                        status: Status.active
                    },
                    select: {
                        id: true,
                        students: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                            }
                        }
                    }
                }
            }
        })

        const BASE_URL = "http://localhost:3000";
        const dataFormatter = groups.map(g => {
            const { studentGroups, groupTeachers, ...rest } = g;
            const mappedGroupTeachers = groupTeachers.map(gt => {
                if (gt.teacher) {
                    return {
                        ...gt,
                        teacher: {
                            ...gt.teacher,
                            photo: gt.teacher.photo ? `${BASE_URL}/uploads/${gt.teacher.photo}` : null
                        }
                    };
                }
                return gt;
            });

            return {
                ...rest,
                groupTeachers: mappedGroupTeachers,
                teachers: mappedGroupTeachers?.[0]?.teacher || null,
                students: studentGroups.map(sg => sg.students),
                student_count: studentGroups.length
            };
        });

        return {
            success: true,
            data: dataFormatter
        }
    }

    async getInactiveTeachers() {
        const teachers = await this.prisma.teacher.findMany({
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

        const newTeacher = await this.prisma.teacher.create({
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

        if (payload.group_ids) {
            try {
                const groupIds = JSON.parse(payload.group_ids);
                if (Array.isArray(groupIds)) {
                    for (const groupId of groupIds) {
                        const parsedGroupId = Number(groupId);
                        if (!isNaN(parsedGroupId)) {
                            await this.prisma.groupTeacher.create({
                                data: {
                                    teacher_id: newTeacher.id,
                                    group_id: parsedGroupId
                                }
                            }).catch(() => {});
                        }
                    }
                }
            } catch (e) {}
        }

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

    async updateTeacher(id: number, payload: UpdateTeacherDto, filename?: string) {
        const existTeacher = await this.prisma.teacher.findUnique({
            where: { id },
        });

        if (!existTeacher) {
            throw new BadRequestException("Bunday teacher mavjud emas");
        }

        const hashPass = payload.password
            ? await bcrypt.hash(payload.password, 10)
            : existTeacher.password;

        await this.prisma.teacher.update({
            where: { id },
            data: {
                first_name: payload.first_name ?? existTeacher.first_name,
                last_name: payload.last_name ?? existTeacher.last_name,
                photo: filename ?? existTeacher.photo,
                phone: payload.phone ?? existTeacher.phone,
                email: payload.email ?? existTeacher.email,
                password: hashPass,
                address: payload.address ?? existTeacher.address,
            },
        });

        if (payload.group_ids) {
            try {
                const groupIds: number[] = JSON.parse(payload.group_ids);
                if (Array.isArray(groupIds)) {
                    const validGroupIds = groupIds.map(Number).filter(n => !isNaN(n));
                    
                    // Deactivate old group relationships not in the new list
                    await this.prisma.groupTeacher.updateMany({
                        where: {
                            teacher_id: id,
                            group_id: { notIn: validGroupIds }
                        },
                        data: {
                            status: TeacherGroupStatus.inactive
                        }
                    });

                    // Add or activate new relationships
                    for (const groupId of validGroupIds) {
                        const existGroupTeacher = await this.prisma.groupTeacher.findFirst({
                            where: {
                                teacher_id: id,
                                group_id: groupId
                            }
                        });

                        if (existGroupTeacher) {
                            if (existGroupTeacher.status !== TeacherGroupStatus.active) {
                                await this.prisma.groupTeacher.update({
                                    where: { id: existGroupTeacher.id },
                                    data: { status: TeacherGroupStatus.active }
                                });
                            }
                        } else {
                            await this.prisma.groupTeacher.create({
                                data: {
                                    teacher_id: id,
                                    group_id: groupId,
                                    status: TeacherGroupStatus.active
                                }
                            });
                        }
                    }
                }
            } catch (e) {}
        }

        return {
            success: true,
            message: "Teacher updated",
        };
    }

    async activateTeacher(id: number) {
        const teacher = await this.prisma.teacher.update({
            where: { id },
            data: { status: Status.active },
        });
        return { success: true, message: "Teacher activated" };
    }
}