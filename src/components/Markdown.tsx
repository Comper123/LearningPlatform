import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Отрисовка Markdown с оформлением под тему приложения.
 * Блоки кода прокручиваются по горизонтали, чтобы длинные строки
 * не растягивали страницу.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h3 className="text-lg font-semibold" {...props} />,
          h2: (props) => <h4 className="text-base font-semibold" {...props} />,
          h3: (props) => <h5 className="font-semibold" {...props} />,
          p: (props) => <p {...props} />,
          ul: (props) => (
            <ul className="list-disc pl-5 marker:text-muted" {...props} />
          ),
          ol: (props) => (
            <ol className="list-decimal pl-5 marker:text-muted" {...props} />
          ),
          li: (props) => <li className="mt-1" {...props} />,
          a: (props) => (
            <a
              className="text-accent hover:underline"
              target="_blank"
              rel="noreferrer noopener"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-2 border-border pl-4 text-muted"
              {...props}
            />
          ),
          hr: () => <hr className="border-border" />,
          table: (props) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="border border-border bg-surface-2 px-3 py-1.5" {...props} />
          ),
          td: (props) => (
            <td className="border border-border px-3 py-1.5" {...props} />
          ),
          code: ({ className, children, ...props }) => {
            // Блочный код react-markdown помечает классом language-*.
            const isBlock = /language-/.test(className ?? "");

            if (!isBlock) {
              return (
                <code
                  className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className="font-mono text-xs" {...props}>
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              className="overflow-x-auto rounded-lg border border-border bg-surface-2 p-3"
              {...props}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
