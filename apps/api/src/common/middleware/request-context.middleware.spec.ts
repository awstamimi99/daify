import { isTrustedRequestId } from './request-context.middleware';

describe('isTrustedRequestId', () => {
  it.each([
    '123e4567-e89b-42d3-a456-426614174000',
    '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  ])('accepts UUID or ULID correlation IDs', (requestId) => {
    expect(isTrustedRequestId(requestId)).toBe(true);
  });

  it.each([undefined, '', 'untrusted log value', 'a'.repeat(128)])(
    'rejects malformed correlation IDs',
    (requestId) => {
      expect(isTrustedRequestId(requestId)).toBe(false);
    },
  );
});
