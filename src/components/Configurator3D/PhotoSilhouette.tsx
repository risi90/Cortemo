import { useRef, useState } from 'react'
import { Check, ImageUp, X } from 'lucide-react'
import { maskFromImage, traceSilhouette } from '../../lib/trace'
import { figureSvgPath, type FigurePath } from '../../data/figures'

/**
 * Foto → silhouet-editor: upload een foto, stel met de drempel-schuif in
 * wat "vorm" is (donker of juist licht), en gebruik het getraceerde
 * silhouet in het ontwerp — als vrijstaande vorm of als uitsnede.
 */
export function PhotoSilhouette({
  onUse,
  onClose,
}: {
  onUse: (path: FigurePath) => void
  onClose: () => void
}) {
  const [imgData, setImgData] = useState<ImageData | null>(null)
  const [threshold, setThreshold] = useState(128)
  const [invert, setInvert] = useState(false)
  const [path, setPath] = useState<FigurePath | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = (file: File) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 360
      const s = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * s)
      canvas.height = Math.round(img.height * s)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setImgData(data)
      retrace(data, threshold, invert)
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  }

  const retrace = (data: ImageData, th: number, inv: boolean) => {
    setPath(traceSilhouette(maskFromImage(data, th, inv)))
  }

  const update = (th: number, inv: boolean) => {
    setThreshold(th)
    setInvert(inv)
    if (imgData) retrace(imgData, th, inv)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#14191E] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">Eigen silhouet uit een foto</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-white/55">
              Werkt het best met een foto tegen een lichte, egale achtergrond. Schuif tot het
              silhouet klopt.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Sluit silhouet-editor"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
        />

        {!imgData ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 flex h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 text-white/55 transition-colors hover:border-rust hover:text-white"
          >
            <ImageUp size={22} strokeWidth={2} />
            <span className="text-[13px] font-semibold">Kies een foto</span>
          </button>
        ) : (
          <>
            <div className="mt-4 flex h-44 items-center justify-center rounded-xl bg-white/5">
              {path ? (
                <svg viewBox="-4 -4 108 108" className="h-40 w-40">
                  <path d={figureSvgPath([path])} fill="#e06a35" />
                </svg>
              ) : (
                <p className="px-6 text-center text-[12px] text-white/45">
                  Geen bruikbare vorm gevonden — schuif de drempel op of zet &ldquo;lichte
                  vorm&rdquo; aan.
                </p>
              )}
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-[12px] font-semibold text-white/70">
                Drempel
                <input
                  type="range"
                  min={20}
                  max={235}
                  value={threshold}
                  onChange={(e) => update(+e.target.value, invert)}
                  className="mt-1 h-1.5 w-full cursor-pointer accent-[#D95A2B]"
                />
              </label>
              <label className="flex items-center gap-2 text-[13px] text-white/70">
                <input
                  type="checkbox"
                  checked={invert}
                  onChange={(e) => update(threshold, e.target.checked)}
                  className="h-4 w-4 rounded accent-[#D95A2B]"
                />
                Lichte vorm op donkere achtergrond
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Andere foto
                </button>
                <button
                  onClick={() => path && onUse(path)}
                  disabled={!path}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rust py-2.5 text-[13px] font-semibold text-white hover:bg-rust-deep disabled:opacity-50"
                >
                  <Check size={14} strokeWidth={2} /> Gebruik dit silhouet
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
