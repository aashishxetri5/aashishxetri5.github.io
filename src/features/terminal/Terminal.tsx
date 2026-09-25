import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import type { PortfolioSnapshot } from '../../lib/snapshot';
import { COMMANDS } from './commands';
import { complete, execute } from './execute';
import type {
  CommandContext,
  CommandEffect,
  TerminalLine,
  Tone,
} from './types';

/**
 * Terminal renderer — the end of the command pipeline in PLAN.md section 9.
 *
 * Knows how to draw lines, manage input, and perform declared effects. Knows
 * nothing about what any command does: it calls `execute` and renders whatever
 * data comes back. That separation is what stops this from becoming the "giant
 * component containing hundreds of conditionals" that section 9 forbids.
 *
 * Accessibility (section 24, Rule 9) is built in rather than retrofitted:
 *   - Output is an aria-live log region, so results are announced as they land.
 *   - The input has a real label inside a form, so Enter submits natively and
 *     mobile keyboards show a Go key (section 25).
 *   - Everything works from the keyboard alone; nothing depends on hover.
 *   - Autofocus only on fine pointers, so it does not slam a phone keyboard
 *     open the moment the page loads.
 */

interface Props {
  snapshot: PortfolioSnapshot;
}

const TONE_CLASS: Record<Tone, string> = {
  default: 'text-ink',
  muted: 'text-muted',
  accent: 'text-accent',
  error: 'text-rose-400',
  live: 'text-live',
};

const toneClass = (tone: Tone | undefined) => TONE_CLASS[tone ?? 'default'];

const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

const HISTORY_KEY = 'terminal-history';
const HISTORY_LIMIT = 50;

/**
 * History survives reloads. Every storage access is guarded: private mode and
 * blocked-storage settings throw on access, and a terminal that cannot remember
 * commands must still run them.
 */
function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .slice(-HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function saveHistory(entries: string[]): void {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(entries.slice(-HISTORY_LIMIT)),
    );
  } catch {
    /* Storage blocked: history still works for this page view. */
  }
}

/**
 * Perform a declared effect.
 *
 * The theme contract is shared with ThemeToggle.astro and the pre-paint script
 * in BaseLayout.astro: `data-theme` on the root element, mirrored to
 * localStorage['theme'], with the key ABSENT meaning "follow the system".
 * Reimplementing it differently here would produce a terminal that disagrees
 * with the header button, so the three sites deliberately share one contract.
 */
