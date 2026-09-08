import { useState } from "react";

import { TopNav, type NavKey } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { LoginPage } from "@/pages/LoginPage";
import { HomesPage } from "@/pages/HomesPage";
import { WorkStatusPage } from "@/pages/WorkStatusPage";
import { InspectionsPage } from "@/pages/InspectionsPage";
import { HelpAboutPage } from "@/pages/HelpAboutPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<NavKey>("home");

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex min-h-svh flex-col">
      <TopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={() => setIsAuthenticated(false)}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        {activeTab === "home" && <HomesPage />}
        {activeTab === "work-status" && <WorkStatusPage />}
        {activeTab === "inspections" && <InspectionsPage />}
        {activeTab === "help" && <HelpAboutPage />}
      </main>
      <Footer />
    </div>
  );
}

export default App;
