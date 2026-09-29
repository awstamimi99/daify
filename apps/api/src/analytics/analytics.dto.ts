import { IsIn, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export const eventKinds = ['MENU_VIEW', 'QR_REDIRECT', 'LANGUAGE_CHANGE', 'SECTION_VIEW', 'ITEM_VIEW'] as const;
export class AnalyticsEventDto {
  @IsUUID('4') id!: string;
  @IsUUID('4') versionId!: string;
  @IsIn(eventKinds) kind!: typeof eventKinds[number];
  @IsString() @Length(2, 35) language!: string;
  @IsOptional() @IsUUID('4') targetId?: string;
}
export class AnalyticsQuery {
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
  @IsOptional() @IsUUID('4') locationId?: string;
  @IsOptional() @IsUUID('4') menuId?: string;
}
