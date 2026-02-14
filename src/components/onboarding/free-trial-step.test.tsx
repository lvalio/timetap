import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockCreatePaymentMethod = vi.fn()

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardElement: (props: { onChange?: () => void }) => (
    <div data-testid="card-element" onClick={props.onChange} />
  ),
  useStripe: () => ({
    createPaymentMethod: mockCreatePaymentMethod,
  }),
  useElements: () => ({
    getElement: () => ({}),
  }),
}))

vi.mock("@/lib/stripe/elements", () => ({
  getStripe: () => Promise.resolve({}),
}))

const mockActivateTrial = vi.fn()
vi.mock("@/app/(host)/onboarding/actions", () => ({
  activateTrial: (...args: unknown[]) => mockActivateTrial(...args),
}))

import { FreeTrialStep } from "./free-trial-step"

describe("FreeTrialStep", () => {
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders trial info text", () => {
    render(<FreeTrialStep onComplete={mockOnComplete} />)

    expect(screen.getByText("Start your free trial")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Try TimeTap free for 20 days. No charge until your trial ends."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText("€14.99/month after trial")
    ).toBeInTheDocument()
  })

  it("renders Stripe card element", () => {
    render(<FreeTrialStep onComplete={mockOnComplete} />)

    expect(screen.getByTestId("card-element")).toBeInTheDocument()
  })

  it('shows "Start free trial" button', () => {
    render(<FreeTrialStep onComplete={mockOnComplete} />)

    expect(
      screen.getByRole("button", { name: "Start free trial" })
    ).toBeInTheDocument()
  })

  it("shows error on card decline from Stripe", async () => {
    const user = userEvent.setup()
    mockCreatePaymentMethod.mockResolvedValue({
      error: { message: "Your card was declined." },
    })

    render(<FreeTrialStep onComplete={mockOnComplete} />)

    await user.click(
      screen.getByRole("button", { name: "Start free trial" })
    )

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your card was declined."
      )
    })
  })

  it("shows error from server action", async () => {
    const user = userEvent.setup()
    mockCreatePaymentMethod.mockResolvedValue({
      paymentMethod: { id: "pm_test" },
    })
    mockActivateTrial.mockResolvedValue({
      success: false,
      error: { message: "Card didn't go through. Try a different card?" },
    })

    render(<FreeTrialStep onComplete={mockOnComplete} />)

    await user.click(
      screen.getByRole("button", { name: "Start free trial" })
    )

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Card didn't go through. Try a different card?"
      )
    })
  })

  it("calls onComplete on success", async () => {
    const user = userEvent.setup()
    mockCreatePaymentMethod.mockResolvedValue({
      paymentMethod: { id: "pm_test" },
    })
    mockActivateTrial.mockResolvedValue({
      success: true,
      data: { trialEndsAt: "2026-03-06T00:00:00Z", slug: "test-host" },
    })

    render(<FreeTrialStep onComplete={mockOnComplete} />)

    await user.click(
      screen.getByRole("button", { name: "Start free trial" })
    )

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        trialEndsAt: "2026-03-06T00:00:00Z",
        slug: "test-host",
      })
    })
  })
})
