
import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DataSource, ChartConfig, Dashboard, CommandCenter, AppSettings, Alert, TriggeredAlert, AppState, Insight, ThemeColors } from '../types';
import { LOCAL_STORAGE_KEY, APP_THEMES, APP_FONTS } from '../constants';

// The part of the state that is persisted to local storage
type PersistedState = Omit<AppState, 'triggeredAlerts' | 'lastTriggeredAlertTimestamp' | 'isCommandCenterEditMode'>;

interface AppContextType extends AppState {
  addDataSource: (dataSource: DataSource) => void;
  updateDataSource: (dataSource: DataSource) => void;
  deleteDataSource: (id: string) => void;
  addChart: (chart: ChartConfig) => void;
  updateChart: (chart: ChartConfig) => void;
  deleteChart: (id: string) => void;
  toggleTheme: () => void;
  setTheme: (themeId: string) => void;
  updateThemeColors: (themeId: string, colors: Partial<ThemeColors>) => void;
  resetThemeColors: (themeId: string) => void;
  toggleFont: () => void;
  setFont: (fontId: string) => void;
  importWorkspace: (newState: Partial<PersistedState>) => void;
  addDashboard: (name: string) => void;
  updateDashboard: (dashboard: Dashboard) => void;
  deleteDashboard: (id: string) => void;
  setActiveDashboard: (id: string) => void;
  addCommandCenter: (name: string, chartIds: string[]) => CommandCenter;
  updateCommandCenter: (cc: CommandCenter) => void;
  deleteCommandCenter: (id: string) => void;
  setActiveCommandCenter: (id?: string) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (alert: Alert) => void;
  deleteAlert: (id: string) => void;
  addTriggeredAlert: (triggeredAlert: TriggeredAlert) => void;
  clearTriggeredAlerts: () => void;
  addInsight: (insight: Insight) => void;
  recordChartRefresh: (chartId: string, newData: any[]) => void;
  setCommandCenterEditMode: (isEditMode: boolean) => void;
  toggleAIFeatures: () => void;
  updateGeminiApiKey: (key: string) => void;
  resetWorkspace: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultDashboardId = 'default';
const defaultState: PersistedState = {
  dataSources: [],
  charts: [],
  dashboards: [{ id: defaultDashboardId, name: 'My Dashboard', layout: {} }],
  commandCenters: [],
  settings: {
    theme: APP_THEMES[0].id,
    font: APP_FONTS[0].id,
    activeDashboardId: defaultDashboardId,
    aiFeaturesEnabled: true,
    geminiApiKey: '',
    customColors: {},
  },
  alerts: [],
  insights: [],
};

/**
 * Generates a dynamic grid layout to fit all given chart IDs onto a single screen.
 */
const generateLayoutForCharts = (
  chartIds: string[]
): CommandCenter['layout'] => {
  const totalCharts = chartIds.length;
  if (totalCharts === 0) return {};

  // Determine grid dimensions to be as square as possible
  const cols = Math.ceil(Math.sqrt(totalCharts));
  const rows = Math.ceil(totalCharts / cols);

  const GAP_PERCENT = 1; // Gap between charts
  
  // Calculate width and height based on grid dimensions and gap
  const chartWidth = (100 - (cols + 1) * GAP_PERCENT) / cols;
  const chartHeight = (100 - (rows + 1) * GAP_PERCENT) / rows;
  
  const layout: CommandCenter['layout'] = {};
  let chartIndex = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (chartIndex < totalCharts) {
        const chartId = chartIds[chartIndex];
        layout[chartId] = {
          x: GAP_PERCENT + c * (chartWidth + GAP_PERCENT),
          y: GAP_PERCENT + r * (chartHeight + GAP_PERCENT),
          w: Math.max(10, chartWidth), // Ensure a minimum width
          h: Math.max(10, chartHeight), // Ensure a minimum height
        };
        chartIndex++;
      }
    }
  }
  return layout;
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [persistedState, setPersistedState] = useLocalStorage<PersistedState>(LOCAL_STORAGE_KEY, defaultState);
  const [transientState, setTransientState] = useState<{
    triggeredAlerts: TriggeredAlert[];
    lastTriggeredAlertTimestamp: string | null;
    isCommandCenterEditMode: boolean;
  }>({
    triggeredAlerts: [],
    lastTriggeredAlertTimestamp: null,
    isCommandCenterEditMode: false,
  });


  const addDataSource = useCallback((dataSource: DataSource) => {
    setPersistedState(prev => ({ ...prev, dataSources: [...prev.dataSources, dataSource] }));
  }, [setPersistedState]);

  const updateDataSource = useCallback((updatedDataSource: DataSource) => {
    setPersistedState(prev => ({
      ...prev,
      dataSources: prev.dataSources.map(ds => ds.id === updatedDataSource.id ? updatedDataSource : ds)
    }));
  }, [setPersistedState]);

  // FIX: Implement proper cascading delete for data sources. When a data source is
  // deleted, all associated charts, alerts, insights, and command center entries
  // must also be removed to prevent data inconsistency and application errors.
  const deleteDataSource = useCallback((id: string) => {
    setPersistedState(prev => {
      // Find IDs of charts associated with the data source being deleted
      const chartIdsToDelete = new Set(prev.charts.filter(c => c.dataSourceId === id).map(c => c.id));

      // Filter out the data source
      const dataSourcesToKeep = prev.dataSources.filter(ds => ds.id !== id);
      
      // If no charts are affected, we're done
      if (chartIdsToDelete.size === 0) {
        return { ...prev, dataSources: dataSourcesToKeep };
      }

      // Filter out associated charts, alerts, and insights
      const chartsToKeep = prev.charts.filter(c => c.dataSourceId !== id);
      const alertsToKeep = prev.alerts.filter(a => !chartIdsToDelete.has(a.chartId));
      const insightsToKeep = prev.insights.filter(i => !chartIdsToDelete.has(i.chartId));

      // Remove the deleted charts from any command centers
      const commandCentersToKeep = prev.commandCenters.map(cc => {
        const newChartIds = cc.chartIds.filter(chartId => !chartIdsToDelete.has(chartId));
        if (newChartIds.length === cc.chartIds.length) return cc;
        
        const newLayout = { ...cc.layout };
        // FIX: Iterate directly over the Set, as forEach with an explicit type is more robust
        // than other iteration methods that might cause incorrect type inference.
        chartIdsToDelete.forEach((chartId: string) => {
          delete newLayout[chartId];
        });
        
        return { ...cc, chartIds: newChartIds, layout: newLayout };
      });

      return {
        ...prev,
        dataSources: dataSourcesToKeep,
        charts: chartsToKeep,
        alerts: alertsToKeep,
        insights: insightsToKeep,
        commandCenters: commandCentersToKeep,
      };
    });
  }, [setPersistedState]);

  const addChart = useCallback((chart: ChartConfig) => {
    setPersistedState(prev => ({ ...prev, charts: [...prev.charts, chart] }));
  }, [setPersistedState]);

  const updateChart = useCallback((updatedChart: ChartConfig) => {
    setPersistedState(prev => ({
      ...prev,
      charts: prev.charts.map(c => c.id === updatedChart.id ? updatedChart : c)
    }));
  }, [setPersistedState]);

  const deleteChart = useCallback((id: string) => {
    setPersistedState(prev => ({
      ...prev,
      charts: prev.charts.filter(c => c.id !== id),
      alerts: prev.alerts.filter(a => a.chartId !== id),
      insights: prev.insights.filter(i => i.chartId !== id),
      commandCenters: prev.commandCenters.map(cc => {
        const newLayout = { ...cc.layout };
        delete newLayout[id];
        return {
          ...cc,
          chartIds: cc.chartIds.filter(chartId => chartId !== id),
          layout: newLayout,
        };
      }),
    }));
  }, [setPersistedState]);
  
  const toggleTheme = useCallback(() => {
    setPersistedState(prev => {
      const currentThemeIndex = APP_THEMES.findIndex(t => t.id === prev.settings.theme);
      const nextThemeIndex = (currentThemeIndex + 1) % APP_THEMES.length;
      const nextTheme = APP_THEMES[nextThemeIndex];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          theme: nextTheme.id,
        }
      };
    });
  }, [setPersistedState]);

  const setTheme = useCallback((themeId: string) => {
    setPersistedState(prev => {
        const themeExists = APP_THEMES.some(t => t.id === themeId);
        if (!themeExists) return prev; // Safety check
        return {
            ...prev,
            settings: {
                ...prev.settings,
                theme: themeId,
            }
        };
    });
  }, [setPersistedState]);

  const updateThemeColors = useCallback((themeId: string, colors: Partial<ThemeColors>) => {
    setPersistedState(prev => ({
        ...prev,
        settings: {
            ...prev.settings,
            customColors: {
                ...(prev.settings.customColors || {}),
                [themeId]: colors,
            }
        }
    }));
  }, [setPersistedState]);

  const resetThemeColors = useCallback((themeId: string) => {
    setPersistedState(prev => {
        const newCustomColors = { ...(prev.settings.customColors || {}) };
        delete newCustomColors[themeId];
        return {
            ...prev,
            settings: {
                ...prev.settings,
                customColors: newCustomColors,
            }
        };
    });
  }, [setPersistedState]);

  const toggleFont = useCallback(() => {
    setPersistedState(prev => {
      const currentFontIndex = APP_FONTS.findIndex(f => f.id === prev.settings.font);
      const nextFontIndex = (currentFontIndex + 1) % APP_FONTS.length;
      const nextFont = APP_FONTS[nextFontIndex];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          font: nextFont.id,
        }
      };
    });
  }, [setPersistedState]);

  const setFont = useCallback((fontId: string) => {
    setPersistedState(prev => {
        const fontExists = APP_FONTS.some(f => f.id === fontId);
        if (!fontExists) return prev;
        return {
            ...prev,
            settings: {
                ...prev.settings,
                font: fontId,
            }
        };
    });
  }, [setPersistedState]);

  const setActiveDashboard = useCallback((id: string) => {
    setPersistedState(prev => ({
      ...prev,
      settings: { ...prev.settings, activeDashboardId: id }
    }));
  }, [setPersistedState]);

  const addDashboard = useCallback((name: string) => {
    const newDashboard: Dashboard = { id: crypto.randomUUID(), name, layout: {} };
    setPersistedState(prev => ({
      ...prev,
      dashboards: [...prev.dashboards, newDashboard],
      settings: { ...prev.settings, activeDashboardId: newDashboard.id }
    }));
  }, [setPersistedState]);

  const updateDashboard = useCallback((updatedDashboard: Dashboard) => {
    setPersistedState(prev => ({
      ...prev,
      dashboards: prev.dashboards.map(d => d.id === updatedDashboard.id ? updatedDashboard : d)
    }));
  }, [setPersistedState]);

  // FIX: Implement proper cascading delete for dashboards. When a dashboard is deleted,
  // charts on it might still be referenced in Command Centers. This ensures those
  // references are also cleaned up.
  const deleteDashboard = useCallback((id: string) => {
    setPersistedState(prev => {
      const remainingDashboards = prev.dashboards.filter(d => d.id !== id);
      if (remainingDashboards.length === 0) {
        alert("Cannot delete the last dashboard.");
        return prev;
      }
      
      const newActiveId = id === prev.settings.activeDashboardId 
        ? remainingDashboards[0].id
        : prev.settings.activeDashboardId;
        
      const chartsOnDeletedDashboard = new Set(prev.charts.filter(c => c.dashboardId === id).map(c => c.id));
      const chartsToKeep = prev.charts.filter(c => c.dashboardId !== id);
      const alertsToKeep = prev.alerts.filter(a => !chartsOnDeletedDashboard.has(a.chartId));
      const insightsToKeep = prev.insights.filter(i => !chartsOnDeletedDashboard.has(i.chartId));
      
      // Also remove charts from command centers
      const commandCentersToKeep = prev.commandCenters.map(cc => {
        const newChartIds = cc.chartIds.filter(chartId => !chartsOnDeletedDashboard.has(chartId));
        if (newChartIds.length === cc.chartIds.length) return cc;
        
        const newLayout = { ...cc.layout };
        // FIX: Iterate directly over the Set, as forEach with an explicit type is more robust
        // than other iteration methods that might cause incorrect type inference.
        chartsOnDeletedDashboard.forEach((chartId: string) => {
          delete newLayout[chartId];
        });

        return { ...cc, chartIds: newChartIds, layout: newLayout };
      });
        
      return {
        ...prev,
        dashboards: remainingDashboards,
        charts: chartsToKeep,
        alerts: alertsToKeep,
        insights: insightsToKeep,
        commandCenters: commandCentersToKeep,
        settings: { ...prev.settings, activeDashboardId: newActiveId },
      };
    });
  }, [setPersistedState]);

  const addCommandCenter = useCallback((name: string, chartIds: string[]) => {
    let newCC: CommandCenter | null = null;
    setPersistedState(prev => {
      newCC = { 
        id: crypto.randomUUID(), 
        name, 
        chartIds: chartIds,
        layout: generateLayoutForCharts(chartIds),
      };
      return {
        ...prev,
        commandCenters: [...prev.commandCenters, newCC],
        settings: { ...prev.settings, activeCommandCenterId: newCC.id }
      };
    });
    return newCC!;
  }, [setPersistedState]);

  const updateCommandCenter = useCallback((updatedCC: CommandCenter) => {
    setPersistedState(prev => {
      const oldCC = prev.commandCenters.find(cc => cc.id === updatedCC.id);
      if (!oldCC) return prev;

      const oldIdsSet = new Set(oldCC.chartIds);
      const newIdsSet = new Set(updatedCC.chartIds);
      
      const areIdsSame = (() => {
        if (oldIdsSet.size !== newIdsSet.size) return false;
        return Array.from(oldIdsSet).every((id: string) => newIdsSet.has(id));
      })();
      
      let finalLayout: CommandCenter['layout'];

      if (areIdsSame) {
        // If chart IDs haven't changed, this is a layout update (e.g., drag/resize).
        finalLayout = updatedCC.layout;
      } else {
        // Chart IDs have changed. Preserve existing layout as much as possible.
        finalLayout = { ...oldCC.layout };
  
        // Remove layouts for charts that were deleted.
        oldCC.chartIds.forEach(id => {
            if (!newIdsSet.has(id)) {
                delete finalLayout[id];
            }
        });
  
        // Add new charts with a default layout at the top-left.
        // This prevents resetting the entire grid when adding a chart.
        const newChartIds = updatedCC.chartIds.filter(id => !oldIdsSet.has(id));
        newChartIds.forEach(newId => {
            finalLayout[newId] = { x: 0, y: 0, w: 33, h: 50 }; // A sensible default.
        });
      }

      const finalCC = { ...updatedCC, layout: finalLayout };

      return {
        ...prev,
        commandCenters: prev.commandCenters.map(cc => cc.id === finalCC.id ? finalCC : cc)
      };
    });
  }, [setPersistedState]);

  const deleteCommandCenter = useCallback((id: string) => {
    setPersistedState(prev => {
      const remainingCCs = prev.commandCenters.filter(cc => cc.id !== id);
      const newActiveId = id === prev.settings.activeCommandCenterId
        ? (remainingCCs[0]?.id || undefined)
        : prev.settings.activeCommandCenterId;
      
      return {
        ...prev,
        commandCenters: remainingCCs,
        settings: { ...prev.settings, activeCommandCenterId: newActiveId },
      };
    });
  }, [setPersistedState]);

  const setActiveCommandCenter = useCallback((id?: string) => {
    setPersistedState(prev => ({
      ...prev,
      settings: { ...prev.settings, activeCommandCenterId: id }
    }));
  }, [setPersistedState]);
  
  const addAlert = useCallback((alert: Alert) => {
    setPersistedState(prev => ({ ...prev, alerts: [...prev.alerts, alert] }));
  }, [setPersistedState]);

  const updateAlert = useCallback((updatedAlert: Alert) => {
    setPersistedState(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => a.id === updatedAlert.id ? updatedAlert : a)
    }));
  }, [setPersistedState]);

  const deleteAlert = useCallback((id: string) => {
    setPersistedState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== id)
    }));
  }, [setPersistedState]);

  const addTriggeredAlert = useCallback((triggeredAlert: TriggeredAlert) => {
    setTransientState(prev => ({
      ...prev,
      triggeredAlerts: [triggeredAlert, ...prev.triggeredAlerts].slice(0, 50),
      lastTriggeredAlertTimestamp: new Date().toISOString(),
    }));
  }, []);
  
  const clearTriggeredAlerts = useCallback(() => {
    setTransientState(prev => ({
      ...prev,
      triggeredAlerts: [],
      lastTriggeredAlertTimestamp: null
    }));
  }, []);
  
  const addInsight = useCallback((insight: Insight) => {
      setPersistedState(prev => ({
          ...prev,
          insights: [insight, ...prev.insights].slice(0, 100) // Keep last 100 insights
      }));
  }, [setPersistedState]);
  
  const recordChartRefresh = useCallback((chartId: string, newData: any[]) => {
      setPersistedState(prev => {
          const newCharts = prev.charts.map(c => {
              if (c.id === chartId) {
                  const newHistoryEntry = { timestamp: new Date().toISOString(), data: newData };
                  const oldHistory = c.dataHistory || [];
                  // Keep the last 20 data points for trend analysis
                  const newHistory = [newHistoryEntry, ...oldHistory].slice(0, 20);
                  return {
                      ...c,
                      lastRefreshed: newHistoryEntry.timestamp,
                      dataHistory: newHistory,
                  };
              }
              return c;
          });
          return { ...prev, charts: newCharts };
      });
  }, [setPersistedState]);

  const setCommandCenterEditMode = useCallback((isEditMode: boolean) => {
    setTransientState(prev => ({ ...prev, isCommandCenterEditMode: isEditMode }));
  }, []);

  const toggleAIFeatures = useCallback(() => {
    setPersistedState(prev => ({
        ...prev,
        settings: {
            ...prev.settings,
            aiFeaturesEnabled: !prev.settings.aiFeaturesEnabled,
        }
    }));
  }, [setPersistedState]);

  const updateGeminiApiKey = useCallback((key: string) => {
    setPersistedState(prev => ({
        ...prev,
        settings: {
            ...prev.settings,
            geminiApiKey: key,
        }
    }));
  }, [setPersistedState]);

  const importWorkspace = useCallback((newState: Partial<PersistedState>) => {
    const finalDashboards = (newState.dashboards && newState.dashboards.length > 0)
      ? newState.dashboards
      : [{ id: defaultDashboardId, name: 'My Dashboard', layout: {} }];

    const validActiveDashboardId = (newState.settings && finalDashboards.some(d => d.id === newState.settings.activeDashboardId))
      ? newState.settings.activeDashboardId
      : finalDashboards[0].id;
    
    const importedState: PersistedState = {
      dataSources: newState.dataSources || [],
      charts: newState.charts || [],
      dashboards: finalDashboards,
      commandCenters: newState.commandCenters || [],
      alerts: newState.alerts || [],
      insights: newState.insights || [],
      settings: {
        theme: newState.settings?.theme || APP_THEMES[0].id,
        font: newState.settings?.font || APP_FONTS[0].id,
        activeDashboardId: validActiveDashboardId,
        activeCommandCenterId: newState.settings?.activeCommandCenterId,
        aiFeaturesEnabled: newState.settings?.aiFeaturesEnabled ?? true,
        geminiApiKey: newState.settings?.geminiApiKey || '',
        customColors: newState.settings?.customColors || {},
      },
    };
    setPersistedState(importedState);
    setTransientState({
      triggeredAlerts: [],
      lastTriggeredAlertTimestamp: null,
      isCommandCenterEditMode: false,
    });
  }, [setPersistedState]);

  const resetWorkspace = useCallback(() => {
    setPersistedState(defaultState);
    setTransientState({
      triggeredAlerts: [],
      lastTriggeredAlertTimestamp: null,
      isCommandCenterEditMode: false,
    });
  }, [setPersistedState]);

  const value: AppContextType = {
    ...persistedState,
    ...transientState,
    addDataSource,
    updateDataSource,
    deleteDataSource,
    addChart,
    updateChart,
    deleteChart,
    toggleTheme,
    setTheme,
    updateThemeColors,
    resetThemeColors,
    toggleFont,
    setFont,
    importWorkspace,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    setActiveDashboard,
    addCommandCenter,
    updateCommandCenter,
    deleteCommandCenter,
    setActiveCommandCenter,
    addAlert,
    updateAlert,
    deleteAlert,
    addTriggeredAlert,
    clearTriggeredAlerts,
    addInsight,
    recordChartRefresh,
    setCommandCenterEditMode,
    toggleAIFeatures,
    updateGeminiApiKey,
    resetWorkspace,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
