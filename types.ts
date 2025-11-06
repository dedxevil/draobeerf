
export enum DataSourceType {
  Supabase = 'supabase',
  Neon = 'neon',
  Generic = 'generic',
  REST = 'rest',
}

export enum ChartType {
  Bar = 'bar',
  StackedBar = 'stacked-bar',
  Line = 'line',
  Area = 'area',
  StackedArea = 'stacked-area',
  Scatter = 'scatter',
  Pie = 'pie',
  Donut = 'donut',
  Funnel = 'funnel',
  Treemap = 'treemap',
  Gauge = 'gauge',
  Heatmap = 'heatmap',
  Number = 'number',
  Table = 'table',
}

export enum AlertConditionOperator {
    GreaterThan = '>',
    LessThan = '<',
    EqualTo = '==',
    GreaterThanOrEqual = '>=',
    LessThanOrEqual = '<=',
}

export type InsightCategory = 'anomaly' | 'trend' | 'forecast' | 'info' | 'error';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  url: string;
  apiKey: string;
}

export interface ChartOptions {
  colorScheme: string;
  xAxisKey?: string;
  yAxisKey?: string;
  zAxisKey?: string;
  labelKey?: string;
  valueKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  zAxisLabel?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  tableColumns?: string[];
}

export interface DataHistoryPoint {
    timestamp: string;
    data: any[];
}

export interface ChartConfig {
  id: string;
  name: string;
  dashboardId: string;
  dataSourceId: string;
  type: ChartType;
  query: string;
  options: ChartOptions;
  refreshInterval?: number;
  lastRefreshed: string;
  dataHistory?: DataHistoryPoint[];
}

export interface Dashboard {
  id: string;
  name: string;
  layout: { [chartId: string]: any };
}

export interface CommandCenter {
  id: string;
  name: string;
  chartIds: string[];
  layout: {
    [chartId: string]: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
  };
}

export interface AppSettings {
  theme: string;
  font: string;
  activeDashboardId: string;
  activeCommandCenterId?: string;
  aiFeaturesEnabled: boolean;
  geminiApiKey: string;
}

export interface Alert {
    id: string;
    chartId: string;
    name: string;
    field: string;
    operator: AlertConditionOperator;
    threshold: number;
    isEnabled: boolean;
    customMessage: string;
    lastChecked: string;
    status: 'ok' | 'triggered';
}

export interface TriggeredAlert {
    id: string;
    alertId: string;
    chartId: string;
    chartName: string;
    dashboardId: string;
    message: string;
    timestamp: string;
}

export interface Insight {
    id: string;
    chartId: string;
    timestamp: string;
    text: string;
    category: InsightCategory;
}

export interface AppState {
  dataSources: DataSource[];
  charts: ChartConfig[];
  dashboards: Dashboard[];
  commandCenters: CommandCenter[];
  settings: AppSettings;
  alerts: Alert[];
  insights: Insight[];
  triggeredAlerts: TriggeredAlert[];
  lastTriggeredAlertTimestamp: string | null;
  isCommandCenterEditMode: boolean;
}
