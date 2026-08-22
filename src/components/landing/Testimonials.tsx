import { SEC, IN } from "./editorial";

/**
 * Illustrative scenarios, NOT customer quotes.
 *
 * The mockup shipped three first-person testimonials with invented
 * attributions ("Priya K., Birthday"). We have no customer quotes to publish,
 * so the copy is written in the second person as "here is what this is for"
 * and every attribution line is gone. Nothing here may be re-attributed to a
 * named person until we hold a real, consented quote.
 */
const MOMENTS = [
  "A page for your mum's 60th that your sister in Australia can add to — so it lands like everyone was in the room.",
  "Not another video dropped in the group chat. Something made for one person.",
  "A countdown that unlocks at midnight in their timezone, wherever you are.",
] as const;

/** "What a surprise can feel like" — mockup `.sec` + `.quotes` hinge blocks. */
export default function Testimonials() {
  return (
    <section aria-labelledby="moments-heading" className={SEC}>
      <div className={IN}>
        <h2 id="moments-heading" className="label">
          What a surprise can feel like
        </h2>

        <div className="mt-3.5 grid gap-[52px] sm:grid-cols-2 lg:grid-cols-3">
          {MOMENTS.map((moment) => (
            <div key={moment} className="relative pt-[34px]">
              <span
                aria-hidden="true"
                className="absolute -left-1 -top-2 font-heading text-[64px] leading-none text-sand"
              >
                &ldquo;
              </span>
              <p className="font-heading text-[19px] italic leading-[1.45] text-ink">
                {moment}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
