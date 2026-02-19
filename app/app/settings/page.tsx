export default function SettingsPage() {
    return (
        <div className="min-h-screen px-6 py-10">
            <div
                className="
          mx-auto max-w-3xl
          rounded-[28px]
          border border-[color:var(--border)]
          bg-[color:var(--panel-bg)]
          backdrop-blur-2sm
          shadow-[var(--shadow)]
          p-6 sm:p-7
        "
            >
                <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">OPTIMAL CLOTHING</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-[color:var(--foreground)]">
                    Settings
                </h1>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                    Settings placeholder — theme is already global, add preferences here later.
                </p>
            </div>
        </div>
    );
}
