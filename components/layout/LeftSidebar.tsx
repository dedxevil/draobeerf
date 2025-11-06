import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FreeboardLogo, DashboardIcon, CommandCenterIcon, DataSourceIcon, SettingsIcon, ChevronLeftIcon, ChevronRightIcon, SunIcon, MoonIcon, FontIcon, InfoIcon } from './Icons';
import { useAppContext } from '../../context/AppContext';
import { APP_THEMES, APP_FONTS } from '../../constants';
import Tooltip from '../ui/Tooltip';
import HelpModal from '../features/HelpModal';

interface LeftSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  isMobile: boolean;
}

const navItems = [
  { to: '/dashboards', label: 'Dashboards', icon: DashboardIcon },
  { to: '/command-centers', label: 'Command Centers', icon: CommandCenterIcon },
  { to: '/data-sources', label: 'Data Sources', icon: DataSourceIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

const LeftSidebar: React.FC<LeftSidebarProps> = ({ isCollapsed, setIsCollapsed, isMobile }) => {
  const { settings, toggleTheme, toggleFont } = useAppContext();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const currentTheme = APP_THEMES.find(t => t.id === settings.theme) || APP_THEMES[0];
  const currentFont = APP_FONTS.find(f => f.id === settings.font) || APP_FONTS[0];
  const isDarkBased = currentTheme.base === 'dark';

  const handleNavClick = () => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  };

  const desktopClasses = isCollapsed ? 'w-16' : 'w-64';
  const mobileClasses = `w-64 transform ${isCollapsed ? '-translate-x-full' : 'translate-x-0'}`;

  return (
    <>
      <aside
        className={`bg-surface h-full z-20 transition-all duration-300 ease-in-out ${
          isMobile ? `fixed top-0 left-0 ${mobileClasses}` : `${desktopClasses} flex-shrink-0`
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center h-16 border-b border-secondary/20 px-4 flex-shrink-0">
            <FreeboardLogo className="w-8 h-8 text-primary flex-shrink-0" />
            {!isCollapsed && <span className="ml-2 font-bold text-lg text-text-primary">Freeboard</span>}
          </div>

          <nav className="flex-grow py-4">
            <ul>
              {navItems.map((item) => {
                const navLink = (
                   <NavLink
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center h-12 my-1 mx-2 px-3 rounded-lg transition-colors duration-200 ${
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'text-text-secondary hover:bg-secondary/20 hover:text-text-primary'
                      } ${isCollapsed && !isMobile ? 'justify-center' : ''}`
                    }
                  >
                    <item.icon className="w-6 h-6 flex-shrink-0" />
                    {(!isCollapsed || !isMobile) && <span className="ml-4 font-medium">{!isCollapsed && item.label}</span>}
                  </NavLink>
                );

                return (
                  <li key={item.to}>
                    {isCollapsed && !isMobile ? (
                      <Tooltip text={item.label} position="right">{navLink}</Tooltip>
                    ) : (
                      navLink
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-2 border-t border-secondary/20 flex-shrink-0">
            <Tooltip text="Toggle Font" position="right">
              <button
                onClick={toggleFont}
                className={`flex items-center w-full h-12 my-1 px-3 rounded-lg transition-colors duration-200 text-text-secondary hover:bg-secondary/20 hover:text-text-primary ${isCollapsed ? 'justify-center': ''}`}
                aria-label="Toggle font"
              >
                <FontIcon className="w-6 h-6 flex-shrink-0" />
                {!isCollapsed && <span className="ml-4 font-medium w-32 text-left truncate">{currentFont.name}</span>}
              </button>
            </Tooltip>
            <Tooltip text="Toggle Theme" position="right">
              <button
                onClick={toggleTheme}
                className={`flex items-center w-full h-12 my-1 px-3 rounded-lg transition-colors duration-200 text-text-secondary hover:bg-secondary/20 hover:text-text-primary ${isCollapsed ? 'justify-center': ''}`}
                aria-label="Toggle theme"
              >
                {isDarkBased ? <SunIcon className="w-6 h-6 flex-shrink-0" /> : <MoonIcon className="w-6 h-6 flex-shrink-0" />}
                {!isCollapsed && <span className="ml-4 font-medium w-32 text-left truncate">{currentTheme.name}</span>}
              </button>
            </Tooltip>
            <Tooltip text="Help & About" position="right">
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className={`flex items-center w-full h-12 my-1 px-3 rounded-lg transition-colors duration-200 text-text-secondary hover:bg-secondary/20 hover:text-text-primary ${isCollapsed ? 'justify-center': ''}`}
                aria-label="Open help manual"
              >
                <InfoIcon className="w-6 h-6 flex-shrink-0" />
                {!isCollapsed && <span className="ml-4 font-medium w-32 text-left truncate">Help</span>}
              </button>
            </Tooltip>
            {!isMobile && (
              <Tooltip text={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} position="right">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={`flex items-center w-full h-12 my-1 px-3 rounded-lg transition-colors duration-200 text-text-secondary hover:bg-secondary/20 hover:text-text-primary ${isCollapsed ? 'justify-center' : ''}`}
                  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isCollapsed ? <ChevronRightIcon className="w-6 h-6 flex-shrink-0" /> : <ChevronLeftIcon className="w-6 h-6 flex-shrink-0" />}
                  {!isCollapsed && <span className="ml-4 font-medium w-32 text-left truncate">Collapse</span>}
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
    </>
  );
};

export default LeftSidebar;
