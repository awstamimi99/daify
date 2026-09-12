import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthQueryDto } from './dto/health-query.dto';
import { HealthService } from './health.service';

@Controller({ path: 'health', version: '1' })
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(@Query() query: HealthQueryDto) {
    return this.healthService.check(query.database);
  }
}
