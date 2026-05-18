import { ConflictException, Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create.dto';
import { Status } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class CoursesService {
    constructor(private prisma : PrismaService){}
    
        async getAllCourses(){
            const courses = await this.prisma.course.findMany({
                where:{status:Status.active}
            })
    
            return {
                success : true,
                data:courses
            }
        }
    
        async createCourse(payload : CreateCourseDto){

            const existCourse = await this.prisma.course.findUnique({
                where:{name:payload.name}
            })
    
            if(existCourse) {
                throw new ConflictException("Course already exists")
            }
    
            await this.prisma.course.create({
                data:payload
            })
    
            return {
                success : true,
                message : "Course created"
            }
        }
}
