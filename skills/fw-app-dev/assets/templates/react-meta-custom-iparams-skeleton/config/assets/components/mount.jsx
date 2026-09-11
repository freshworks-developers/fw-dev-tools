import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from './ErrorFallback';
import IparamsForm from './IparamsForm';

export function mountIparams() {
  createRoot(document.getElementById('root')).render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <IparamsForm />
    </ErrorBoundary>
  );
}
