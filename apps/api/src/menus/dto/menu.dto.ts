import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBase64, IsBoolean, IsIn, IsInt, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';

const Optional = () => ValidateIf((_object: unknown, value: unknown) => value !== undefined);
export class TranslationDto {
  @IsString() @Length(2, 35) languageTag!: string;
  @IsString() @MaxLength(160) name!: string;
  @Optional() @IsString() @MaxLength(2000) description?: string;
}
export class AltTranslationDto {
  @IsString() @Length(2, 35) languageTag!: string;
  @IsString() @MaxLength(500) altText!: string;
}
export class RevisionDto { @IsInt() @Min(1) revision!: number; }
export class CreateMenuDto {
  @IsString() @Length(2, 160) name!: string;
  @IsString() @Length(1, 100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsString() @Length(2, 35) defaultLanguage!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsString({ each: true }) supportedLanguages!: string[];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => TranslationDto) translations!: TranslationDto[];
}
export class UpdateMenuDto extends RevisionDto {
  @Optional() @IsString() @Length(2, 160) name?: string;
  @Optional() @IsString() @Length(1, 100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
  @Optional() @IsString() @Length(2, 35) defaultLanguage?: string;
  @Optional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsString({ each: true }) supportedLanguages?: string[];
  @Optional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => TranslationDto) translations?: TranslationDto[];
}
export class SectionDto extends RevisionDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => TranslationDto) translations!: TranslationDto[];
  @Optional() @IsBoolean() isVisible?: boolean;
  @Optional() @IsInt() @Min(0) @Max(1000) position?: number;
}
export class ItemDto extends RevisionDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => TranslationDto) translations!: TranslationDto[];
  @IsString() @Matches(/^(0|[1-9]\d{0,8})(\.\d{1,3})?$/) price!: string;
  @IsBoolean() isAvailable!: boolean;
  @IsBoolean() isFeatured!: boolean;
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true }) allergens!: string[];
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true }) dietaryTags!: string[];
  @Optional() @IsUUID('4') sectionId?: string;
  @Optional() @IsInt() @Min(0) @Max(1000) position?: number;
}
export class AvailabilityDto extends RevisionDto { @IsBoolean() isAvailable!: boolean; }
export class ImageUploadDto extends RevisionDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp']) mimeType!: string;
  @IsString() @MaxLength(2796204) @IsBase64() data!: string;
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AltTranslationDto) translations!: AltTranslationDto[];
}
export class ImageUpdateDto extends RevisionDto {
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AltTranslationDto) translations!: AltTranslationDto[];
}
