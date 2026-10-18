import 'server-only';
import { cookies } from 'next/headers';
import { localeCookie, normalizeLocale, translator } from './translate';
export async function getLocale() { return normalizeLocale((await cookies()).get(localeCookie)?.value); }
export async function getTranslator() { return translator(await getLocale()); }
