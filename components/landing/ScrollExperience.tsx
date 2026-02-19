"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Image from "next/image";
import ShirtStage3D from "@/components/landing/ShirtStage3D";
import Link from "next/link";
import { ShoppingCart, User, Menu, X } from "lucide-react";

function Scene({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <section className="relative h-[120vh]">
            <div className="sticky top-0 h-screen overflow-hidden">
                {/* ✅ Optional: very subtle vignette only */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/0" />

                {/* Content always above everything */}
                <div className="relative z-30 mx-auto flex h-full max-w-6xl items-center px-6">
                    <div className="w-full">
                        {/* ✅ Readability panel (NOT full screen) */}
                        <div
                            className="
                inline-block max-w-2xl rounded-3xl
                border border-[color:var(--border)]
                bg-[color:var(--panel-bg)]
                backdrop-blur-2sm
                px-6 py-6 sm:px-8 sm:py-7
                shadow-[var(--shadow)]
              "
                        >
                            <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">
                                OPTIMAL CLOTHING
                            </p>

                            <h2 className="mt-3 text-4xl sm:text-5xl font-semibold text-[color:var(--foreground)]">
                                {title}
                            </h2>

                            <p className="mt-3 text-sm sm:text-base text-[color:var(--muted)]">
                                {subtitle}
                            </p>

                            <div className="mt-7">{children}</div>
                        </div>
                    </div>
                </div>

                {/* ✅ Subtle grid */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.06]
          [background-image:linear-gradient(to_right,rgba(0,0,0,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.35)_1px,transparent_1px)]
          [background-size:84px_84px]"
                />
            </div>
        </section>
    );
}

function useWindowSize() {
    const [size, setSize] = useState({ w: 1200, h: 800 });
    useEffect(() => {
        const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return size;
}

function useHtmlDark() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const el = document.documentElement;

        const update = () => setIsDark(el.classList.contains("dark"));
        update();

        const obs = new MutationObserver(update);
        obs.observe(el, { attributes: true, attributeFilter: ["class"] });

        return () => obs.disconnect();
    }, []);

    return isDark;
}


