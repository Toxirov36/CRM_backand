import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsMobilePhone, IsOptional, IsString, MinLength } from "class-validator"

export class LoginDto {
    @ApiProperty({ example: "881411505" })
    @IsMobilePhone("uz-UZ")
    phone: string

    @ApiProperty({ example: "@Parol2026" })
    @IsString()
    password: string
}

export class CreateSuperAdminDto {
    @ApiProperty({ example: '+998901234567' })
    @IsMobilePhone('uz-UZ')
    @IsString()
    phone: string;

    @ApiProperty({ example: 'superadmin@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SuperAdmin123!' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    first_name: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    last_name: string;

    @ApiProperty({ example: 'Tashkent, Uzbekistan', required: false })
    @IsOptional()
    @IsString()
    address?: string;
}

export class ForgotPasswordDto {
    @ApiProperty({ example: "998901234567" })
    @IsString()
    phone: string;
}

export class VerifyCodeDto {
    @ApiProperty({ example: "998901234567" })
    @IsString()
    phone: string;

    @ApiProperty({ example: "1234" })
    @IsString()
    code: string;
}

export class ResetPasswordDto {
    @ApiProperty({ example: "998901234567" })
    @IsString()
    phone: string;

    @ApiProperty({ example: "1234" })
    @IsString()
    code: string;

    @ApiProperty({ example: "newPassword123" })
    @IsString()
    @MinLength(6)
    newPassword: string;
}