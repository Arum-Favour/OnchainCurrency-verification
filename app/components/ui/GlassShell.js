export default function GlassShell({ children, className = '' }) {
  return (
    <div className={`app-shell ${className}`}>
      {children}
    </div>
  );
}
