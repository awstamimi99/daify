import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length, Matches, IsIn, IsTimeZone, IsISO4217CurrencyCode } from 'class-validator';
import { MembershipStatus, OrganizationRole } from '../../generated/prisma/enums';

export class CreateOrganizationDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value) @IsString() @Length(2, 160) name!: string;
  @IsString() @Length(1, 100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsOptional() @IsIn(['en', 'ar']) defaultLocale?: string;
  @IsOptional() @IsTimeZone() timezone?: string;
}

export class CreateLocationDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value) @IsString() @Length(2, 160) name!: string;
  @IsString() @Length(1, 100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsTimeZone() timezone!: string;
  @IsISO4217CurrencyCode() currency!: string;
  @IsIn(['en', 'ar']) defaultLanguage!: string;
}

export class InviteMemberDto {
  @IsEmail() email!: string;
  @IsEnum(OrganizationRole) role!: OrganizationRole;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) permissions: string[] = [];
  @IsBoolean() allLocations = false;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsUUID('4', { each: true }) locationIds: string[] = [];
}

export class AcceptInvitationDto { @IsString() token!: string; }

export class UpdateMemberDto {
  @IsOptional() @IsEnum(OrganizationRole) role?: OrganizationRole;
  @IsOptional() @IsEnum(MembershipStatus) status?: MembershipStatus;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) permissions?: string[];
}
