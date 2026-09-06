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
 * never renders. The renderer knows how to draw lines; it knows nothing about
 * commands. Adding a command in Phase 4 touches one file and no UI code.
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
  | { kind: 'entry'; index?: string; title: string; meta?: string; note?: string; href?: string; badge?: string; badgeTone?: Tone }
  | { kind: 'heading'; text: string }
  | { kind: 'blank' };

export interface CommandResult {
  lines: TerminalLine[];
  /** Wipe the buffer before appending these lines. */
  clear?: boolean;
  /** Navigate after rendering. Used by `reader`, `open`, `resume`. */
  navigate?: { href: string; external?: boolean };
}

export interface CommandContext {
  snapshot: PortfolioSnapshot;
  /** Supplied so `help` can enumerate without importing the registry. */
  commands: readonly CommandDescriptor[];
}

export interface CommandDescriptor {
  name: string;
  summary: string;
  /** Shown by `help`; Phase 4 adds flags here. */
  usage?: string;
  aliases?: readonly string[];
  /** Hidden from `help` listings — easter eggs (§28). */
  hidden?: boolean;
  run(args: readonly string[], ctx: CommandContext): CommandResult;
}
