import type { AppProps } from "next/app";
import "../app/globals.css";
import ErrorBoundary from "../app/components/ErrorBoundary";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

