import { Controller, Get, Param, Patch, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role';
import { Role } from '@prisma/client';

@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @ApiOperation({
    summary: `${Role.STUDENT}`
  })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('my')
  getMy(@Req() req: any) {
    const currentUser = req.user || req['user'];
    return this.service.getMyNotifications(currentUser.id);
  }

  @ApiOperation({
    summary: `${Role.STUDENT}`
  })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number) {
    return this.service.markAsRead(id);
  }
}
