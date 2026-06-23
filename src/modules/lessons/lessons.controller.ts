import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create.lesson.dto';
import { Roles } from 'src/common/decorators/role';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller()
export class LessonsController {
    constructor(private readonly lessonService: LessonsService){}

    @ApiOperation({
        summary:`${Role.STUDENT}`
    })
    @UseGuards(AuthGuard,RolesGuard)
    @Roles(Role.STUDENT)
    @Get("groups/:groupId/lessons/:lessonId/videos")
    getLessonVideos(
        @Param("groupId", ParseIntPipe) groupId : number,
        @Param("lessonId", ParseIntPipe) lessonId : number,
        @Req() req : Request
    ){
        return this.lessonService.getLessonVideos(groupId, lessonId, req['user'])
    }

    @ApiOperation({
        summary:`${Role.STUDENT}`
    })
    @UseGuards(AuthGuard,RolesGuard)
    @Roles(Role.STUDENT)
    @Get("groups/:groupId/lesson/:lessonId/homework")
    getLessonHomework(
        @Param("groupId", ParseIntPipe) groupId : number,
        @Param("lessonId", ParseIntPipe) lessonId : number,
        @Req() req : Request
    ){
        return this.lessonService.getLessonHomework(groupId, lessonId, req['user'])
    }

    @ApiOperation({
        summary:`${Role.STUDENT}`
    })
    @UseGuards(AuthGuard,RolesGuard)
    @Roles(Role.STUDENT)
    @Get("lessons/my/group/:groupId")
    getMyGroupLessons(
        @Param("groupId", ParseIntPipe) groupId : number,
        @Req() req : Request
    ){
        return this.lessonService.getMyGroupLessons(groupId,req['user'])
    }


    @ApiOperation({
        summary:`${Role.ADMIN}`
    })
    @UseGuards(AuthGuard,RolesGuard)
    @Roles(Role.ADMIN,Role.SUPERADMIN)
    @Get("lessons")
    getAllLessons(){
        return this.lessonService.getAllLessons()
    }

    @ApiOperation({
        summary:`${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard,RolesGuard)
    @Roles(Role.ADMIN,Role.SUPERADMIN,Role.TEACHER)
    @Get("lessons/group/:groupId")
    getLessonsByGroup(
        @Param("groupId", ParseIntPipe) groupId: number
    ){
        return this.lessonService.getLessonsByGroup(groupId)
    }

    @ApiOperation({
        summary:`${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard,RolesGuard)
    @Roles(Role.ADMIN,Role.TEACHER,Role.SUPERADMIN)
    @Post("lessons")
    createLesson(
        @Body() payload : CreateLessonDto,
        @Req() req : Request
    ){
        return this.lessonService.createLesson(payload,req['user'])
    }
}
