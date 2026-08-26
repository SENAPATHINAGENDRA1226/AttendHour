import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Login from "../pages/Login";
import { api } from "../api/client";
import { AuthProvider, useAuth } from "../context/AuthContext";

vi.mock("../api/client", () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Login Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows validation error or prevents submit when inputs are empty", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Form inputs are marked required, so HTML5 form validation or submit handler triggers
    expect(api.post).not.toHaveBeenCalled();
  });

  it("calls login API with entered credentials and navigates to /faculty on faculty role", async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        access_token: "test-token-123",
        role: "faculty",
        full_name: "Dr. Faculty",
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const usernameInput = screen.getByLabelText("Username");
    const passwordInput = screen.getByLabelText("Password");
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: "faculty1" } });
    fireEvent.change(passwordInput, { target: { value: "faculty123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        username: "faculty1",
        password: "faculty123",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/faculty");
    });
  });

  it("navigates to /admin on admin role", async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        access_token: "admin-token-456",
        role: "admin",
        full_name: "Dept Admin",
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "admin123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });
  });

  it("displays error banner when login API request fails", async () => {
    (api.post as any).mockRejectedValueOnce({
      response: {
        data: {
          detail: "Invalid username or password",
        },
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "wronguser" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid username or password")).toBeInTheDocument();
    });
  });

  it("toggles password visibility when eye icon button is clicked", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const toggleBtn = screen.getByRole("button", { name: /show password visibility/i });

    expect(passwordInput.type).toBe("password");

    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput.type).toBe("password");
  });
});
