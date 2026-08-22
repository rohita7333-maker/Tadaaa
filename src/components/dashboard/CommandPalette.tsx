"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Plus,
  Settings,
  Tag as TagIcon,
  LogOut,
  CreditCard,
  Search as SearchIcon,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { signOut } from "@/actions/auth";
import { occasions as ALL_OCCASIONS } from "@/lib/themes";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void | Promise<void>;
};

interface Props {
  occasionsInUse: string[];
}

export default function CommandPalette({ occasionsInUse }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Cmd/Ctrl+K toggle
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      // Defer state resets to next frame to avoid synchronous setState-in-effect.
      const raf = requestAnimationFrame(() => {
        setQuery("");
        setActiveIdx(0);
      });
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t);
      };
    }
  }, [open]);

  function setOccasionFilter(id: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("occasion", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  const commands: Cmd[] = useMemo(() => {
    const base: Cmd[] = [
      {
        id: "new",
        label: "New surprise",
        hint: "Create a new invite",
        icon: Plus,
        run: () => router.push("/create"),
      },
      {
        id: "settings",
        label: "Go to settings",
        icon: Settings,
        run: () => router.push("/settings"),
      },
      {
        id: "pricing",
        label: "Go to pricing",
        icon: CreditCard,
        run: () => router.push("/pricing"),
      },
      {
        id: "signout",
        label: "Sign out",
        icon: LogOut,
        run: async () => {
          await signOut();
        },
      },
    ];

    const active = ALL_OCCASIONS.filter((occ) => occasionsInUse.includes(occ.id));
    const occCmds: Cmd[] = active.map((occ) => ({
      id: `occ-${occ.id}`,
      label: `Filter by occasion: ${occ.label}`,
      hint: occ.emoji,
      icon: TagIcon,
      run: () => setOccasionFilter(occ.id),
    }));

    return [...base, ...occCmds];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, occasionsInUse, pathname, searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setActiveIdx(0));
    return () => cancelAnimationFrame(raf);
  }, [query]);

  async function execute(cmd: Cmd) {
    setOpen(false);
    await cmd.run();
  }

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIdx];
      if (cmd) execute(cmd);
    }
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="max-w-xl bg-pebble">
      <div onKeyDown={handleKey} className="flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-mist/40">
          <SearchIcon className="w-4 h-4 text-stone" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            aria-label="Command palette search"
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-stone"
          />
          <kbd className="text-[10px] text-stone border border-mist rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>
        <ul role="listbox" className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <li className="px-5 py-6 text-center text-stone text-sm">
              No commands match.
            </li>
          )}
          {filtered.map((cmd, idx) => {
            const Icon = cmd.icon;
            const active = idx === activeIdx;
            return (
              <li
                key={cmd.id}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => execute(cmd)}
                className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm transition-colors ${
                  active
                    ? "bg-chip-coral-bg text-coral"
                    : "text-ink hover:bg-pebble"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-coral" : "text-stone"}`} />
                <span className="flex-1">{cmd.label}</span>
                {cmd.hint && (
                  <span className="text-xs text-stone">{cmd.hint}</span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="px-5 py-2 border-t border-mist/40 flex items-center justify-between text-[10px] text-stone">
          <span>
            <kbd className="border border-mist rounded px-1">↑</kbd>{" "}
            <kbd className="border border-mist rounded px-1">↓</kbd> navigate
          </span>
          <span>
            <kbd className="border border-mist rounded px-1">↵</kbd> select
          </span>
          <span>
            <kbd className="border border-mist rounded px-1">⌘K</kbd> toggle
          </span>
        </div>
      </div>
    </Dialog>
  );
}
