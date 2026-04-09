import { fireEvent, render, screen } from "@testing-library/react";
import type { MouseEvent } from "react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { UserNameActions } from "@/components/user-name-actions";

describe("UserNameActions", () => {
  it("opens action menu without triggering parent click navigation", async () => {
    const parentClick = vi.fn((e: MouseEvent) => e.preventDefault());

    render(
      <a href="/users/1/record" onClick={parentClick}>
        <UserNameActions
          userId={1}
          nickname="테스터"
          gender="MALE"
          grade="D"
          lv={3}
          myUserId={2}
        />
      </a>,
    );

    fireEvent.mouseDown(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("개인 기록 보기")).toBeInTheDocument();
    expect(screen.getByText("나와의 전적 보기")).toBeInTheDocument();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
