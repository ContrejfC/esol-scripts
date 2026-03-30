"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-semibold text-red-800">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-red-700">
              The app hit an error. Try refreshing the page. If you are running
              locally, the backend may be down—start it on port{" "}
              {process.env.NEXT_PUBLIC_BACKEND_PORT ?? "8002"} or set{" "}
              <code className="rounded bg-red-100 px-1">NEXT_PUBLIC_API_BASE</code> for a hosted API.
            </p>
            {this.state.error?.message && (
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-red-100/80 p-3 text-xs text-red-900">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
