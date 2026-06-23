import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateHomeworkDto } from './dto/create.dto';
import { HomeworkStatus, Role } from '@prisma/client';
import HomeworkResultDto from './dto/homework.result.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HomeworkService {
    constructor(
        private prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) { }

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

    async getHomeworkResults(groupId: number, homeworkId: number, status?: HomeworkStatus) {
        let studentsResult: any;

        if (status == HomeworkStatus.pending) {
            studentsResult = await this.prisma.homeworkAnswerStudent.findMany({
                where: {
                    homework_id: homeworkId,
                    status: HomeworkStatus.pending
                }, select: {
                    id: true,
                    title: true,
                    file: true,
                    students: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            })
        }

        else if (status == HomeworkStatus.completed || status == HomeworkStatus.rejected || status == HomeworkStatus.checked || status == HomeworkStatus.failed) {
            studentsResult = await this.prisma.homeworkResult.findMany({
                where: {
                    homework_id: homeworkId,
                    group_id: groupId,
                    homeworkStatus: status
                },
                select: {
                    grade: true,          // ✅ qo'shing
                    homeworkStatus: true, // ✅ qo'shing
                    homeworkAnswerStudent: {
                        select: {
                            id: true,
                            title: true,  // ✅
                            file: true,   // ✅
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
        }

        // Get all student IDs in the group
        const studentIds = await this.prisma.studentGroup.findMany({
            where: {
                group_id: groupId
            }, select: {
                student_id: true
            }
        })

        // Get all students who submitted homework
        let submitStudents = await this.prisma.homeworkAnswerStudent.findMany({
            where: {
                homework_id: homeworkId
            }
        })

        let submitStudentId = submitStudents.map(el => el.student_id)

        // Get students who haven't submitted
        const notSubmitStudents = await this.prisma.studentGroup.findMany({
            where: {
                group_id: groupId,
                student_id: {
                    notIn: submitStudentId
                }
            }, select: {
                students: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true
                    }
                }
            }
        })

        // If no status provided, return students who haven't submitted
        if (!status) {
            return {
                success: true,
                data: {
                    students: notSubmitStudents.map(el => el.students)
                }
            }
        }

        // Return students with the specified status
        return {
            success: true,
            data: {
                students: status == "pending"
                    ? studentsResult.map(el => ({
                        ...el.students,
                        title: el.title,
                        file: el.file,
                        homework_answer_id: el.id
                    }))
                    : studentsResult.map(el => ({
                        ...el.homeworkAnswerStudent.students,
                        title: el.homeworkAnswerStudent.title,
                        file: el.homeworkAnswerStudent.file,
                        grade: el.grade,
                        homeworkStatus: el.homeworkStatus,
                        homework_answer_id: el.homeworkAnswerStudent.id
                    }))
            }
        }
    }

    async getGroupHomeworkStudentResult(groupId: number, homeworkId: number, studentId: number, lessonId: number) {
        const studentResult = await this.prisma.homeworkAnswerStudent.findFirst({
            where: {
                homework_id: homeworkId,
                student_id: studentId
            }, select: {
                id: true,
                file: true,
                title: true,
                created_at: true,
                students: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true
                    }
                }
            }
        })

        const homework = await this.prisma.homework.findFirst({
            where: {
                id: homeworkId,
            }, select: {
                id: true,
                title: true,
                file: true,
            }
        })

        let lessons: any = await this.prisma.lesson.findFirst({
            where: {
                group_id: groupId,
                id: lessonId
            },
            select: {
                homework: {
                    where: {
                        id: homeworkId
                    }, select: {
                        homeworkAnswerStudents: {
                            where: {
                                student_id: studentId
                            },
                            select: {
                                status: true,
                                homeworkResults: {
                                    select: {
                                        grade: true,
                                        title: true,
                                        homeworkStatus: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        let status = "Bajarilmagan"
        let grade = null;
        let comment = "";

        if (lessons && lessons.homework && lessons.homework.length > 0) {
            const answer = lessons.homework[0].homeworkAnswerStudents?.[0];
            if (answer) {
                const result = answer.homeworkResults?.[0];
                if (result) {
                    grade = result.grade;
                    comment = result.title;
                    if (result.homeworkStatus === HomeworkStatus.completed || result.homeworkStatus === HomeworkStatus.checked) {
                        status = "Qabul qilingan";
                    } else if (result.homeworkStatus === HomeworkStatus.rejected) {
                        status = "Qaytarilgan";
                    } else if (result.homeworkStatus === HomeworkStatus.failed) {
                        status = "Bajarilmagan";
                    }
                } else {
                    status = "Kutayotganlar";
                }
            }
        } else {
            status = "Berilmagan";
        }

        return {
            success: true,
            data: {
                id: studentResult?.id || null,
                file: studentResult?.file || null,
                title: studentResult?.title || "",
                created_at: studentResult?.created_at || null,
                students: studentResult?.students || null,
                status,
                grade,
                comment
            }
        }
    }

    async getAllHomework() {
        const homeworks = await this.prisma.homework.findMany()

        return {
            success: true,
            data: homeworks
        }
    }

    async getHomeworkByGroup(groupId: number) {
        const homeworks = await this.prisma.homework.findMany({
            where: {
                group_id: groupId
            },
            select: {
                id: true,
                title: true,
                file: true,
                created_at: true,
                update_at: true,
                lesson: {
                    select: {
                        id: true,
                        topic: true
                    }
                },
                teachers: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true
                    }
                },
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true
                    }
                },
                homeworkAnswerStudents: {
                    select: {
                        id: true,
                        student_id: true,
                        status: true,
                        homeworkResults: {
                            select: {
                                id: true,
                                homeworkStatus: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        const formatted = homeworks.map(hw => {
            const totalAnswers = hw.homeworkAnswerStudents.length
            const pending = hw.homeworkAnswerStudents.filter(ans => ans.status === HomeworkStatus.pending).length
            const completed = hw.homeworkAnswerStudents.filter(ans => ans.homeworkResults.some(res => res.homeworkStatus === HomeworkStatus.completed)).length

            return {
                id: hw.id,
                title: hw.title,
                file: hw.file,
                created_at: hw.created_at,
                update_at: hw.update_at,
                lesson: hw.lesson,
                teacher: hw.teachers,
                user: hw.users,
                totalAnswers,
                pending,
                completed,
            }
        })

        return {
            success: true,
            data: formatted
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
                        id: true,
                        teacher_id: true
                    }
                }
            }
        })

        if (!existLesson) {
            throw new NotFoundException("Lesson not fount with this id")
        }

        const existHomework = await this.prisma.homework.findFirst({
            where: {
                lesson_id: payload.lesson_id
            }
        })

        if (existHomework) {
            throw new ForbiddenException("Bu dars uchun allaqachon uyga vazifa yaratilgan")
        }

        if (currentUser.role == Role.TEACHER) {
            const isAssigned = await this.prisma.groupTeacher.findFirst({
                where: {
                    group_id: existLesson.groups.id,
                    teacher_id: currentUser.id,
                    status: 'active'
                }
            });
            if (!isAssigned && existLesson.groups.teacher_id != currentUser.id) {
                throw new ForbiddenException("Is not your lesson")
            }
        }

        await this.prisma.homework.create({
            data: {
                ...payload,
                file: filename,
                teacher_id: currentUser.role == "TEACHER" ? currentUser.id : null,
                user_id: currentUser.role != "TEACHER" ? currentUser.id : null
            }
        })

        await this.notificationsService.createForGroup(
            payload.group_id,
            "Yangi uy vazifasi",
            `Sizga yangi vazifa berildi: ${payload.title}`
        );

        return {
            success: true,
            message: "Homework recorded"
        }
    }

    async checkHomeworkResult(
        payload: HomeworkResultDto,
        currentUser: { id: number, role: Role },
        groupId: number,
        homeworkId: number
    ) {
        const existingResult = await this.prisma.homeworkResult.findFirst({
            where: {
                homework_answer_id: payload.homework_answer_id
            }
        });

        const status = payload.grade >= 60 ? HomeworkStatus.completed : HomeworkStatus.rejected;

        if (existingResult) {
            await this.prisma.homeworkResult.update({
                where: { id: existingResult.id },
                data: {
                    grade: payload.grade,
                    title: payload.title,
                    homeworkStatus: status,
                    teacher_id: currentUser.role == Role.TEACHER ? currentUser.id : null,
                    user_id: currentUser.role == Role.TEACHER ? null : currentUser.id
                }
            });
        } else {
            await this.prisma.homeworkResult.create({
                data: {
                    homework_answer_id: payload.homework_answer_id,
                    group_id: groupId,
                    homework_id: homeworkId,
                    grade: payload.grade,
                    title: payload.title,
                    homeworkStatus: status,
                    teacher_id: currentUser.role == Role.TEACHER ? currentUser.id : null,
                    user_id: currentUser.role == Role.TEACHER ? null : currentUser.id
                }
            });
        }

        await this.prisma.homeworkAnswerStudent.update({
            where: {
                id: payload.homework_answer_id
            },
            data: {
                status: HomeworkStatus.checked
            }
        })

        const answer = await this.prisma.homeworkAnswerStudent.findUnique({
            where: { id: payload.homework_answer_id },
            select: {
                student_id: true,
                homework: {
                    select: { title: true }
                }
            }
        });

        if (answer) {
            await this.notificationsService.createForStudent(
                answer.student_id,
                "Vazifa tekshirildi",
                `"${answer.homework.title}" mavzusidagi vazifangiz tekshirildi. Baho: ${payload.grade}`
            );
        }

        return {
            success: true,
            message: "Homework result recorded"
        }
    }
}