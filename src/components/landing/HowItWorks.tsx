import { SEC, IN, SEC_H2, SEC_SUB } from "./editorial";

const STEPS = [
  {
    num: "01",
    title: "Invite friends & family",
    body: "Share one link. They don't need an account.",
    path: <path d="M4 12h16M12 4v16" strokeLinecap="round" />,
  },
  {
    num: "02",
    title: "Collect messages & photos",
    body: "Contributors upload from any device. Everything lands in one place.",
    path: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18" />
      </>
    ),
  },
  {
    num: "03",
    title: "Create & share",
    body: "Arrange scenes, add music, preview, and send.",
    path: <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />,
  },
] as const;

/** "How to create a surprise reveal" — mockup `.sec.pebble#how` + `.steps3`. */
export default function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-heading" className={`${SEC} bg-pebble`}>
      <div className={IN}>
        <h2 id="how-heading" className={SEC_H2}>
          How to create a surprise reveal
        </h2>
        <p className={SEC_SUB}>
          Collect messages from friends and family, then turn them into a
          personalized reveal experience.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-[var(--r-md)] border border-mist bg-paper px-7 py-9"
            >
              <div className="mb-4 text-xs font-semibold tracking-[0.12em] text-coral-deep">
                {step.num}
              </div>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="mb-[18px] h-9 w-9 fill-none stroke-ink [stroke-width:1.4]"
              >
                {step.path}
              </svg>
              <h3 className="mb-2 text-xl">{step.title}</h3>
              <p className="text-sm">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
