"use client";

import { useEffect, useState } from "react";

function getIsDark() {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
}

function applyTheme(isDark: boolean) {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export default function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setMounted(true);

        const saved = localStorage.getItem("theme");
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        const initial = saved ? saved === "dark" : systemDark;
        applyTheme(initial);
        setIsDark(initial);
    }, []);

    if (!mounted) return null;

    const toggle = () => {
        const next = !getIsDark();
        applyTheme(next);
        setIsDark(next);
    };

    return (
        <button
            type="button"
            onClick={toggle}
            role="switch"
            aria-checked={isDark}
            title={isDark ? "Switch to light" : "Switch to dark"}
            className="
        group relative inline-flex items-center
        h-10 w-[78px]
        rounded-full
        border border-[color:var(--border)]
        bg-[color:var(--panel-bg)]
        backdrop-blur-2sm
        shadow-[var(--shadow)]
        transition
        hover:opacity-95
        active:scale-[0.99]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40
      "
        >
            {/* subtle inner track */}
            <span
                className="
          absolute inset-[5px]
          rounded-full
          bg-[color:var(--soft-bg)]
          border border-[color:var(--border)]
        "
                aria-hidden="true"
            />

            {/* glow */}
            <span
                className="
          pointer-events-none absolute inset-0 rounded-full
          opacity-0 transition-opacity duration-300
          group-hover:opacity-100
          bg-[radial-gradient(60%_70%_at_30%_30%,rgba(239,68,68,0.16),transparent_65%)]
          dark:bg-[radial-gradient(60%_70%_at_70%_30%,rgba(239,68,68,0.14),transparent_65%)]
        "
                aria-hidden="true"
            />

            {/* icons (premium, not emoji) */}
            <span className="absolute left-[12px] grid place-items-center" aria-hidden="true">
                {/* sun */}
                <svg
                    className={`
            h-[16px] w-[16px] transition-all duration-300
            ${isDark ? "opacity-40 scale-90" : "opacity-90 scale-100"}
          `}
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <path
                        d="M12 17.25a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M12 2.25v2.1M12 19.65v2.1M21.75 12h-2.1M4.35 12h-2.1M19.07 4.93l-1.49 1.49M6.42 17.58l-1.49 1.49M19.07 19.07l-1.49-1.49M6.42 6.42 4.93 4.93"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                    />
                </svg>
            </span>

            <span className="absolute right-[12px] grid place-items-center" aria-hidden="true">
                {/* moon */}
                <svg
                    className={`
            h-[16px] w-[16px] transition-all duration-300
            ${isDark ? "opacity-90 scale-100" : "opacity-40 scale-90"}
          `}
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <path
                        d="M21 14.3A8.2 8.2 0 0 1 9.7 3a6.9 6.9 0 1 0 11.3 11.3Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </span>

            {/* knob */}
            <span
                className={`
          relative z-10 ml-[6px]
          h-[28px] w-[28px] rounded-full
          border border-[color:var(--border)]
          bg-[color:var(--card-bg)]
          shadow-[0_10px_25px_rgba(0,0,0,0.18)]
          transition-transform duration-300 ease-out
          ${isDark ? "translate-x-[38px]" : "translate-x-0"}
        `}
                aria-hidden="true"
            >
                {/* inner metal highlight */}
                <span
                    className="
            absolute inset-0 rounded-full
            bg-[radial-gradient(60%_60%_at_35%_30%,rgba(255,255,255,0.70),rgba(255,255,255,0.10),transparent_70%)]
            dark:bg-[radial-gradient(60%_60%_at_35%_30%,rgba(255,255,255,0.18),rgba(255,255,255,0.06),transparent_70%)]
            opacity-80
          "
                />
                {/* tiny notch */}
                <span
                    className="
            absolute left-1/2 top-1/2 h-[9px] w-[9px]
            -translate-x-1/2 -translate-y-1/2
            rounded-full
            border border-[color:var(--border)]
            bg-[color:var(--soft-bg)]
          "
                />
            </span>

            <span className="sr-only">{isDark ? "Dark mode" : "Light mode"}</span>
        </button>
    );
}
