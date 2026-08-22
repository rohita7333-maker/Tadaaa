import Link from "next/link";
import { SEC, IN, SEC_H2, SEC_SUB, photo } from "./editorial";
import { LANDING_OCCASIONS } from "./occasion-data";

const CARD_COUNT = 6;

/** "Explore popular occasions" — mockup `.sec.pebble` + `.occbig` / `.obcard`. */
export default function OccasionCards() {
  return (
    <section aria-labelledby="occasions-heading" className={`${SEC} bg-pebble`}>
      <div className={IN}>
        <h2 id="occasions-heading" className={SEC_H2}>
          Explore popular occasions
        </h2>
        <p className={SEC_SUB}>
          See how TaDaaaa brings people together for moments that matter.
        </p>

        {/* `min(300px,100%)` instead of the mockup's bare `300px`: at 320px the
            fixed minimum pushes the track 4px past the viewport. */}
        <div className="grid gap-[22px] [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
          {LANDING_OCCASIONS.slice(0, CARD_COUNT).map((occasion) => (
            <Link
              key={occasion.id}
              href="/templates"
              className="relative flex aspect-[4/3] items-end overflow-hidden rounded-[var(--r-md)]"
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${photo(occasion.seed, 600, 450)}')` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,26,26,0)_35%,rgba(26,26,26,0.82)_100%)]" />
              <div className="relative flex w-full items-end justify-between gap-3 p-[22px]">
                <div>
                  <h3 className="mb-1 text-2xl text-white">{occasion.name}</h3>
                  <p className="max-w-[280px] text-[13px] text-white/80">
                    {occasion.blurb}
                  </p>
                </div>
                {/* coral-light, not coral: coral on the 82% ink scrim measures
                    4.34:1 — below AA for 13px text. */}
                <span className="whitespace-nowrap text-sm font-semibold text-coral-light">
                  Explore →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
