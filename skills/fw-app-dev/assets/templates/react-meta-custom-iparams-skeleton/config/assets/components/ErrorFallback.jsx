export default function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <strong>Settings error:</strong> {error.message}
    </div>
  );
}
