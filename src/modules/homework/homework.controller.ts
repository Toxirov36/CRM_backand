import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CreateHomeworkDto } from './dto/create.dto';
import { HomeworkStatus, Role } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role';
import HomeworkResultDto from './dto/homework.result.dto';

@ApiBearerAuth()
@Controller('homework')
export class HomeworkController {
    constructor(private readonly homeworkService: HomeworkService) { }

    @ApiOperation({
        summary: `${Role.STUDENT}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    @Get("own/:lessonId")
    getOwnHomework(
        @Param("lessonId", ParseIntPipe) lessonId: number,
        @Req() req: Request) {
        return this.homeworkService.getOwnHomework(lessonId, req['user'])
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @Get("group/:groupId/homework/:homeworkId/results")
    @ApiQuery({
        name: "status",
        enum: HomeworkStatus,
        required: false
    })
    getHomeworkResults(
        @Query("status") status: HomeworkStatus,
        @Param("groupId", ParseIntPipe) groupId: number,
        @Param("homeworkId", ParseIntPipe) homeworkId: number
    ) {
        return this.homeworkService.getHomeworkResults(groupId, homeworkId, status)
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @Get("group/:groupId/lesson/:lessonId/homework/:homeworkId/result/:studentId")
    getGroupHomeworkStudentResult(
        @Param("groupId", ParseIntPipe) groupId: number,
        @Param("lessonId", ParseIntPipe) lessonId: number,
        @Param("homeworkId", ParseIntPipe) homeworkId: number,
        @Param("studentId", ParseIntPipe) studentId: number
    ) {
        return this.homeworkService.getGroupHomeworkStudentResult(groupId, homeworkId, studentId, lessonId)
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    @Get("homework")
    getAllHomework() {
        return this.homeworkService.getAllHomework()
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @Get("group/:groupId")
    getHomeworkByGroup(
        @Param("groupId", ParseIntPipe) groupId: number
    ) {
        return this.homeworkService.getHomeworkByGroup(groupId)
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                lesson_id: { type: "number" },
                group_id: { type: "number" },
                file: { type: 'string', format: 'binary' },
                title: { type: "string" },
            }
        }
    })
    @UseInterceptors(FileInterceptor("file", {
        storage: diskStorage({
            destination: "./src/uploads/files",
            filename: (req, file, cb) => {
                const filename = Date.now() + "." + file.mimetype.split("/")[1]
                cb(null, filename)
            }
        })
    }))
    @Post()
    createHomework(
        @Req() req: Request,
        @Body() payload: CreateHomeworkDto,
        @UploadedFile() file?: Express.Multer.File
    ) {
        return this.homeworkService.createHomework(payload, req["user"], file?.filename)
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @Post("group/:groupId/homework/:homeworkId/check")
    submitHomeworkResult(
        @Param("groupId", ParseIntPipe) groupId: number,
        @Param("homeworkId", ParseIntPipe) homeworkId: number,
        @Body() payload: HomeworkResultDto,
        @Req() req: Request
    ) {
        return this.homeworkService.checkHomeworkResult(payload, req['user'], groupId, homeworkId)
    }
}
