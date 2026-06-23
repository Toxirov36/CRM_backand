import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsMobilePhone, IsOptional, IsString } from "class-validator"
import { PartialType } from "@nestjs/swagger"

export class CreateTeacherDto {
    @ApiProperty()
    @IsString()
    first_name!: string

    @ApiProperty()
    @IsString()
    last_name!: string

    @ApiProperty()
    @IsString()
    password!: string

    @ApiProperty()
    @IsMobilePhone()
    phone!: string

    @ApiProperty()
    @IsEmail()
    email!: string

    @ApiProperty()
    @IsString()
    address!: string

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    group_ids?: string
}

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}