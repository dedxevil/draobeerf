import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChartConfig, ChartType, AlertConditionOperator, ChartOptions } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { fetchData } from '../../services/postgrestService';
import { generateChartInsight } from '../../services/geminiService';
import { showNotification, playNotificationSound } from '../../services/notificationService';
import { PencilIcon, RefreshIcon, TrashIcon, ExportIcon, CopyIcon, BellIcon, ExpandIcon, SortIcon, SortUpIcon, SortDownIcon } from '../layout/Icons';
import AlertsManagerModal from './AlertsManagerModal';
import Modal from '../ui/Modal';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Label, ScatterChart, Scatter, ZAxis, AreaChart, Area, FunnelChart, Funnel, Treemap
} from 'recharts';
import { COLOR_SCHEMES } from '../../constants';
import * as htmlToImage from 'html-to-image';
import { formatNumber } from '../../utils/formatters';
import Tooltip from '../ui/Tooltip';

const getNestedValue = (obj: any, path: string): any => {
    if (!path || typeof path !== 'string') return undefined;
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
};

const useTimeAgo = (isoTimestamp: string | null) => {
  const [timeAgo, setTimeAgo] = useState('');

  const calculateTimeAgo = useCallback(() => {
    if (!isoTimestamp) {
        setTimeAgo('');
        return;
    }
    const date = new Date(isoTimestamp);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) {
      setTimeAgo('just now');
    } else if (minutes < 60) {
      setTimeAgo(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
    } else if (hours < 24) {
      setTimeAgo(`${hours} hour${hours > 1 ? 's' : ''} ago`);
    } else {
      setTimeAgo(`${days} day${days > 1 ? 's' : ''} ago`);
    }
  }, [isoTimestamp]);

  useEffect(() => {
    calculateTimeAgo();
    const intervalId = setInterval(calculateTimeAgo, 60000); // Update every minute
    return () => clearInterval(intervalId);
  }, [calculateTimeAgo]);

  return timeAgo;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isPie = !label && payload[0]?.payload?.cx;
      if (isPie) {
          const entry = payload[0];
          return (
             <div className="p-2 bg-surface border border-secondary/30 rounded-lg shadow-lg text-sm">
                <p className="flex items-center gap-2">
                    <span className="block w-2 h-2 rounded-full" style={{ backgroundColor: entry.payload.fill }}></span>
                    <span className="text-text-secondary">{entry.name}:</span>
                    <span className="font-semibold text-text-primary">{formatNumber(entry.value)}</span>
                </p>
            </div>
          )
      }
      return (
        <div className="p-2 bg-surface border border-secondary/30 rounded-lg shadow-lg text-sm">
          <p className="font-bold text-text-primary mb-1">{label}</p>
          <ul className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <li key={`item-${index}`} className="flex items-center gap-2">
                <span className="block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-text-secondary">{entry.name}:</span>
                <span className="font-semibold text-text-primary">{formatNumber(entry.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

const ScatterTooltip = ({ active, payload, chartOptions }: any) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        return (
            <div className="p-2 bg-surface border border-secondary/30 rounded-lg shadow-lg text-sm">
                <ul className="space-y-1">
                    {chartOptions.xAxisKey && <li className="font-bold text-text-primary mb-1">{chartOptions.xAxisKey}: {getNestedValue(dataPoint, chartOptions.xAxisKey)}</li>}
                    {chartOptions.yAxisKey && <li>{chartOptions.yAxisKey}: {formatNumber(getNestedValue(dataPoint, chartOptions.yAxisKey))}</li>}
                    {chartOptions.zAxisKey && <li>{chartOptions.zAxisKey}: {formatNumber(getNestedValue(dataPoint, chartOptions.zAxisKey))}</li>}
                    {chartOptions.valueKey && <li>{chartOptions.valueKey}: {formatNumber(getNestedValue(dataPoint, chartOptions.valueKey))}</li>}
                </ul>
            </div>
        );
    }
    return null;
};


interface ChartWrapperProps {
  chart: ChartConfig;
  onEdit?: (chart: ChartConfig) => void;
  onDelete?: (chartId: string) => void;
  onCopy?: (chart: ChartConfig) => void;
  viewOnly?: boolean;
  onHeaderMouseDown?: (e: React.MouseEvent) => void;
  showTitleWhenViewOnly?: boolean;
  showActions?: boolean;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ chart, onEdit, onDelete, onCopy, viewOnly = false, onHeaderMouseDown, showTitleWhenViewOnly = false, showActions = true }) => {
    const { dataSources, alerts, addTriggeredAlert, updateAlert, addInsight, recordChartRefresh, settings } = useAppContext();
    const [data, setData] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [isFullView, setIsFullView] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);
    const timeAgo = useTimeAgo(chart.lastRefreshed);

    // State for table sorting and filtering
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [processedData, setProcessedData] = useState<any[] | null>(null);
    
    // FIX: Ensure chartOptions is always a valid object, even if chart.options is missing from legacy data.
    const chartOptions: ChartOptions = chart.options || { colorScheme: 'default' };
    const { id, query, dataSourceId, refreshInterval } = chart;
    const { aiFeaturesEnabled, geminiApiKey } = settings;

    const fetchDataForChart = useCallback(async (): Promise<any[] | null> => {
      setIsLoading(true);
      setError(null);
      const dataSource = dataSources.find(ds => ds.id === dataSourceId);
      if (!dataSource) {
          setError("Data source not found.");
          setIsLoading(false);
          return null;
      }
      try {
          const result = await fetchData(dataSource, query, geminiApiKey);
          setData(result);
          // Reset filters and sort when data is fetched
          setFilters({});
          setSortConfig(null);
          return result;
      } catch (err: any) {
          setError(err.message || 'Failed to fetch chart data.');
          setData([]);
          return null;
      } finally {
          setIsLoading(false);
      }
    }, [dataSourceId, query, dataSources, geminiApiKey]);

    const checkAlerts = useCallback((dataForAlerts: any[]) => {
        if (viewOnly) return;
        const chartAlerts = alerts.filter(a => a.chartId === id && a.isEnabled);
        if (chartAlerts.length === 0 || !dataForAlerts || dataForAlerts.length === 0) return;
        
        chartAlerts.forEach(alert => {
            const triggeredDataPoint = dataForAlerts.find(item => {
                const value = getNestedValue(item, alert.field);
                if (value === undefined || value === null) return false;
                const sanitizedValue = String(value).replace(/[^0-9.-]+/g, "");
                const numericValue = sanitizedValue === '' ? NaN : Number(sanitizedValue);
                if (isNaN(numericValue)) return false;
                
                switch (alert.operator) {
                    case AlertConditionOperator.GreaterThan: return numericValue > alert.threshold;
                    case AlertConditionOperator.LessThan: return numericValue < alert.threshold;
                    case AlertConditionOperator.EqualTo: return numericValue === alert.threshold;
                    case AlertConditionOperator.GreaterThanOrEqual: return numericValue >= alert.threshold;
                    case AlertConditionOperator.LessThanOrEqual: return numericValue <= alert.threshold;
                    default: return false;
                }
            });

            const now = new Date().toISOString();
            if (triggeredDataPoint && alert.status !== 'triggered') {
                const triggeredValue = getNestedValue(triggeredDataPoint, alert.field);
                const message = alert.customMessage || `Alert "${alert.name}" on chart "${chart.name}" triggered: ${alert.field} (${triggeredValue}) ${alert.operator} ${alert.threshold}.`;
                
                showNotification(chart.name, { body: message });
                playNotificationSound();
                addTriggeredAlert({ id: crypto.randomUUID(), alertId: alert.id, chartId: id, chartName: chart.name, dashboardId: chart.dashboardId, message, timestamp: now });
                updateAlert({ ...alert, status: 'triggered', lastChecked: now });

            } else if (!triggeredDataPoint && alert.status === 'triggered') {
                const message = alert.customMessage ? `"${alert.name}" has resolved.` : `Alert "${alert.name}" on chart "${chart.name}" has resolved.`;
                showNotification(chart.name, { body: message });
                updateAlert({ ...alert, status: 'ok', lastChecked: now });
            }
        });
    }, [alerts, id, chart, addTriggeredAlert, updateAlert, viewOnly]);
    
    // This function will be defined on every render, capturing the latest props and state.
    const handleRefresh = async (trigger: 'initial' | 'manual' | 'auto' = 'manual') => {
        const fetchedData = await fetchDataForChart();
        if (fetchedData) {
            const previousData = chart.dataHistory?.[0]?.data;
            recordChartRefresh(chart.id, fetchedData);
            
            if (trigger === 'auto') {
                // Check if data has actually changed before generating an insight to prevent duplicates
                const hasDataChanged = !previousData || JSON.stringify(fetchedData) !== JSON.stringify(previousData);

                if (hasDataChanged && !viewOnly && chart.type !== ChartType.Table && aiFeaturesEnabled && geminiApiKey) {
                    const insightResult = await generateChartInsight(chart.name, chart.type, fetchedData, chart.dataHistory || [], geminiApiKey);
                    if (insightResult) {
                        addInsight({
                            id: crypto.randomUUID(),
                            chartId: chart.id,
                            timestamp: new Date().toISOString(),
                            text: insightResult.insight,
                            category: insightResult.category,
                        });
                    }
                }
                checkAlerts(fetchedData);
            }
        }
    };
    
    const handleRefreshRef = useRef(handleRefresh);
    
    // On every render, update the ref to the latest refresh function.
    useEffect(() => {
        handleRefreshRef.current = handleRefresh;
    });

    useEffect(() => {
      // Perform an initial fetch.
      handleRefreshRef.current('initial');
      
      // Set up the interval for auto-refreshing.
      if (refreshInterval && refreshInterval >= 10) {
        const intervalId = setInterval(() => handleRefreshRef.current('auto'), refreshInterval * 1000);
        return () => clearInterval(intervalId);
      }
    // This dependency array is correct. It only re-creates the interval when these specific properties change.
    // It will not be affected by other charts refreshing.
    }, [refreshInterval, query, dataSourceId]);

    // Effect for processing table data (sorting/filtering)
    useEffect(() => {
      if (!data) {
        setProcessedData(null);
        return;
      }

      let filteredData = [...data];

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
            filteredData = filteredData.filter(row => {
                const cellValue = getNestedValue(row, key);
                // FIX: `cellValue` could be a non-string value (e.g., number, null), causing a runtime error.
                // Safely convert it to a string before calling `.toLowerCase()`.
                return String(cellValue ?? '').toLowerCase().includes(String(value).toLowerCase());
            });
        }
      });

      // Apply sorting
      if (sortConfig !== null) {
        filteredData.sort((a, b) => {
            const valA = getNestedValue(a, sortConfig.key);
            const valB = getNestedValue(b, sortConfig.key);
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
      }

      setProcessedData(filteredData);
    }, [data, filters, sortConfig]);

    
    const handleExport = () => {
        if (chartRef.current) {
            setIsExporting(true);
            setTimeout(() => {
                htmlToImage.toPng(chartRef.current!)
                    .then(dataUrl => {
                        const link = document.createElement('a');
                        link.download = `${chart.name}.png`;
                        link.href = dataUrl;
                        link.click();
                        setIsExporting(false);
                    })
                    .catch(err => {
                        console.error('oops, something went wrong!', err);
                        setIsExporting(false);
                    });
            }, 100); // Small delay to allow state to update and animations to disable
        }
    };
    
    const getRelevantFields = (sample: any | null): string[] => {
        const { type, options } = chart;
        const fields = new Set<string>();
        if (!sample) return [];

        const addIfPresent = (key?: string) => {
            if (key && getNestedValue(sample, key) !== undefined) fields.add(key);
        };
        
        switch (type) {
            case ChartType.Bar:
            case ChartType.Line:
            case ChartType.StackedBar:
            case ChartType.Area:
            case ChartType.StackedArea:
                addIfPresent(options.xAxisKey);
                if (options.yAxisKey) options.yAxisKey.split(',').map(k => k.trim()).forEach(addIfPresent);
                break;
            case ChartType.Scatter:
                addIfPresent(options.xAxisKey);
                addIfPresent(options.yAxisKey);
                addIfPresent(options.zAxisKey);
                break;
            case ChartType.Pie:
            case ChartType.Donut:
            case ChartType.Number:
            case ChartType.Gauge:
            case ChartType.Funnel:
            case ChartType.Treemap:
                addIfPresent(options.labelKey);
                addIfPresent(options.valueKey);
                break;
            case ChartType.Heatmap:
                addIfPresent(options.xAxisKey);
                addIfPresent(options.yAxisKey);
                addIfPresent(options.valueKey);
                break;
            case ChartType.Table:
                Object.keys(sample).forEach(key => fields.add(key));
                break;
        }
        return Array.from(fields);
    };

    const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const dataSample = data && data.length > 0 ? data[0] : null;
    const relevantFields = getRelevantFields(dataSample);
    
    const renderChartContent = (isMaximized = false) => {
        if (!data || data.length === 0) {
            return <p className="text-text-secondary text-center">No data to display.</p>;
        }
        
        const colors = COLOR_SCHEMES[chartOptions.colorScheme || 'default'] || COLOR_SCHEMES.default;
        
        switch (chart.type) {
            case ChartType.Bar:
            case ChartType.StackedBar:
                 const yBarKeys = (chartOptions.yAxisKey || '').split(',').map(k => k.trim());
                 return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--secondary)" />
                            <XAxis dataKey={chartOptions.xAxisKey} stroke="var(--text-secondary)" tick={{ fontSize: 12 }}>
                                {chartOptions.xAxisLabel && <Label value={chartOptions.xAxisLabel} offset={-15} position="insideBottom" fill="var(--text-secondary)" />}
                            </XAxis>
                            <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 12 }} tickFormatter={formatNumber}>
                               {chartOptions.yAxisLabel && <Label value={chartOptions.yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="var(--text-secondary)" />}
                            </YAxis>
                            <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                            {yBarKeys.length > 1 && <Legend 
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                wrapperStyle={{
                                    fontSize: "12px",
                                    paddingTop: isMaximized ? "40px" : "20px"
                                }}
                            />}
                             {yBarKeys.map((key, index) => (
                                <Bar key={key} dataKey={key} stackId={chart.type === ChartType.StackedBar ? "a" : undefined} fill={colors[index % colors.length]} isAnimationActive={!isExporting} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case ChartType.Line:
                const yLineKeys = (chartOptions.yAxisKey || '').split(',').map(k => k.trim());
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--secondary)" />
                            <XAxis dataKey={chartOptions.xAxisKey} stroke="var(--text-secondary)" tick={{ fontSize: 12 }}>
                                {chartOptions.xAxisLabel && <Label value={chartOptions.xAxisLabel} offset={-15} position="insideBottom" fill="var(--text-secondary)" />}
                            </XAxis>
                            <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 12 }} tickFormatter={formatNumber}>
                               {chartOptions.yAxisLabel && <Label value={chartOptions.yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="var(--text-secondary)" />}
                            </YAxis>
                            <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                            {yLineKeys.length > 1 && <Legend 
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                wrapperStyle={{
                                    fontSize: "12px",
                                    paddingTop: isMaximized ? "40px" : "20px"
                                }}
                            />}
                            {yLineKeys.map((key, index) => (
                                <Line key={key} type="monotone" dataKey={key} stroke={colors[index % colors.length]} dot={false} strokeWidth={2} isAnimationActive={!isExporting} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );
            case ChartType.Area:
            case ChartType.StackedArea:
                const yAreaKeys = (chartOptions.yAxisKey || '').split(',').map(k => k.trim());
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--secondary)" />
                            <XAxis dataKey={chartOptions.xAxisKey} stroke="var(--text-secondary)" tick={{ fontSize: 12 }}>
                                {chartOptions.xAxisLabel && <Label value={chartOptions.xAxisLabel} offset={-15} position="insideBottom" fill="var(--text-secondary)" />}
                            </XAxis>
                            <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 12 }} tickFormatter={formatNumber}>
                            {chartOptions.yAxisLabel && <Label value={chartOptions.yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="var(--text-secondary)" />}
                            </YAxis>
                            <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                            {yAreaKeys.length > 1 && <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px", paddingTop: isMaximized ? "40px" : "20px" }} />}
                            {yAreaKeys.map((key, index) => {
                                const color = colors[index % colors.length];
                                return (
                                    <Area 
                                        key={key} 
                                        type="monotone" 
                                        dataKey={key} 
                                        stackId={chart.type === ChartType.StackedArea ? "1" : undefined}
                                        stroke={color} 
                                        fill={color} 
                                        fillOpacity={0.6}
                                        isAnimationActive={!isExporting} 
                                    />
                                );
                            })}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case ChartType.Scatter:
                const zDataKey = chartOptions.zAxisKey;
                const zDomain = zDataKey ? data.map(p => getNestedValue(p, zDataKey)).filter(v => typeof v === 'number') : [];
                const zDomainMin = zDomain.length > 0 ? Math.min(...zDomain) : 0;
                const zDomainMax = zDomain.length > 0 ? Math.max(...zDomain) : 0;
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--secondary)" />
                            <XAxis type="category" dataKey={chartOptions.xAxisKey} name={chartOptions.xAxisLabel || chartOptions.xAxisKey} stroke="var(--text-secondary)" tick={{ fontSize: 12 }}>
                                {chartOptions.xAxisLabel && <Label value={chartOptions.xAxisLabel} offset={-15} position="insideBottom" fill="var(--text-secondary)" />}
                            </XAxis>
                            <YAxis type="number" dataKey={chartOptions.yAxisKey} name={chartOptions.yAxisLabel || chartOptions.yAxisKey} stroke="var(--text-secondary)" tick={{ fontSize: 12 }} tickFormatter={formatNumber}>
                            {chartOptions.yAxisLabel && <Label value={chartOptions.yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="var(--text-secondary)" />}
                            </YAxis>
                            {zDataKey && <ZAxis type="number" dataKey={zDataKey} name={chartOptions.zAxisLabel || zDataKey} range={[10, 400]} domain={[zDomainMin, zDomainMax]} />}
                            <RechartsTooltip content={<ScatterTooltip chartOptions={chartOptions} />} cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name={chart.name} data={data} fill={colors[0]} isAnimationActive={!isExporting} />
                        </ScatterChart>
                    </ResponsiveContainer>
                );
            case ChartType.Donut:
            case ChartType.Pie:
                 const isDonut = chart.type === ChartType.Donut;
                 const LABEL_THRESHOLD = 8;
                 if (data.length > LABEL_THRESHOLD) {
                    return (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={data} 
                                    cx="50%" 
                                    cy="50%" 
                                    labelLine={false} 
                                    innerRadius={isDonut ? '20%' : 0}
                                    outerRadius="80%" 
                                    fill="#8884d8" 
                                    dataKey={chartOptions.valueKey || ''} 
                                    nameKey={chartOptions.labelKey || ''} 
                                    label={false} 
                                    isAnimationActive={!isExporting}
                                >
                                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} /> )}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: "12px", paddingLeft: "10px", maxHeight: '200px', overflowY: 'auto'}} iconSize={10}/>
                            </PieChart>
                        </ResponsiveContainer>
                    );
                 } else {
                    const CustomizedPieLabel = ({ cx, cy, midAngle, outerRadius, name, percent }: any) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius * 1.2; 
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return <text x={x} y={y} fill="var(--text-primary)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">{`${name} (${(percent * 100).toFixed(0)}%)`}</text>;
                    };
                    return (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={data} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={isDonut ? '40%' : 0}
                                    outerRadius="70%" 
                                    fill="#8884d8" 
                                    dataKey={chartOptions.valueKey || ''} 
                                    nameKey={chartOptions.labelKey || ''} 
                                    labelLine={false}
                                    label={<CustomizedPieLabel />}
                                    isAnimationActive={!isExporting}
                                >
                                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} /> )}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    );
                 }
            case ChartType.Funnel:
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Funnel dataKey={chartOptions.valueKey || ''} data={data} isAnimationActive={!isExporting} nameKey={chartOptions.labelKey || ''}>
                                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                );
            case ChartType.Treemap:
                const CustomizedTreemapContent = (props: any) => {
                    const { depth, x, y, width, height, index, name } = props;
                    const color = colors[index % colors.length];
            
                    if (width < 35 || height < 20) return null;
            
                    return (
                        <g>
                            <rect
                                x={x} y={y} width={width} height={height}
                                style={{
                                    fill: depth === 1 ? color : 'none',
                                    stroke: '#fff', strokeWidth: 2 / (depth + 1e-10), strokeOpacity: 1 / (depth + 1e-10),
                                }}
                            />
                            {depth === 1 ? (
                                <text x={x + 4} y={y + 18} fill="#fff" fontSize={14} className="font-semibold">
                                    {name}
                                </text>
                            ) : null}
                        </g>
                    );
                };
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={data}
                            dataKey={chartOptions.valueKey || ''}
                            nameKey={chartOptions.labelKey || ''}
                            aspectRatio={4 / 3}
                            stroke="#fff"
                            content={<CustomizedTreemapContent />}
                            isAnimationActive={!isExporting}
                        />
                    </ResponsiveContainer>
                );
            case ChartType.Heatmap:
                const xKey = chartOptions.xAxisKey || '';
                const yKey = chartOptions.yAxisKey || '';
                const valKey = chartOptions.valueKey || '';
                
                const values = data.map(d => getNestedValue(d, valKey)).filter(v => typeof v === 'number');
                const minVal = Math.min(...values);
                const maxVal = Math.max(...values);
                
                const getColor = (value: number) => {
                    if (isNaN(value)) return 'var(--secondary)';
                    const ratio = (maxVal - minVal) > 0 ? (value - minVal) / (maxVal - minVal) : 0.5;
                    const color = colors[0]; // Base color from scheme
                    return `${color}${Math.floor(25 + ratio * 200).toString(16).padStart(2, '0')}`; // Append alpha
                };
                
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                            <CartesianGrid stroke="var(--secondary)" />
                            <XAxis type="category" dataKey={xKey} name={xKey} interval={0} stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey={yKey} name={yKey} interval={0} stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                            <RechartsTooltip content={<ScatterTooltip chartOptions={chartOptions} />} cursor={false} />
                            <Scatter data={data} shape="square" isAnimationActive={!isExporting}>
                                {data.map((entry, index) => {
                                    const value = getNestedValue(entry, valKey);
                                    return <Cell key={`cell-${index}`} fill={getColor(value)} />;
                                })}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                );
            case ChartType.Number:
                const value = getNestedValue(data[0], chartOptions.valueKey || '');
                return (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className={`${isMaximized ? 'text-[12rem]' : 'text-8xl'} font-bold text-text-primary leading-none`} title={String(value)}>{formatNumber(value)}</p>
                        {chartOptions.unit && <p className={`${isMaximized ? 'text-6xl' : 'text-2xl'} text-text-secondary`}>{chartOptions.unit}</p>}
                    </div>
                );
            case ChartType.Gauge:
                const gaugeValue = getNestedValue(data[0], chartOptions.valueKey || '');
                const minValue = chartOptions.minValue ?? 0;
                const maxValue = chartOptions.maxValue ?? 100;
                const unit = chartOptions.unit || '';
                
                if (minValue >= maxValue) {
                    return (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                <p className="text-lg font-semibold text-text-primary mb-2">Configuration Error</p>
                                <p className="text-sm text-text-secondary">Max Value must be greater than Min Value for Gauge chart.</p>
                        </div>
                    );
                }
                
                const numericValue = Number(String(gaugeValue).replace(/[^0-9.-]+/g, ""));
                const clampedValue = Math.max(minValue, Math.min(maxValue, isNaN(numericValue) ? minValue : numericValue));
            
                const gaugeData = [
                    { name: 'value', value: clampedValue - minValue },
                    { name: 'remainder', value: maxValue - clampedValue }
                ];
                
                return (
                    <div className="w-full h-full grid place-items-center overflow-hidden">
                        <div className="relative w-full h-full max-w-full max-h-full aspect-square grid">
                            <ResponsiveContainer width="100%" height="100%" className="col-start-1 row-start-1">
                                <PieChart>
                                    <Pie
                                        data={gaugeData}
                                        cx="50%"
                                        cy="50%"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius="60%"
                                        outerRadius="80%"
                                        dataKey="value"
                                        isAnimationActive={!isExporting}
                                        stroke="none"
                                    >
                                        <Cell key="value" fill={colors[0]} />
                                        <Cell key="remainder" fill="var(--secondary)" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                             <div className="col-start-1 row-start-1 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                                    <p className={`${isMaximized ? 'text-8xl' : 'text-6xl'} font-bold text-text-primary`} title={String(gaugeValue)}>
                                        {formatNumber(gaugeValue)}
                                    </p>
                                    {unit && <p className={`${isMaximized ? 'text-2xl' : 'text-lg'} text-text-secondary mt-1`}>{unit}</p>}
                                </div>
                                <div className="absolute top-1/2 w-full px-[10%] flex justify-between items-end">
                                    <span className={`-translate-x-1/2 ${isMaximized ? 'text-lg' : 'text-base'} font-semibold text-text-secondary`}>{formatNumber(minValue)}</span>
                                    <span className={`translate-x-1/2 ${isMaximized ? 'text-lg' : 'text-base'} font-semibold text-text-secondary`}>{formatNumber(maxValue)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case ChartType.Table:
                const columns = chartOptions.tableColumns || [];
                if (columns.length === 0) {
                    return <p className="text-text-secondary text-center">No columns configured for this table.</p>;
                }
                return (
                    <div className="h-full overflow-auto freeboard-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="sticky top-0 bg-surface">
                                <tr>
                                    {columns.map(col => (
                                        <th key={col} className="p-2 border-b border-secondary/20 font-semibold text-text-primary">
                                            <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort(col)}>
                                                {col}
                                                {sortConfig?.key === col ? (sortConfig.direction === 'asc' ? <SortUpIcon/> : <SortDownIcon/>) : <SortIcon/>}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {columns.map(col => (
                                        <th key={`${col}-filter`} className="p-1 border-b border-secondary/20">
                                            <input
                                                type="text"
                                                placeholder={`Filter ${col}...`}
                                                value={filters[col] || ''}
                                                onChange={(e) => handleFilterChange(col, e.target.value)}
                                                className="w-full bg-secondary text-text-primary text-xs p-1 rounded border border-transparent focus:ring-1 focus:ring-accent focus:border-accent"
                                            />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(processedData || data).map((row, index) => (
                                    <tr key={index} className="hover:bg-secondary/20">
                                        {columns.map(col => (
                                            <td key={col} className="p-2 border-b border-secondary/10 whitespace-nowrap truncate max-w-xs text-text-primary" title={String(getNestedValue(row, col))}>
                                                {String(getNestedValue(row, col))}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            default:
                return <p className="text-text-secondary text-center">Unsupported chart type.</p>;
        }
    };

    const FullViewModal = () => (
        <Modal title={chart.name} onClose={() => setIsFullView(false)} size="large">
            <div className="w-full h-[70vh]">
                {renderChartContent(true)}
            </div>
        </Modal>
    );

    const titleToShow = viewOnly ? (showTitleWhenViewOnly ? chart.name : '') : chart.name;
    
    return (
        <div className="bg-surface rounded-lg shadow-lg w-full h-full flex flex-col p-4 relative group/chart" ref={chartRef}>
            <div 
                className="absolute top-0 right-0 p-2 z-30 flex items-center gap-1 transition-opacity duration-300 opacity-0 group-hover/chart:opacity-100"
            >
                {showActions && !viewOnly && (
                     <>
                        <Tooltip text="Manage Alerts"><button onClick={() => setIsAlertModalOpen(true)} className="p-1.5 rounded-full text-text-secondary bg-surface/80 hover:bg-secondary/80 hover:text-text-primary"><BellIcon className="w-5 h-5" /></button></Tooltip>
                        <Tooltip text="Edit Chart"><button onClick={() => onEdit?.(chart)} className="p-1.5 rounded-full text-text-secondary bg-surface/80 hover:bg-secondary/80 hover:text-text-primary"><PencilIcon className="w-5 h-5" /></button></Tooltip>
                        <Tooltip text="Copy Chart"><button onClick={() => onCopy?.(chart)} className="p-1.5 rounded-full text-text-secondary bg-surface/80 hover:bg-secondary/80 hover:text-text-primary"><CopyIcon className="w-5 h-5" /></button></Tooltip>
                        <Tooltip text="Full View"><button onClick={() => setIsFullView(true)} className="p-1.5 rounded-full text-text-secondary bg-surface/80 hover:bg-secondary/80 hover:text-text-primary"><ExpandIcon className="w-5 h-5" /></button></Tooltip>
                        <Tooltip text="Export PNG"><button onClick={() => handleExport()} className="p-1.5 rounded-full text-text-secondary bg-surface/80 hover:bg-secondary/80 hover:text-text-primary"><ExportIcon className="w-5 h-5" /></button></Tooltip>
                        <Tooltip text="Delete Chart"><button onClick={() => onDelete?.(id)} className="p-1.5 rounded-full text-red-500 bg-surface/80 hover:bg-secondary/80 hover:text-red-400"><TrashIcon className="w-5 h-5" /></button></Tooltip>
                    </>
                )}
            </div>
            
            <div 
                className={`flex-shrink-0 ${onHeaderMouseDown ? 'cursor-move' : ''}`}
                onMouseDown={onHeaderMouseDown}
            >
                <h3 className="font-semibold text-text-primary truncate" title={chart.name}>{titleToShow}</h3>
            </div>

            <div className="flex-grow w-full h-full min-h-0 flex items-center justify-center">
                {isLoading && <p className="text-text-secondary">Loading chart...</p>}
                {error && <p className="text-red-500 text-sm p-4 text-center">{error}</p>}
                {!isLoading && !error && renderChartContent()}
            </div>
            
            <div className="flex-shrink-0 flex justify-between items-center pt-2">
                <p className="text-xs text-text-secondary" title={new Date(chart.lastRefreshed).toLocaleString()}>
                    Refreshed {timeAgo} {chart.refreshInterval && <span>(every {chart.refreshInterval}s)</span>}
                </p>
                {showActions && !viewOnly && (
                    <div className="transition-opacity duration-300 opacity-0 group-hover/chart:opacity-100">
                        <Tooltip text="Refresh Now">
                            <button onClick={() => handleRefresh()} className="p-1 rounded-full text-text-secondary hover:bg-secondary/50 hover:text-text-primary">
                                <RefreshIcon className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>

            {isAlertModalOpen && (
                <AlertsManagerModal
                    chart={chart}
                    dataSample={dataSample}
                    relevantFields={relevantFields}
                    onClose={() => setIsAlertModalOpen(false)}
                />
            )}
            {isFullView && <FullViewModal />}
        </div>
    );
};

export default ChartWrapper;