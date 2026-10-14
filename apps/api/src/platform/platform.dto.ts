import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class DirectoryQuery {
  @IsOptional() @IsUUID('4') after?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @Length(0, 100) search?: string;
}
export class AuditQuery extends DirectoryQuery {
  @IsOptional() @IsUUID('4') organizationId?: string;
  @IsOptional() @IsUUID('4') actorUserId?: string;
}
export class OrganizationStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED']) status!: 'ACTIVE' | 'SUSPENDED';
  @IsIn(['ACTIVE', 'SUSPENDED']) expectedStatus!: 'ACTIVE' | 'SUSPENDED';
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(10, 500) reason!: string;
}
export class UserStatusDto {
  @IsIn(['ACTIVE', 'DISABLED']) status!: 'ACTIVE' | 'DISABLED';
  @IsIn(['ACTIVE', 'DISABLED']) expectedStatus!: 'ACTIVE' | 'DISABLED';
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(10, 500) reason!: string;
}
