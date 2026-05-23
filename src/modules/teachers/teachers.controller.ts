import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/create.dto';

@ApiBearerAuth()
@Controller('teachers')
export class TeachersController {
    constructor(private readonly teacherService: TeachersService) { }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`,
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    @Get()
    getAllTeachers() {
        return this.teacherService.getAllTeachers()
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`,
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    @Get("inactive")
    getInactiveTeachers() {
        return this.teacherService.getInactiveTeachers()
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`,
        description: "Bu endpointga admin va superadmin huquqi bor"
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                first_name: { type: 'string', example: "Alish" },
                last_name: { type: 'string' },
                email: { type: 'string' },
                password: { type: 'string' },
                phone: { type: 'string' },
                photo: { type: 'string', format: 'binary' },
                address: { type: "string" },
            }
        }
    })
    @UseInterceptors(FileInterceptor("photo", {
        storage: diskStorage({
            destination: "./src/uploads",
            filename: (req, file, cb) => {
                const filename = Date.now() + "." + file.mimetype.split("/")[1]
                cb(null, filename)
            }
        })
    }))

    @Post()
    createTeacher(
        @Body() payload: CreateTeacherDto,
        @UploadedFile() file?: Express.Multer.File
    ) {
        return this.teacherService.createTeacher(payload, file?.filename)
    }

    @Delete(":id")
    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`,
        description: "Bu endpointga admin va superadmin huquqi bor"
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    deleteTeacher(@Param("id", ParseIntPipe) id: number) {
        return this.teacherService.deleteTeacher(id)
    }

    // controller
    @Put(":id")
    @UseInterceptors(FileInterceptor('photo'))
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    updateTeacher(
        @Param("id", ParseIntPipe) id: number,
        @Body() payload: UpdateTeacherDto,        // ✅ UpdateTeacherDto
        @UploadedFile() file?: Express.Multer.File
    ) {
        return this.teacherService.updateTeacher(id, payload, file?.filename)
    }

    @Patch(':id/activate')
    activateTeacher(@Param('id', ParseIntPipe) id: number) {
        return this.teacherService.activateTeacher(id);
    }
}