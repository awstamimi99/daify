import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { openApiDocument } from './openapi.document';

@Controller({ path: 'docs', version: VERSION_NEUTRAL })
export class DocsController {
  @Get('openapi.json')
  getOpenApiDocument() {
    return openApiDocument;
  }
}
