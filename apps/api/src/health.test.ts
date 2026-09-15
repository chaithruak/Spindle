import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createApiServer } from './server.ts';
import { LOOPBACK } from './environment.ts';

describe('GET /health', () => {
  const server = createApiServer();

  afterEach(() => {
    server.close();
  });

  it('answers ok on the loopback address', async () => {
    await new Promise<void>((resolve) => server.listen(0, LOOPBACK, resolve));
    const { address, port } = server.address() as AddressInfo;
    expect(address).toBe(LOOPBACK);

    const response = await fetch(`http://${LOOPBACK}:${port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});
