import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type LogDeps } from './lib/decision-log.ts';
import {
  decide,
  deniedShell,
  DENY_RULES,
  expectedSettingsDeny,
  needsTicket,
  TICKET_PATHS,
  type PathsInput,
} from './protect-paths.ts';

const now = Date.parse('2026-09-17T10:00:00Z');

let scratch: string;
let home: string;
let project: string;

function deps(): LogDeps {
  return { env: { SPINDLE_HOME: home }, now, projectDir: project, cwd: project };
}

function bind(sessionId: string, binding: Record<string, unknown>): void {
  const sessions = path.join(home, 'sessions');
  mkdirSync(sessions, { recursive: true });
  writeFileSync(path.join(sessions, `${sessionId}.json`), JSON.stringify(binding));
}

function edit(file: string, sessionId = 'abc-123'): PathsInput {
  return { session_id: sessionId, tool_name: 'Edit', tool_input: { file_path: file } };
}

function bash(command: string): PathsInput {
  return { session_id: 'abc-123', tool_name: 'Bash', tool_input: { command } };
}

beforeEach(() => {
  scratch = mkdtempSync(path.join(os.tmpdir(), 'spindle-paths-'));
  home = path.join(scratch, 'home');
  project = path.join(scratch, 'project');
  mkdirSync(home, { recursive: true });
  mkdirSync(project, { recursive: true });
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('needsTicket', () => {
  it('knows each of the nine protected shapes', () => {
    const named = [
      '.github/workflows/pipeline.yml',
      '.github/actions/setup/action.yml',
      '.github/ci/policy.json',
      'scripts/deploy.ts',
      '.worktreeinclude',
      '.mcp.json',
      '.claude/settings.json',
      '.claude/settings.local.json',
      '.claude/hooks/protect-paths.ts',
      'packages/adapters/recordings/openrouter.json',
    ];
    for (const file of named) expect(needsTicket(file, project)).toBeDefined();
    expect(TICKET_PATHS).toHaveLength(9);
  });

  it('matches a path given in full as well as one given relative', () => {
    expect(needsTicket(path.join(project, '.mcp.json'), project)).toBe('.mcp.json');
    expect(needsTicket('./.mcp.json', project)).toBe('.mcp.json');
  });

  it('leaves every stream path alone', () => {
    for (const file of [
      'apps/web/src/App.tsx',
      'apps/api/src/server.ts',
      'packages/proxy/src/keys.ts',
      'packages/adapters/src/index.ts',
      'scripts/record.ts',
      'docs/3-build/web/notes.md',
      'intent/spindle/plan.md',
    ]) {
      expect(needsTicket(file, project)).toBeUndefined();
    }
  });

  it('does not mistake scripts/record.ts for the deploy script', () => {
    expect(needsTicket('scripts/record.ts', project)).toBeUndefined();
    expect(needsTicket('scripts/deploy-staging.ts', project)).toBe('scripts/deploy*.ts');
  });
});

describe('the ticket', () => {
  it('refuses a protected path to a session holding none, and names the recovery', () => {
    const verdict = decide(edit('.github/workflows/pipeline.yml'), deps());
    expect(verdict.decision).toBe('deny');
    expect(verdict.reason).toContain('change ticket');
    expect(verdict.reason).toContain('checkout --');
  });

  it('allows the same path to a session holding one', () => {
    bind('abc-123', { sessionId: 'abc-123', ticket: 'W3 build kit' });
    const verdict = decide(edit('.claude/hooks/protect-paths.ts'), deps());
    expect(verdict.decision).toBe('allow');
    expect(verdict.reason).toContain('W3 build kit');
  });

  it('treats a release binding as no ticket, because it is not one', () => {
    bind('abc-123', { sessionId: 'abc-123', release: 'REL-1 abc1234' });
    expect(decide(edit('.mcp.json'), deps()).decision).toBe('deny');
  });

  it('treats a malformed binding as no ticket rather than throwing', () => {
    const sessions = path.join(home, 'sessions');
    mkdirSync(sessions, { recursive: true });
    writeFileSync(path.join(sessions, 'abc-123.json'), '{ not json');
    expect(decide(edit('.mcp.json'), deps()).decision).toBe('deny');
  });

  it('costs a ticketless session the protected paths and nothing else', () => {
    expect(decide(edit('apps/web/src/App.tsx'), deps()).decision).toBe('allow');
    expect(decide(edit('docs/3-build/kit/notes.md'), deps()).decision).toBe('allow');
  });

  it('does not stop reading a protected path, only writing one', () => {
    const read = {
      session_id: 'abc-123',
      tool_name: 'Read',
      tool_input: { file_path: '.mcp.json' },
    };
    expect(decide(read, deps()).decision).toBe('allow');
  });
});

describe('the deny list in shell form', () => {
  it('refuses an environment dump in either shell', () => {
    for (const command of ['printenv', 'env', 'set', 'Get-ChildItem Env:*', 'node -e "x"']) {
      expect(deniedShell(command), command).toBeDefined();
    }
  });

  it('refuses a command naming the token or its env file', () => {
    expect(deniedShell('echo $GH_TOKEN')).toBeDefined();
    expect(deniedShell('cat $CLAUDE_ENV_FILE')).toBeDefined();
    expect(deniedShell('ls ~/.claude/session-env')).toBeDefined();
  });

  it('refuses a command that could move the ticket mechanism', () => {
    expect(deniedShell('SPINDLE_HOME=/tmp/fake node x.ts')).toBeDefined();
    expect(deniedShell('notepad session.txt')).toBeDefined();
  });

  it('refuses the GitHub commands that change the repository', () => {
    for (const command of [
      'gh pr merge 7 --squash',
      'gh ruleset list',
      'gh repo edit --visibility public',
      'gh auth status',
      'gh secret set X',
      'gh repo delete',
    ]) {
      expect(deniedShell(command), command).toBeDefined();
    }
  });

  it('lets gh read and refuses gh write', () => {
    expect(deniedShell('gh api repos/o/r/pulls')).toBeUndefined();
    expect(deniedShell('gh pr view 7')).toBeUndefined();
    expect(deniedShell('gh api repos/o/r/pulls -X POST')).toBeDefined();
    expect(deniedShell('gh api repos/o/r/issues -f title=x')).toBeDefined();
  });

  it('refuses a force push and any push aimed at main', () => {
    expect(deniedShell('git push --force')).toBeDefined();
    expect(deniedShell('git push origin main')).toBeDefined();
    expect(deniedShell('git push -u origin build/kit')).toBeUndefined();
    expect(deniedShell('git push -u origin worktree-web')).toBeUndefined();
  });

  it('refuses running the deploy script directly', () => {
    expect(deniedShell('node scripts/deploy.ts')).toBeDefined();
  });

  it('refuses reaching the network in either shell', () => {
    for (const command of [
      'curl https://example.com',
      'wget https://example.com',
      'Invoke-WebRequest https://example.com',
      'Invoke-RestMethod https://example.com',
    ]) {
      expect(deniedShell(command), command).toBeDefined();
    }
  });

  it('leaves the commands the streams actually run alone', () => {
    for (const command of [
      'npm test',
      'npm ci',
      'npm run build',
      'npm run lint',
      'npm run checks',
      'git status',
      'git diff',
      'git add -A',
      'git log --oneline -5',
      'gh pr create --body-file body.md',
      'npx vitest run packages/adapters',
    ]) {
      expect(deniedShell(command), command).toBeUndefined();
    }
  });

  it('catches a denied command even wrapped in another shell', () => {
    expect(deniedShell('sh -c "curl https://example.com"')).toBeDefined();
    expect(deniedShell("bash -lc 'gh pr merge 7'")).toBeDefined();
  });

  it('refuses through decide as well, whatever the tool is called', () => {
    expect(decide(bash('curl https://example.com'), deps()).decision).toBe('deny');
    expect(
      decide(
        {
          session_id: 'abc-123',
          tool_name: 'PowerShell',
          tool_input: { command: 'Invoke-RestMethod x' },
        },
        deps(),
      ).decision,
    ).toBe('deny');
  });
});

describe('expectedSettingsDeny', () => {
  it('gives a sorted list with no repeats, so two copies can be held equal', () => {
    const list = expectedSettingsDeny();
    expect(list).toEqual([...list].sort());
    expect(new Set(list).size).toBe(list.length);
  });

  it('gives every Bash rule a PowerShell twin', () => {
    for (const entry of expectedSettingsDeny()) {
      if (!entry.startsWith('Bash(')) continue;
      const twin = entry.replace(/^Bash\(/, 'PowerShell(');
      expect(expectedSettingsDeny(), entry).toContain(twin);
    }
  });

  it('keeps the Wave 0 env-file deny, rather than leaving it outside the comparison', () => {
    expect(expectedSettingsDeny()).toContain('Read(~/.claude/session-env/**)');
  });

  it('carries a settings mirror for every rule', () => {
    for (const rule of DENY_RULES) expect(rule.settings.length, rule.name).toBeGreaterThan(0);
  });
});
