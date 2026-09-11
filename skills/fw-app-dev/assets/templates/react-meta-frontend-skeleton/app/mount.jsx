import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './components/App';
import ErrorFallback from './components/ErrorFallback';

export function mountApp() {
  createRoot(document.getElementById('root')).render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  );
}
