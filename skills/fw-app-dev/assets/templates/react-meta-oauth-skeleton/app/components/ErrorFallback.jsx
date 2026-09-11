export default function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <strong>App error:</strong> {error.message}
    </div>
  );
}
