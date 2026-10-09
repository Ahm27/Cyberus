export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;
  return (
    <div role="status" className={error ? "status-error" : "status-ok"}>
      {error || success}
    </div>
  );
}
