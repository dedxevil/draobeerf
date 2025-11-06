import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIIcon, AlertIcon, ChevronRightIcon } from './Icons';
import AIAssistant from '../features/AIAssistant';
import { useAppContext } from '../../context/AppContext';
import { TriggeredAlert } from '../../types';
import Tooltip from '../ui/Tooltip';

interface RightSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isMobile: boolean;
}

type ActiveTab = 'assistant' | 'alerts';

const RightSidebar: React.FC<RightSidebarProps> = ({ isOpen, setIsOpen, isMobile }) => {
  const { triggeredAlerts, clearTriggeredAlerts, lastTriggeredAlertTimestamp, setActiveDashboard, insights, charts, settings } = useAppContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>(settings.aiFeaturesEnabled ? 'assistant' : 'alerts');
  const navigate = useNavigate();

  useEffect(() => {
    // If AI features are disabled and the current tab is assistant, switch to alerts.
    if (!settings.aiFeaturesEnabled && activeTab === 'assistant') {
        setActiveTab('alerts');
    }
  }, [settings.aiFeaturesEnabled, activeTab]);

  useEffect(() => {
    // When a new alert is triggered, automatically open the sidebar and switch to the alerts tab.
    if (lastTriggeredAlertTimestamp) {
      setActiveTab('alerts');
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  }, [lastTriggeredAlertTimestamp, isOpen, setIsOpen]);

  // Group alerts by chartId for a cleaner display
  const groupedAlerts = triggeredAlerts.reduce((acc, alert) => {
    acc[alert.chartId] = [...(acc[alert.chartId] || []), alert];
    return acc;
  }, {} as Record<string, TriggeredAlert[]>);


  const handleGoToChart = (dashboardId: string) => {
    setActiveDashboard(dashboardId);
    navigate('/dashboards');
    setIsOpen(false);
  };
  
  const handleIconClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const desktopClasses = isOpen ? 'w-80' : 'w-16';
  const mobileClasses = `w-80 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`;

  const TabButton: React.FC<{tab: ActiveTab, icon: React.ReactNode, label: string, badgeCount?: number}> = ({tab, icon, label, badgeCount}) => (
      <button
        onClick={() => setActiveTab(tab)}
        className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
          activeTab === tab ? 'text-primary border-b-2 border-primary bg-secondary/20' : 'text-text-secondary hover:bg-secondary/20'
        }`}
      >
        {icon}
        {label}
        {badgeCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{badgeCount}</span>}
      </button>
  );

  const ExpandedContent = () => (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex-shrink-0 border-b border-secondary/20 flex justify-between items-center">
        <div className="flex flex-grow">
            {settings.aiFeaturesEnabled && <TabButton tab="assistant" icon={<AIIcon className="w-5 h-5"/>} label="AI Assistant" />}
            <TabButton tab="alerts" icon={<AlertIcon className="w-5 h-5"/>} label="Alerts" badgeCount={triggeredAlerts.length} />
        </div>
        {!isMobile && (
          <Tooltip text="Collapse sidebar" position="left">
            <button onClick={() => setIsOpen(false)} className="p-2 text-text-secondary hover:text-text-primary mr-1">
                <ChevronRightIcon className="w-5 h-5" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="flex-grow min-h-0">
        {activeTab === 'assistant' && settings.aiFeaturesEnabled && <AIAssistant insights={insights} />}
        {activeTab === 'alerts' && (
          <div className="p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Triggered Alerts</h4>
              {triggeredAlerts.length > 0 && (
                <Tooltip text="Clear all triggered alerts">
                  <button onClick={clearTriggeredAlerts} className="text-sm text-accent hover:underline">Clear All</button>
                </Tooltip>
              )}
            </div>
            {triggeredAlerts.length === 0 ? (
              <div className="text-text-secondary text-center h-full flex items-center justify-center">
                <p>No new alerts.</p>
              </div>
            ) : (
              <ul className="space-y-4 overflow-y-auto flex-grow freeboard-scrollbar">
                {Object.entries(groupedAlerts).map(([chartId, chartAlerts]) => {
                    const chart = charts.find(c => c.id === chartId);
                    if (!chart) return null;
                    return (
                        <li key={chartId} className="bg-secondary/30 p-3 rounded-lg animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold text-sm text-text-primary break-words">{chart.name}</p>
                                <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{chartAlerts.length}</span>
                            </div>
                            <ul className="space-y-2 pl-2 border-l-2 border-secondary/50">
                                {chartAlerts.map(alert => (
                                    <li key={alert.id}>
                                        <p className="text-xs text-text-secondary break-words">{alert.message}</p>
                                        <p className="text-xs text-text-secondary/70 text-right mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-2 text-right">
                                <Tooltip text="Navigate to this chart's dashboard">
                                    <button onClick={() => handleGoToChart(chart.dashboardId)} className="text-xs bg-accent/80 hover:bg-accent text-white font-semibold py-1 px-2 rounded-md transition-colors">
                                        Go to Chart
                                    </button>
                                </Tooltip>
                            </div>
                        </li>
                    );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const CollapsedContent = () => (
    <div className="flex flex-col items-center pt-4 space-y-2">
      {settings.aiFeaturesEnabled && (
        <Tooltip text="AI Assistant" position="left">
            <button onClick={() => handleIconClick('assistant')} className="p-3 rounded-lg text-text-secondary hover:bg-secondary/20 hover:text-text-primary">
            <AIIcon className="w-6 h-6" />
            </button>
        </Tooltip>
      )}
      <Tooltip text="Alerts" position="left">
        <button onClick={() => handleIconClick('alerts')} className="p-3 rounded-lg text-text-secondary hover:bg-secondary/20 hover:text-text-primary relative">
          <AlertIcon className="w-6 h-6" />
          {triggeredAlerts.length > 0 && <span className="absolute top-1 right-1 block w-2 h-2 bg-red-500 rounded-full"></span>}
        </button>
      </Tooltip>
    </div>
  );

  return (
    <aside
      className={`bg-surface h-full z-20 transition-all duration-300 ease-in-out border-l border-secondary/20 flex flex-col ${
        isMobile ? `fixed top-0 right-0 ${mobileClasses}` : `${desktopClasses} flex-shrink-0`
      }`}
    >
      {isOpen ? <ExpandedContent /> : (isMobile ? null : <CollapsedContent />)}
    </aside>
  );
};

export default RightSidebar;