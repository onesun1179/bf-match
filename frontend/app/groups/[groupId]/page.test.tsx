import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import React from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import GroupDetailPage from "@/app/groups/[groupId]/page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ groupId: "10" }),
  useSearchParams: () => ({ get: (key: string) => (key === "view" ? "games" : null) }),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/components/bottom-nav-group-detail", () => ({
  BottomNavGroupDetail: () => null,
}));

const authMocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  fetchGroupDetail: vi.fn(),
  fetchGames: vi.fn(),
  fetchMemberStats: vi.fn(),
  getAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  submitScore: vi.fn(),
  confirmScore: vi.fn(),
  rejectScore: vi.fn(),
  startGame: vi.fn(),
  finishGame: vi.fn(),
  updateGameCourtNumber: vi.fn(),
  approveGameProposal: vi.fn(),
  rejectGameProposal: vi.fn(),
  cancelGame: vi.fn(),
  createInviteLink: vi.fn(),
  acceptInvite: vi.fn(),
  declineInvite: vi.fn(),
  fetchInviteLinkInfo: vi.fn(),
  joinPublicGroup: vi.fn(),
  closeGroup: vi.fn(),
  leaveGroup: vi.fn(),
  kickGroupMember: vi.fn(),
  changeMemberRole: vi.fn(),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<object>("@/lib/auth");
  return { ...actual, ...authMocks };
});

describe("GroupDetailPage result dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getAccessToken.mockReturnValue("token");
    authMocks.fetchMe.mockResolvedValue({
      id: 1,
      nickname: "me",
      gender: "MALE",
      email: null,
      authProvider: "LOCAL",
      regionCode: null,
      preferredCourt: null,
      onboardingCompleted: true,
      notificationEnabled: true,
      skill: { nationalGrade: "D", lv: 3, exp: 10, canUpgradeGrade: false },
    });
    authMocks.fetchGroupDetail.mockResolvedValue({
      id: 10,
      name: "group",
      description: null,
      visibility: "PUBLIC",
      ownerUserId: 1,
      memberCount: 2,
      myRole: "OWNER",
      myStatus: "ACTIVE",
      location: null,
      startAt: null,
      endAt: null,
      registrationDeadline: null,
      minGrade: null,
      maxGrade: null,
      maxMembers: null,
      maxMale: null,
      maxFemale: null,
      closed: false,
      members: [
        { userId: 1, nickname: "me", gender: "MALE", nationalGrade: "D", role: "OWNER", status: "ACTIVE" },
        { userId: 2, nickname: "u2", gender: "MALE", nationalGrade: "D", role: "MEMBER", status: "ACTIVE" },
      ],
    });
    authMocks.fetchGames.mockResolvedValue([
      {
        id: 100,
        groupId: 10,
        status: "FINISHED",
        proposalStatus: "APPROVED",
        proposedByUserId: 1,
        proposalReviewedByUserId: 1,
        proposalReviewedAt: null,
        proposalRejectReason: null,
        gameType: "MALE_DOUBLES",
        courtNumber: null,
        teamAScore: null,
        teamBScore: null,
        winnerTeam: null,
        pendingTeamAScore: null,
        pendingTeamBScore: null,
        pendingWinnerTeam: null,
        pendingRequestedByTeam: null,
        pendingRequestedByUserId: null,
        pendingRequestedAt: null,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        teamA: [
          { userId: 1, nickname: "me", gender: "MALE", nationalGrade: "D" },
          { userId: 2, nickname: "u2", gender: "MALE", nationalGrade: "D" },
        ],
        teamB: [
          { userId: 3, nickname: "u3", gender: "MALE", nationalGrade: "D" },
          { userId: 4, nickname: "u4", gender: "MALE", nationalGrade: "D" },
        ],
      },
    ]);
    authMocks.fetchMemberStats.mockResolvedValue([]);
    authMocks.submitScore.mockResolvedValue({});
  });

  it("keeps confirm disabled before team selection", async () => {
    render(<GroupDetailPage />);

    await waitFor(() => expect(screen.getByText("게임")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "입력대기" }));
    fireEvent.click(screen.getByRole("button", { name: "결과 입력" }));

    const confirmBtn = screen.getByRole("button", { name: "확인" });
    expect(confirmBtn).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "팀 A 승리" }));
    expect(confirmBtn).not.toBeDisabled();
  });
});
