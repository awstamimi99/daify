import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class HealthQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean()
  database = false;
}
