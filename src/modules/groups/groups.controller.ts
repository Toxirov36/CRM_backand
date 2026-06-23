import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create.dto';
import { AuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { filterDto } from './dto/search';

@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
    constructor(private readonly groupService: GroupsService) { }


    @Get("one/students/:groupId")
    getGroupOne(
        @Param("groupId", ParseIntPipe) groupId: number
    ) {
        return this.groupService.getGroupOne(groupId)
    }

    @ApiOperation({
        summary: `${Role.STUDENT}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    @Get(":groupId/lessons")
    getLessonsByGroupId(
        @Param("groupId", ParseIntPipe) groupId: number,
        @Req() req: Request
    ) {
        return this.groupService.getLessonsByGroupId(groupId, req["user"].id)
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @Get("all")
    getAllGroups(
        @Query() search: filterDto
    ) {
        return this.groupService.getAllGroups(search)
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    @Get("allInactive")
    getAllGroupsInactive() {
        return this.groupService.getAllInactiveGroups()
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN)
    @Post()
    createGroup(@Body() payload: CreateGroupDto) {
        return this.groupService.createGroup(payload)
    }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @Get(":id/schedules")
    getGroupSchedules(
        @Param("id", ParseIntPipe) id: number
    ) {
        return this.groupService.getGroupSchedules(id)
    }
}

