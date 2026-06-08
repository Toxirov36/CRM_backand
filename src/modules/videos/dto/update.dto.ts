import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateVideoDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    lesson_id?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;
}
