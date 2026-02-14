import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[640px] px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-tt-text-primary">
        Page not found
      </h1>
      <p className="mt-4 text-tt-text-secondary">
        We couldn&apos;t find this page. The link may have changed or the host
        hasn&apos;t gone live yet.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-tt-primary hover:text-tt-primary-hover underline"
      >
        Go to TimeTap
      </Link>
    </div>
  )
}
