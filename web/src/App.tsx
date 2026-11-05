import { useState } from "react";

import { TopNav, type NavKey } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { LoginPage } from "@/pages/LoginPage";
import { HomesPage } from "@/pages/HomesPage";
import { WorkStatusPage } from "@/pages/WorkStatusPage";
import { InspectionsPage } from "@/pages/InspectionsPage";
import { HelpAboutPage } from "@/pages/HelpAboutPage";
import { getStoredUser } from "@/lib/api";
import type { User } from "@/types/user";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [activeTab, setActiveTab] = useState<NavKey>("home");

  function handleLogin(user: User) {
    setCurrentUser(user);
    localStorage.setItem("homecare_user", JSON.stringify(user));
  }

  function handleLogout() {
    localStorage.removeItem("homecare_user");
    setCurrentUser(null);
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-svh flex-col">
      <TopNav
        user={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        {activeTab === "home" && <HomesPage />}
        {activeTab === "work-status" && <WorkStatusPage />}
        {activeTab === "inspections" && <InspectionsPage />}
        {activeTab === "help" && <HelpAboutPage user={currentUser} />}
      </main>
      <Footer user={currentUser} />
    </div>
  );
}

export default App;
