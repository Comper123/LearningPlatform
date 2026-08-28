/** Кружок с инициалами. Цвет стабилен для одного имени. */
export function Avatar({
  name,
  size = 56,
}: {
  name: string;
  size?: number;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  // Оттенок из суммы кодов символов — детерминированно.
  const hue =
    [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `hsl(${hue} 55% 45%)`,
      }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
