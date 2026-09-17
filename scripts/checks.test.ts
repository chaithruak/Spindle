import { describe, expect, it } from 'vitest';

import {
  addedSkips,
  datedSections,
  HIGH_RISK_PATHS,
  namesHighRisk,
  sharedFilesNamed,
  strayPaths,
  streamFromBranch,
  streamSection,
} from './checks.ts';

describe('streamFromBranch', () => {
  it('knows the three streams by their branch names', () => {
    expect(streamFromBranch('worktree-web')).toBe('web');
    expect(streamFromBranch('worktree-adapters')).toBe('adapters');
    expect(streamFromBranch('worktree-server')).toBe('server');
  });

  it('is not fooled by a branch that only looks like one', () => {
    expect(streamFromBranch('main')).toBeUndefined();
    expect(streamFromBranch('build/kit')).toBeUndefined();
    expect(streamFromBranch('worktree-something-else')).toBeUndefined();
    expect(streamFromBranch('worktree-worktree-web')).toBeUndefined();
  });
});

describe('streamSection', () => {
  const plan = [
    '### Files that change',
    '',
    '#### worktree-web — the chat window and the model picker',
    '',
    '1. `apps/web/src/App.tsx` — replaced.',
    'Shared files this stream may name: **CLAUDE.md**.',
    '',
    '#### worktree-adapters — one interface and two providers',
    '',
    '1. `packages/adapters/src/index.ts` — new.',
    '',
    '### Order of work',
    '',
    'Not part of any stream.',
  ].join('\n');

  it('finds a section by its heading and stops at the next one', () => {
    const web = streamSection(plan, 'web');
    expect(web).toContain('apps/web/src/App.tsx');
    expect(web).not.toContain('packages/adapters');
    expect(web).not.toContain('Order of work');
  });

  it('comes back empty-handed when a stream has no section', () => {
    expect(streamSection(plan, 'server')).toBeUndefined();
  });

  it('names only the shared files its own section names', () => {
    expect(sharedFilesNamed(streamSection(plan, 'web')!)).toEqual(['CLAUDE.md']);
    expect(sharedFilesNamed(streamSection(plan, 'adapters')!)).toEqual([]);
  });
});

describe('strayPaths', () => {
  const section = 'Shared files this stream may name: **CLAUDE.md**.';

  it('lets a stream work inside its own paths', () => {
    expect(strayPaths(['apps/web/src/App.tsx', 'apps/web/src/api.ts'], 'web', section)).toEqual([]);
  });

  it('lets it extend its own plan section and its own notes', () => {
    expect(
      strayPaths(['intent/spindle/plan.md', 'docs/3-build/web/rounds.md'], 'web', section),
    ).toEqual([]);
  });

  it('lets it name a shared file its section named, and no other', () => {
    expect(strayPaths(['CLAUDE.md'], 'web', section)).toEqual([]);
    expect(strayPaths(['.prettierignore'], 'web', section)).toEqual(['.prettierignore']);
  });

  it('catches a stream reaching into another stream', () => {
    expect(strayPaths(['packages/adapters/src/index.ts'], 'web', section)).toEqual([
      'packages/adapters/src/index.ts',
    ]);
  });

  it('catches a frozen file even though it sits inside the fence', () => {
    expect(strayPaths(['apps/web/package.json'], 'web', section)).toEqual([
      'apps/web/package.json',
    ]);
    expect(strayPaths(['package-lock.json'], 'web', section)).toEqual(['package-lock.json']);
  });

  it('gives the adapters stream its two script files', () => {
    expect(
      strayPaths(['scripts/record.ts', 'scripts/record.test.ts'], 'adapters', section),
    ).toEqual([]);
    expect(strayPaths(['scripts/smoke.ts'], 'adapters', section)).toEqual(['scripts/smoke.ts']);
  });

  it('gives the screenshot rounds to the web stream alone', () => {
    const round = 'docs/3-build/screenshot-rounds/round-1.png';
    expect(strayPaths([round], 'web', section)).toEqual([]);
    expect(strayPaths([round], 'server', section)).toEqual([round]);
  });
});

describe('the high-risk list', () => {
  it('is the ticket list plus the two the Wave 3 section adds', () => {
    expect(HIGH_RISK_PATHS).toContain('packages/proxy/**');
    expect(HIGH_RISK_PATHS).toContain('apps/api/src/sign-in.ts');
    expect(HIGH_RISK_PATHS).toContain('.claude/hooks/**');
    expect(HIGH_RISK_PATHS.length).toBeGreaterThan(9);
  });

  it('sees a high-risk path named in a section body', () => {
    expect(namesHighRisk('this stream builds `packages/proxy/keys.ts`')).toContain(
      'packages/proxy/**',
    );
    expect(namesHighRisk('this stream builds `apps/web/src/App.tsx`')).toEqual([]);
  });
});

describe('datedSections', () => {
  it('splits the plan on its dated headings and keeps each body with it', () => {
    const plan = [
      'Preamble nobody owns.',
      '## 2026-09-14 — one',
      'body of one',
      '## 2026-09-17 — two',
      'body of two',
    ].join('\n');
    const sections = datedSections(plan);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.body).toContain('body of one');
    expect(sections[0]?.body).not.toContain('body of two');
  });
});

describe('addedSkips', () => {
  const patch = (line: string) =>
    [
      'diff --git a/x.test.ts b/x.test.ts',
      '--- a/x.test.ts',
      '+++ b/x.test.ts',
      '@@ -1 +1,2 @@',
      `+${line}`,
    ].join('\n');

  it('catches a test marked skipped, exclusive or pending', () => {
    for (const marker of ['it.skip(', 'test.only(', 'describe.skip(', 'it.todo(']) {
      expect(addedSkips(patch(`  ${marker}'x', () => {});`)), marker).toHaveLength(1);
    }
  });

  it('leaves a platform condition alone, which is not a skipped test', () => {
    expect(addedSkips(patch("  it.skipIf(onWindows)('x', () => {});"))).toEqual([]);
    expect(addedSkips(patch("  it.runIf(onWindows)('x', () => {});"))).toEqual([]);
  });

  it('leaves an ordinary test alone', () => {
    expect(addedSkips(patch("  it('does the thing', () => {});"))).toEqual([]);
  });
});
