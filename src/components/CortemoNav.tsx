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
  /** Callback for the "Zakelijk" link (B2B portal). */
  onB2B?: () => void
  /** Callback for the "Ons verhaal" link. */
  onStory?: () => void
  /** Callback for the configurator call-to-action. */
  onConfigurator?: () => void
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

export function CortemoNav({
  active,
  theme,
  onToggleTheme,
  onHome,
  onInspiration,
  onB2B,
  onStory,
  onConfigurator,
}: CortemoNavProps) {
  const [open, setOpen] = useState(false)

  const links: NavLink[] = [
    { label: 'Assortiment', href: '/', onClick: onHome },
    { label: 'Inspiratie', href: '/inspiratie', onClick: onInspiration },
    { label: 'Zakelijk', href: '/zakelijk', onClick: onB2B },
    { label: 'Ons verhaal', href: '/verhaal', onClick: onStory },
  ]

  const follow = (l: NavLink) => (e: React.MouseEvent) => {
    if (l.onClick) {
      e.preventDefault()
      l.onClick()
    }
    setOpen(false)
  }

  const cta = (extra: string) => (
    <button
      onClick={() => {
        setOpen(false)
        onConfigurator?.()
      }}
      className={
        'flex items-center gap-2 whitespace-nowrap rounded-xl bg-rust text-sm font-medium text-white transition-colors hover:bg-rust-deep ' +
        extra
      }
    >
      Start de configurator <ArrowRight size={15} strokeWidth={2} />
    </button>
  )

  return (
    <nav className="on-light relative flex w-full items-center gap-2 self-start rounded-2xl bg-white/60 py-2 pl-2 pr-2 shadow-sm backdrop-blur-md md:w-auto md:gap-6 md:pl-4">
      {/* hamburger, op mobiel en smalle tablets */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Sluit menu' : 'Open menu'}
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-ink/5 md:hidden"
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

      <div className="hidden items-center gap-6 md:flex">
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
        {/* thema-switcher: op desktop rechts in de balk, op mobiel in het menu */}
        <span className="hidden md:block">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </span>
        {active !== 'Configurator' && cta('hidden px-4 py-2 sm:flex md:px-5')}
      </span>

      {/* uitklapmenu op mobiel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 flex flex-col gap-1 rounded-2xl bg-white/95 p-2 shadow-lg backdrop-blur-xl md:hidden">
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
          {active !== 'Configurator' && cta('mt-1 w-full justify-center px-4 py-3 font-semibold')}
          <button
            onClick={onToggleTheme}
            className="mt-1 flex items-center gap-2.5 rounded-xl border-t border-ink/5 px-4 py-3 text-[14px] font-medium text-ink/70 transition-colors hover:bg-ink/5"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} strokeWidth={2} /> Lichte weergave
              </>
            ) : (
              <>
                <Moon size={15} strokeWidth={2} /> Donkere weergave
              </>
            )}
          </button>
        </div>
      )}
    </nav>
  )
}
