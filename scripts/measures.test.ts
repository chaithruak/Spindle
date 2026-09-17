import { describe, expect, it } from 'vitest';
import {
  fetchWorkflowRuns,
  firstRunBySha,
  planSections,
  tallyFirstTimeGreen,
  editsAfter,
  fetchClosedPulls,
  formatDuration,
  readStart,
  repositoryFromRemote,
  tallyIntents,
  type ClosedPull,
} from './measures.ts';

describe('the conversation start line', () => {
  it('reads a time with its offset', () => {
    const start = readStart('Conversation started: 2026-09-15T14:05-05:00\n\n# Mark and Claude');
    expect(start?.written).toBe('2026-09-15T14:05-05:00');
    expect(start?.at.toISOString()).toBe('2026-09-15T19:05:00.000Z');
  });

  it('reads seconds, UTC and a positive offset', () => {
    expect(readStart('Conversation started: 2026-09-15T19:05:30Z')?.at.toISOString()).toBe(
      '2026-09-15T19:05:30.000Z',
    );
    expect(readStart('Conversation started: 2026-09-16T00:35+05:30')?.at.toISOString()).toBe(
      '2026-09-15T19:05:00.000Z',
    );
  });

  it('tolerates a byte-order mark and Windows line endings', () => {
    const mark = String.fromCharCode(0xfeff);
    expect(readStart(`${mark}Conversation started: 2026-09-15T14:05-05:00\r\nrest`)).toBeDefined();
  });

  it('refuses a time without its offset', () => {
    expect(readStart('Conversation started: 2026-09-15T14:05')).toBeUndefined();
  });

  it('refuses a time that is not on the calendar', () => {
    expect(readStart('Conversation started: 2026-02-30T10:00-05:00')).toBeUndefined();
    expect(readStart('Conversation started: 2026-09-15T24:00-05:00')).toBeUndefined();
  });

  it('reads only the first line', () => {
    expect(
      readStart('# Conversation\nConversation started: 2026-09-15T14:05-05:00'),
    ).toBeUndefined();
  });
});

describe('a duration', () => {
  it('is given in hours and minutes, to the nearest minute', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(29_000)).toBe('0 min');
    expect(formatDuration(14 * 60_000 + 31_000)).toBe('15 min');
    expect(formatDuration((26 * 60 + 5) * 60_000)).toBe('26 h 5 min');
  });

  it('is refused when negative', () => {
    expect(formatDuration(-60_000)).toBeUndefined();
    expect(formatDuration(Number.NaN)).toBeUndefined();
  });
});

describe('edits to an intent after its spec', () => {
  const spec = '2026-09-15T21:00:00-05:00';

  it('counts only commits dated after the spec landed', () => {
    expect(
      editsAfter(
        [
          '2026-09-16T09:30:00-05:00',
          '2026-09-15T21:00:00-05:00',
          '2026-09-15T18:44:39-05:00',
          '2026-09-14T11:00:00-05:00',
        ],
        spec,
      ),
    ).toBe(1);
  });

  it('does not count the commit that carried the spec itself', () => {
    expect(editsAfter([spec], spec)).toBe(0);
    expect(editsAfter(['2026-09-16T02:00:00Z'], spec)).toBe(0);
  });

  it('reads 0 when the intent was never touched again', () => {
    expect(editsAfter([], spec)).toBe(0);
  });

  it('ignores a date git could not give and a spec date that is not a date', () => {
    expect(editsAfter(['not a date', '2026-09-16T09:30:00-05:00'], spec)).toBe(1);
    expect(editsAfter(['2026-09-16T09:30:00-05:00'], 'not a date')).toBe(0);
  });
});

// Remote addresses with a user in them look like email addresses to the key
// scan, so they are put together while the test runs.
const withUser = (user: string, rest: string) => [user, rest].join('@');

describe('the repository behind a remote', () => {
  it('is read from an https address, with or without a user and .git', () => {
    expect(
      repositoryFromRemote(
        `https://${withUser('someone', 'github.com/example-owner/Spindle.git')}\n`,
      ),
    ).toEqual({
      owner: 'example-owner',
      repo: 'Spindle',
    });
    expect(repositoryFromRemote('https://github.com/example-owner/Spindle')).toEqual({
      owner: 'example-owner',
      repo: 'Spindle',
    });
  });

  it('is read from an ssh address', () => {
    expect(repositoryFromRemote(withUser('git', 'github.com:example-owner/Spindle.git'))).toEqual({
      owner: 'example-owner',
      repo: 'Spindle',
    });
  });

  it('is undefined for a remote that is not on GitHub', () => {
    expect(repositoryFromRemote('https://example.com/example-owner/Spindle.git')).toBeUndefined();
  });
});

const pull = (ref: string, merged: boolean, sha = `sha-${ref}`): ClosedPull => ({
  head: { ref, sha },
  merged_at: merged ? '2026-09-15T21:29:16Z' : null,
});

describe('the tally of decided intents', () => {
  it('counts merged intent branches as accepted and closed ones as closed', () => {
    expect(
      tallyIntents([
        pull('intent/spindle', false),
        pull('intent/spindle-2', true),
        pull('intent/other', true),
      ]),
    ).toEqual({ accepted: 2, closed: 1 });
  });

  it('ignores every branch that does not carry an intent', () => {
    expect(tallyIntents([pull('docs/wave-0-records', true), pull('fix/run-tests', false)])).toEqual(
      { accepted: 0, closed: 0 },
    );
  });
});

