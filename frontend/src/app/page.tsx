"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TournamentCard from "@/components/tournament/TournamentCard";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { getAllTournaments } from "@/lib/stellar/contracts";
import ErrorState from "@/components/shared/ErrorState";
import { mockStats, formatXLM, type Tournament } from "@/lib/mock-data";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTournaments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllTournaments();
      setTournaments(data);
    } catch {
      setError("Unable to load tournaments from chain.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getAllTournaments();
        if (!cancelled) setTournaments(data);
      } catch {
        if (!cancelled) setError("Unable to load tournaments from chain.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const featured = tournaments
    .filter((t) => t.status === "ongoing" || t.status === "registration_open")
    .slice(0, 3);

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.03] via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/[0.04] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex flex-col items-center pt-20 pb-20 text-center sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {/* Badge */}
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-xs font-medium text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Powered by Stellar Soroban
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="mt-6 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-7xl font-[family-name:var(--font-space-grotesk)]"
              variants={fadeUp}
            >
              Where Chess Meets{" "}
              <span className="text-gradient-gold">the Blockchain</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg"
              variants={fadeUp}
            >
              Create and join chess tournaments with on-chain entry fees,
              transparent prize pools, and automatic payouts. Play anywhere —
              we handle the rest.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              variants={fadeUp}
            >
              <Link
                href="/tournaments"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:brightness-110 active:scale-[0.98]"
              >
                Explore Tournaments
                <span className="text-base">→</span>
              </Link>
              <Link
                href="/dashboard/create"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                Create Tournament
              </Link>
            </motion.div>

            {/* Floating chess pieces */}
            <motion.div
              className="mt-12 flex items-center gap-6 text-3xl sm:gap-8 sm:text-4xl opacity-20"
              variants={fadeUp}
            >
              {["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"].map(
                (piece, i) => (
                  <span
                    key={i}
                    className="animate-float"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    {piece}
                  </span>
                )
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="border-y border-white/5 bg-white/[0.01]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-white/5 sm:grid-cols-4">
            {[
              {
                label: "Tournaments",
                value: mockStats.totalTournaments.toString(),
              },
              {
                label: "Prize Distributed",
                value: formatXLM(mockStats.totalPrizeDistributed),
              },
              {
                label: "Total Players",
                value: mockStats.totalPlayers.toString(),
              },
              {
                label: "Active Now",
                value: mockStats.activeTournaments.toString(),
                highlight: true,
              },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-6 text-center sm:py-8">
                <div
                  className={`text-xl font-bold sm:text-2xl font-[family-name:var(--font-space-grotesk)] ${
                    stat.highlight ? "text-emerald-400" : "text-white"
                  }`}
                >
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-zinc-500 sm:text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Tournaments ─── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl font-[family-name:var(--font-space-grotesk)]">
                Featured Tournaments
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Active and upcoming competitions
              </p>
            </div>
            <Link
              href="/tournaments"
              className="hidden text-sm font-medium text-amber-400 transition-colors hover:text-amber-300 sm:inline-flex items-center gap-1"
            >
              View all <span>→</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-8">
              <LoadingSkeleton variant="card" count={3} />
            </div>
          ) : error ? (
            <div className="mt-8">
              <ErrorState message={error} onRetry={loadTournaments} />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link
              href="/tournaments"
              className="text-sm font-medium text-amber-400"
            >
              View all tournaments →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="border-t border-white/5 bg-white/[0.01] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl font-[family-name:var(--font-space-grotesk)]">
              How It Works
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Three simple steps to compete
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: "♟",
                title: "Connect & Join",
                description:
                  "Connect your Freighter wallet, browse tournaments, and pay the entry fee in XLM. Your funds are held securely in a Soroban smart contract.",
              },
              {
                step: "02",
                icon: "♞",
                title: "Play Your Games",
                description:
                  "Play your tournament games on Lichess, Chess.com, or any platform you prefer. The organizer verifies results and updates the bracket.",
              },
              {
                step: "03",
                icon: "♛",
                title: "Win & Get Paid",
                description:
                  "Once the tournament concludes, the smart contract automatically releases the prize pool to the winner. No middlemen, no delays.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-amber-500/20 hover:bg-white/[0.04]"
              >
                {/* Step Number */}
                <div className="absolute -top-3 left-5 rounded-full bg-zinc-950 px-2">
                  <span className="text-xs font-bold text-amber-500">
                    {item.step}
                  </span>
                </div>

                {/* Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-xl text-amber-400 transition-colors group-hover:bg-amber-500/15">
                  {item.icon}
                </div>

                <h3 className="mt-4 text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-amber-500/[0.08] via-transparent to-emerald-500/[0.05] p-8 sm:p-12 lg:p-16">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-amber-500/[0.06] blur-[80px]" />

            <div className="relative max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl font-[family-name:var(--font-space-grotesk)]">
                Ready to compete?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Create your own tournament or join an existing one. Transparent
                prize pools, trustless payouts, all on-chain.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/create"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:brightness-110"
                >
                  Create Tournament
                </Link>
                <Link
                  href="/tournaments"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  Browse Tournaments
                </Link>
              </div>
            </div>

            {/* Decorative chess piece */}
            <div className="absolute bottom-4 right-8 text-8xl opacity-5 sm:text-9xl">
              ♚
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
