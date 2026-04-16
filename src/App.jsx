import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";

const GatePage = lazy(() =>
  import("./pages/GatePage.jsx").then((m) => ({ default: m.GatePage }))
);
const AdminPage = lazy(() =>
  import("./pages/AdminPage.jsx").then((m) => ({ default: m.AdminPage }))
);
const AppHomePage = lazy(() =>
  import("./pages/AppHomePage.jsx").then((m) => ({ default: m.AppHomePage }))
);
const CampaignPage = lazy(() =>
  import("./pages/CampaignPage.jsx").then((m) => ({ default: m.CampaignPage }))
);
const CreatePage = lazy(() =>
  import("./pages/CreatePage.jsx").then((m) => ({ default: m.CreatePage }))
);
const DirectoryActivePage = lazy(() =>
  import("./pages/DirectoryActivePage.jsx").then((m) => ({
    default: m.DirectoryActivePage,
  }))
);
const DirectoryPastPage = lazy(() =>
  import("./pages/DirectoryPastPage.jsx").then((m) => ({
    default: m.DirectoryPastPage,
  }))
);
const MyCampaignsPage = lazy(() =>
  import("./pages/MyCampaignsPage.jsx").then((m) => ({
    default: m.MyCampaignsPage,
  }))
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage.jsx").then((m) => ({ default: m.ProfilePage }))
);

function RouteFallback() {
  return (
    <div className="cc-route-fallback">
      <p className="lead">Loading…</p>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<GatePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route element={<Layout />}>
          <Route path="/app" element={<AppHomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/campaign/:id" element={<CampaignPage />} />
          <Route path="/my-campaigns" element={<MyCampaignsPage />} />
          <Route path="/campaigns/active" element={<DirectoryActivePage />} />
          <Route path="/campaigns/past" element={<DirectoryPastPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
