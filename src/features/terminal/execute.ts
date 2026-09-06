/**
 * Command parser and dispatcher.
 *
 * The middle of §9's pipeline: parse raw input, resolve it against the
 * registry, run the handler. Pure and framework-free, so it is unit-testable
 * without mounting a component (§34 lists "command parser" and "command
 * registry" as required unit tests).
 */
import type { CommandContext, CommandDescriptor, CommandResult } from './types';

export interface ParsedInput {
  name: string;
  args: string[];
}

/**
 * Split raw input into a command name and arguments.
 *
 * Quoted segments are kept intact so Phase 4's `project "image extractor"`
 * works without revisiting the parser.
 */
export function parseInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const tokens = trimmed.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  const cleaned = tokens.map((token) =>
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
      ? token.slice(1, -1)
      : token,
  );

  const [name, ...args] = cleaned;
  if (name === undefined) return null;

  return { name: name.toLowerCase(), args };
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
function distance(a: string, b: string): number {
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

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
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
 * the easter eggs (§28).
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
    return command.run(parsed.args, ctx);
  } catch (error) {
    // §32: a malformed content entry must not blank the terminal.
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
