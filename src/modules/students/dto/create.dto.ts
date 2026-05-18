import { ApiProperty } from "@nestjs/swagger"
import { IsDateString, IsEmail, IsMobilePhone, IsString } from "class-validator"


export class CreateStudentDto {
    @ApiProperty()
    @IsString()
    first_name: string

    @ApiProperty()
    @IsString()
    last_name: string

    @ApiProperty()
    @IsString()
    password: string

    @ApiProperty()
    @IsMobilePhone()
    phone: string

    @ApiProperty()
    @IsEmail()
    email: string

    @ApiProperty()
    @IsDateString()
    birth_date: string

    @ApiProperty()
    @IsString()
    address: string
}