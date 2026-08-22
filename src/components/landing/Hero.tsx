import Link from "next/link";
import HeroPhone from "./HeroPhone";
import { BTN, BTN_MD, BTN_CORAL, TLINK_INK } from "./editorial";

/**
 * Landing hero — mockup `.hero`.
 *
 * Server component on purpose: the `<h1>` is the LCP element and must arrive
 * in the SSR HTML at full opacity. Nothing here is gated on JS. Only the
 * decorative phone preview is a client island.
 */
export default function Hero() {
  return (
    // `bg-[image:…]` is required: bare `bg-[var(--grad-hero)]` compiles to
    // `background-color`, which drops a gradient value and renders nothing.
    <section
      aria-labelledby="hero-heading"
      className="flex min-h-[calc(100vh-24px)] flex-col items-center justify-center bg-[image:var(--grad-hero)] px-6 pt-20 pb-[60px] text-center"
    >
      <h1
        id="hero-heading"
        className="max-w-[760px] text-[clamp(40px,6.5vw,64px)]"
      >
        The surprise app designed to be opened.
      </h1>

      <p className="mt-[22px] mb-[34px] max-w-[520px] text-lg text-stone">
        Create a private reveal page. Invite friends to add messages. Send one
        link. Watch them actually feel something.
      </p>

      <HeroPhone />

      <div className="flex flex-col items-center gap-[18px]">
        <Link href="/auth/signup" className={`${BTN} ${BTN_MD} ${BTN_CORAL}`}>
          Create a surprise — free
        </Link>
        <a href="#how" className={TLINK_INK}>
          See how it works →
        </a>
      </div>
    </section>
  );
}
