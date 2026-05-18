import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CourseLevel, Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/role';
import { AuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { CreateCourseDto } from './dto/create.dto';

@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
     constructor(private readonly courseService : CoursesService){}
    
        @ApiOperation({
            summary:`${Role.SUPERADMIN}, ${Role.ADMIN}`
        })
        @UseGuards(AuthGuard,RolesGuard)
        @Roles(Role.SUPERADMIN, Role.ADMIN)
        @Get()
        getAllCourses(){
            return this.courseService.getAllCourses()
        }
    
        @ApiOperation({
            summary:`${Role.SUPERADMIN}, ${Role.ADMIN}`
        })
        @UseGuards(AuthGuard,RolesGuard)
        @Roles(Role.SUPERADMIN, Role.ADMIN)
        // @ApiQuery({name:"level",enum:CourseLevel})
        @Post()
        createCourse(
            @Body() payload: CreateCourseDto,
            // @Query("level") level : GetCoursesDto
        ){
            return this.courseService.createCourse(payload)
        }
}
