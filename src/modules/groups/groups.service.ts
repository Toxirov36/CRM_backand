import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateGroupDto } from './dto/create.dto';
import { Status } from '@prisma/client';
import { filterDto } from './dto/search';

@Injectable()
export class GroupsService {
    constructor(private prisma: PrismaService) { }

    async getGroupOne(groupId: number) {
        const existGroup = await this.prisma.group.findFirst({
            where: {
                id: groupId,
                status: Status.active
            }
        })

        if (!existGroup) {
            throw new NotFoundException("Group not found with this id")
        }

        const groupStudents = await this.prisma.studentGroup.findMany({
            where: {
                group_id: groupId,
                status: Status.active
            },
            select: {
                students: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        phone: true,
                        email: true,
                        photo: true,
                        birth_date: true,
                        created_at: true
                    }
                }
            }
        })

        const dataFormatter = groupStudents.map(el => el.students)

        return {
            success: true,
            data: dataFormatter
        }
    }

    async getAllGroups(search: filterDto) {
        const { groupName, max_student } = search
        let searchWhere = {
            status: Status.active,
        }

        if (groupName) {
            searchWhere["name"] = groupName
        }
        if (max_student) {
            searchWhere["max_student"] = +max_student
        }

        const groups = await this.prisma.group.findMany({
            where: searchWhere,
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
                teachers: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true
                    }
                }
            }
        })

        return {
            success: true,
            data: groups
        }
    }

    async getAllInactiveGroups() {
        const groups = await this.prisma.group.findMany({
            where: {
                status: Status.inactive
            },
            select: {
                id: true,
                name: true,
                max_student: true,
                start_date: true,
                start_time: true,
                week_day: true,
            }
        })

        return {
            success: true,
            data: groups
        }
    }

    async createGroup(payload: CreateGroupDto) {

        // const timeToMinutes = (time: string) => {
        //     const [h, m] = time.split(":").map(Number);
        //     return h * 60 + m;
        // };

        const existRoom = await this.prisma.room.findFirst({
            where: {
                id: payload.room_id,
                status: Status.active
            }
        });

        if (!existRoom) {
            throw new NotFoundException("Room is not found with this id");
        }

        const existCourse = await this.prisma.course.findFirst({
            where: {
                id: payload.course_id,
                status: Status.active
            }
        });

        if (!existCourse) {
            throw new NotFoundException("Course is not found or inactive with this id");
        }

        const existTeacher = await this.prisma.teacher.findFirst({
            where: {
                id: payload.teacher_id,
                status: Status.active
            }
        });

        if (!existTeacher) {
            throw new NotFoundException("Teacher is not found with this id");
        }

        const existGroup = await this.prisma.group.findUnique({
            where: { name: payload.name }
        });

        if (existGroup) {
            throw new ConflictException("Group already exists");
        }

        // const startNew = timeToMinutes(payload.start_time);
        // const endNew = startNew + existCourse.duration_hours * 60;

        const roomGroups = await this.prisma.group.findMany({
            where: {
                room_id: payload.room_id,
                status: Status.active
            },
            select: {
                start_time: true,
                courses: {
                    select: {
                        duration_hours: true
                    }
                }
            }
        });

        // const isRoomBusy = roomGroups.some(el => {
        //     const start = timeToMinutes(el.start_time);
        //     const end = start + el.courses.duration_hours * 60;

        //     return start < endNew && end > startNew;
        // });

        // if (isRoomBusy) {
        //     throw new ConflictException("Room is busy at this time");
        // }

        const newGroup = await this.prisma.group.create({
            data: {
                ...payload,
                start_date: new Date(payload.start_date)
            }
        });

        return {
            success: true,
            message: "Group created successfully",
            data: newGroup
        };
    }

    async getGroupSchedules(groupId: number) {
        const group = await this.prisma.group.findFirst({
            where: { id: groupId, status: Status.active },
            select: {
                id: true,
                start_date: true,
                week_day: true,
                courses: {
                    select: {
                        duration_month: true
                    }
                }
            }
        });

        if (!group) {
            throw new NotFoundException('Group not found with this id');
        }

        const { start_date, week_day, courses } = group;
        const duration_month = courses.duration_month;

        // WeekDay enum -> JS getDay() raqamiga moslashtirish (0=Yakshanba)
        const dayMap: Record<string, number> = {
            MONDAY: 1,
            TUESDAY: 2,
            WEDNESDAY: 3,
            THURSDAY: 4,
            FRIDAY: 5,
            SATURDAY: 6,
            SUNDAY: 0,
        };

        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const weekDayNumbers = week_day.map(d => dayMap[d]);

        const result: Record<number, { day: number; month: string }[]> = {};

        const startDate = new Date(start_date);

        for (let monthIndex = 0; monthIndex < duration_month; monthIndex++) {
            const monthDates: { day: number; month: string }[] = [];

            // Har bir oy uchun boshlanish va tugash sanasini hisoblash
            const monthStart = new Date(startDate);
            monthStart.setMonth(monthStart.getMonth() + monthIndex);

            const monthEnd = new Date(startDate);
            monthEnd.setMonth(monthEnd.getMonth() + monthIndex + 1);

            const current = new Date(monthStart);
            while (current < monthEnd) {
                if (weekDayNumbers.includes(current.getDay())) {
                    monthDates.push({
                        day: current.getDate(),
                        month: monthNames[current.getMonth()]
                    });
                }
                current.setDate(current.getDate() + 1);
            }

            result[monthIndex + 1] = monthDates;
        }

        return {
            success: true,
            data: result
        };
    }

}
