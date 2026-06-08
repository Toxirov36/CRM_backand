import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/role';
import { AuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { CreateVideoDto } from './dto/create.dto';
import { UpdateVideoDto } from './dto/update.dto';
import { VideosService } from './videos.service';

const videoStorage = diskStorage({
    destination: "./src/uploads/videos",
    filename: (req, file, cb) => {
        const safeExt = extname(file.originalname) || `.${file.mimetype.split("/")[1] || "mp4"}`;
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
});

@ApiBearerAuth()
@Controller('videos')
export class VideosController {
    constructor(private readonly videosService: VideosService) { }

    @ApiOperation({ summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}` })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @Get("group/:groupId")
    getVideosByGroup(@Param("groupId", ParseIntPipe) groupId: number) {
        return this.videosService.getVideosByGroup(groupId);
    }

    @ApiOperation({ summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}` })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: 'object',
            required: ["lesson_id", "group_id", "name", "file"],
            properties: {
                lesson_id: { type: "number" },
                group_id: { type: "number" },
                name: { type: "string" },
                file: { type: 'string', format: 'binary' },
            }
        }
    })
    @UseInterceptors(FileInterceptor("file", { storage: videoStorage }))
    @Post()
    createVideo(
        @Req() req: Request,
        @Body() payload: CreateVideoDto,
        @UploadedFile() file: Express.Multer.File
    ) {
        return this.videosService.createVideo(payload, req["user"], file);
    }

    @ApiOperation({ summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}` })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @ApiConsumes("multipart/form-data")
    @UseInterceptors(FileInterceptor("file", { storage: videoStorage }))
    @Patch(":id")
    updateVideo(
        @Param("id", ParseIntPipe) id: number,
        @Req() req: Request,
        @Body() payload: UpdateVideoDto,
        @UploadedFile() file?: Express.Multer.File
    ) {
        return this.videosService.updateVideo(id, payload, req["user"], file);
    }

    @ApiOperation({ summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}` })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
    @Delete(":id")
    deleteVideo(
        @Param("id", ParseIntPipe) id: number,
        @Req() req: Request
    ) {
        return this.videosService.deleteVideo(id, req["user"]);
    }
}
