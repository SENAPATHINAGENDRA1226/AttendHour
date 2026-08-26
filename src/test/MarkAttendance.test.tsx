import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import MarkAttendance from "../pages/faculty/MarkAttendance";
import { AuthProvider } from "../context/AuthContext";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../api/outbox", () => ({
  getOutboxItems: vi.fn().mockResolvedValue([]),
  saveToOutbox: vi.fn(),
  removeOutboxForSession: vi.fn(),
}));

describe("MarkAttendance Component — Same vs Split Mode State Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles same vs split mode toggle cleanly for a two-period session", async () => {
    const mockStudents = [
      { id: 101, roll_no: "23CS01", name: "Alice Smith", order_no: 1 },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/students")) {
        return Promise.resolve({ data: mockStudents });
      }
      if (url.includes("/session")) {
        return Promise.resolve({ data: { status: "held", records: [] } });
      }
      return Promise.reject(new Error("Not found"));
    });

    const route = "/faculty/mark?section_id=1&section_name=2nd+CSM-A&subject_id=2&subject_name=OS&date=2026-08-10&periods=1,2";

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <MarkAttendance />
        </MemoryRouter>
      </AuthProvider>
    );

    // Wait for student roster to load
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    });

    // 1. Student defaults to "present" under "same" mode
    const markButtons = screen.getAllByRole("button", { name: "P" });
    expect(markButtons.length).toBeGreaterThan(0);
    const samePButton = markButtons[0];
    expect(samePButton).toHaveClass("active");

    // 2. Click "Post Separately" to enable split mode
    const splitToggleBtn = screen.getByText(/post separately/i);
    fireEvent.click(splitToggleBtn);

    // 3. Verify P1 and P2 toggles appear and default to active
    await waitFor(() => {
      const activePresentButtons = screen.getAllByRole("button", { name: "P" }).filter((btn) => btn.classList.contains("active"));
      expect(activePresentButtons.length).toBe(2);
    });

    // 4. Change Period 2 status to "absent" (click 'A' next to P2)
    const absentButtons = screen.getAllByRole("button", { name: "A" });
    fireEvent.click(absentButtons[1]);

    // 5. Verify Period 2 is now absent
    expect(absentButtons[1]).toHaveClass("active");

    // 6. Click "Save Attendance" and verify payload per-period overrides
    (api.post as any).mockResolvedValueOnce({ data: { status: "saved" } });
    const saveBtn = screen.getByRole("button", { name: /save attendance/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/faculty/attendance/post",
        expect.objectContaining({
          section_id: 1,
          subject_id: 2,
          date: "2026-08-10",
          period_numbers: [1, 2],
          per_period_overrides: {
            1: [{ student_id: 101, status: "present" }],
            2: [{ student_id: 101, status: "absent" }],
          },
        })
      );
    });
  });
});
