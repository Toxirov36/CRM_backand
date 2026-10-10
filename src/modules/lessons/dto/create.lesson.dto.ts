import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsNumber, IsOptional, IsString } from "class-validator"


export class CreateLessonDto {
    @ApiProperty()
    @IsNumber()
    group_id : number

    @ApiProperty()
    @IsString()
    topic : string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description? : string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    created_at? : string
}
