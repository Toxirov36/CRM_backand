import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsString } from "class-validator";

export default class HomeworkResultDto{
    @ApiProperty({
        description: 'grade'
    })
    @IsNumber()
    grade: number

    @ApiProperty({
        description: 'title'
    })
    @IsString()
    title: string

    @ApiProperty({
        description: 'homework_answer_id'
    })
    @IsNumber()
    @Type(() => Number)
    homework_answer_id: number
}