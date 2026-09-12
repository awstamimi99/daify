import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { openApiDocument } from './openapi.document';
import { AppConfigService } from '../common/config/app-config.service';

@Controller({ path: 'docs', version: VERSION_NEUTRAL })
@SkipThrottle()
export class DocsController {
  constructor(private readonly config: AppConfigService) {}
  @Get('openapi.json')
  getOpenApiDocument() {
    return { ...openApiDocument, components: { ...openApiDocument.components, securitySchemes: { sessionCookie: { ...openApiDocument.components.securitySchemes.sessionCookie, name: this.config.sessionCookieName } } } };
  }
}
