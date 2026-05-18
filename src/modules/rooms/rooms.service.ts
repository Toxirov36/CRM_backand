import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateRoomDto } from './dto/create.dto';
import { Status } from '@prisma/client';

@Injectable()
export class RoomsService {
    constructor(private prisma : PrismaService){}

    async getAllRooms(){
        const rooms = await this.prisma.room.findMany({
            where:{status:Status.active}
        })

        return {
            success : true,
            data:rooms
        }
    }

    async createRoom(payload : CreateRoomDto){

        const existRoom = await this.prisma.room.findUnique({
            where:{name:payload.name}
        })

        if(existRoom) {
            throw new ConflictException("Room already exists")
        }

        await this.prisma.room.create({
            data:payload
        })

        return {
            success : true,
            message : "Room created"
        }
    }
}
