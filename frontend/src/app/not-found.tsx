import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-xl font-medium">Page not found</p>
      <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <Link
        href="/login"
        className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Back to Login
      </Link>
    </div>
  );
}