describe('reading closed pull requests from GitHub', () => {
  it('reads page after page until one comes back short, with no token', async () => {
    const asked: { url: string; headers: Record<string, string> }[] = [];
    const fullPage = Array.from({ length: 100 }, () => pull('fix/something', true));
    const fakeFetch = async (url: string, init?: RequestInit) => {
      asked.push({ url, headers: init?.headers as Record<string, string> });
      const body = asked.length === 1 ? fullPage : [pull('intent/spindle', true)];
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const result = await fetchClosedPulls('example-owner', 'Spindle', fakeFetch);
    expect('pulls' in result && result.pulls).toHaveLength(101);
    expect(asked.map((entry) => new URL(entry.url).searchParams.get('page'))).toEqual(['1', '2']);
    expect(asked.every((entry) => new URL(entry.url).searchParams.get('state') === 'closed')).toBe(
      true,
    );
    expect(
      asked.every((entry) =>
        Object.keys(entry.headers).every((name) => name.toLowerCase() !== 'authorization'),
      ),
    ).toBe(true);
  });

  it('says what GitHub answered when it refuses', async () => {
    const fakeFetch = async () => new Response('rate limited', { status: 403 });
    expect(await fetchClosedPulls('example-owner', 'Spindle', fakeFetch)).toEqual({
      error: 'GitHub answered 403',
    });
  });

  it('says GitHub could not be reached when the request fails', async () => {
    const fakeFetch = async () => {
      throw new Error('offline');
    };
    expect(await fetchClosedPulls('example-owner', 'Spindle', fakeFetch)).toEqual({
      error: 'GitHub could not be reached (offline)',
    });
  });
});

describe("Wave 3's four measures", () => {
  describe('planSections', () => {
    const plan = [
      '## 2026-09-14 — Wave 0, commit 1: the empty house',
      '',
      '**Record:** none.',
      '**Accepted:** 2026-09-15 — `Accepted - Linda, tech lead and release manager`,',
      'written by the owner.',
      '',
      '## 2026-09-17 — Wave 3, the build kit',
      '',
      '**Accepted:** _pending._',
      '',
      '## 2026-09-18 — something never accepted',
      '',
      'No gate line at all.',
    ].join('\n');

    it('finds every dated section, whichever dash its heading used', () => {
      expect(planSections(plan).map((section) => section.dated)).toEqual([
        '2026-09-14',
        '2026-09-17',
        '2026-09-18',
      ]);
    });

    it('takes the acceptance date only where one was written', () => {
      const [first, second, third] = planSections(plan);
      expect(first?.accepted).toBe('2026-09-15');
      expect(second?.accepted).toBeUndefined();
      expect(third?.accepted).toBeUndefined();
    });

    it('keeps the first acceptance line and ignores a later one in the same section', () => {
      const twice = ['## 2026-09-14 — one', '**Accepted:** 2026-09-15', '**Accepted:** 2026-09-16'];
      expect(planSections(twice.join('\n'))[0]?.accepted).toBe('2026-09-15');
    });
  });

  describe('firstRunBySha', () => {
    it('keeps the earliest run for a commit, so a green rerun cannot rewrite history', () => {
      const runs = [
        { head_sha: 'aaa', conclusion: 'success', run_number: 9 },
        { head_sha: 'aaa', conclusion: 'failure', run_number: 4 },
        { head_sha: 'bbb', conclusion: 'success', run_number: 5 },
      ];
      const first = firstRunBySha(runs);
      expect(first.get('aaa')?.conclusion).toBe('failure');
      expect(first.get('bbb')?.conclusion).toBe('success');
    });
  });

  describe('tallyFirstTimeGreen', () => {
    it('counts merged pull requests whose own first run was green', () => {
      const pulls = [pull('a', true, 'aaa'), pull('b', true, 'bbb'), pull('c', false, 'ccc')];
      const runs = firstRunBySha([
        { head_sha: 'aaa', conclusion: 'success', run_number: 1 },
        { head_sha: 'bbb', conclusion: 'failure', run_number: 1 },
        { head_sha: 'ccc', conclusion: 'failure', run_number: 1 },
      ]);
      expect(tallyFirstTimeGreen(pulls, runs)).toEqual({ green: 1, counted: 2, unseen: 0 });
    });

    it('counts a merge with no run neither way, and says how many those were', () => {
      const pulls = [pull('a', true, 'aaa'), pull('b', true, 'bbb')];
      const runs = firstRunBySha([{ head_sha: 'aaa', conclusion: 'success', run_number: 1 }]);
      expect(tallyFirstTimeGreen(pulls, runs)).toEqual({ green: 1, counted: 1, unseen: 1 });
    });

    it('counts a run still going as unseen rather than as a failure', () => {
      const runs = firstRunBySha([{ head_sha: 'aaa', conclusion: null, run_number: 1 }]);
      expect(tallyFirstTimeGreen([pull('a', true, 'aaa')], runs)).toEqual({
        green: 0,
        counted: 0,
        unseen: 1,
      });
    });
  });

  describe('fetchWorkflowRuns', () => {
    it('reads the runs out of the answer and stops on a short page', async () => {
      const fetchImpl = async () =>
        new Response(
          JSON.stringify({
            workflow_runs: [{ head_sha: 'aaa', conclusion: 'success', run_number: 1 }],
          }),
          { status: 200 },
        );
      const result = await fetchWorkflowRuns('owner', 'repo', fetchImpl);
      expect(result).toEqual({ runs: [{ head_sha: 'aaa', conclusion: 'success', run_number: 1 }] });
    });

    it('says what went wrong rather than throwing', async () => {
      const refused = async () => new Response('no', { status: 403 });
      expect(await fetchWorkflowRuns('owner', 'repo', refused)).toEqual({
        error: 'GitHub answered 403',
      });
    });
  });
});
