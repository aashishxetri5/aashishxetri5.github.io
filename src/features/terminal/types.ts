/**
 * Terminal type contracts.
 *
 * §9 requires a real command system rather than "one giant component
 * containing hundreds of conditionals", with the shape:
 *
 *   CommandRegistry -> CommandParser -> CommandHandler -> CommandResult
 *   -> TerminalRenderer
 *
 * These types are that contract. A handler returns DATA describing output; it
 * never renders, and it never touches the DOM. The renderer knows how to draw
 * lines and apply effects; it knows nothing about commands. Adding a command
 * touches one file and no UI code.
 */
import type { PortfolioSnapshot } from '../../lib/snapshot';

export type Tone = 'default' | 'muted' | 'accent' | 'error' | 'live';

/**
 * One rendered line. A closed union so the renderer's switch is exhaustive —
 * adding a variant becomes a type error at the render site rather than a
 * silently dropped line.
 */
export type TerminalLine =
  /** Echo of what the user typed, with the prompt sigil. */
  | { kind: 'prompt'; text: string }
  | { kind: 'text'; text: string; tone?: Tone }
  /** Key/value row, the terminal's equivalent of the reader-mode spec table. */
  | { kind: 'pair'; label: string; value: string; href?: string; tone?: Tone }
  /** Indexed listing row: `001  Pustakalaya   JAVA · JSP`. */
  | {
      kind: 'entry';
      index?: string;
      title: string;
      meta?: string;
      note?: string;
      href?: string;
      badge?: string;
      badgeTone?: Tone;
    }
  | { kind: 'heading'; text: string }
  | { kind: 'blank' };

/**
 * A parsed invocation. Flags are separated from positionals so handlers never
 * re-parse `argv` themselves — the inconsistency that would follow (one command
 * accepting `-f`, another only `--featured`) is the thing this prevents.
 */
export interface CommandInput {
  /** Positional arguments, with flags removed. */
  args: readonly string[];
  /** Long flags, lowercased and stripped of leading dashes. */
  flags: ReadonlySet<string>;
}

/**
 * A side effect the RENDERER performs on the handler's behalf.
 *
 * `theme` is the first command that has to change something outside the
 * terminal. Letting its handler reach for `document` directly would work, and
 * would quietly destroy the property that makes this registry testable: that
 * every handler is a pure function of (input, snapshot). Declaring the effect
 * as data keeps handlers pure and keeps the DOM in exactly one place.
 */
export type CommandEffect = {
  type: 'theme';
  /** 'system' clears the stored preference and follows prefers-color-scheme. */
  value: 'light' | 'dark' | 'system' | 'toggle';
};

export interface CommandResult {
  lines: TerminalLine[];
  /**
   * Wipe the buffer before appending these lines. Distinct from `effect`:
   * this is renderer-internal state, not a change to the world outside.
   */
  clear?: boolean;
  /** Navigate after rendering. Used by `reader`, `resume`, `github`. */
  navigate?: { href: string; external?: boolean };
  effect?: CommandEffect;
}

export interface CommandContext {
  snapshot: PortfolioSnapshot;
  /** Supplied so `help` can enumerate without importing the registry. */
  commands: readonly CommandDescriptor[];
}

export interface CommandDescriptor {
  name: string;
  summary: string;
  /** Shown by `help`. Include argument and flag syntax. */
  usage?: string;
  aliases?: readonly string[];
  /** Hidden from `help` listings — easter eggs (§28). */
  hidden?: boolean;
  run(input: CommandInput, ctx: CommandContext): CommandResult;
  /**
   * Optional argument completion for Tab.
   *
   * Only commands with a knowable argument space implement this. Completing
   * command names is universal and handled centrally; completing arguments is
   * per-command because only the command knows what its arguments mean.
   */
  complete?(input: CommandInput, ctx: CommandContext): string[];
}
