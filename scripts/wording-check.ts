import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { machineHoldsKeys } from './key-scan.ts';
import { git, listFiles, looksBinary, readText, ROOT } from './lib/repo.ts';

// Keeps Spindle's words its own.
//
//   node scripts/wording-check.ts           every file in the repository
//   node scripts/wording-check.ts --staged  what is about to be committed (pre-commit)
//
// Every file is measured against the owner's playbook copy, and evidence (the
// numbered stage folders under docs/) against the hand-off as well. A run of
// twelve words matching either one fails, and so does citing a line number of
// the playbook. The two copies are found through PLAYBOOK_COPY and HANDOFF_COPY;
// neither path is ever committed. A hit names the file and line, never the words.

export const RUN_LENGTH = 12;

// Wording this build fixes word for word, so evidence quoting it still passes.
export const FIXED_WORDING = [
  "Example: replace this with your company's own. See docs/make-it-yours.md.",
  'Stage 0 · Set-up: the front door - README, the MIT licence and the make-it-yours skeleton, so the public link is never empty - Linda, tech lead and release manager',
  'Stage 0 · Set-up: the empty house - workspaces, a starter app, CLAUDE.md, the house policies and the rules for main - Linda, tech lead and release manager',
  '1. Prerequisites: Node 24 (`node --version`), and on Windows, Git Bash, because the hooks run through it.',
  '2. `npm install`, then `npm run dev`.',
  '3. Open http://127.0.0.1:3000 and sign in as `dev`, the dev account (a stand-in); the API prints its one-time password when it starts.',
  '4. Pick **Mock** and say hello. Claude, GPT and the NVIDIA model show "add a key: see keys.env.example" until someone adds keys.',
];

const LINE_CITATIONS = [
  /\bplaybook\b[^\n]{0,80}?\b(?:lines?|ll?\.)\s*\d+/i,
  /\b(?:lines?)\s+\d+[^\n]{0,40}?\bplaybook\b/i,
  /\bplaybook\b[^\n]*#L\d+/i,
];

const EVIDENCE = /^docs\/\d[^/]*\//;
const NEVER_MEASURED = new Set(['package-lock.json']);

export type Word = { word: string; line: number };

