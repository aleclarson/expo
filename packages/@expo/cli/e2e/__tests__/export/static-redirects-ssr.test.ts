/* eslint-env jest */
import type { RedirectConfig } from 'expo-router';
import path from 'node:path';

import { runExportSideEffects } from './export-side-effects';
import { executeExpoAsync } from '../../utils/expo';
import { processFindPrefixedValue } from '../../utils/process';
import { createBackgroundServer } from '../../utils/server';
import { getRouterE2ERoot } from '../utils';

runExportSideEffects();

describe('exports server', () => {
  const projectRoot = getRouterE2ERoot();
  const outputName = 'dist-static-redirects-ssr';

  beforeAll(async () => {
    await executeExpoAsync(
      projectRoot,
      ['export', '-p', 'web', '--source-maps', '--output-dir', outputName],
      {
        env: {
          NODE_ENV: 'production',
          EXPO_USE_STATIC: 'server',
          E2E_ROUTER_SRC: 'static-redirects',
          E2E_ROUTER_ASYNC: '',
          EXPO_USE_FAST_RESOLVER: 'true',
          E2E_ROUTER_REDIRECTS: JSON.stringify([
            { source: '/external-redirect', destination: 'https://expo.dev' },
          ] as RedirectConfig[]),
        },
      }
    );
  });

  describe('requests', () => {
    const server = createBackgroundServer({
      command: ['node', path.join(projectRoot, '__e2e__/static-redirects-ssr/express.js')],
      host: (chunk) =>
        processFindPrefixedValue(chunk, 'Express server listening') && 'http://localhost',
      cwd: projectRoot,
      env: { NODE_ENV: 'production', TEST_SECRET_KEY: 'test-secret-key' },
    });

    beforeAll(async () => {
      await server.startAsync();
    });
    afterAll(async () => {
      await server.stopAsync();
    });

    it('gets an external URL redirect', async () => {
      const res = await server.fetchAsync('/external-redirect');
      expect(res.status).toBe(200);
      expect(res.url).toBe('https://expo.dev/');
    });
  });
});
