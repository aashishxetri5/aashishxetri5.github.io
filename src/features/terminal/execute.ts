/**
 * Command parser, dispatcher and completion engine.
 *
 * The middle of 9's pipeline: parse raw input, resolve it against the
 * registry, run the handler. Pure and framework-free, so it is unit-testable
 * without mounting a component (34 lists "command parser" and "command
 * registry" as required unit tests).
 */
import type {
  CommandContext,
  CommandDescriptor,
  CommandInput,
  CommandResult,
} from './types';

export interface ParsedInput extends CommandInput {
  name: string;
}

/** Split a line into tokens, keeping quoted segments intact. */
function tokenize(input: string): string[] {
  const tokens = input.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];

  return tokens.map((token) =>
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
      ? token.slice(1, -1)
      : token,
  );
}

/**
 * Split raw input into a command name, positional arguments and flags.
 *
 * Flags are long-form only (`--featured`). Short flags are deliberately not
 * supported: nothing in 9's command list needs them, and Rule 4 asks for a
 * reason before adding surface area. Quoted segments survive, so
 * `project "image extractor"` works.
 */
export function parseInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const tokens = tokenize(trimmed);
  const [name, ...rest] = tokens;
  if (name === undefined) return null;

  const args: string[] = [];
  const flags = new Set<string>();

  for (const token of rest) {
    if (token.startsWith('--') && token.length > 2) {
      flags.add(token.slice(2).toLowerCase());
    } else {
      args.push(token);
    }
  }

  return { name: name.toLowerCase(), args, flags };
}

/** Resolve by canonical name first, then by alias. */
export function resolveCommand(
  name: string,
  commands: readonly CommandDescriptor[],
): CommandDescriptor | undefined {
  return (
    commands.find((command) => command.name === name) ??
    commands.find((command) => command.aliases?.includes(name))
  );
}

/**
 * Damerau-Levenshtein distance (optimal string alignment variant).
 *
 * Plain Levenshtein is the obvious choice here and it is subtly wrong for this
 * job: it scores a transposition as TWO edits, so "hlep" sits distance 2 from
 * "help" and falls outside a tight threshold. Transposing adjacent characters
 * is the single most common typing error, so the most likely typo was the one
 * least likely to be suggested. Counting a swap as one edit fixes that without
 * loosening the threshold and matching everything to everything.
 */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Two previous rows are needed to score transpositions.
  let twoBack: number[] = [];
  let previous: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current: number[] = [i];

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      let best = Math.min(
        (previous[j - 1] as number) + cost, // substitute
        (current[j - 1] as number) + 1, // insert
        (previous[j] as number) + 1, // delete
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, (twoBack[j - 2] as number) + 1); // transpose
      }

      current[j] = best;
    }

    twoBack = previous;
    previous = current;
  }

  return previous[b.length] as number;
}

/**
 * Nearest command name for a typo, or undefined when nothing is close enough.
 *
 * The threshold scales with input length so short words are not matched to
 * everything, and hidden commands are never suggested — that would give away
 * the easter eggs (28).
 */
export function suggest(
  name: string,
  commands: readonly CommandDescriptor[],
): string | undefined {
  const threshold = name.length <= 4 ? 1 : 2;

  let best: { name: string; score: number } | undefined;

  for (const command of commands) {
    if (command.hidden) continue;
    const score = distance(name, command.name);
    if (score <= threshold && (best === undefined || score < best.score)) {
      best = { name: command.name, score };
    }
  }

  return best?.name;
}

/* -------------------------------------------------------------------------- */
/* Completion                                                                 */
/* -------------------------------------------------------------------------- */

export interface Completion {
  /** Every candidate matching the token under the cursor. */
  candidates: string[];
  /** The input line with the longest unambiguous completion applied. */
  value: string;
}

function longestCommonPrefix(values: string[]): string {
  if (values.length === 0) return '';
  let prefix = values[0] as string;

  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix.length === 0) return '';
    }
  }

  return prefix;
}

/**
 * Tab completion (37: "Support Tab completion where practical").
 *
 * Two levels, and the split matters. Command NAMES are completed centrally,
 * because the registry already knows all of them. ARGUMENTS are completed by
 * the command itself via an optional `complete`, because only `project` knows
 * that its argument is a project id. Building a generic argument-completion
 * language would be exactly the speculative machinery 19 warns against.
 *
 * Never completes to a hidden command: Tab must not reveal an easter egg.
 */
export function complete(raw: string, ctx: CommandContext): Completion {
  const endsWithSpace = /\s$/.test(raw);
  const tokens = tokenize(raw);

  // Completing the command name: no arguments typed yet.
  if (tokens.length === 0 || (tokens.length === 1 && !endsWithSpace)) {
    const partial = (tokens[0] ?? '').toLowerCase();

    const candidates = ctx.commands
      .filter((command) => !command.hidden && command.name.startsWith(partial))
      .map((command) => command.name)
      .sort();

    if (candidates.length === 0) return { candidates: [], value: raw };

    const filled = longestCommonPrefix(candidates);
    return {
      candidates,
      // A single match is a complete word, so add the space the user would.
      value: candidates.length === 1 ? `${filled} ` : filled,
    };
  }

  // Completing an argument.
  const parsed = parseInput(raw);
  if (parsed === null) return { candidates: [], value: raw };

  const command = resolveCommand(parsed.name, ctx.commands);
  if (command?.complete === undefined) return { candidates: [], value: raw };

  const partial = endsWithSpace ? '' : ((tokens.at(-1) ?? '').toLowerCase());
  const candidates = command
    .complete(parsed, ctx)
    .filter((candidate) => candidate.toLowerCase().startsWith(partial))
    .sort();

  if (candidates.length === 0) return { candidates: [], value: raw };

  const filled = longestCommonPrefix(candidates);
  const head = endsWithSpace ? tokens : tokens.slice(0, -1);
  const value = [...head, filled].join(' ');

  return { candidates, value: candidates.length === 1 ? `${value} ` : value };
}

/* -------------------------------------------------------------------------- */

/**
 * Execute one line of input.
 *
 * Returns null for empty input so the caller can echo the prompt without
 * appending output — pressing Enter on an empty line should behave like a real
 * shell rather than raising an error.
 */
export function execute(raw: string, ctx: CommandContext): CommandResult | null {
  const parsed = parseInput(raw);
  if (parsed === null) return null;

  const command = resolveCommand(parsed.name, ctx.commands);

  if (command === undefined) {
    const hint = suggest(parsed.name, ctx.commands);

    return {
      lines: [
        {
          kind: 'text',
          text: `command not found: ${parsed.name}`,
          tone: 'error',
        },
        {
          kind: 'text',
          text: hint
            ? `Did you mean "${hint}"? Type "help" for the full list.`
            : 'Type "help" for the list of commands.',
          tone: 'muted',
        },
      ],
    };
  }

  try {
    return command.run(parsed, ctx);
  } catch (error) {
    // 32: a malformed content entry must not blank the terminal.
    return {
      lines: [
        { kind: 'text', text: `${parsed.name}: command failed`, tone: 'error' },
        {
          kind: 'text',
          text: error instanceof Error ? error.message : String(error),
          tone: 'muted',
        },
      ],
    };
  }
}
