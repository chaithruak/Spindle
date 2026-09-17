import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { git, readText, ROOT } from './lib/repo.ts';

// Prints the measures report. Four measures have a source so far: the time from
// an intent's conversation starting to the intent merging on main, the share of
// decided intents that were accepted rather than closed, the time from an
// intent landing on main to its spec landing there, and how often an intent was
// edited after its first spec existed. Each figure is printed only when its
// data exists; otherwise the report says what is missing.
// docs/playbook-map.md says how a team would measure every other play.

// Which conversation each intent came from.
export const INTENT_CONVERSATIONS = [
  { intent: 'intent/spindle/intent.md', conversation: 'docs/1-plan/conversation.md' },
];

// Which spec belongs to which intent.
export const INTENT_SPECS = [
  { intent: 'intent/spindle/intent.md', spec: 'intent/spindle/spec.md' },
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

// How many of these commit dates fall after the spec's own. A commit at the
// same moment as the spec is the commit that carried the spec, so only what
// comes strictly after counts as the intent being reopened.
export function editsAfter(commitDates: string[], specDate: string): number {
  const spec = new Date(specDate).getTime();
  if (Number.isNaN(spec)) return 0;
  return commitDates.filter((date) => {
    const at = new Date(date).getTime();
    return !Number.isNaN(at) && at > spec;
  }).length;
}

export type ClosedPull = { head: { ref: string; sha: string }; merged_at: string | null };

// ---- Wave 3's four measures ----

export const PLAN_FILE = 'intent/spindle/plan.md';
export const SPEC_FILE = 'intent/spindle/spec.md';

// The commit that added the spec. Measure 4 counts spec commits dated after this
// one rather than after the first plan section, because the first section is
// dated the day before the spec arrived: dated that way the measure would count
// the spec's own arrival and read 1 for a spec nobody has ever reopened.
export const SPEC_ADDED_COMMIT = 'a04e46b';

// The four policies landed in Wave 0. The first engineering skill lands with the
// build kit, which is what measure 3 is the distance between.
export const POLICY_SKILLS = [
  'plugins/house-policies/skills/security/SKILL.md',
  'plugins/house-policies/skills/compliance/SKILL.md',
  'plugins/house-policies/skills/ux/SKILL.md',
  'plugins/house-policies/skills/brand/SKILL.md',
];
export const FIRST_ENGINEERING_SKILL = '.claude/skills/provider-adapter/SKILL.md';

export type PlanSection = { dated: string; title: string; accepted?: string };

// A heading reads "## 2026-09-17 <dash> title". The dash is matched as any run
// of non-space rather than written out, so nothing here depends on which dash
// character a section was written with.
const SECTION_HEADING = /^##\s+(\d{4}-\d{2}-\d{2})\s+\S+\s+(.+)$/;
const ACCEPTED_LINE = /^\*\*Accepted:\*\*\s*(\d{4}-\d{2}-\d{2})/;

// Every dated section in the plan, with the date its gate role accepted it.
export function planSections(text: string): PlanSection[] {
  const sections: PlanSection[] = [];
  let current: PlanSection | undefined;
  for (const line of text.split(/\r?\n/)) {
    const heading = SECTION_HEADING.exec(line);
    if (heading) {
      current = { dated: heading[1]!, title: heading[2]!.trim() };
      sections.push(current);
      continue;
    }
    if (!current || current.accepted) continue;
    const accepted = ACCEPTED_LINE.exec(line);
    if (accepted) current.accepted = accepted[1];
  }
  return sections;
}

export type WorkflowRun = { head_sha: string; conclusion: string | null; run_number: number };

// The earliest pipeline run for each commit, which is the run a pull request is
// measured by. A rerun that went green afterwards does not make the first attempt
// green, and that is the whole point of the measure.
export function firstRunBySha(runs: WorkflowRun[]): Map<string, WorkflowRun> {
  const first = new Map<string, WorkflowRun>();
  for (const run of runs) {
    const held = first.get(run.head_sha);
    if (!held || run.run_number < held.run_number) first.set(run.head_sha, run);
  }
  return first;
}

// Merged pull requests whose own first run was green, against all of them. A
// pull request with no run at all is not counted either way, and said so.
export function tallyFirstTimeGreen(
  pulls: ClosedPull[],
  firstRuns: Map<string, WorkflowRun>,
): { green: number; counted: number; unseen: number } {
  const merged = pulls.filter((pull) => pull.merged_at !== null);
  let green = 0;
  let counted = 0;
  let unseen = 0;
  for (const pull of merged) {
    const run = firstRuns.get(pull.head.sha);
    if (!run || run.conclusion === null) {
      unseen += 1;
      continue;
    }
    counted += 1;
    if (run.conclusion === 'success') green += 1;
  }
  return { green, counted, unseen };
}

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

// When a file was added on main, following first parents only. An empty list
// means it is not there; undefined means git could not read the history at all.
async function addedOnMain(file: string): Promise<string[] | undefined> {
  const log = await git([
    'log',
    MAIN,
    '--first-parent',
    '--diff-filter=A',
    '--format=%aI',
    '--',
    file,
  ]);
  return log === undefined ? undefined : log.trim().split('\n').filter(Boolean);
}

// Every commit on main that touched a file, newest first.
async function touchedOnMain(file: string): Promise<string[] | undefined> {
  const log = await git(['log', MAIN, '--first-parent', '--format=%aI', '--', file]);
  return log === undefined ? undefined : log.trim().split('\n').filter(Boolean);
}

const NO_HISTORY = `git could not read the history of ${MAIN} here`;

async function conversationToMerge(intent: string, conversation: string): Promise<string> {
  const text = existsSync(path.join(ROOT, conversation)) ? readText(conversation) : undefined;
  if (text === undefined) return `${intent}: no figure, because ${conversation} is missing.`;
  const start = readStart(text);
  if (!start) {
    return `${intent}: no figure, because the first line of ${conversation} does not read "Conversation started: <time with its offset>".`;
  }
  const added = await addedOnMain(intent);
  if (added === undefined) return `${intent}: no figure, because ${NO_HISTORY}.`;
  const merged = added.at(-1);
  if (merged === undefined) return `${intent}: no figure yet, because it is not on ${MAIN}.`;
  const span = formatDuration(new Date(merged).getTime() - start.at.getTime());
  if (span === undefined) {
    return `${intent}: no figure, because its commit on ${MAIN} is dated before the conversation started.`;
  }
  return `${intent}: ${span}, from ${start.written} (${conversation}) to ${merged} (its commit on ${MAIN})`;
}

// The intent lands on main, then design turns it into a spec. Both dates are
// author dates on main, which for a squash merge is the time it was merged.
async function intentToSpec(intent: string, spec: string): Promise<string> {
  const intentAdded = await addedOnMain(intent);
  const specAdded = await addedOnMain(spec);
  if (intentAdded === undefined || specAdded === undefined) {
    return `${spec}: no figure, because ${NO_HISTORY}.`;
  }
  const intentAt = intentAdded.at(-1);
  if (intentAt === undefined) return `${spec}: no figure yet, because ${intent} is not on ${MAIN}.`;
  const specAt = specAdded.at(-1);
  if (specAt === undefined) return `${spec}: no figure yet, because it is not on ${MAIN}.`;
  const span = formatDuration(new Date(specAt).getTime() - new Date(intentAt).getTime());
  if (span === undefined) {
    return `${spec}: no figure, because its commit on ${MAIN} is dated before ${intent}.`;
  }
  return `${spec}: ${span}, from ${intentAt} (${intent}) to ${specAt} (its commit on ${MAIN})`;
}

// An intent edited after design has read it is an intent that was reopened.
async function editsSinceSpec(intent: string, spec: string): Promise<string> {
  const specAdded = await addedOnMain(spec);
  if (specAdded === undefined) return `${intent}: no count, because ${NO_HISTORY}.`;
  const specAt = specAdded.at(-1);
  if (specAt === undefined) return `${intent}: no count yet, because ${spec} is not on ${MAIN}.`;
  const touched = await touchedOnMain(intent);
  if (touched === undefined) return `${intent}: no count, because ${NO_HISTORY}.`;
  const edits = editsAfter(touched, specAt);
  return `${intent}: ${edits} edit${edits === 1 ? '' : 's'} since ${spec} landed on ${MAIN} at ${specAt}`;
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

// Every pipeline run GitHub has kept, read with no token like the pulls above.
export async function fetchWorkflowRuns(
  owner: string,
  repo: string,
  fetchImpl: Fetch = fetch,
): Promise<{ runs: WorkflowRun[] } | { error: string }> {
  const runs: WorkflowRun[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=${PAGE_SIZE}&page=${page}`;
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
    const batch = (await response.json()) as { workflow_runs?: WorkflowRun[] };
    const page_runs = batch.workflow_runs ?? [];
    runs.push(...page_runs);
    if (page_runs.length < PAGE_SIZE) return { runs };
  }
  return { error: `there are more than ${PAGE_SIZE * MAX_PAGES} runs to read` };
}

async function firstTimeGreen(): Promise<string> {
  const remote = await git(['remote', 'get-url', 'origin']);
  const repository = remote === undefined ? undefined : repositoryFromRemote(remote);
  if (!repository) return 'no figure, because the git remote does not name a GitHub repository.';
  const pulls = await fetchClosedPulls(repository.owner, repository.repo);
  if ('error' in pulls) return `no figure, because ${pulls.error}.`;
  const runs = await fetchWorkflowRuns(repository.owner, repository.repo);
  if ('error' in runs) return `no figure, because ${runs.error}.`;

  const { green, counted, unseen } = tallyFirstTimeGreen(pulls.pulls, firstRunBySha(runs.runs));
  if (counted === 0) return 'no figure yet, because no merged pull request has a run to read.';
  const percent = Math.round((green / counted) * 100);
  const missing = unseen === 0 ? '' : `; ${unseen} merged with no run to read, not counted`;
  return `${green} of ${counted} merged pull requests passed on the first attempt (${percent}%)${missing}`;
}

// From the date a plan section was accepted to the first commit on main after it.
async function planToMerge(): Promise<string[]> {
  const text = readText(PLAN_FILE);
  if (text === undefined) return [`no figure, because ${PLAN_FILE} could not be read.`];
  const sections = planSections(text).filter((section) => section.accepted);
  if (sections.length === 0) return ['no figure yet, because no plan section has been accepted.'];

  const log = await git(['log', MAIN, '--first-parent', '--format=%aI']);
  if (log === undefined) return [`no figure, because ${NO_HISTORY}.`];
  const commits = log.trim().split('\n').filter(Boolean).reverse();

  // The next merge after acceptance, which is what this repository can actually
  // see. Which commits a section covers is not recorded anywhere a script can
  // read, so two sections accepted on one day share an answer, and the rows say
  // so by naming their section rather than pretending to be separate figures.
  return sections.map((section) => {
    const short = section.title.length > 44 ? `${section.title.slice(0, 43)}...` : section.title;
    const after = `${section.accepted}T00:00:00Z`;
    const landed = commits.find((at) => at >= after);
    if (landed === undefined) {
      return `${section.dated} ${short}: no figure yet, because nothing has merged to ${MAIN} since.`;
    }
    const span = formatDuration(Date.parse(landed) - Date.parse(after));
    return `${section.dated} ${short}: ${span ?? 'no figure'}, accepted ${section.accepted} to ${landed}`;
  });
}

// From the last of the four policies landing to the first engineering skill landing.
async function policyToSkill(): Promise<string> {
  const landings: string[] = [];
  for (const policy of POLICY_SKILLS) {
    const added = await addedOnMain(policy);
    if (added === undefined) return `no figure, because ${NO_HISTORY}.`;
    const at = added.at(-1);
    if (at === undefined) return `no figure, because ${policy} is not on ${MAIN}.`;
    landings.push(at);
  }
  const lastPolicy = landings.sort().at(-1)!;

  const skill = await addedOnMain(FIRST_ENGINEERING_SKILL);
  if (skill === undefined) return `no figure, because ${NO_HISTORY}.`;
  const skillAt = skill.at(-1);
  if (skillAt === undefined) {
    return `no figure yet, because ${FIRST_ENGINEERING_SKILL} is not on ${MAIN}.`;
  }
  const span = formatDuration(Date.parse(skillAt) - Date.parse(lastPolicy));
  if (span === undefined) {
    return `no figure, because the skill is dated before the last policy on ${MAIN}.`;
  }
  return `${span}, from the last of the four policies at ${lastPolicy} to ${FIRST_ENGINEERING_SKILL} at ${skillAt}`;
}

// Commits on main touching the spec and dated after the commit that added it.
async function specReopened(): Promise<string> {
  const added = await git(['log', '-1', '--format=%aI', SPEC_ADDED_COMMIT]);
  if (added === undefined) return `no count, because ${SPEC_ADDED_COMMIT} could not be read.`;
  const touched = await touchedOnMain(SPEC_FILE);
  if (touched === undefined) return `no count, because ${NO_HISTORY}.`;
  const edits = editsAfter(touched, added.trim());
  return `${edits} commit${edits === 1 ? '' : 's'} on ${MAIN} touching ${SPEC_FILE} after ${SPEC_ADDED_COMMIT} (${added.trim()})`;
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
  console.log('Merged intent to merged spec');
  for (const { intent, spec } of INTENT_SPECS) {
    console.log(`  ${await intentToSpec(intent, spec)}`);
  }
  console.log('');
  console.log('Edits to an intent after its first spec');
  for (const { intent, spec } of INTENT_SPECS) {
    console.log(`  ${await editsSinceSpec(intent, spec)}`);
  }
  console.log('');
  console.log('Merges that passed on the first attempt');
  console.log(`  ${await firstTimeGreen()}`);
  console.log('');
  console.log('Plan accepted to the next merge on main');
  for (const line of await planToMerge()) console.log(`  ${line}`);
  console.log('');
  console.log('Policy approved to its skill merging');
  console.log(`  ${await policyToSkill()}`);
  console.log('');
  console.log('Spec commits after the spec arrived');
  console.log(`  ${await specReopened()}`);
  console.log('');
  console.log(
    'No other measure has data yet. See docs/playbook-map.md for how each play would be measured.',
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.chdir(ROOT);
  await main();
}
