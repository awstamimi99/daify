import { BadRequestException } from '@nestjs/common';
export function supportReason(reason: string | undefined) {
  let value = reason?.trim();
  if (value?.startsWith('uri:')) {
    try { value = decodeURIComponent(value.slice(4)).trim(); } catch { throw new BadRequestException('Invalid support reason encoding.'); }
  }
  if (!value || value.length < 10 || value.length > 500) throw new BadRequestException('A support reason of 10–500 characters is required.');
  return value;
}