function applyEffect(effect: CommandEffect): void {
  if (effect.type !== 'theme') return;

  const root = document.documentElement;
  let next: 'light' | 'dark' | null;

  if (effect.value === 'system') {
    next = null;
  } else if (effect.value === 'toggle') {
    const explicit = root.getAttribute('data-theme');
    const isDark =
      explicit === 'dark' ||
      (explicit === null &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    next = isDark ? 'light' : 'dark';
  } else {
    next = effect.value;
  }

  if (next === null) {
    root.removeAttribute('data-theme');
    try {
      localStorage.removeItem('theme');
    } catch {
      /* Storage blocked: the change still applies to this page view. */
    }
    return;
  }

  root.setAttribute('data-theme', next);
  try {
    localStorage.setItem('theme', next);
  } catch {
    /* Storage blocked: the change still applies to this page view. */
  }
}

function Line({ line }: { line: TerminalLine }) {
  switch (line.kind) {
    case 'blank':
      return <div className="h-3" aria-hidden="true" />;

    case 'prompt':
      return (
        <div className="flex gap-2 pt-3">
          <span className="text-accent" aria-hidden="true">
            $
          </span>
          <span className="break-all text-ink">{line.text}</span>
        </div>
      );

    case 'heading':
      return <div className="spec-label mt-1 mb-1 text-ink">{line.text}</div>;

    case 'text':
      return (
        <div
          className={`wrap-break-word whitespace-pre-wrap ${toneClass(line.tone)}`}
        >
          {line.text}
        </div>
      );

    case 'pair':
      return (
        <div className="flex flex-col gap-x-4 sm:flex-row">
          <span className="w-full shrink-0 text-faint sm:w-40">
            {line.label}
          </span>
          <span className={`min-w-0 wrap-break-word ${toneClass(line.tone)}`}>
            {line.href ? (
              <a
                href={line.href}
                target={isExternal(line.href) ? '_blank' : undefined}
                rel={isExternal(line.href) ? 'noopener noreferrer' : undefined}
                className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
              >
                {line.value}
              </a>
            ) : (
              line.value
            )}
          </span>
        </div>
      );

    case 'entry':
      return (
        <div className="flex gap-3 py-1">
          {line.index !== undefined && (
            <span className="shrink-0 text-line-strong">{line.index}</span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2">
              {line.href ? (
                <a
                  href={line.href}
                  target={isExternal(line.href) ? '_blank' : undefined}
                  rel={isExternal(line.href) ? 'noopener noreferrer' : undefined}
                  className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent"
                >
                  {line.title}
                </a>
              ) : (
                <span className="font-medium text-ink">{line.title}</span>
              )}
              {line.badge && (
                <span
                  className={`border border-line px-1 text-[0.65rem] tracking-[0.12em] uppercase ${toneClass(line.badgeTone)}`}
                >
                  {line.badge}
                </span>
              )}
            </div>
            {line.meta && <div className="text-faint">{line.meta}</div>}
            {line.note && <div className="text-muted">{line.note}</div>}
          </div>
        </div>
      );

    default: {
      // Exhaustiveness guard: adding a TerminalLine variant without handling it
      // here becomes a compile error rather than a silently dropped line.
      const exhaustive: never = line;
      void exhaustive;
      return null;
    }
  }
}

export default function Terminal({ snapshot }: Props) {
  const context = useMemo<CommandContext>(
    () => ({ snapshot, commands: COMMANDS }),
    [snapshot],
  );

  const [lines, setLines] = useState<TerminalLine[]>(() => [
    { kind: 'text', text: `AASHISH.OS ${snapshot.meta.version}`, tone: 'accent' },
    {
      kind: 'text',
      text: `${snapshot.profile.name} — ${snapshot.profile.headline}`,
      tone: 'muted',
    },
    { kind: 'blank' },
    { kind: 'text', text: 'Type "help" to list commands.', tone: 'muted' },
  ]);

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  /** -1 means "editing a fresh line" rather than browsing history. */
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest output in view.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines]);

  useEffect(() => {
    // Read storage after mount, never during render: this component is
    // server-rendered by Astro, where localStorage does not exist.
    setHistory(loadHistory());

    if (window.matchMedia('(pointer: fine)').matches) {
      inputRef.current?.focus();
    }
  }, []);

  const submit = useCallback(
    (raw: string) => {
      const result = execute(raw, context);
      const echo: TerminalLine = { kind: 'prompt', text: raw };

      setLines((previous) =>
        result?.clear ? result.lines : [...previous, echo, ...(result?.lines ?? [])],
      );

      if (raw.trim().length > 0) {
        setHistory((previous) => {
          const next = [...previous, raw].slice(-HISTORY_LIMIT);
          saveHistory(next);
          return next;
        });
      }
      setHistoryIndex(-1);
      setInput('');

      if (result?.effect) applyEffect(result.effect);

      if (result?.navigate) {
        const { href, external } = result.navigate;
        // Deferred so the confirmation line paints before the page changes.
        window.setTimeout(() => {
          if (external) window.open(href, '_blank', 'noopener,noreferrer');
          else window.location.href = href;
        }, 180);
      }
    },
    [context],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Tab') {
        // Must preventDefault before anything else, or focus leaves the input.
        event.preventDefault();

        const result = complete(input, context);
        if (result.candidates.length === 0) return;

        setInput(result.value);

        // Ambiguous: show the options, the way a shell does.
        if (result.candidates.length > 1) {
          setLines((previous) => [
            ...previous,
            { kind: 'prompt', text: input },
            { kind: 'text', text: result.candidates.join('   '), tone: 'muted' },
          ]);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (history.length === 0) return;
        const next =
          historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(next);
        setInput(history[next] ?? '');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyIndex === -1) return;
        const next = historyIndex + 1;
        if (next >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(next);
          setInput(history[next] ?? '');
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setInput('');
        setHistoryIndex(-1);
      }
    },
    [context, history, historyIndex, input],
  );

  return (
    <div
      className="flex h-full min-h-0 cursor-text flex-col font-mono text-sm"
      onClick={(event) => {
        // A click anywhere puts you at the prompt, which is why the whole
        // terminal shows the text cursor. Two exceptions: a click meant for a
        // link, and the click that ends a drag-to-select. Focusing the input
        // moves the selection into it, so without the second check you could
        // never copy anything out of the terminal.
        if (event.target instanceof HTMLElement && event.target.closest('a')) return;
        if (window.getSelection()?.toString()) return;
        inputRef.current?.focus();
      }}
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
      >
        {lines.map((line, index) => (
          <Line key={index} line={line} />
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-line p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <label htmlFor="terminal-input" className="sr-only">
          Enter a command
        </label>
        <span className="text-accent" aria-hidden="true">
          $
        </span>
        <input
          id="terminal-input"
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          className="caret-accent min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint"
          placeholder="help"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-describedby="terminal-hint"
        />
      </form>

      <p id="terminal-hint" className="sr-only">
        Type a command and press Enter. Press Tab to complete a command name or
        argument. Use the up and down arrow keys to recall previous commands.
        Press Escape to clear the input.
      </p>
    </div>
  );
}
