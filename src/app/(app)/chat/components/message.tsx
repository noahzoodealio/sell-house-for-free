import type { ReactElement } from "react";
import type { UIMessage } from "@ai-sdk/react";

import { cn } from "@/lib/cn";
import { DocSummarySchema } from "@/lib/ai/schemas/doc-summary";
import { OfferAnalysisSchema } from "@/lib/ai/schemas/offer-analysis";

import { DocSummaryCard } from "./doc-summary-card";
import { OfferAnalysisCard } from "./offer-analysis-card";

/**
 * Minimal markdown renderer for bold/italic/inline-code/links/bulleted-and-numbered lists.
 * Intentionally lightweight — pulling react-markdown is overkill for the conversational
 * range the transaction manager emits. If S13 needs richer markdown for artifact
 * summaries, swap at that time.
 */
function renderInline(text: string): Array<string | ReactElement> {
  const parts: Array<string | ReactElement> = [];
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="px-1 py-0.5 rounded bg-surface-tint font-mono text-[0.92em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            className="underline text-brand"
            target="_blank"
            rel="noreferrer"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        parts.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderBlocks(text: string): ReactElement[] {
  const lines = text.split(/\r?\n/);
  const blocks: ReactElement[] = [];
  let currentList: { kind: "ul" | "ol"; items: string[] } | null = null;
  let buffer: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (buffer.length === 0) return;
    const joined = buffer.join(" ").trim();
    if (joined) {
      blocks.push(
        <p key={key++} className="leading-relaxed">
          {renderInline(joined)}
        </p>,
      );
    }
    buffer = [];
  };

  const flushList = () => {
    if (!currentList) return;
    const Tag = currentList.kind;
    blocks.push(
      <Tag
        key={key++}
        className={cn(
          "ml-5 space-y-1",
          Tag === "ul" ? "list-disc" : "list-decimal",
        )}
      >
        {currentList.items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </Tag>,
    );
    currentList = null;
  };

  for (const line of lines) {
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul) {
      flushParagraph();
      if (!currentList || currentList.kind !== "ul") {
        flushList();
        currentList = { kind: "ul", items: [] };
      }
      currentList.items.push(ul[1]);
      continue;
    }
    if (ol) {
      flushParagraph();
      if (!currentList || currentList.kind !== "ol") {
        flushList();
        currentList = { kind: "ol", items: [] };
      }
      currentList.items.push(ol[1]);
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    buffer.push(line);
  }
  flushParagraph();
  flushList();

  return blocks;
}

function extractToolResults(message: UIMessage): Array<{
  toolName: string;
  result: unknown;
}> {
  const results: Array<{ toolName: string; result: unknown }> = [];
  for (const part of message.parts ?? []) {
    const p = part as {
      type: string;
      toolName?: string;
      output?: unknown;
      result?: unknown;
    };
    if (typeof p.type !== "string") continue;
    if (!p.type.startsWith("tool-") && p.type !== "tool-result") continue;

    const toolName =
      p.toolName ??
      (p.type.startsWith("tool-") ? p.type.slice("tool-".length) : undefined);
    const payload = p.output ?? p.result;
    if (!toolName || payload === undefined) continue;

    results.push({ toolName, result: payload });
  }
  return results;
}

export function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const textParts = (message.parts ?? [])
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  const toolResults = extractToolResults(message);

  const cards: ReactElement[] = [];
  for (const [i, r] of toolResults.entries()) {
    if (r.toolName === "review_pdf") {
      const parsed = DocSummarySchema.safeParse(
        (r.result as { summary?: unknown }).summary ?? r.result,
      );
      if (parsed.success) {
        cards.push(<DocSummaryCard key={`doc-${i}`} summary={parsed.data} />);
        continue;
      }
    }
    if (r.toolName === "analyze_offer") {
      const parsed = OfferAnalysisSchema.safeParse(r.result);
      if (parsed.success) {
        cards.push(
          <OfferAnalysisCard key={`offer-${i}`} analysis={parsed.data} />,
        );
      }
    }
  }

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div className="max-w-[82%] md:max-w-[70%] flex flex-col gap-2">
        {textParts && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-[15px]",
              isUser
                ? "bg-brand text-brand-foreground"
                : "bg-surface border border-border text-ink-body",
            )}
          >
            {renderBlocks(textParts)}
          </div>
        )}
        {cards}
      </div>
    </div>
  );
}
