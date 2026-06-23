import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger"
import { TeacherGroupService } from "./teacherGroup.service"
import { Role } from "@prisma/client"
import { AuthGuard } from "src/common/guards/jwt-auth.guard"
import { RolesGuard } from "src/common/guards/role.guard"
import { Roles } from "src/common/decorators/role"
import { CreateTeacherGroupDto } from "./dto/teacherGroup.dto"

@ApiBearerAuth()
@Controller('teacherGroup')
export class TeacherGroupController {
    constructor(private readonly teacherGroupService: TeacherGroupService) { }


    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    @Get("get/teacherGroup")
    getAllTeacherGroup() {
        return this.teacherGroupService.getAllTeacherGroup()
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    @Post()
    createTeacherGroup(@Body() payload: CreateTeacherGroupDto) {
        return this.teacherGroupService.createTeacherGroup(payload)
    }
}
