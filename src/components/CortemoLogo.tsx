/** Cortemo beeldmerk: twee strakke diagonale platen (antraciet boven, rust onder). */
export function CortemoLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-label="Cortemo">
      <path d="M 256 0 L 128 0 L 0 128 L 96 128 L 176 48 L 256 48 Z" fill="#1F2937" />
      <path d="M 256 256 L 128 256 L 0 128 L 96 128 L 176 208 L 256 208 Z" fill="#D95A2B" />
    </svg>
  )
}
