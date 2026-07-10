import { useState } from 'react'
import { ArrowRight, Menu, Moon, Sun, X } from 'lucide-react'
import type { Theme } from '../lib/useTheme'
import { CortemoLogo } from './CortemoLogo'

type NavLink = { label: string; href: string; onClick?: () => void }

export type CortemoNavProps = {
  active?: string
  theme: Theme
  onToggleTheme: () => void
  /** Callback for the "Assortiment" link and logo (in-app root of the webshop). */
  onHome?: () => void
  /** Callback for the "Inspiratie" link. */
  onInspiration?: () => void
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Wissel licht/donker thema"
      title="Licht / donker"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-ink/5"
    >
      {theme === 'dark' ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
    </button>
  )
}

export function CortemoNav({ active, theme, onToggleTheme, onHome, onInspiration }: CortemoNavProps) {
  const [open, setOpen] = useState(false)

  const links: NavLink[] = [
    { label: 'Assortiment', href: '#', onClick: onHome },
    { label: 'Ons verhaal', href: '#' },
    { label: 'Inspiratie', href: '#', onClick: onInspiration },
  ]

  const follow = (l: NavLink) => (e: React.MouseEvent) => {
    if (l.onClick) {
      e.preventDefault()
      l.onClick()
    }
    setOpen(false)
  }

  return (
    <nav className="relative flex w-full items-center gap-2 self-start rounded-2xl bg-white/60 py-2 pl-2 pr-2 shadow-sm backdrop-blur-md sm:w-auto sm:gap-6 sm:pl-4">
      {/* hamburger, alleen op mobiel */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Sluit menu' : 'Open menu'}
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-ink/5 sm:hidden"
      >
        {open ? <X size={17} strokeWidth={2} /> : <Menu size={17} strokeWidth={2} />}
      </button>

      <a
        href="#"
        onClick={(e) => {
          if (onHome) {
            e.preventDefault()
            onHome()
          }
          setOpen(false)
        }}
        className="flex items-center gap-2.5"
      >
        <CortemoLogo />
        <span className="text-[16px] font-extrabold tracking-[-.03em] text-ink">
          CORTEMO<span className="text-rust">.</span>
        </span>
      </a>

      <div className="hidden items-center gap-6 sm:flex">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            onClick={follow(l)}
            className={
              'whitespace-nowrap text-sm font-medium transition-opacity hover:opacity-60 ' +
              (active === l.label ? 'text-rust' : 'text-ink')
            }
          >
            {l.label}
          </a>
        ))}
      </div>

      <span className="ml-auto flex items-center gap-1.5">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        {active !== 'Configurator' && (
          <a
            href="#"
            className="hidden items-center gap-2 whitespace-nowrap rounded-xl bg-rust px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rust-deep sm:flex sm:px-5"
          >
            Start de configurator <ArrowRight size={15} strokeWidth={2} />
          </a>
        )}
      </span>

      {/* uitklapmenu op mobiel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 flex flex-col gap-1 rounded-2xl bg-white/95 p-2 shadow-lg backdrop-blur-xl sm:hidden">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={follow(l)}
              className={
                'rounded-xl px-4 py-3 text-[14px] font-medium transition-colors hover:bg-ink/5 ' +
                (active === l.label ? 'text-rust' : 'text-ink')
              }
            >
              {l.label}
            </a>
          ))}
          {active !== 'Configurator' && (
            <a
              href="#"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-rust px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-rust-deep"
            >
              Start de configurator <ArrowRight size={15} strokeWidth={2} />
            </a>
          )}
        </div>
      )}
    </nav>
  )
}
