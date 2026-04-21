import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import HomePage from "@/app/page";
import OnboardingPage from "@/app/onboarding/page";
import NotificationsPage from "@/app/notifications/page";
import RankingPage from "@/app/ranking/page";
import MyPage from "@/app/my/page";
import MyRecordPage from "@/app/my-record/page";
import MyRecordMonthlyPage from "@/app/my-record/monthly/page";
import MyRecordRecentGamesPage from "@/app/my-record/recent-games/page";
import MyRecordBestPartnersPage from "@/app/my-record/best-partners/page";
import MyRecordWorstPartnersPage from "@/app/my-record/worst-partners/page";
import MyRecordWorstOpponentsPage from "@/app/my-record/worst-opponents/page";
import SettingsPage from "@/app/settings/page";
import SettingsNotificationsPage from "@/app/settings/notifications/page";
import GroupsPage from "@/app/groups/page";
import GroupListPage from "@/app/groups/list/page";
import GroupCreatePage from "@/app/groups/create/page";
import GroupJoinPage from "@/app/groups/join/[token]/page";
import GroupDetailPage from "@/app/groups/[groupId]/page";
import GroupEditPage from "@/app/groups/[groupId]/edit/page";
import GroupInviteHistoryPage from "@/app/groups/[groupId]/invite-history/page";
import GroupNewGamePage from "@/app/groups/[groupId]/games/new/page";
import GroupTeamRecordPage from "@/app/groups/[groupId]/teams/[teamKey]/page";
import TeamRecordPage from "@/app/teams/[teamKey]/record/page";
import UserRecordPage from "@/app/users/[userId]/record/page";
import UserWithMeRecordPage from "@/app/users/[userId]/record/with-me/page";
import AuthCallbackPage from "@/app/auth/callback/page";
import AuthLoginPage from "@/app/auth/login/page";
import AuthRegisterPage from "@/app/auth/register/page";

export function ViteRouterApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/my-record" element={<MyRecordPage />} />
        <Route path="/my-record/monthly" element={<MyRecordMonthlyPage />} />
        <Route path="/my-record/recent-games" element={<MyRecordRecentGamesPage />} />
        <Route path="/my-record/best-partners" element={<MyRecordBestPartnersPage />} />
        <Route path="/my-record/worst-partners" element={<MyRecordWorstPartnersPage />} />
        <Route path="/my-record/worst-opponents" element={<MyRecordWorstOpponentsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/notifications" element={<SettingsNotificationsPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/list" element={<GroupListPage />} />
        <Route path="/groups/create" element={<GroupCreatePage />} />
        <Route path="/groups/join/:token" element={<GroupJoinPage />} />
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
        <Route path="/groups/:groupId/edit" element={<GroupEditPage />} />
        <Route path="/groups/:groupId/invite-history" element={<GroupInviteHistoryPage />} />
        <Route path="/groups/:groupId/games/new" element={<GroupNewGamePage />} />
        <Route path="/groups/:groupId/teams/:teamKey" element={<GroupTeamRecordPage />} />
        <Route path="/teams/:teamKey/record" element={<TeamRecordPage />} />
        <Route path="/users/:userId/record" element={<UserRecordPage />} />
        <Route path="/users/:userId/record/with-me" element={<UserWithMeRecordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/login" element={<AuthLoginPage />} />
        <Route path="/auth/register" element={<AuthRegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
