import * as React from "react";

/**
 * Tiny markdown subset (bold, inline code, bullet lists, [n] citations).
 * Deliberately dependency-free; swap for a full renderer if richer markdown is needed.
 */
function inline(text: string, onCite?: (n: number) => void): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\d+\])/g);
  return parts.map((p, i) => {
    if (/^\*\*.+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^`.+`$/.test(p)) return <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{p.slice(1, -1)}</code>;
    const cite = /^\[(\d+)\]$/.exec(p);
    if (cite) {
      const n = Number(cite[1]);
      return (
        <button
          key={i} type="button" onClick={() => onCite?.(n)} aria-label={`Source ${n}`}
          className="mx-0.5 inline-flex size-4 -translate-y-px items-center justify-center rounded bg-primary/15 align-middle text-[10px] font-semibold text-primary hover:bg-primary/25"
        >{n}</button>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

export function RichText({ text, onCite }: { text: string; onCite?: (n: number) => void }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^[-*] /.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.slice(2), onCite)}</li>)}</ul>;
        }
        return <p key={i}>{inline(b, onCite)}</p>;
      })}
    </div>
  );
}
