import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Dashboard, ChartConfig } from '../../types';
import { SearchIcon } from '../layout/Icons';

interface SearchResult {
    dashboards: Dashboard[];
    charts: (ChartConfig & { dashboardName: string })[];
}

const GlobalSearch: React.FC = () => {
    const { dashboards, charts, setActiveDashboard } = useAppContext();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult>({ dashboards: [], charts: [] });
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    
    const dashboardNameMap = new Map(dashboards.map(d => [d.id, d.name]));

    useEffect(() => {
        if (query.trim() === '') {
            setResults({ dashboards: [], charts: [] });
            setIsOpen(false);
            return;
        }

        const lowerCaseQuery = query.toLowerCase();

        const filteredDashboards = dashboards.filter(d =>
            d.name.toLowerCase().includes(lowerCaseQuery)
        );

        const filteredCharts = charts
            .filter(c => c.name.toLowerCase().includes(lowerCaseQuery))
            .map(c => ({
                ...c,
                dashboardName: dashboardNameMap.get(c.dashboardId) || 'Unknown Dashboard'
            }));
            
        setResults({ dashboards: filteredDashboards, charts: filteredCharts });
        setIsOpen(true);
    }, [query, dashboards, charts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDashboardClick = (dashboard: Dashboard) => {
        setActiveDashboard(dashboard.id);
        navigate('/dashboards');
        setQuery('');
        setIsOpen(false);
    };

    const handleChartClick = (chart: ChartConfig) => {
        setActiveDashboard(chart.dashboardId);
        navigate('/dashboards');
        setQuery('');
        setIsOpen(false);
    };

    const hasResults = results.dashboards.length > 0 || results.charts.length > 0;

    return (
        <div className="relative w-48 md:w-64" ref={searchRef}>
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                    type="text"
                    placeholder="Search dashboards, charts..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.trim() && setIsOpen(true)}
                    className="w-full bg-secondary text-text-primary rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Global search"
                />
            </div>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-surface rounded-md shadow-lg z-30 border border-secondary/50 max-h-96 overflow-y-auto freeboard-scrollbar">
                    {hasResults ? (
                        <ul>
                            {results.dashboards.length > 0 && (
                                <>
                                    <li className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase">Dashboards</li>
                                    {results.dashboards.map(dashboard => (
                                        <li key={dashboard.id}>
                                            <button onClick={() => handleDashboardClick(dashboard)} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-secondary/50 transition-colors">
                                                {dashboard.name}
                                            </button>
                                        </li>
                                    ))}
                                </>
                            )}
                            {results.charts.length > 0 && (
                                <>
                                    <li className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase border-t border-secondary/30 mt-1">Charts</li>
                                    {results.charts.map(chart => (
                                        <li key={chart.id}>
                                            <button onClick={() => handleChartClick(chart)} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-secondary/50 transition-colors">
                                                <div>{chart.name}</div>
                                                <div className="text-xs text-text-secondary">{chart.dashboardName}</div>
                                            </button>
                                        </li>
                                    ))}
                                </>
                            )}
                        </ul>
                    ) : (
                        <div className="p-4 text-sm text-text-secondary text-center">No results found for "{query}".</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;