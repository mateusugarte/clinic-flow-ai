import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { PageLoading } from "@/components/ui/page-loading";

export function AppLayout() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background relative">
      <PageLoading isLoading={isLoading} />
      
      <AppSidebar />
      {/* Sidebar is 56px collapsed */}
      <main className="lg:ml-14 pt-14 lg:pt-0 pb-16 lg:pb-0 min-h-screen relative z-10">
        <div className="p-3 lg:p-4 h-[calc(100vh-3.5rem)] lg:h-screen overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
