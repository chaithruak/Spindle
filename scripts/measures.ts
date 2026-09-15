import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { git, readText, ROOT } from './lib/repo.ts';

// Prints the measures report. Two measures have a source so far: the time from
// an intent's conversation starting to the intent merging on main, and the
// share of decided intents that were accepted rather than closed. Each figure
// is printed only when its data exists; otherwise the report says what is
// missing. docs/playbook-map.md says how a team would measure every other play.

// Which conversation each intent came from.
export const INTENT_CONVERSATIONS = [
  { intent: 'intent/spindle/intent.md', conversation: 'docs/1-plan/conversation.md' },
];

// A pull request carries an intent when its branch starts with this.
export const INTENT_BRANCH_PREFIX = 'intent/';

const MAIN = 'main';
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);
const START_LINE =
  /^Conversation started:\s*((\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|([+-])(\d{2}):(\d{2})))$/;

// The time on a conversation file's first line, which reads
// "Conversation started: 2026-09-15T14:05-05:00". A time without its offset, or
// one that is not on the calendar, gives undefined rather than a guess.
export function readStart(text: string): { written: string; at: Date } | undefined {
  const first = (text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text).split(/\r?\n/, 1)[0];
  const match = START_LINE.exec((first ?? '').trim());
  if (!match) return undefined;
  const [year, month, day, hour, minute, second] = match
    .slice(2, 8)
    .map((part) => Number(part ?? 0));
  const wall = new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!, second!));
  const onCalendar =
    wall.getUTCFullYear() === year &&
    wall.getUTCMonth() === month! - 1 &&
    wall.getUTCDate() === day &&
    wall.getUTCHours() === hour &&
    wall.getUTCMinutes() === minute;
  if (!onCalendar) return undefined;
  const offsetMinutes =
    match[8] === 'Z'
      ? 0
      : (match[9] === '-' ? -1 : 1) * (Number(match[10]) * 60 + Number(match[11]));
  return { written: match[1]!, at: new Date(wall.getTime() - offsetMinutes * 60_000) };
}

// A span in hours and minutes, to the nearest minute. A negative span gives undefined.
export function formatDuration(milliseconds: number): string | undefined {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return undefined;
  const total = Math.round(milliseconds / 60_000);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours === 0 ? `${minutes} min` : `${hours} h ${minutes} min`;
}

// The GitHub account and repository a git remote address points at.
export function repositoryFromRemote(remote: string): { owner: string; repo: string } | undefined {
  const match = /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(remote.trim());
  return match ? { owner: match[1]!, repo: match[2]! } : undefined;
}

export type ClosedPull = { head: { ref: string }; merged_at: string | null };

// Decided intent pull requests: merged counts as accepted, closed without a merge as closed.
export function tallyIntents(pulls: ClosedPull[]): { accepted: number; closed: number } {
  const intents = pulls.filter((pull) => pull.head.ref.startsWith(INTENT_BRANCH_PREFIX));
  const accepted = intents.filter((pull) => pull.merged_at !== null).length;
  return { accepted, closed: intents.length - accepted };
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

// Every closed pull request, read from GitHub's public API with no token.
export async function fetchClosedPulls(
  owner: string,
  repo: string,
  fetchImpl: Fetch = fetch,
): Promise<{ pulls: ClosedPull[] } | { error: string }> {
  const pulls: ClosedPull[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=closed&per_page=${PAGE_SIZE}&page=${page}`;
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'spindle-measures',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
    } catch (error) {
      return { error: `GitHub could not be reached (${(error as Error).message})` };
    }
    if (!response.ok) return { error: `GitHub answered ${response.status}` };
    const batch = (await response.json()) as ClosedPull[];
    pulls.push(...batch);
    if (batch.length < PAGE_SIZE) return { pulls };
  }
  return { error: `there are more than ${PAGE_SIZE * MAX_PAGES} closed pull requests to read` };
}

async function conversationToMerge(intent: string, conversation: string): Promise<string> {
  const text = existsSync(path.join(ROOT, conversation)) ? readText(conversation) : undefined;
  if (text === undefined) return `${intent}: no figure, because ${conversation} is missing.`;
  const start = readStart(text);
  if (!start) {
    return `${intent}: no figure, because the first line of ${conversation} does not read "Conversation started: <time with its offset>".`;
  }
  const added = await git([
    'log',
    MAIN,
    '--first-parent',
    '--diff-filter=A',
    '--format=%aI',
    '--',
    intent,
  ]);
  if (added === undefined) {
    return `${intent}: no figure, because git could not read the history of ${MAIN} here.`;
  }
  const merged = added.trim().split('\n').filter(Boolean).at(-1);
  if (merged === undefined) return `${intent}: no figure yet, because it is not on ${MAIN}.`;
  const span = formatDuration(new Date(merged).getTime() - start.at.getTime());
  if (span === undefined) {
    return `${intent}: no figure, because its commit on ${MAIN} is dated before the conversation started.`;
  }
  return `${intent}: ${span}, from ${start.written} (${conversation}) to ${merged} (its commit on ${MAIN})`;
}

async function acceptedShare(): Promise<string> {
  const remote = await git(['remote', 'get-url', 'origin']);
  const repository = remote === undefined ? undefined : repositoryFromRemote(remote);
  if (!repository) return 'no share, because the git remote does not name a GitHub repository.';
  const result = await fetchClosedPulls(repository.owner, repository.repo);
  if ('error' in result) return `no share, because ${result.error}.`;
  const { accepted, closed } = tallyIntents(result.pulls);
  const decided = accepted + closed;
  if (decided === 0) return 'no share yet, because no intent pull request has been decided.';
  const percent = Math.round((accepted / decided) * 100);
  return `${accepted} of ${decided} decided intent pull requests accepted (${percent}%), ${closed} closed.`;
}

async function main(): Promise<void> {
  console.log('Spindle measures');
  console.log('');
  console.log('Conversation start to merged intent');
  for (const { intent, conversation } of INTENT_CONVERSATIONS) {
    console.log(`  ${await conversationToMerge(intent, conversation)}`);
  }
  console.log('');
  console.log('Intents accepted rather than closed');
  console.log(`  ${await acceptedShare()}`);
  console.log('');
  console.log(
    'No other measure has data yet. See docs/playbook-map.md for how each play would be measured.',
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.chdir(ROOT);
  await main();
}
