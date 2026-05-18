import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role, Status, WeekDay } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateAttendanceDto } from './dto/create.dto';

@Injectable()
export class AttendanceService {
    constructor(private prisma: PrismaService) { }

    async getAllAttendance(){
        const attendances = await this.prisma.attendance.findMany()

        return {
            seccess : true,
            data : attendances
        }
    }

    async createAttendance(payload: CreateAttendanceDto, currentUser: { id: number, role: Role }) {

        const week = {
            "1": "MONDAY",
            "2": "TUESDAY",
            "3": "WEDNESDAY",
            "4": "THURSDAY",
            "5": "FRIDAY",
            "6": "SATURDAY",
            "7": "SUNDAY"
        }

        const lessonGroup = await this.prisma.lesson.findFirst({
            where: {
                id: payload.lesson_id
            },
            select: {
                created_at:true,
                groups: {
                    select: {
                        start_time: true,
                        start_date: true,
                        teacher_id: true,
                        week_day: true,
                        courses: {
                            select: {
                                duration_hours: true
                            }
                        },
                        studentGroups: {
                            where: {
                                student_id: payload.student_id,
                                status: Status.active
                            }
                        }
                    }
                }
            }
        })

        if (!lessonGroup?.groups.studentGroups.length) {
            throw new BadRequestException("Student not found whth this group")
        }

        if (currentUser.role == Role.TEACHER && lessonGroup?.groups.teacher_id != currentUser.id) {
            throw new ForbiddenException("Is not your lesson")
        }

        const week_day = lessonGroup?.groups.week_day
        const nowDate = new Date()
        const day = nowDate.getDay()

        if (!week_day?.includes(week[day])) {
            throw new BadRequestException("Dars vaqti xali boshlanmadi")
        }

        const timeToMinutes = (time: string) => {
            const [h, m] = time.split(":").map(Number);
            return h * 60 + m;
        };

        const startMinute = timeToMinutes(lessonGroup!.groups.start_time);
        const endMinute = startMinute + lessonGroup!.groups.courses.duration_hours * 60;
        const nowMinute = nowDate.getHours() * 60 + nowDate.getMinutes()

        if (!(lessonGroup.created_at.getTime() < Date.now()) && startMinute > nowMinute ) {
            throw new BadRequestException("Dars hali boshlanmadi")
        }

        if (!(startMinute < nowMinute && endMinute > nowMinute) && currentUser.role == Role.TEACHER) {
            throw new BadRequestException("Dars vaqtidan tashqarida davomat qilib bo'lmaydi")
        }

        await this.prisma.attendance.create({
            data: {
                ...payload,
                teacher_id: currentUser.role == "TEACHER" ? currentUser.id : null,
                user_id: currentUser.role != "TEACHER" ? currentUser.id : null
            }
        })

        return {
            success: true,
            message: "Attendance recorded"
        }
    }
}
