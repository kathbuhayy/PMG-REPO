import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AppModal from "./AppModal";

describe("AppModal component tests", () => {
  // Tests modal behavior when open is false
  test("renders nothing when open is false", () => {
    const { container } = render(
      <AppModal open={false} title="Test Title" message="Test Message" />
    );
    expect(container.firstChild).toBeNull();
  });

  // Tests modal text and contents render correctly when open is true
  test("renders title, message, and children when open is true", () => {
    render(
      <AppModal open={true} title="Test Title" message="Test Message">
        <div data-testid="child-element">Child Content</div>
      </AppModal>
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Message")).toBeInTheDocument();
    expect(screen.getByTestId("child-element")).toBeInTheDocument();
  });

  // Tests different styles (tones) applied to mark indicator
  test("renders correct tone indicators", () => {
    const { rerender } = render(
      <AppModal open={true} title="Title" tone="success" />
    );
    expect(screen.getByText("✓")).toBeInTheDocument();

    rerender(<AppModal open={true} title="Title" tone="danger" />);
    expect(screen.getByText("!")).toBeInTheDocument();

    rerender(<AppModal open={true} title="Title" tone="info" />);
    expect(screen.getByText("i")).toBeInTheDocument();
  });

  // Tests callbacks for confirm action buttons
  test("triggers onConfirm when confirm button is clicked", () => {
    const handleConfirm = jest.fn();
    render(
      <AppModal open={true} title="Title" onConfirm={handleConfirm} />
    );

    fireEvent.click(screen.getByRole("button", { name: /ok/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  // Tests cancel button rendering and cancel callback triggers
  test("triggers onCancel and displays cancel button when cancelText provided", () => {
    const handleCancel = jest.fn();
    render(
      <AppModal
        open={true}
        title="Title"
        cancelText="Cancel Now"
        onCancel={handleCancel}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /cancel now/i });
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
