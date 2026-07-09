import { ArrowRight, Moon, Sun } from 'lucide-react'
import type { Theme } from '../lib/useTheme'
import { CortemoLogo } from './CortemoLogo'

type NavLink = { label: string; href: string; onClick?: () => void }

export type CortemoNavProps = {
  active?: string
  theme: Theme
  onToggleTheme: () => void
  /** Callback for the "Assortiment" link and logo (in-app root of the webshop). */
  onHome?: () => void
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Wissel licht/donker thema"
      title="Licht / donker"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-ink/5"
    >
      {theme === 'dark' ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
    </button>
  )
}

export function CortemoNav({ active, theme, onToggleTheme, onHome }: CortemoNavProps) {
  const links: NavLink[] = [
    { label: 'Assortiment', href: '#', onClick: onHome },
    { label: 'Ons verhaal', href: '#' },
    { label: 'Inspiratie', href: '#' },
  ]

  return (
    <nav className="flex w-full items-center gap-3 self-start rounded-2xl bg-white/60 py-2 pl-3 pr-2 shadow-sm backdrop-blur-md sm:w-auto sm:gap-6 sm:pl-4">
      <a
        href="#"
        onClick={(e) => {
          if (onHome) {
            e.preventDefault()
            onHome()
          }
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
            onClick={(e) => {
              if (l.onClick) {
                e.preventDefault()
                l.onClick()
              }
            }}
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
            className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-rust px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rust-deep sm:px-5"
          >
            Start de configurator <ArrowRight size={15} strokeWidth={2} />
          </a>
        )}
      </span>
    </nav>
  )
}
