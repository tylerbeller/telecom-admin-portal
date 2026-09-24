"use client"

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      role="img"
      aria-label="Telecom Demo logo"
      className={className}
      style={{ fill: "var(--primary, #CC0000)" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0a12 12 0 0 1 0 24 12 12 0 0 1 0-24Zm0 3.5a8.5 8.5 0 0 0 0 17 8.5 8.5 0 0 0 0-17Z"
      />
      <circle cx="12" cy="12" r="4.5" />
    </svg>
  )
}
