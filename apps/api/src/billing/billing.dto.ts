import { IsBoolean, IsDateString, IsInt, IsObject, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
export class BillingPlanChoiceDto { @IsUUID('4') planId!: string; }
export class CheckoutDto extends BillingPlanChoiceDto { @IsUUID('4') idempotencyKey!: string; }
export class PlanDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @Length(1, 50) code!: string;
  @IsInt() @Min(1) @Max(100000) version!: number;
  @IsString() @Length(2, 100) name!: string;
  @IsString() @Length(2, 100) nameAr!: string;
  @Matches(/^\d{1,6}(?:\.\d{1,3})?$/) amount!: string;
  @IsObject() limits!: Record<string, unknown>;
  @IsString() @Length(10, 500) reason!: string;
}
export class PlanAvailabilityDto { @IsBoolean() active!: boolean; @IsString() @Length(10, 500) reason!: string; }
export class OverrideDto {
  @IsObject() limits!: Record<string, unknown>;
  @IsDateString() expiresAt!: string;
  @IsString() @Length(10, 500) reason!: string;
}
