import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsMobilePhone, IsString } from "class-validator"
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

}

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}