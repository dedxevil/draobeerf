import React from 'react';
import { useLocation } from 'react-router-dom';
import { MenuIcon } from './Icons';
import Tooltip from '../ui/Tooltip';
import { DashboardHeaderActions } from '../features/DashboardHeaderActions';
import { CommandCenterHeaderActions } from '../features/CommandCenterHeaderActions';
import GlobalSearch from '../features/GlobalSearch';

interface HeaderProps {
    isMobile: boolean;
    toggleLeftSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ isMobile, toggleLeftSidebar }) => {
    const location = useLocation();
    const isDashboardPage = location.pathname.startsWith('/dashboards');

    const renderContent = () => {
        if (location.pathname.startsWith('/dashboards')) {
            return <DashboardHeaderActions isMobile={isMobile} />;
        }
        if (location.pathname.startsWith('/command-centers')) {
            return <CommandCenterHeaderActions isMobile={isMobile} />;
        }

        // Generic header for other pages
        const title = location.pathname.startsWith('/data-sources') ? "Data Sources"
                    : location.pathname.startsWith('/settings') ? "Settings"
                    : "Freeboard";
        
        return (
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
            </div>
        );
    };

    return (
        <header className="h-16 bg-surface flex-shrink-0 border-b border-secondary/20 flex items-center px-4 md:px-6 gap-4">
            {isMobile && (
                <Tooltip text="Open navigation" position="bottom">
                    <button onClick={toggleLeftSidebar} className="p-2 text-text-secondary hover:text-text-primary">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                </Tooltip>
            )}
            <div className="flex-grow min-w-0">{renderContent()}</div>
            {isDashboardPage && (
                <div className="flex-shrink-0">
                    <GlobalSearch />
                </div>
            )}
        </header>
    );
};

export default Header;