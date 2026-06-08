import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Role, Status } from '@prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateVideoDto } from './dto/create.dto';
import { UpdateVideoDto } from './dto/update.dto';

@Injectable()
export class VideosService {
    constructor(private prisma: PrismaService) { }

    async getVideosByGroup(groupId: number) {
        const videos = await this.prisma.video.findMany({
            where: {
                group_id: groupId,
                status: Status.active
            },
            select: {
                id: true,
                name: true,
                file: true,
                size: true,
                mime_type: true,
                created_at: true,
                update_at: true,
                lesson: {
                    select: {
                        id: true,
                        topic: true,
                        created_at: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return {
            success: true,
            data: videos
        };
    }

    async createVideo(payload: CreateVideoDto, currentUser: { id: number, role: Role }, file?: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException("Video file is required");
        }

        const lesson = await this.prisma.lesson.findFirst({
            where: {
                id: payload.lesson_id,
                group_id: payload.group_id,
                status: Status.active
            },
            select: {
                groups: {
                    select: {
                        teacher_id: true
                    }
                }
            }
        });

        if (!lesson) {
            throw new NotFoundException("Lesson not found with this group");
        }

        if (currentUser.role === Role.TEACHER && lesson.groups.teacher_id !== currentUser.id) {
            throw new ForbiddenException("Is not your lesson");
        }

        const video = await this.prisma.video.create({
            data: {
                lesson_id: payload.lesson_id,
                group_id: payload.group_id,
                name: payload.name,
                file: file.filename,
                size: file.size,
                mime_type: file.mimetype,
                teacher_id: currentUser.role === Role.TEACHER ? currentUser.id : null,
                user_id: currentUser.role !== Role.TEACHER ? currentUser.id : null
            }
        });

        return {
            success: true,
            message: "Video uploaded",
            data: video
        };
    }

    async updateVideo(id: number, payload: UpdateVideoDto, currentUser: { id: number, role: Role }, file?: Express.Multer.File) {
        const existingVideo = await this.prisma.video.findFirst({
            where: {
                id,
                status: Status.active
            },
            select: {
                id: true,
                group_id: true,
                teachers: {
                    select: {
                        id: true
                    }
                },
                groups: {
                    select: {
                        teacher_id: true
                    }
                }
            }
        });

        if (!existingVideo) {
            throw new NotFoundException("Video not found");
        }

        if (currentUser.role === Role.TEACHER && existingVideo.groups.teacher_id !== currentUser.id) {
            throw new ForbiddenException("Is not your video");
        }

        if (payload.lesson_id) {
            const lesson = await this.prisma.lesson.findFirst({
                where: {
                    id: payload.lesson_id,
                    group_id: existingVideo.group_id,
                    status: Status.active
                }
            });

            if (!lesson) {
                throw new NotFoundException("Lesson not found with this group");
            }
        }

        const video = await this.prisma.video.update({
            where: { id },
            data: {
                ...(payload.lesson_id ? { lesson_id: payload.lesson_id } : {}),
                ...(payload.name ? { name: payload.name } : {}),
                ...(file ? { file: file.filename, size: file.size, mime_type: file.mimetype } : {})
            }
        });

        return {
            success: true,
            message: "Video updated",
            data: video
        };
    }

    async deleteVideo(id: number, currentUser: { id: number, role: Role }) {
        const existingVideo = await this.prisma.video.findFirst({
            where: { id, status: Status.active },
            select: {
                file: true,
                groups: {
                    select: { teacher_id: true }
                }
            }
        });

        if (!existingVideo) {
            throw new NotFoundException("Video not found");
        }

        if (currentUser.role === Role.TEACHER && existingVideo.groups?.teacher_id !== currentUser.id) {
            throw new ForbiddenException("Is not your video");
        }

        // ✅ Faylni o'chirish:
        if (existingVideo.file) {
            const filePath = path.join(process.cwd(), 'src', 'uploads', 'videos', existingVideo.file);
            console.log('Searching file at:', filePath);       // ✅ qayerda qidirmoqda
            console.log('File exists:', fs.existsSync(filePath)); // ✅ topildimi
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await this.prisma.video.update({
            where: { id },
            data: { status: Status.inactive }
        });

        return {
            success: true,
            message: "Video deleted"
        };
    }
}
