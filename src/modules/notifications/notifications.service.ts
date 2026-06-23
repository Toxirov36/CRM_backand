import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyNotifications(studentId: number) {
    const notifications = await this.prisma.notification.findMany({
      where: { student_id: studentId },
      orderBy: { created_at: 'desc' }
    });
    return { success: true, data: notifications };
  }

  async markAsRead(id: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id }
    });
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    await this.prisma.notification.update({
      where: { id },
      data: { is_read: true }
    });
    return { success: true, message: "Marked as read" };
  }

  async createForGroup(groupId: number, title: string, message: string) {
    const students = await this.prisma.studentGroup.findMany({
      where: { group_id: groupId, status: "active" },
      select: { student_id: true }
    });

    if (students.length === 0) return;

    await this.prisma.notification.createMany({
      data: students.map(s => ({
        student_id: s.student_id,
        title,
        message,
        type: "HOMEWORK",
      }))
    });
  }

  async createForStudent(studentId: number, title: string, message: string) {
    await this.prisma.notification.create({
      data: {
        student_id: studentId,
        title,
        message,
        type: "HOMEWORK",
      }
    });
  }
}
