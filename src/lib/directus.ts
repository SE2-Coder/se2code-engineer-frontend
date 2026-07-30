import { createDirectus, rest } from '@directus/sdk';

// IMPORTANTE: Cambia '172.26.3.43' por la IP PRIVADA REAL de tu Nodo 2
export const client = createDirectus('http://172.26.3.43:8055').with(rest());
