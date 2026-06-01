import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Application boundary caught an error', { error, info });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-slate-900">
        <section className="max-w-lg text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">Something went wrong</p>
          <h1 className="mt-3 text-3xl font-bold">We could not load this hospital workspace.</h1>
          <p className="mt-4 text-slate-600">
            Refresh the page. If the issue repeats, share the time and action with the support team.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Reload
          </button>
        </section>
      </main>
    );
  }
}

