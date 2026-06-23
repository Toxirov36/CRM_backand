import { ApiProperty, PartialType } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsDateString, IsEmail, IsMobilePhone, IsOptional, IsString, IsStrongPassword } from "class-validator"


export class CreateStudentDto {
    @ApiProperty()
    @IsString()
    first_name!: string

    @ApiProperty()
    @IsString()
    last_name!: string

    @ApiProperty()
    @IsStrongPassword()
    @IsString()
    password!: string

    @ApiProperty()
    @IsMobilePhone()
    phone!: string

    @ApiProperty()
    @IsEmail()
    email!: string

    @ApiProperty()
    @IsDateString()
    birth_date!: string

    @ApiProperty()
    @IsString()
    address!: string
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) { }

export class CreateHomeworkAnswerDto {
    @ApiProperty()
    @Transform(({ value }) => String(value))
    @IsString()
    title: string;
}

export class ChangePasswordDto {
    @ApiProperty()
    @IsString()
    currentPassword!: string;

    @ApiProperty()
    @IsString()
    newPassword!: string;
}