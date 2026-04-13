import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { AppHomePage } from "./pages/AppHomePage.jsx";
import { CampaignPage } from "./pages/CampaignPage.jsx";
import { CreatePage } from "./pages/CreatePage.jsx";
import { DirectoryActivePage } from "./pages/DirectoryActivePage.jsx";
import { DirectoryPastPage } from "./pages/DirectoryPastPage.jsx";
import { GatePage } from "./pages/GatePage.jsx";
import { MyCampaignsPage } from "./pages/MyCampaignsPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GatePage />} />
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
  );
}
