import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { Server } from 'node:http';
import request from 'supertest';
import { openApiDocument } from '../../src/docs/openapi.document';

const ajv = new Ajv2020({ strict: false, allErrors: true });
for (const format of ['email', 'uuid', 'uri', 'date-time'] as const) ajv.addFormat(format, addFormats.get(format));
ajv.addSchema({ $id: 'urn:daify:contract', components: openApiDocument.components });
type Operation = { responses: Record<string, { $ref?: string; content?: Record<string, { schema: object }> }> };
const paths = openApiDocument.paths as unknown as Record<string, Record<string, Operation>>;

export function contractRequest(server: Server) {
  const agent = request(server);
  for (const method of ['get', 'post', 'patch', 'delete'] as const) {
    const original = agent[method].bind(agent);
    agent[method] = (url: string) => original(url).expect(response => {
      if (url === '/api/docs/openapi.json') return;
      const path = url.split('?')[0]!.replace(/^\/api\/v1/, '');
      const entry = Object.entries(paths).find(([template]) => new RegExp(`^${template.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(path));
      if (!entry) throw new Error(`Undocumented path: ${method} ${path}`);
      const operation = entry[1][method];
      const result = operation?.responses[String(response.status)];
      if (!result) throw new Error(`Undocumented status: ${method} ${entry[0]} ${response.status}`);
      if (response.type === 'image/jpeg') { expect(result.content?.['image/jpeg']).toBeDefined(); expect(Buffer.isBuffer(response.body)).toBe(true); return; }
      if (response.status === 204) { expect(response.text).toBe(''); return; }
      const schema = result.$ref ? openApiDocument.components.responses.Problem.content['application/problem+json'].schema : Object.values(result.content ?? {})[0]?.schema;
      if (!schema) throw new Error(`Response schema missing: ${method} ${entry[0]}`);
      const qualified = JSON.parse(JSON.stringify(schema).replaceAll('#/components/', 'urn:daify:contract#/components/')) as object;
      if (!ajv.validate(qualified, response.body)) throw new Error(`Contract mismatch: ${method} ${entry[0]} ${response.status}: ${ajv.errorsText()}`);
    });
  }
  return agent;
}
