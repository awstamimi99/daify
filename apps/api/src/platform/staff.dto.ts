import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsString, IsUUID, Length, Min } from 'class-validator';
import { staffPermissions, staffRoles, type StaffRole } from './staff-policy';

export class StaffAccessDto {
  @IsIn(staffRoles) role!: StaffRole;
  @IsArray() @ArrayUnique() @ArrayMaxSize(30) @IsIn(staffPermissions, { each: true }) permissions!: string[];
  @IsBoolean() allOrganizations!: boolean;
  @IsArray() @ArrayUnique() @ArrayMaxSize(500) @IsUUID('4', { each: true }) organizationIds!: string[];
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(10, 500) reason!: string;
}
export class InviteStaffDto extends StaffAccessDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @Length(3, 320) email!: string;
}
export class UpdateStaffDto extends StaffAccessDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsIn(['ACTIVE', 'SUSPENDED', 'INVITED']) status!: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
}
