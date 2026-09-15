import { describe, expect, it } from 'vitest';
import {
  ACCESS_LINK_RULE,
  CREDENTIAL_RULES,
  addedLines,
  privateRules,
  scanFile,
  scanText,
} from './key-scan.ts';

// Every fake value is put together while the test runs, so this file never
// holds a string the scan would refuse.
const repeat = (text: string, times: number) => text.repeat(times);
const fake = {
  openRouter: ['sk', 'or', 'v1', repeat('a1', 32)].join('-'),
  nvidia: ['nvapi', repeat('Xy_', 11)].join('-'),
  anthropic: ['sk', 'ant', 'api03', repeat('Ab-', 8)].join('-'),
  anthropicOauth: ['sk', 'ant', 'oat01', repeat('Zz9', 8)].join('-'),
  github: ['ghp', repeat('A1b2', 9)].join('_'),
  githubPat: ['github', 'pat', repeat('Q7w_', 13)].join('_'),
  bearer: ['Bearer', repeat('tok3n.', 5)].join(' '),
};
const rules = [...CREDENTIAL_RULES, ACCESS_LINK_RULE];
const found = (text: string) => scanText(text, rules, 'sample.txt').map((finding) => finding.rule);

describe('credential values', () => {
  it('refuses each credential shape', () => {
    expect(found(`OPENROUTER_API_KEY=${fake.openRouter}`)).toContain('OpenRouter key');
    expect(found(`NVIDIA_API_KEY=${fake.nvidia}`)).toContain('NVIDIA key');
    expect(found(fake.anthropic)).toContain('Anthropic key or token');
    expect(found(fake.anthropicOauth)).toContain('Anthropic key or token');
    expect(found(fake.github)).toContain('GitHub token');
    expect(found(fake.githubPat)).toContain('GitHub fine-grained token');
    expect(found(`Authorization: ${fake.bearer}`)).toContain('Authorization header value');
    expect(found(`curl -H "${fake.bearer}"`)).toContain('Bearer value');
  });

  it('lets through the word in front of a value, as the logger tests and the docs write it', () => {
    const prose = [
      'Authorization: Bearer <redacted>',
      'The logger replaces every Bearer token with [redacted].',
      'Set OPENROUTER_API_KEY and NVIDIA_API_KEY in the keys file.',
      'GH_TOKEN is exported by the session-start hook.',
      'Anthropic keys begin sk-ant-api03- and GitHub tokens begin ghp_.',
      'Authorization: Basic',
    ];
    for (const line of prose) {
      expect(found(line), line).toEqual([]);
    }
  });

  it('names the file and line but never the value', () => {
    const findings = scanText(`first line\n${fake.github}`, rules, 'notes.md');
    expect(findings).toEqual([{ where: 'notes.md', line: 2, rule: 'GitHub token' }]);
    expect(JSON.stringify(findings)).not.toContain(fake.github);
  });
});

describe('claude.ai access links', () => {
  const host = ['claude', 'ai'].join('.');

  it('refuses share and bundle addresses', () => {
    expect(found(`see https://${host}/share/0f3c2a`)).toContain('claude.ai share or bundle link');
    expect(found(`https://${host}/code/bundle/abc123`)).toContain('claude.ai share or bundle link');
  });

  it('lets plain claude.ai addresses through', () => {
    expect(found(`Open https://${host}/new and start a chat.`)).toEqual([]);
  });
});

describe('the pipeline generic rules', () => {
  const windowsHome = ['C:', 'Users', 'someone', 'project'].join('\\');
  const doubledHome = ['C:', 'Users', 'someone', 'project'].join('\\\\');
  const address = ['someone', 'example.org'].join('@');

  it('refuses absolute home paths, backslashes doubled or not', () => {
    for (const text of [
      windowsHome,
      doubledHome,
      `/${'home'}/someone/x`,
      `/c/${'Users'}/someone`,
    ]) {
      expect(
        scanFile('a.md', text, [], true).map((finding) => finding.rule),
        text,
      ).toContain('absolute home path');
    }
  });

  it('lets placeholders through', () => {
    expect(
      scanFile('a.md', '%USERPROFILE%\\.spindle and ~/.spindle and C:\\Users\\<you>', [], true),
    ).toEqual([]);
  });

  it('refuses email addresses other than no-reply and the co-author trailer', () => {
    expect(scanFile('a.md', `write to ${address}`, [], true)).toHaveLength(1);
    const trailer = ['noreply', 'anthropic.com'].join('@');
    const noreply = ['1+someone', 'users.noreply.github.com'].join('@');
    expect(scanFile('a.md', `${trailer} ${noreply}`, [], true)).toEqual([]);
  });

  it('refuses telemetry identity attributes only inside .jsonl files', () => {
    const line = JSON.stringify({ [['user', 'email'].join('.')]: 'x' });
    expect(scanFile('events.jsonl', line, [], true).map((finding) => finding.rule)).toContain(
      'telemetry identity attribute',
    );
    expect(scanFile('notes.md', line, [], true)).toEqual([]);
  });
});

describe('personal patterns', () => {
  const patterns = privateRules('\uFEFFsomeone\n# a comment\n\nSecret Project Name\n');

  it('builds home-path shapes from the first line without matching the bare name', () => {
    const doubled = ['C:', 'Users', 'someone', 'x'].join('\\\\');
    expect(scanText(doubled, patterns, 'f').map((finding) => finding.rule)).toContain(
      'personal home path',
    );
    expect(scanText('owned by @someoneelse and someone', patterns, 'f')).toEqual([]);
  });

  it('matches later lines literally, ignoring case', () => {
    expect(scanText('the secret project name is out', patterns, 'f')).toHaveLength(1);
  });

  it('reads the name after a label on the first line', () => {
    const labelled = privateRules('user: someone\n');
    const doubled = ['C:', 'Users', 'someone', 'notes'].join('\\\\');
    expect(scanText(`see ${doubled}`, labelled, 'f').map((finding) => finding.rule)).toEqual([
      'personal home path',
    ]);
    expect(scanText('the user someone wrote this', labelled, 'f')).toEqual([]);
  });
});

describe('addedLines', () => {
  it('reads the file and line each added line lands on', () => {
    const patch = [
      'diff --git a/x.md b/x.md',
      '--- a/x.md',
      '+++ b/x.md',
      '@@ -3,0 +4,2 @@',
      '+one',
      '+two',
    ].join('\n');
    expect(addedLines(patch)).toEqual([
      { file: 'x.md', line: 4, text: 'one' },
      { file: 'x.md', line: 5, text: 'two' },
    ]);
  });
});