// A link is a citation, not wording, so addresses are left out of every run.
export function words(text: string): Word[] {
  const found: Word[] = [];
  text.split('\n').forEach((line, index) => {
    const prose = line.replace(/https?:\/\/[^\s)>\]]+/g, ' ').toLowerCase();
    for (const match of prose.matchAll(/[\p{L}\p{N}]+(?:['’]\p{L}+)?/gu)) {
      found.push({ word: match[0].replace('’', "'"), line: index + 1 });
    }
  });
  return found;
}

const FIXED_SEQUENCES = FIXED_WORDING.map((wording) => words(wording).map((entry) => entry.word));

// Cuts the fixed wording out of a list of words, from the corpus and from each
// file alike, so no run can begin or end inside it.
export function withoutFixedWording(list: Word[]): Word[] {
  const keep = list.map(() => true);
  for (const sequence of FIXED_SEQUENCES) {
    for (let start = 0; start + sequence.length <= list.length; start += 1) {
      if (sequence.every((word, offset) => list[start + offset]!.word === word)) {
        sequence.forEach((_, offset) => (keep[start + offset] = false));
      }
    }
  }
  return list.filter((_, index) => keep[index]);
}

export function runsOf(text: string): Set<string> {
  const list = withoutFixedWording(words(text)).map((entry) => entry.word);
  const runs = new Set<string>();
  for (let start = 0; start + RUN_LENGTH <= list.length; start += 1) {
    runs.add(list.slice(start, start + RUN_LENGTH).join(' '));
  }
  return runs;
}

// The line numbers where a run of twelve words from the corpus begins.
export function matchingLines(text: string, corpus: Set<string>): number[] {
  const list = withoutFixedWording(words(text));
  const lines = new Set<number>();
  for (let start = 0; start + RUN_LENGTH <= list.length; start += 1) {
    const run = list
      .slice(start, start + RUN_LENGTH)
      .map((entry) => entry.word)
      .join(' ');
    if (corpus.has(run)) lines.add(list[start]!.line);
  }
  return [...lines].sort((a, b) => a - b);
}

export function citationLines(text: string): number[] {
  return text
    .split('\n')
    .flatMap((line, index) =>
      LINE_CITATIONS.some((pattern) => pattern.test(line)) ? [index + 1] : [],
    );
}

type Corpus = { label: string; variable: string; runs?: Set<string> };

function loadCorpus(variable: string, label: string): Corpus | 'unreadable' {
  const location = process.env[variable];
  if (!location) return { label, variable };
  if (!existsSync(location)) return 'unreadable';
  return { label, variable, runs: runsOf(readFileSync(location, 'utf8')) };
}

type Hit = { file: string; line: number; why: string };

export function measure(
  file: string,
  text: string,
  playbook: Set<string> | undefined,
  handoff: Set<string> | undefined,
): Hit[] {
  const hits: Hit[] = [];
  if (playbook) {
    for (const line of matchingLines(text, playbook)) {
      hits.push({ file, line, why: 'matches the playbook copy' });
    }
  }
  if (handoff && EVIDENCE.test(file)) {
    for (const line of matchingLines(text, handoff)) {
      hits.push({ file, line, why: 'matches the hand-off' });
    }
  }
  for (const line of citationLines(text)) {
    hits.push({ file, line, why: 'cites a line number of the playbook' });
  }
  return hits;
}

async function main(argv: string[]): Promise<number> {
  const staged = argv.includes('--staged');
  const playbook = loadCorpus('PLAYBOOK_COPY', 'the playbook copy');
  const handoff = loadCorpus('HANDOFF_COPY', 'the hand-off');

  if (playbook === 'unreadable' || handoff === 'unreadable') {
    console.log('wording-check: a copy variable is set but its file cannot be read.');
    return 1;
  }

  const entries: { file: string; text: string }[] = [];
  if (staged) {
    const names =
      (await git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])) ?? '';
    for (const file of names.split('\0').filter(Boolean)) {
      if (NEVER_MEASURED.has(file)) continue;
      const text = await git(['show', `:${file}`]);
      if (text !== undefined && !looksBinary(text)) entries.push({ file, text });
    }
    const unset = [playbook, handoff].filter((corpus) => !corpus.runs);
    if (
      unset.length > 0 &&
      machineHoldsKeys() &&
      entries.some(({ file }) => file.startsWith('docs/'))
    ) {
      console.log(
        `wording-check: refused. Evidence is bound for docs/ on a machine that holds keys, and ${unset
          .map((corpus) => corpus.variable)
          .join(' and ')} is not set.`,
      );
      return 1;
    }
  } else {
    for (const file of (await listFiles()).files) {
      if (NEVER_MEASURED.has(file)) continue;
      const text = readText(file);
      if (text !== undefined) entries.push({ file, text });
    }
  }

  for (const corpus of [playbook, handoff]) {
    if (!corpus.runs) {
      console.log(
        `wording-check: ${corpus.variable} is not set, so nothing was measured against ${corpus.label} (skipped, not passed).`,
      );
    }
  }

  const hits = entries.flatMap(({ file, text }) =>
    measure(file, text, playbook.runs, handoff.runs),
  );
  if (hits.length === 0) {
    console.log(`wording-check: no matches (${entries.length} files measured)`);
    return 0;
  }
  console.log(`wording-check: ${hits.length} hit(s); the matching words are not printed.`);
  for (const hit of hits) console.log(`  ${hit.file}:${hit.line}  ${hit.why}`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.chdir(ROOT);
  process.exitCode = await main(process.argv.slice(2));
}
