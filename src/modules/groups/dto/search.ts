import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class filterDto {
    @ApiPropertyOptional()
    @IsOptional()
    groupName? : string

    @ApiPropertyOptional()
    @IsOptional()
    max_student? : number
}