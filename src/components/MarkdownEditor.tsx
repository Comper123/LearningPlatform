"use client";

import { useRef, useState } from "react";

import { Markdown } from "@/components/Markdown";
import { controlClass } from "@/components/ui";

type Tool = {
  label: string;
  title: string;
  /** Что вставить до и после выделения. */
  wrap: [string, string];
  /** Если выделения нет — этот текст станет заготовкой. */
  placeholder?: string;
};

const TOOLS: Tool[] = [
  { label: "Ж", title: "Полужирный", wrap: ["**", "**"], placeholder: "текст" },
  { label: "К", title: "Курсив", wrap: ["_", "_"], placeholder: "текст" },
  { label: "H", title: "Заголовок", wrap: ["\n## ", "\n"], placeholder: "Заголовок" },
  { label: "•", title: "Список", wrap: ["\n- ", ""], placeholder: "пункт" },
  { label: "1.", title: "Нумерованный список", wrap: ["\n1. ", ""], placeholder: "пункт" },
  { label: "</>", title: "Код в строке", wrap: ["`", "`"], placeholder: "код" },
  {
    label: "{ }",
    title: "Блок кода",
    wrap: ["\n```python\n", "\n```\n"],
    placeholder: "print('привет')",
  },
  { label: "🔗", title: "Ссылка", wrap: ["[", "](https://)"], placeholder: "текст" },
];

/**
 * Редактор Markdown с панелью вставки и вкладкой предпросмотра.
 * Значение уходит в форму обычным textarea, поэтому работает в
 * серверных экшенах без дополнительной обвязки.
 */
export function MarkdownEditor({
  name,
  defaultValue = "",
  rows = 14,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function apply(tool: Tool) {
    const area = areaRef.current;
    if (!area) return;

    const { selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end) || tool.placeholder || "";
    const [before, after] = tool.wrap;

    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setValue(next);

    // Возвращаем фокус и выделяем вставленный текст — можно сразу печатать.
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface-2 p-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            disabled={preview}
            onClick={() => apply(tool)}
            className="min-w-8 rounded-md px-2 py-1 text-xs text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-40"
          >
            {tool.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className={`ml-auto rounded-md px-2.5 py-1 text-xs transition ${
            preview
              ? "bg-accent-soft font-medium text-accent"
              : "text-muted hover:bg-surface hover:text-foreground"
          }`}
        >
          {preview ? "Редактировать" : "Просмотр"}
        </button>
      </div>

      {/* textarea не размонтируем: иначе форма потеряет поле в режиме превью. */}
      <div className={preview ? "hidden" : ""}>
        <textarea
          ref={areaRef}
          name={name}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          className={`${controlClass} rounded-none border-0 font-mono text-xs leading-relaxed focus:border-0`}
        />
      </div>

      {preview && (
        <div className="p-4">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-muted">Пусто — нечего показывать.</p>
          )}
        </div>
      )}
    </div>
  );
}
