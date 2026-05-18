import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateLessonDto } from './dto/create.lesson.dto';
import { Role, Status } from '@prisma/client';

@Injectable()
export class LessonsService {
    constructor(private prisma: PrismaService) { }

    async getMyGroupLessons(groupId : number, currentUser : { id : number }){
        const existGroup = await this.prisma.group.findFirst({
            where:{
                id: groupId,
                status : Status.active
            }
        })

        if(!existGroup){
            throw new NotFoundException("Group not found with this id")
        }

        const existGroupStudent = await this.prisma.studentGroup.findFirst({
            where:{
                group_id:groupId,
                student_id:currentUser.id,
                status : Status.active
            }
        })

        if(!existGroupStudent){
            throw new BadRequestException("Group does not belong to this Student")
        }

        const groupLessons = await this.prisma.lesson.findMany({
            where:{
                group_id : groupId,
                status: Status.active
            },
            select:{
                id:true,
                topic:true,
                created_at:true
            }
        })

        return {
            success : true,
            data: groupLessons
        }
    }

    async getAllLessons(){
        const lessons = await this.prisma.lesson.findMany({
            where:{status:"active"}
        })

        return {
            sucess:true,
            data:lessons
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

        if (currentUser.role == "TEACHER" && existGroup.teacher_id != currentUser.id) {
            throw new ForbiddenException("Bu seni guruhing emas")
        }

        await this.prisma.lesson.create({
            data: {
                ...payload,
                teacher_id: currentUser.role == "TEACHER" ? currentUser.id : null,
                user_id: currentUser.role != "TEACHER" ? currentUser.id : null
            }
        })

        return {
            success: true,
            message: "Lesson created"
        }
    }
}
