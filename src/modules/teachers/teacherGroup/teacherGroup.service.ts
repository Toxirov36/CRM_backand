
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Status, TeacherGroupStatus } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateTeacherGroupDto } from './dto/teacherGroup.dto';

@Injectable()
export class TeacherGroupService {
    constructor(private prisma: PrismaService) { }

    async getAllTeacherGroup(){
        const teacherGroups = await this.prisma.groupTeacher.findMany({
            where:{
                status:TeacherGroupStatus.active
            },
            select:{
                id:true,
                teacher:{
                    select:{
                        id:true,
                        first_name:true
                    }
                },
                group:{
                    select:{
                        id:true,
                        name:true
                    }
                }
            }
        })

        return {
            sucess:true,
            data:teacherGroups
        }
    }

    async createTeacherGroup(payload: CreateTeacherGroupDto) {
        const existTeacher = await this.prisma.teacher.findFirst({
            where: {
                id: payload.teacher_id,
                status: Status.active
            }
        })

        if (!existTeacher) {
            throw new NotFoundException("Teacher not found with this id")
        }

        const existGroup = await this.prisma.group.findFirst({
            where: {
                id: payload.group_id,
                status: Status.active
            }
        })

        if (!existGroup) {
            throw new NotFoundException("Group not found with this id")
        }

        const existGroupTeacher = await this.prisma.groupTeacher.findFirst({
            where: {
                teacher_id: payload.teacher_id,
                group_id: payload.group_id,
                status: TeacherGroupStatus.active
            }
        })

        if (existGroupTeacher) {
            throw new ConflictException("Teacher is already in group")
        }

        await this.prisma.groupTeacher.create({
            data: {
                teacher_id: payload.teacher_id,
                group_id: payload.group_id,
                status: TeacherGroupStatus.active
            }
        })

        return {
            success: true,
            message: "Teacher added group"
        }
    }

}
