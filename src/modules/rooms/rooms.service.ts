import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateRoomDto } from './dto/create.dto';
import { Status } from '@prisma/client';

@Injectable()
export class RoomsService {
    constructor(private prisma: PrismaService) { }

    async getAllRooms() {
        const rooms = await this.prisma.room.findMany({
            where: { status: Status.active }
        })

        return {
            success: true,
            data: rooms
        }
    }

    async createRoom(payload: CreateRoomDto) {

        const existRoom = await this.prisma.room.findUnique({
            where: { name: payload.name }
        })

        if (existRoom) {
            throw new ConflictException("Room already exists")
        }

        await this.prisma.room.create({
            data: payload
        })

        return {
            success: true,
            message: "Room created"
        }
    }

    async deleteRoom(id: number) {
        const existRoom = await this.prisma.room.findUnique({
            where: { id }
        })

        if (!existRoom) {
            throw new ConflictException("Room not found")
        }

        // Check if room is assigned to any active group
        const activeGroups = await this.prisma.group.findMany({
            where: {
                room_id: id,
                status: Status.active
            }
        })

        if (activeGroups.length > 0) {
            throw new ConflictException("Bu xona guruhga biriktirilgan. Avval guruhdan ajrating.")
        }

        await this.prisma.room.update({
            where: { id },
            data: { status: Status.inactive }
        })

        return {
            success: true,
            message: "Room deleted"
        }
    }

    async updateRoom(id: number, payload: CreateRoomDto) {
        const existRoom = await this.prisma.room.findUnique({
            where: { id }
        })

        if (!existRoom) {
            throw new ConflictException("Room not found")
        }

        await this.prisma.room.update({
            where: { id },
            data: payload
        })

        return {
            success: true,
            message: "Room updated"
        }
    }

    async getInactiveRooms() {
        const rooms = await this.prisma.room.findMany({
            where: { status: Status.inactive }
        })

        return {
            success: true,
            data: rooms
        }
    }

    async activateRoom(id: number) {
        const existRoom = await this.prisma.room.findUnique({
            where: { id }
        })

        if (!existRoom) {
            throw new ConflictException("Room not found")
        }

        await this.prisma.room.update({
            where: { id },
            data: { status: Status.active }
        })

        return {
            success: true,
            message: "Room restored"
        }
    }
}
