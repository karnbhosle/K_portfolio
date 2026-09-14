import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { fileURLToPath } from 'node:url';
const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/next-env.d.ts', 'design/stitch/**', 'playwright-report/**', 'test-results/**'] },
  { settings: { next: { rootDir: fileURLToPath(new URL('./apps/web/', import.meta.url)) } }, rules: { '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] } }
];
export default config;
