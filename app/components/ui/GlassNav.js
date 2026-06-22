export default function GlassNav({ title, subtitle, children, onBack, backLabel = 'Back' }) {
  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary btn-sm">
              ← {backLabel}
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-on-dark">{title}</h1>
              {subtitle && <p className="text-xs text-on-dark-muted">{subtitle}</p>}
            </div>
          </div>
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
