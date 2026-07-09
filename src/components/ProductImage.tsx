/**
 * Statisch beeld voor categorie- en productkaarten. Vervangt de drag-drop
 * <image-slot> uit het ontwerp: waar een dummy render bestaat tonen we die
 * full-bleed; ontbreekt het beeld (bijv. Decoratie & Praktisch) dan valt het
 * terug op een warm-grijs vlak met de naam als label.
 */
export function ProductImage({
  src,
  label,
  radius = 16,
}: {
  src?: string
  label: string
  radius?: number
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        draggable={false}
        className="h-full w-full select-none object-cover"
        style={{ borderRadius: radius }}
      />
    )
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-[#EAE8E3] p-4 text-center"
      style={{ borderRadius: radius }}
    >
      <span className="text-[13px] font-medium text-ink/55">{label}</span>
    </div>
  )
}
