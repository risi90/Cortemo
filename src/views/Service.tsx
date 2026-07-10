import { useEffect } from 'react'
import { FileText, HelpCircle, ShieldCheck, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Servicepagina: veelgestelde vragen, levering & retour, voorwaarden en
 * privacy op één pagina met ankers (/service#faq etc.), zodat elke
 * footerlink een echte bestemming heeft.
 */

type Blok = {
  id: string
  icon: LucideIcon
  title: string
  items: [string, string][]
}

const BLOKKEN: Blok[] = [
  {
    id: 'faq',
    icon: HelpCircle,
    title: 'Veelgestelde vragen',
    items: [
      [
        'Hoe snel roest cortenstaal?',
        'Onbehandeld corten kleurt in 2 tot 6 maanden van staalgrijs naar diep roestbruin, afhankelijk van weer en wind. Met het versnelde roestproces leveren we hem direct in zijn eindkleur.',
      ],
      [
        'Geeft corten af op tegels of hout?',
        'In de eerste maanden kan roestwater uitlopen op poreuze ondergronden. Kies de anti-uitspoeling coating of zet het product de eerste tijd op grind of gras.',
      ],
      [
        'Is maatwerk echt op de millimeter?',
        'Ja — de configurator rekent met de exacte maten die jij instelt en de fabriek snijdt lasergestuurd. Gezette randen en naden vallen binnen ±1 mm.',
      ],
      [
        'Kan ik een eigen ontwerp laten snijden?',
        'Ja. Upload een foto voor een silhouet in de configurator, of lever een DXF-bestand aan via de offerte-route; we controleren de maakbaarheid altijd vooraf.',
      ],
    ],
  },
  {
    id: 'levering',
    icon: Truck,
    title: 'Levering & retour',
    items: [
      [
        'Levertijd',
        'Voorraadproducten leveren we binnen 8 werkdagen, maatwerk binnen 10 tot 15 werkdagen. Je ontvangt bericht zodra je bestelling in productie gaat en wanneer hij onderweg is.',
      ],
      [
        'Bezorging',
        'Levering gaat per pallettransport door heel Nederland en België; de chauffeur belt vooraf. Zware leveringen komen tot aan de eerste deur op de begane grond.',
      ],
      [
        'Retourneren',
        'Standaardproducten kun je binnen 14 dagen retourneren in onbeschadigde staat; retourkosten van pallettransport zijn voor de koper. Maatwerk is van herroeping uitgesloten (art. 6:230p BW), maar valt wél onder onze kwaliteitsgarantie.',
      ],
      [
        'Schade of gebreken',
        'Meld transportschade binnen 48 uur met een foto via hallo@cortemo.nl — we sturen kosteloos een vervangend deel of product.',
      ],
    ],
  },
  {
    id: 'voorwaarden',
    icon: FileText,
    title: 'Algemene voorwaarden (kern)',
    items: [
      [
        'Prijzen en betaling',
        'Alle prijzen zijn in euro’s inclusief 21% btw. Particulieren betalen bij bestelling; zakelijke partners met een betaaltermijn bestellen op rekening.',
      ],
      [
        'Maatwerk',
        'Maatwerk wordt geproduceerd op basis van de door jou bevestigde configuratie. Controleer maten en opties in de besteloverzicht; na start van productie zijn wijzigingen niet meer mogelijk.',
      ],
      [
        'Garantie',
        'Corten roest bewust — dat is geen gebrek. Op constructie en laswerk geldt 5 jaar garantie; vervorming door verkeerde plaatsing of overbelasting valt daarbuiten.',
      ],
      [
        'Eigendomsvoorbehoud',
        'Geleverde producten blijven eigendom van Cortemo tot volledige betaling. Op alle overeenkomsten is Nederlands recht van toepassing.',
      ],
    ],
  },
  {
    id: 'privacy',
    icon: ShieldCheck,
    title: 'Privacyverklaring (kern)',
    items: [
      [
        'Welke gegevens',
        'We verwerken alleen wat nodig is voor je bestelling: naam, e-mailadres, bezorgadres en je orderhistorie. Foto’s die je uploadt voor een silhouet verwerken we lokaal in je browser en slaan we niet op.',
      ],
      [
        'Waarvoor',
        'Voor het uitvoeren en factureren van je bestelling, orderupdates per e-mail en — alleen met jouw inschrijving — de nieuwsbrief. We verkopen nooit gegevens aan derden.',
      ],
      [
        'Bewaartermijn en rechten',
        'Ordergegevens bewaren we 7 jaar (fiscale plicht); daarna verwijderen we ze. Je kunt inzage, correctie of verwijdering aanvragen via hallo@cortemo.nl.',
      ],
      [
        'Verwerkers',
        'Onze webshop draait op Europese infrastructuur (Supabase, eu-central-1); e-mail loopt via Resend. Met verwerkers zijn verwerkersovereenkomsten gesloten.',
      ],
    ],
  },
]

export function Service() {
  // ankers uit de footer (/service#levering) netjes in beeld scrollen
  useEffect(() => {
    const id = location.hash.slice(1)
    if (!id) return
    const el = document.getElementById(id)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
      <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">Service</p>
      <h1 className="serif mt-3 text-[30px] leading-[1.0] tracking-[-.03em] text-white sm:text-[40px]">
        Goed geregeld, zwart op wit.
      </h1>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/60">
        Antwoorden op de meestgestelde vragen en de kern van onze voorwaarden. Staat je vraag er
        niet bij? Mail{' '}
        <a href="mailto:hallo@cortemo.nl" className="font-semibold text-rust hover:underline">
          hallo@cortemo.nl
        </a>
        {' '}— we reageren binnen één werkdag.
      </p>

      <div className="mt-10 space-y-10">
        {BLOKKEN.map((blok) => (
          <section key={blok.id} id={blok.id} className="scroll-mt-28">
            <h2 className="flex items-center gap-2.5 text-[18px] font-bold text-white">
              <blok.icon size={17} strokeWidth={2} className="text-rust" />
              {blok.title}
            </h2>
            <div className="mt-4 divide-y divide-white/5 rounded-2xl bg-white/5">
              {blok.items.map(([vraag, antwoord]) => (
                <div key={vraag} className="px-5 py-4">
                  <h3 className="text-[14px] font-semibold text-white">{vraag}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/60">{antwoord}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
