"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let codeBlock: { language: string; lines: string[] } | null = null;
  let paragraphLines: string[] = [];

  const flushParagraph = (key: string | number) => {
    if (paragraphLines.length > 0) {
      blocks.push(
        <p key={`p-${key}`} className="mb-2 leading-relaxed text-sm last:mb-0">
          {renderInline(paragraphLines.join("\n"))}
        </p>
      );
      paragraphLines = [];
    }
  };

  const flushList = (key: string | number) => {
    if (currentList) {
      const Tag = currentList.type;
      const listClass =
        currentList.type === "ol"
          ? "list-decimal pl-6 mb-2 space-y-1 text-sm text-foreground"
          : "list-disc pl-6 mb-2 space-y-1 text-sm text-foreground";
      blocks.push(
        <Tag key={`list-${key}`} className={listClass}>
          {currentList.items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </Tag>
      );
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith("```")) {
      if (codeBlock) {
        // End of code block
        blocks.push(
          <pre
            key={`code-${i}`}
            className="p-3 bg-zinc-950 text-zinc-100 rounded-md my-2 overflow-x-auto text-xs font-mono border border-zinc-800"
          >
            <code>{codeBlock.lines.join("\n")}</code>
          </pre>
        );
        codeBlock = null;
      } else {
        // Start of code block
        flushParagraph(i);
        flushList(i);
        const language = line.trim().slice(3).trim();
        codeBlock = { language, lines: [] };
      }
      continue;
    }

    if (codeBlock) {
      codeBlock.lines.push(line);
      continue;
    }

    // Check for Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph(i);
      flushList(i);
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const HeadingTag = `h${level}` as any;

      let headingClass = "font-bold mt-3 mb-2 tracking-tight text-foreground";
      if (level === 1) headingClass += " text-lg border-b pb-1 font-extrabold";
      else if (level === 2) headingClass += " text-base";
      else if (level === 3) headingClass += " text-sm font-semibold";
      else headingClass += " text-xs";

      blocks.push(
        <HeadingTag key={`h-${i}`} className={headingClass}>
          {renderInline(headingText)}
        </HeadingTag>
      );
      continue;
    }

    // Check for Unordered Lists
    const ulMatch = line.match(/^([*\-+])\s+(.+)$/);
    if (ulMatch) {
      flushParagraph(i);
      const itemContent = ulMatch[2];
      if (!currentList || currentList.type !== "ul") {
        flushList(i);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(renderInline(itemContent));
      continue;
    }

    // Check for Ordered Lists
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph(i);
      const itemContent = olMatch[2];
      if (!currentList || currentList.type !== "ol") {
        flushList(i);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(renderInline(itemContent));
      continue;
    }

    // Blank line indicates paragraph separator
    if (line.trim() === "") {
      flushParagraph(i);
      flushList(i);
      continue;
    }

    // Otherwise, it's a paragraph line
    flushList(i);
    paragraphLines.push(line);
  }

  // Flush remaining elements
  flushParagraph("final");
  flushList("final");
  if (codeBlock) {
    blocks.push(
      <pre
        key="code-final"
        className="p-3 bg-zinc-950 text-zinc-100 rounded-md my-2 overflow-x-auto text-xs font-mono border border-zinc-800"
      >
        <code>{codeBlock.lines.join("\n")}</code>
      </pre>
    );
  }

  return <div className="space-y-1">{blocks}</div>;
}

function renderInline(text: string): React.ReactNode[] {
  // Split using regex for: bold (**), italic (*), code (`), links ([text](url))
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded font-mono text-xs border border-zinc-200 dark:border-zinc-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.+?)\]\((.+?)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      const isAbsoluteFile = linkUrl.startsWith("file:///");
      return (
        <a
          key={index}
          href={linkUrl}
          target={isAbsoluteFile ? undefined : "_blank"}
          rel={isAbsoluteFile ? undefined : "noopener noreferrer"}
          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
        >
          {linkText}
        </a>
      );
    }
    return part;
  });
}
