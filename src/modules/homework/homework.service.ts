import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateHomeworkDto } from './dto/create.dto';
import { Role } from '@prisma/client';

@Injectable()
export class HomeworkService {
    constructor(private prisma: PrismaService) { }

    async getOwnHomework(lessonId: number, currentUser: { id: number }) {
        const myLessons = await this.prisma.homework.findMany({
            where: {
                lesson_id: lessonId
            },
            select: {
                id: true,
                title: true,
                file: true,
                created_at: true,
                update_at: true,
                teachers: {
                    select: {
                        id: true,
                        last_name: true,
                        first_name: true,
                        phone: true,
                        photo: true
                    }
                },
                users: {
                    select: {
                        id: true,
                        last_name: true,
                        first_name: true,
                        phone: true,
                        photo: true
                    }
                }
            }
        })

        const homeworkFormated = myLessons.map(el => {
            if (!el.teachers) {
                return {
                    id: el.id,
                    title: el.title,
                    file: el.file,
                    created_at: el.created_at,
                    update_at: el.update_at,
                    user: el.users
                }
            } else {
                return {
                    id: el.id,
                    title: el.title,
                    file: el.file,
                    created_at: el.created_at,
                    update_at: el.update_at,
                    teacher: el.teachers
                }
            }
        })

        return {
            success: true,
            data: homeworkFormated
        }
    }

    async getAllHomework() {
        const homeworks = await this.prisma.homework.findMany()

        return {
            success: true,
            data: homeworks
        }
    }

    async createHomework(payload: CreateHomeworkDto, currentUser: { id: number, role: Role }, filename?: string) {
        const existLesson = await this.prisma.lesson.findFirst({
            where: {
                id: payload.lesson_id
            },
            select: {
                groups: {
                    select: {
                        teacher_id: true
                    }
                }
            }
        })

        if (!existLesson) {
            throw new NotFoundException("Lesson not fount with this id")
        }

        if (currentUser.role == Role.TEACHER && existLesson.groups.teacher_id != currentUser.id) {
            throw new ForbiddenException("Is not your lesson")
        }

        await this.prisma.homework.create({
            data: {
                ...payload,
                file: filename,
                teacher_id: currentUser.role == "TEACHER" ? currentUser.id : null,
                user_id: currentUser.role != "TEACHER" ? currentUser.id : null
            }
        })

        return {
            success: true,
            message: "Homework recorded"
        }
    }
}
