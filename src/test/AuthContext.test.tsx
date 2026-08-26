import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../context/AuthContext";

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists auth state to localStorage on login", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.auth).toBeNull();
    expect(localStorage.getItem("attendance_auth")).toBeNull();

    const mockAuth = {
      token: "jwt-token-abc",
      role: "faculty" as const,
      fullName: "Dr. Alice",
    };

    act(() => {
      result.current.login(mockAuth);
    });

    expect(result.current.auth).toEqual(mockAuth);
    expect(localStorage.getItem("attendance_auth")).toBe(JSON.stringify(mockAuth));
  });

  it("restores auth state from localStorage on reload/init", () => {
    const storedAuth = {
      token: "jwt-token-xyz",
      role: "admin" as const,
      fullName: "Admin Bob",
    };

    localStorage.setItem("attendance_auth", JSON.stringify(storedAuth));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.auth).toEqual(storedAuth);
  });

  it("clears auth state and localStorage on logout", () => {
    const storedAuth = {
      token: "jwt-token-xyz",
      role: "faculty" as const,
      fullName: "Dr. Alice",
    };

    localStorage.setItem("attendance_auth", JSON.stringify(storedAuth));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.auth).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.auth).toBeNull();
    expect(localStorage.getItem("attendance_auth")).toBeNull();
  });
});
