import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class CreateTeacherGroupDto {
    @ApiProperty()
    @IsNumber()
    teacher_id:number

    @ApiProperty()
    @IsNumber()
    group_id:number
}