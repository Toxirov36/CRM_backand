import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateLessonDto } from './dto/create.lesson.dto';
import { Role, Status } from '@prisma/client';

@Injectable()
export class LessonsService {
    constructor(private prisma: PrismaService) { }

    async getLessonVideos(groupId: number, lessonId: number, currentUser: { id: number }) {
        const existLesson = await this.prisma.lesson.findFirst({
            where: {
                id: lessonId,
                status: Status.active,
                group_id: groupId
            }
        })

        if (!existLesson) {
            throw new NotFoundException("Lesson not found with this id")
        }

        const existLessonStudent = await this.prisma.studentGroup.findFirst({
            where: {
                group_id: existLesson.group_id,
                student_id: currentUser.id,
                status: Status.active
            }
        })

        if (!existLessonStudent) {
            throw new BadRequestException("Lesson does not belong to this Student")
        }

        const lessonVideos = await this.prisma.video.findMany({
            where: {
                lesson_id: lessonId,
                status: Status.active
            },
            select: {
                id: true,
                name: true,
                file: true,
                created_at: true
            }
        })

        return {
            success: true,
            data: lessonVideos
        }
    }

    async getLessonHomework(groupId: number, lessonId: number, currentUser: { id: number }) {
        const existLesson = await this.prisma.lesson.findFirst({
            where: {
                id: lessonId,
                group_id: groupId
            }
        })

        if (!existLesson) {
            throw new NotFoundException("Lesson not found with this id")
        }

        const existLessonStudent = await this.prisma.studentGroup.findFirst({
            where: {
                group_id: existLesson.group_id,
                student_id: currentUser.id,
            }
        })

        if (!existLessonStudent) {
            throw new BadRequestException("Lesson does not belong to this Student")
        }

        const lessonHomework = await this.prisma.homework.findMany({
            where: {
                lesson_id: lessonId,
                group_id: groupId
            },
            select: {
                id: true,
                file: true,
                title: true,
                created_at: true,
            }
        })

        if (lessonHomework.length == 0) {
            return {
                success: true,
                data: {
                    homework: null,
                    answer: null,
                    result: null,
                    status: 'Berilmagan'
                }
            }
        }

        const studentHomeworkAnswer = await this.prisma.homeworkAnswerStudent.findFirst({
            where: {
                student_id: currentUser.id,
                homework_id: lessonHomework[0].id
            },
            select: {
                id: true,
                file: true,
                title: true,
                created_at: true
            }
        })

        if (!studentHomeworkAnswer) {
            return {
                success: true,
                data: {
                    homework: { ...lessonHomework[0] },
                    answer: null,
                    result: null,
                    status: 'bajarilmagan'
                }
            }
        }

        const homeworkResult = await this.prisma.homeworkResult.findFirst({
            where: {
                homework_answer_id: studentHomeworkAnswer.id,
            },
            select: {
                id: true,
                grade: true,
                title: true,
                created_at: true,
                homeworkStatus: true,
                teachers: {
                    select: {
                        first_name: true,
                        last_name: true
                    }
                },
                users: {
                    select: {
                        first_name: true,
                        last_name: true
                    }
                }
            }
        })

        if (!homeworkResult) {
            return {
                success: true,
                data: {
                    homework: { ...lessonHomework[0] },
                    answer: { ...studentHomeworkAnswer },
                    status: 'Kutayotganlar'
                }
            }
        }

        return {
            success: true,
            data: {
                homework: { ...lessonHomework[0] },
                answer: { ...studentHomeworkAnswer },
                result: { ...homeworkResult },
                status: homeworkResult.homeworkStatus === 'completed' || homeworkResult.homeworkStatus === 'checked'
                    ? 'Qabul qilingan'
                    : homeworkResult.homeworkStatus === 'rejected'
                    ? 'Qaytarilgan'
                    : homeworkResult.homeworkStatus === 'failed'
                    ? 'Bajarilmagan'
                    : 'Kutayotganlar'
            }
        }
    }

