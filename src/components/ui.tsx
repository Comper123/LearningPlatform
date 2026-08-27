import type { ComponentProps, ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow-card ${className}`}
      {...props}
    />
  );
}

/**
 * Обёртка поля с подписью.
 *
 * Намеренно `div`, а не `label`: внутрь попадают не только нативные поля,
 * но и наши Select/DatePicker с кнопкой и всплывающей панелью. `label`
 * пересылает клик первому вложенному элементу формы, из-за чего кнопка
 * получала клик дважды и панель закрывалась в тот же миг, что открывалась.
 *
 * Для связи подписи с полем передайте `htmlFor` и такой же `id` полю.
 */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium tracking-wide text-muted uppercase"
      >
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

/** Общий вид всех полей ввода — используется и кастомными компонентами. */
export const controlClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition placeholder:text-muted/70 hover:border-border-strong focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea className={`${controlClass} resize-y ${className}`} {...props} />
  );
}

const buttonVariants = {
  primary: "bg-accent text-accent-fg hover:brightness-110 active:brightness-95",
  secondary:
    "border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
  danger: "border border-border text-danger hover:bg-danger/10",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

/** Маленькая круглая кнопка для действий в строке списка. */
export function IconButton({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-30 ${className}`}
      {...props}
    />
  );
}

export function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${style}`}
    >
      {label}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-danger">{children}</p>;
}
