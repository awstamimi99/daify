import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { DirectoryQuery } from '../platform/platform.dto';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class SupportQuery extends DirectoryQuery {
  @IsOptional() @IsUUID('4') organizationId?: string;
  @IsOptional() @IsIn(['OPEN', 'CLOSED']) status?: 'OPEN' | 'CLOSED';
}
export class SupportReplyDto {
  @Transform(trim) @IsString() @Length(1, 4000) body!: string;
}
export class SupportCreateDto extends SupportReplyDto {
  @Transform(trim) @IsString() @Length(3, 160) subject!: string;
}
export class SupportStatusDto {
  @IsIn(['OPEN', 'CLOSED']) status!: 'OPEN' | 'CLOSED';
  @IsIn(['OPEN', 'CLOSED']) expectedStatus!: 'OPEN' | 'CLOSED';
}
