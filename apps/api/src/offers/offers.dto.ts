import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
export class OfferReasonDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(10, 500) reason!: string;
}
export class CouponDto extends OfferReasonDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @Matches(/^[A-Z0-9][A-Z0-9-]{2,39}$/) code!: string;
  @IsInt() @Min(1) @Max(100) percent!: number;
  @IsInt() @Min(1) @Max(12) months!: number;
  @IsInt() @Min(1) @Max(100000) maxRedemptions!: number;
  @IsOptional() @IsUUID('4') organizationId?: string;
  @IsDateString() expiresAt!: string;
}
export class QuoteDto extends OfferReasonDto {
  @IsUUID('4') organizationId!: string;
  @IsUUID('4') planId!: string;
  @Matches(/^\d{1,6}(?:\.\d{1,3})?$/) amount!: string;
  @IsInt() @Min(1) @Max(12) months!: number;
  @IsDateString() expiresAt!: string;
}
export class QuoteUpdateDto extends QuoteDto { @IsInt() @Min(1) expectedVersion!: number; }
export class QuoteDecisionDto extends OfferReasonDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsIn(['APPROVE', 'REJECT', 'WITHDRAW']) decision!: 'APPROVE' | 'REJECT' | 'WITHDRAW';
}
export class AllowanceDto extends OfferReasonDto {
  @IsInt() @Min(0) @Max(100) maxPercent!: number;
  @IsInt() @Min(0) @Max(12) maxMonths!: number;
  @IsInt() @Min(0) @Max(12) freeMonths!: number;
  @IsInt() @Min(0) expectedVersion!: number;
}
export class CouponReviewDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @Matches(/^[A-Z0-9][A-Z0-9-]{2,39}$/) code!: string;
  @IsUUID('4') planId!: string;
}
export class CouponAcceptDto extends CouponReviewDto {
  @Matches(/^[a-f0-9]{64}$/) termsHash!: string;
  @IsBoolean() confirm!: boolean;
}
export class QuoteAcceptDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsBoolean() confirm!: boolean;
}
