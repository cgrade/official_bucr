export function BucrWordmark({ height = 30, light = false }: { height?: number; light?: boolean }) {
  return (
    <span
      className="font-display font-bold tracking-tight"
      style={{ fontSize: height, lineHeight: 1 }}
    >
      <span className="text-gold">B</span>
      <span style={{ color: light ? '#f5f0e8' : '#0f2547' }}>ucr</span>
    </span>
  );
}
