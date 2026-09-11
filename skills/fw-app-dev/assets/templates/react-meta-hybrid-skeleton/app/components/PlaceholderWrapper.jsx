import { useEffect, useState } from 'react';

const POLL_MS = 100;
const MAX_ATTEMPTS = 50;

export default function PlaceholderWrapper({ children }) {
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function initClient() {
      for (let attempt = 0; active && attempt < MAX_ATTEMPTS; attempt += 1) {
        if (typeof app !== 'undefined') {
          try {
            const c = await app.initialized();
            if (active) setClient(c);
          } catch (err) {
            if (active) setError(err?.message || 'app.initialized() failed');
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
      if (active) {
        setError('Freshworks app client failed to load. Ensure index.html includes the appclient script.');
      }
    }

    initClient();
    return () => { active = false; };
  }, []);

  if (error) return <div role="alert">{error}</div>;
  if (!client) return <div>Loading...</div>;
  return children;
}
