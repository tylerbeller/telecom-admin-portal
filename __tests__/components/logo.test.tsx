import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Logo } from "@/components/logo"

describe("Logo", () => {
  it("renders the application logo", () => {
    render(<Logo />)
    expect(screen.getByRole("img", { name: /telecom demo logo/i })).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(<Logo className="custom-class" />)
    expect(screen.getByRole("img", { name: /telecom demo logo/i })).toHaveClass("custom-class")
  })
})
