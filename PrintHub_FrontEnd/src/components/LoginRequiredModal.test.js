import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LoginRequiredModal from "./LoginRequiredModal";

describe("LoginRequiredModal component tests", () => {
  // Tests component markup matches requirements
  test("renders Login Required text and all three action buttons", () => {
    render(<LoginRequiredModal />);
    
    expect(screen.getByRole("heading", { name: /login required/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  // Tests button callbacks are correctly invoked
  test("calls expected handlers when buttons are clicked", () => {
    const handleClose = jest.fn();
    const handleLogin = jest.fn();
    const handleRegister = jest.fn();

    render(
      <LoginRequiredModal
        onClose={handleClose}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(handleLogin).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(handleRegister).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