export default function ScrollExperience() {
    const ref = useRef<HTMLDivElement | null>(null);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"],
    });

    // Global “cinematic” motion
    const scale = useTransform(scrollYProgress, [0, 0.35, 0.7, 1], [1, 1.22, 0.96, 1.08]);
    const y = useTransform(scrollYProgress, [0, 1], [0, 90]);
    const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [0, -5, 3]);
    const glow = useTransform(scrollYProgress, [0, 0.4, 1], [0.18, 0.35, 0.2]);

    // Focus highlight (appears mid scroll)
    const focusOpacity = useTransform(scrollYProgress, [0.15, 0.25, 0.35], [0, 1, 0]);
    const focusScale = useTransform(scrollYProgress, [0.15, 0.25], [0.92, 1.04]);

    // Center title intro (unique pre-scroll)
    const introOpacity = useTransform(scrollYProgress, [0, 0.06, 0.12], [1, 1, 0]);
    const introScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.92]);
    const introY = useTransform(scrollYProgress, [0, 0.12], [0, -24]);
    const introBlur = useTransform(scrollYProgress, [0, 0.12], [0, 8]);

    // ✅ Scene 1 focus window (tweak ranges depending sa feel)
    const scene1Focus = useTransform(scrollYProgress, [0.12, 0.20, 0.30], [0, 1, 0]);

    // ✅ move whole shirt stage to the RIGHT while focusing
    // const stageShiftX = useTransform(scene1Focus, [0, 1], [0, 170]); // px
    const stageShiftScale = useTransform(scene1Focus, [0, 1], [1, 1.02]); // subtle

    const { w } = useWindowSize();

    // reuse your responsive maxShift
    const maxShift =
        w < 640 ? 20 :
            w < 1024 ? 70 :
                140;

    // a single X curve across the whole scroll
    const stageShiftX = useTransform(
        scrollYProgress,
        [0.12, 0.20, 0.30, 0.38, 0.48, 0.56, 0.66, 0.74, 0.84, 0.92, 1],
        [0, maxShift, 0, maxShift * 0.65, 0, maxShift * 0.35, 0, maxShift * 0.25, 0, maxShift, maxShift]
    );


    // Scene windows (0→1→0)
    const chest = useTransform(scrollYProgress, [0.12, 0.20, 0.30], [0, 1, 0]);
    const bottomLeft = useTransform(scrollYProgress, [0.30, 0.38, 0.48], [0, 1, 0]);
    const back = useTransform(scrollYProgress, [0.48, 0.56, 0.66], [0, 1, 0]);
    const backCenter = useTransform(scrollYProgress, [0.66, 0.74, 0.84], [0, 1, 0]);
    const outro = useTransform(scrollYProgress, [0.84, 0.92, 1.0], [0, 1, 1]);

    const isDark = useHtmlDark();
    const [designUrl, setDesignUrl] = useState("/designs/skull-headphones.png");

    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);

        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-mobile-menu]")) return; // click inside menu
            setMenuOpen(false);
        };

        document.addEventListener("keydown", onKey);
        document.addEventListener("click", onClick);

        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("click", onClick);
        };
    }, []);


    return (
        <div ref={ref} className="relative">
            {/* Top bar (always above) */}
            <div className="sticky top-0 z-50 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                <div className="flex items-center gap-3">
                    {/* ✅ LOGO swap via CSS classes (no dark: needed) */}
                    <div className="relative h-[42px] w-[42px]">
                        <Image
                            src="/OC_whiteBG.png"
                            alt="Optimal Clothing"
                            fill
                            className="object-contain rounded-lg logo-light"
                            priority
                        />
                        <Image
                            src="/OC_BLACKBG.png"
                            alt="Optimal Clothing"
                            fill
                            className="object-contain rounded-lg logo-dark"
                            priority
                        />
                    </div>

                    <span className="text-sm tracking-widest text-[color:var(--foreground)]">
                        OPTIMAL CLOTHING
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* ✅ Desktop buttons */}
                    <div className="hidden md:flex items-center gap-2">
                        <Link
                            href="/login"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)]
        bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90 transition"
                            aria-label="Account"
                            title="Account"
                        >
                            <User size={18} />
                        </Link>

                        <Link
                            href="/cart"
                            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)]
        bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90 transition"
                            aria-label="Cart"
                            title="Cart"
                        >
                            <ShoppingCart size={18} />
                            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] text-white">
                                0
                            </span>
                        </Link>

                        <ThemeToggle />
                    </div>

                    {/* ✅ Mobile hamburger */}
                    <div className="relative md:hidden" data-mobile-menu>
                        <button
                            onClick={() => setMenuOpen((v) => !v)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)]
        bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90 transition"
                            aria-label="Menu"
                            aria-expanded={menuOpen}
                        >
                            {menuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>

                        {/* Dropdown */}
                        {menuOpen && (
                            <div
                                className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-[color:var(--border)]
          bg-[color:var(--panel-bg)] shadow-[var(--shadow)] backdrop-blur-2sm"
                            >
                                <Link
                                    href="/login"
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 text-sm text-[color:var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    <User size={18} />
                                    Account
                                </Link>

                                <Link
                                    href="/cart"
                                    onClick={() => setMenuOpen(false)}
                                    className="flex items-center justify-between px-4 py-3 text-sm text-[color:var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    <span className="flex items-center gap-3">
                                        <ShoppingCart size={18} />
                                        Cart
                                    </span>
                                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                                        0
                                    </span>
                                </Link>

                                <div className="px-3 py-3 border-t border-[color:var(--border)]">
                                    <ThemeToggle />
                                </div>
                            </div>
                        )}
                    </div>
                </div>


            </div>

            {/* ✅ Global background layer */}
            <div
                className="pointer-events-none fixed inset-0 -z-20
        bg-[radial-gradient(60%_50%_at_50%_20%,rgba(239,68,68,0.12),transparent_60%)]
        transition-colors duration-300"
            />

            {/* ✅ CENTER TITLE INTRO (doesn't disrupt the stage) */}
            <motion.div
                style={{ opacity: introOpacity }}
                className="pointer-events-none fixed inset-0 z-20 grid place-items-center"
            >
                <motion.div
                    style={{
                        scale: introScale,
                        y: introY,
                        filter: introBlur as unknown as string,
                    }}
                    className="text-center px-6"
                >
                    <div
                        className="
    inline-block rounded-[28px]
    px-8 py-7
    bg-[color:var(--panel-bg)]
    backdrop-blur-2sm
    shadow-[var(--shadow)]
  "
                    >
                        {/* BIG BRAND */}
                        <div className="relative inline-block">
                            <h1
                                className="
                font-semibold leading-[0.9]
                text-[clamp(2.6rem,6.5vw,6.2rem)]
                tracking-[0.18em]
                text-[color:var(--foreground)]
                opacity-90
              "
                            >
                                OPTIMAL
                                <span className="block mt-2 text-[clamp(1.2rem,2.6vw,2.2rem)] tracking-[0.45em] opacity-75">
                                    CLOTHING
                                </span>
                            </h1>

                            {/* OUTLINE GHOST (premium) */}
                            <div
                                className="
                absolute inset-0 -z-10
                text-transparent
                [-webkit-text-stroke:1px_color:var(--border)]
                opacity-70
                select-none
              "
                                aria-hidden="true"
                            >
                                <div
                                    className="
                  font-semibold leading-[0.9]
                  text-[clamp(2.6rem,6.5vw,6.2rem)]
                  tracking-[0.18em]
                "
                                >
                                    OPTIMAL
                                    <span className="block mt-2 text-[clamp(1.2rem,2.6vw,2.2rem)] tracking-[0.45em]">
                                        CLOTHING
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* MINI TAGLINE (super minimal, not redundant) */}
                        <p className="mt-6 text-xs sm:text-sm tracking-[0.28em] uppercase text-[color:var(--muted)]">
                            Minimal streetwear • print-on-demand • made personal
                        </p>

                        {/* SCROLL HINT (tiny, centered) */}
                        <div className="mt-10 flex flex-col items-center gap-3">
                            <div
                                className="
                h-10 w-7 rounded-full
                border border-[color:var(--border)]
                bg-[color:var(--soft-bg)]
                grid place-items-center
              "
                            >
                                <div className="h-2 w-1 rounded-full bg-[color:var(--muted)] animate-bounce" />
                            </div>
                            <span className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">
                                SCROLL
                            </span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>


            {/* ✅ SHIRT STAGE: FULLSCREEN CANVAS (never clipped) */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ x: stageShiftX, scale: stageShiftScale }}
                >
                    {/* Soft glow behind shirt */}
                    <motion.div
                        style={{ opacity: glow }}
                        className="absolute h-[720px] w-[720px] rounded-full blur-3xl bg-red-500/30"
                    />

                    {/* ✅ Canvas now fills the screen (ShirtStage3D will be 100%) */}
                    <div className="absolute inset-0">
                        <ShirtStage3D
                            isDark={isDark}
                            designUrl={designUrl}
                            printSide="front"
                            scaleMv={scale}
                            yMv={y}
                            rotateMv={rotate}
                            chestMv={chest}
                            bottomLeftMv={bottomLeft}
                            backMv={back}
                            backCenterMv={backCenter}
                            outroMv={outro}
                        />

                    </div>

                    {/* Optional: keep your print guide overlay relative to screen */}
                    <motion.div
                        style={{ opacity: focusOpacity, scale: focusScale }}
                        className="
        absolute left-1/2 top-[50%]
        h-[18%] w-[22%]
        -translate-x-1/2 -translate-y-1/2
        rounded-2xl
        border-2 border-red-500/70
        bg-red-500/10
      "
                    />
                </motion.div>
            </div>



            {/* SCENES */}
            <div className="mt-[100vh]">
                <Scene
                    title="Minimal streetwear. Made personal."
                    subtitle="Pick from a wide variety of clean, minimalist designs—then upload your own or generate one inside the site. We print it on premium tees. You just checkout."
                >
                    {/* HERO EYEBROW */}
                    <p className="mb-3 text-xs tracking-[0.4em] uppercase text-[color:var(--muted)]">
                        Est. 2025 · Print-on-demand streetwear
                    </p>

                    {/* CTA */}
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href="/products"
                            className="rounded-full px-6 py-3 text-sm font-medium
    bg-[color:var(--btn-primary-bg)]
    text-[color:var(--btn-primary-fg)]
    hover:opacity-90 transition"
                        >
                            Shop Designs
                        </Link>


                        <a
                            href="#custom"
                            className="
        rounded-full px-6 py-3 text-sm font-medium
        border border-[color:var(--btn-secondary-border)]
        bg-[color:var(--btn-secondary-bg)]
        text-[color:var(--btn-secondary-fg)]
        hover:opacity-90 transition
      "
                        >
                            Customize Your Tee
                        </a>
                    </div>

                    {/* DIVIDER */}
                    <div className="my-7 h-px w-full bg-[color:var(--border)]" />

                    {/* TRUST BADGES */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            "Premium cotton",
                            "Printed on demand",
                            "No minimum orders",
                        ].map((item) => (
                            <span
                                key={item}
                                className="
          rounded-full px-3 py-1 text-[11px]
          border border-[color:var(--border)]
          bg-[color:var(--soft-bg)]
          text-[color:var(--muted)]
        "
                            >
                                {item}
                            </span>
                        ))}
                    </div>

                    {/* FEATURE CARDS (unchanged) */}
                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-5">
                            <p className="text-sm font-medium text-[color:var(--foreground)]">
                                Minimalist Drops
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                                Curated streetwear designs you can wear daily.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-5">
                            <p className="text-sm font-medium text-[color:var(--foreground)]">
                                Upload Your Art
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                                PNG/SVG → auto-fit to a safe print area.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-5">
                            <p className="text-sm font-medium text-[color:var(--foreground)]">
                                Prompt-to-Print
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                                Describe it → generate a design → preview → checkout.
                            </p>
                        </div>
                    </div>
                </Scene>
            </div>


            <Scene
                title="Zoom in. Check the print."
                subtitle="See exactly how your design sits on the tee—clean placement, safe margins, and a preview that matches what we print."
            >
                <ul className="mt-1 space-y-2 text-sm text-[color:var(--muted)]">
                    <li>• Safe print area guide</li>
                    <li>• Front / back / sleeve options</li>
                    <li>• Preview before checkout</li>
                </ul>
            </Scene>

            <Scene
                title="Upload your design."
                subtitle="Drop your artwork and we auto-fit it to the shirt—no guessing, no manual resizing."
            >
                <div id="custom" className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-5">
                        <p className="text-sm font-medium text-[color:var(--foreground)]">Upload</p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">PNG • SVG • print-ready</p>
                        <div className="mt-4 h-28 rounded-xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] grid place-items-center text-xs text-[color:var(--muted)]">
                            Drop file zone (future)
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-5">
                        <p className="text-sm font-medium text-[color:var(--foreground)]">Auto-fit</p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                            Snap-to-center + safe print margins
                        </p>
                        <div className="mt-4 h-28 rounded-xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] grid place-items-center text-xs text-[color:var(--muted)]">
                            Live preview (future)
                        </div>
                    </div>
                </div>
            </Scene>

            <Scene
                title="Generate a design with a prompt."
                subtitle="No design? No problem. Type an idea and generate a clean, printable graphic right inside OPTIMAL."
            >
                <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-5">
                    <p className="text-sm font-medium text-[color:var(--foreground)]">Prompt → Design</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                        Example: “minimal skull with headphones, black & white”
                    </p>
                    <div className="mt-4 h-28 rounded-xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] grid place-items-center text-xs text-[color:var(--muted)]">
                        AI generator UI (future)
                    </div>
                </div>
            </Scene>

            <Scene
                title="Checkout with confidence."
                subtitle="What you preview is what we print. Choose size, color, quantity—then we handle the rest."
            >
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href="/cart"
                        className="
              rounded-full px-6 py-3 text-sm font-medium
              border border-[color:var(--btn-secondary-border)]
              bg-[color:var(--btn-secondary-bg)]
              text-[color:var(--btn-secondary-fg)]
              hover:opacity-90 transition
            "
                    >
                        Go to Cart
                    </Link>

                    <Link
                        href="/checkout"
                        className="
              rounded-full px-6 py-3 text-sm font-medium
              bg-[color:var(--btn-primary-bg)]
              text-[color:var(--btn-primary-fg)]
              hover:opacity-90 transition
            "
                    >
                        Checkout
                    </Link>
                </div>
            </Scene>

            <footer className="relative z-30 py-12 text-center text-xs text-[color:var(--muted-2)]">
                © {new Date().getFullYear()} OPTIMAL CLOTHING
            </footer>
        </div>
    );
}
