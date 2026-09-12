import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() email!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value) @IsString() @Length(2, 160) displayName!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}

export class LoginDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() email!: string;
  @IsString() @MaxLength(128) password!: string;
  @IsOptional() @Matches(/^\d{6}$/) mfaCode?: string;
  @IsOptional() @Matches(/^[a-fA-F0-9-]{32,39}$/) recoveryCode?: string;
}

export class MfaSetupDto {
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
  @IsOptional() @Matches(/^\d{6}$/) mfaCode?: string;
  @IsOptional() @Matches(/^[a-fA-F0-9-]{32,39}$/) recoveryCode?: string;
}
export class MfaConfirmDto {
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
  @Matches(/^\d{6}$/) code!: string;
}

export class EmailDto { @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() email!: string; }
export class TokenDto { @IsString() @MinLength(20) token!: string; }
export class ResetPasswordDto extends TokenDto {
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
