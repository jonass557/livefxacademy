import React from 'react';

// Filet de sécurité global : une erreur de rendu ne doit JAMAIS produire une page blanche.
// Affiche un message récupérable (avec le détail technique, utile pour le support) et
// permet de réessayer sans quitter la session.
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info);
  }

  componentDidUpdate(prevProps) {
    // Changer de section (resetKey) réinitialise l'erreur automatiquement.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error?.message || this.state.error || '');
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 p-6 m-4 rounded-xl border bg-card text-foreground">
        <h3 className="text-base font-bold">Cette section n'a pas pu s'afficher / This section could not be displayed</h3>
        <p className="text-xs text-muted-foreground break-all max-w-md">{msg.slice(0, 200)}</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
            onClick={() => this.setState({ error: null })}
          >
            Réessayer / Retry
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border text-sm font-semibold"
            onClick={() => { try { window.location.assign('/dashboard'); } catch (_) { window.location.reload(); } }}
          >
            Tableau de bord / Dashboard
          </button>
        </div>
      </div>
    );
  }
}
