/**
 * BucrWordmark — renders "Bucr" as a single SVG text element.
 *
 * "B" in gold (#c9a84c) and "ucr" in cream (#f5f0e8) are tspans inside the
 * same <text> node, so they share the same baseline with zero gap between them.
 * Cormorant Garamond is loaded by the portal's layout.tsx via next/font.
 */
interface Props {
  height?: number;
  className?: string;
}

export function BucrWordmark({ height = 28, className }: Props) {
  // SVG viewBox sized to the approximate text bounds of "Bucr" at 64px
  // Width ≈ 2.5× height to accommodate the full word
  const w = height * 2.5;
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 160 56"
      className={className}
      aria-label="Bucr"
      role="img"
    >
      <text
        x="2"
        y="46"
        fontFamily="'Cormorant Garamond', 'Georgia', serif"
        fontWeight="600"
        fontSize="56"
        letterSpacing="-1"
      >
        <tspan fill="#c9a84c">B</tspan>
        <tspan fill="#f5f0e8">ucr</tspan>
      </text>
    </svg>
  );
}
