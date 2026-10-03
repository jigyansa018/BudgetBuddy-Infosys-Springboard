import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../component/Sidebar/Sidebar";
import "./Layout.css";

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleToggleCollapse = () => {
    setIsCollapsed((previous) => !previous);
  };

  const handleOpenMobile = () => {
    setIsMobileOpen(true);
  };

  const handleCloseMobile = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="bb-layout">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={handleCloseMobile}
      />

      <main
        className={`bb-main ${
          isCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        <button
          type="button"
          className="bb-mobile-menu-btn"
          onClick={handleOpenMobile}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <Outlet />
      </main>
    </div>
  );
}