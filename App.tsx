import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LeftSidebar from './components/layout/LeftSidebar';
import RightSidebar from './components/layout/RightSidebar';
import Header from './components/layout/Header';
import DashboardPage from './components/pages/DashboardPage';
import CommandCenterPage from './components/pages/CommandCenterPage';
import CommandCenterPresentView from './components/pages/CommandCenterView';
import DataSourcesPage from './components/pages/DataSourcesPage';
import SettingsPage from './components/pages/SettingsPage';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ui/Toast';
import { requestNotificationPermission } from './services/notificationService';
import { useWindowSize } from './hooks/useWindowSize';
import { APP_FONTS } from './constants';

const MOBILE_BREAKPOINT = 1024; // Tailwind's 'lg' breakpoint

const MainAppLayout: React.FC = () => {
  const { width } = useWindowSize();
  const isMobile = width < MOBILE_BREAKPOINT;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(true);
      setIsRightSidebarOpen(false);
    } else {
      setIsSidebarCollapsed(false);
      setIsRightSidebarOpen(true);
    }
  }, [isMobile]);
  
  const showBackdrop = isMobile && (!isSidebarCollapsed || isRightSidebarOpen);

  return (
    <div className="flex h-screen bg-background text-text-primary overflow-hidden">
      {showBackdrop && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => {
            setIsSidebarCollapsed(true);
            setIsRightSidebarOpen(false);
          }}
        ></div>
      )}

      <LeftSidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
        isMobile={isMobile} 
      />
      <div 
        className="flex flex-col flex-grow transition-all duration-300 min-w-0"
      >
        <Header 
          isMobile={isMobile}
          toggleLeftSidebar={() => setIsSidebarCollapsed(c => !c)}
        />
        <main className="flex-grow p-4 md:p-6 overflow-auto freeboard-scrollbar">
          <Outlet />
        </main>
      </div>
      <RightSidebar 
        isOpen={isRightSidebarOpen} 
        setIsOpen={setIsRightSidebarOpen}
        isMobile={isMobile}
      />
    </div>
  );
}

const ThemedApp: React.FC = () => {
  const { settings } = useAppContext();
  
  useEffect(() => {
    const root = document.documentElement;
    root.className = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    const root = document.documentElement;
    const selectedFont = APP_FONTS.find(f => f.id === settings.font) || APP_FONTS[0];
    root.style.setProperty('--font-sans', selectedFont.family);
  }, [settings.font]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission();
    }
  }, []);

  return (
    <Routes>
      <Route element={<MainAppLayout />}>
        <Route path="/" element={<Navigate to="/dashboards" />} />
        <Route path="/dashboards" element={<DashboardPage />} />
        <Route path="/command-centers" element={<CommandCenterPage />} />
        <Route path="/data-sources" element={<DataSourcesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/command-centers/:id/present" element={<CommandCenterPresentView />} />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <ThemedApp />
        </HashRouter>
        <ToastContainer />
      </ToastProvider>
    </AppProvider>
  );
};

export default App;