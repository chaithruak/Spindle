import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  commandTokens,
  decide,
  globToRegExp,
  isNeverBlocked,
  keyShaped,
  normalise,
  shutsOut,
  type HookInput,
} from './protect-secrets.ts';

const home = path.join(os.tmpdir(), 'spindle-secrets-home');
const env: NodeJS.ProcessEnv = { HOME: home, USERPROFILE: home, SPINDLE_HOME: `${home}/.private` };

function call(toolName: string, toolInput: Record<string, unknown>): HookInput {
  return { session_id: 'abc-123', tool_name: toolName, tool_input: toolInput };
}

describe('globToRegExp', () => {
  it('lets ** cross folders and * stay inside one', () => {
    expect(globToRegExp('**/*.env').test('apps/api/keys.env')).toBe(true);
    expect(globToRegExp('**/*.env').test('keys.env')).toBe(true);
    expect(globToRegExp('*.env').test('apps/keys.env')).toBe(false);
  });
});

describe('normalise', () => {
  it('writes one spelling for a home folder written four ways', () => {
    const expected = `${home.replace(/\\/g, '/')}/keys.env`;
    for (const written of [
      '~/keys.env',
      '$HOME/keys.env',
      '${HOME}/keys.env',
      '%USERPROFILE%/keys.env',
    ]) {
      expect(normalise(written, env)).toBe(expected);
    }
  });

  it('takes quotes and trailing slashes off', () => {
    expect(normalise('"apps/api/"', env)).toBe('apps/api');
  });
});

describe('commandTokens', () => {
  it('splits on shell punctuation as well as spaces', () => {
    expect(commandTokens('cat a.txt && rm "b.txt"; echo c')).toContain('b.txt');
  });

  it('splits an assignment, because that is how a path hides', () => {
    expect(commandTokens('SPINDLE_KEYS_FILE=/tmp/keys.env node x.ts')).toContain('/tmp/keys.env');
  });
});

describe('what is shut and what is not', () => {
  it('shuts the keys file', () => {
    expect(shutsOut('keys.env', env)).toBeDefined();
    expect(shutsOut('../keys.env', env)).toBeDefined();
    expect(shutsOut('~/keys.env', env)).toBeDefined();
  });

  it('shuts anything inside the Spindle home folder', () => {
    expect(shutsOut(`${home}/.private/gh-token.txt`, env)).toContain('Spindle home folder');
  });

  it('shuts a dot-env file however it is spelled', () => {
    expect(shutsOut('.env', env)).toBeDefined();
    expect(shutsOut('.env.local', env)).toBeDefined();
    expect(shutsOut('apps/api/.env', env)).toBeDefined();
  });

  it('never shuts keys.env.example, which is what the spec points people at', () => {
    expect(isNeverBlocked('keys.env.example')).toBe(true);
    expect(shutsOut('keys.env.example', env)).toBeUndefined();
    expect(shutsOut('/c/Projects/Spindle/keys.env.example', env)).toBeUndefined();
  });

  it('never shuts a source file these streams need', () => {
    for (const file of [
      'apps/api/src/environment.ts',
      'packages/proxy/src/keys.ts',
      'apps/web/src/api.ts',
      'scripts/record.ts',
      'config/environments.json',
    ]) {
      expect(shutsOut(file, env)).toBeUndefined();
    }
  });
});

describe('keyShaped', () => {
  it('knows both providers, built at run time so this file holds neither', () => {
    const openrouter = ['sk', 'or', 'v1', 'a1b2c3d4'.repeat(8)].join('-');
    const nvidia = ['nvapi', 'x'.repeat(34)].join('-');
    expect(keyShaped(openrouter)).toBe('OpenRouter key');
    expect(keyShaped(nvidia)).toBe('NVIDIA key');
  });

  it('knows an access link, because it lets somebody in', () => {
    // Put together at run time, like the keys above. Written out in full, the
    // commit hook refuses this file — which is the guard doing its job, and is
    // how this line came to be written this way.
    const link = ['https:/', 'claude.ai', 'share', 'abcdef'].join('/');
    expect(keyShaped(`see ${link}`)).toBe(ACCESS_LINK_NAME);
  });

  it('leaves ordinary prose alone', () => {
    expect(keyShaped('the router hands the adapter a key accessor')).toBeUndefined();
  });
});

const ACCESS_LINK_NAME = 'claude.ai share or bundle link';

describe('decide', () => {
  it('refuses reading the keys file through a file tool, and names the route', () => {
    const verdict = decide(call('Read', { file_path: '~/keys.env' }), env);
    expect(verdict.decision).toBe('deny');
    expect(verdict.reason).toContain('keys.env.example');
  });

  it('refuses reaching the keys file through either shell', () => {
    expect(decide(call('Bash', { command: 'cat ~/keys.env' }), env).decision).toBe('deny');
    expect(decide(call('PowerShell', { command: 'Get-Content ~/keys.env' }), env).decision).toBe(
      'deny',
    );
  });

  it('allows the example file through either route', () => {
    expect(decide(call('Read', { file_path: 'keys.env.example' }), env).decision).toBe('allow');
    expect(decide(call('Bash', { command: 'cat keys.env.example' }), env).decision).toBe('allow');
  });

  it('refuses writing something key-shaped into any file', () => {
    const fake = ['nvapi', 'z'.repeat(34)].join('-');
    expect(
      decide(call('Write', { file_path: 'docs/3-build/notes.md', content: fake }), env),
    ).toMatchObject({ decision: 'deny' });
  });

  it('lets ordinary work through untouched', () => {
    expect(decide(call('Edit', { file_path: 'apps/web/src/App.tsx' }), env).decision).toBe('allow');
    expect(decide(call('Bash', { command: 'npm test' }), env).decision).toBe('allow');
  });

  it('allows a call it cannot read anything out of, having found nothing to refuse', () => {
    expect(decide({}, env).decision).toBe('allow');
  });
});