    async getMyGroupLessons(groupId: number, currentUser: { id: number }) {
        const existGroup = await this.prisma.group.findFirst({
            where: {
                id: groupId,
                status: Status.active
            }
        })

        if (!existGroup) {
            throw new NotFoundException("Group not found with this id")
        }

        const existGroupStudent = await this.prisma.studentGroup.findFirst({
            where: {
                group_id: groupId,
                student_id: currentUser.id,
                status: Status.active
            }
        })

        if (!existGroupStudent) {
            throw new BadRequestException("Group does not belong to this Student")
        }

        const groupLessons = await this.prisma.lesson.findMany({
            where: {
                group_id: groupId,
                status: Status.active
            },
            select: {
                id: true,
                topic: true,
                created_at: true,
                videos: {
                    where: { status: Status.active },
                    select: { id: true }
                },
                homework: {
                    select: {
                        id: true,
                        title: true,
                        created_at: true,
                        homeworkAnswerStudents: {
                            where: { student_id: currentUser.id },
                            select: {
                                id: true,
                                status: true,
                                created_at: true,
                                homeworkResults: {
                                    select: {
                                        id: true,
                                        homeworkStatus: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        const data = groupLessons.map(lesson => {
            const hw = lesson.homework?.[0];
            let homeworkStatus = 'none';
            let homeworkDeadline: Date | null = null;

            if (hw) {
                const answer = hw.homeworkAnswerStudents?.[0];
                if (!answer) {
                    homeworkStatus = 'failed'; // Bajarilmagan - not submitted
                } else {
                    const result = answer.homeworkResults?.[0];
                    if (result) {
                        homeworkStatus = result.homeworkStatus; // checked, completed, rejected, failed
                    } else {
                        homeworkStatus = 'submitted'; // submitted, waiting review
                    }
                }
                homeworkDeadline = hw.created_at;
            } else {
                homeworkStatus = 'pending'; // Berilmagan - not assigned
            }

            return {
                id: lesson.id,
                topic: lesson.topic,
                created_at: lesson.created_at,
                videoCount: lesson.videos?.length || 0,
                homeworkStatus,
                homeworkDeadline,
            };
        });

        return {
            success: true,
            data
        }
    }

    async getAllLessons() {
        const lessons = await this.prisma.lesson.findMany({
            where: { status: "active" }
        })

        return {
            sucess: true,
            data: lessons
        }
    }

    async getLessonsByGroup(groupId: number) {
        const existGroup = await this.prisma.group.findFirst({
            where: {
                id: groupId,
                status: Status.active
            }
        })

        if (!existGroup) {
            throw new NotFoundException("Group not found with this id")
        }

        const lessons = await this.prisma.lesson.findMany({
            where: {
                group_id: groupId,
                status: Status.active
            },
            select: {
                id: true,
                topic: true,
                description: true,
                created_at: true
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        return {
            success: true,
            data: lessons
        }
    }

    async createLesson(payload: CreateLessonDto, currentUser: { id: number, role: Role }) {

        const existGroup = await this.prisma.group.findFirst({
            where: {
                id: payload.group_id,
                status: Status.active
            }
        })

        if (!existGroup) {
            throw new NotFoundException("Group not found with this id")
        }

        if (currentUser.role == "TEACHER") {
            const isAssigned = await this.prisma.groupTeacher.findFirst({
                where: {
                    group_id: payload.group_id,
                    teacher_id: currentUser.id,
                    status: 'active'
                }
            });
            if (!isAssigned && existGroup.teacher_id != currentUser.id) {
                throw new ForbiddenException("Bu seni guruhing emas")
            }
        }

        const newLesson = await this.prisma.lesson.create({
            data: {
                ...payload,
                teacher_id: currentUser.role == "TEACHER" ? currentUser.id : null,
                user_id: currentUser.role != "TEACHER" ? currentUser.id : null
            }
        })

        return {
            success: true,
            message: "Lesson created",
            data: newLesson
        }
    }
}
