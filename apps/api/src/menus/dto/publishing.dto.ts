import { IsIn, IsObject, IsString, IsUUID, Length, Matches, ValidateIf } from 'class-validator';
import { RevisionDto } from './menu.dto';
export class DesignDto extends RevisionDto { @IsObject() design!: object; }
export class PublicationDto extends RevisionDto { @IsUUID('4') idempotencyKey!: string; }
export class PublishDto extends PublicationDto {
  @IsString() @Length(1, 100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsIn(['PUBLIC', 'UNLISTED', 'PRIVATE']) visibility!: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
}
export class RollbackDto extends PublicationDto { @IsUUID('4') versionId!: string; }
export class PublicParams { @IsString() @Length(1, 100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string; }
export class PublicImageParams extends PublicParams { @IsUUID('4') versionId!: string; @IsUUID('4') imageId!: string; }
export class PreviewQuery { @ValidateIf((_object: unknown, value: unknown) => value !== undefined) @IsString() @Length(2, 35) lang?: string; }
