"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CoverflowFan from "@/components/templates/CoverflowFan";
import TemplateCard from "@/components/templates/TemplateCard";
import { templates } from "@/lib/templates";

const SHOWCASE_COUNT = 6;

/**
 * Landing-page template showcase — the coverflow fan (the product's signature
 * visual) surfaced at zero clicks, with a top slice of the catalog beneath it.
 * The full browsable catalog stays at /templates.
 */
export default function TemplateShowcase() {
  return (
    <section aria-labelledby="landing-templates-heading" className="px-6 pb-24 pt-4 text-center">
      <p className="mb-2 font-handwritten text-2xl text-[#3E6B5C]">
        psst… they have no idea
      </p>
      <h2
        id="landing-templates-heading"
        className="mx-auto max-w-2xl font-heading text-4xl leading-[1.08] text-[#1A1B18] md:text-5xl"
      >
        A template for <em className="text-[#3E6B5C]">every occasion</em>
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[#6F6E68]">
        Pick one, add your words and photos, send a link. The moment unfolds
        like a tiny film.
      </p>

      <CoverflowFan />

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-5 text-left sm:grid-cols-2 lg:grid-cols-3">
        {templates.slice(0, SHOWCASE_COUNT).map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      <Link
        href="/templates"
        className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#1A1B18]/25 px-7 py-3 text-sm font-semibold text-[#1A1B18] transition-colors duration-300 hover:border-[#3E6B5C] hover:text-[#3E6B5C] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E6B5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9F6]"
      >
        Browse all templates
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
