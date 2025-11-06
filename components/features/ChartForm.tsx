import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChartConfig, ChartType, DataSource, DataSourceType } from '../../types';
import { CHART_TYPE_OPTIONS, COLOR_SCHEMES } from '../../constants';
import { useToast } from '../../context/ToastContext';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { fetchData } from '../../services/postgrestService';
import { BarChartIcon, LineChartIcon, NumberChartIcon, PieChartIcon, DonutChartIcon, TableChartIcon, StackedBarChartIcon, GaugeChartIcon, AreaChartIcon, ScatterChartIcon, HeatmapChartIcon, FunnelChartIcon, TreemapChartIcon } from '../layout/Icons';

interface ChartFormProps {
  chart?: ChartConfig | null;
  initialData?: ChartConfig | null;
  onSuccess: () => void;
  dashboardId: string;
}

const chartTypeIcons = {
    [ChartType.Bar]: BarChartIcon,
    [ChartType.StackedBar]: StackedBarChartIcon,
    [ChartType.Line]: LineChartIcon,
    [ChartType.Area]: AreaChartIcon,
    [ChartType.StackedArea]: AreaChartIcon,
    [ChartType.Scatter]: ScatterChartIcon,
    [ChartType.Pie]: PieChartIcon,
    [ChartType.Donut]: DonutChartIcon,
    [ChartType.Funnel]: FunnelChartIcon,
    [ChartType.Treemap]: TreemapChartIcon,
    [ChartType.Gauge]: GaugeChartIcon,
    [ChartType.Heatmap]: HeatmapChartIcon,
    [ChartType.Number]: NumberChartIcon,
    [ChartType.Table]: TableChartIcon,
};

const defaultChartConfig: Omit<ChartConfig, 'id' | 'lastRefreshed' | 'dashboardId'> = {
  name: '',
  dataSourceId: '',
  type: ChartType.Bar,
  query: '',
  options: {
    colorScheme: 'default',
  },
  refreshInterval: undefined,
};

const ChartForm: React.FC<ChartFormProps> = ({ chart, initialData, onSuccess, dashboardId }) => {
  const { addChart, updateChart, dataSources } = useAppContext();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Omit<ChartConfig, 'id' | 'lastRefreshed' | 'dashboardId'>>(defaultChartConfig);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  
  // State for new query methods
  const [isAdvancedQuery, setIsAdvancedQuery] = useState(false);

  useEffect(() => {
    let config: Partial<ChartConfig> | null = null;
    if (chart) {
        config = chart;
    } else if (initialData) {
        config = { ...initialData, name: `${initialData.name} - Copy`};
    }

    if (config) {
        setFormData({
            name: config.name || '',
            dataSourceId: config.dataSourceId || (dataSources[0]?.id || ''),
            type: config.type || ChartType.Bar,
            query: config.query || '',
            options: config.options || { colorScheme: 'default' },
            refreshInterval: config.refreshInterval,
        });
        const queryIsAdvanced = config.query?.includes('?') || config.query?.trim().toLowerCase().startsWith('select');
        setIsAdvancedQuery(!!queryIsAdvanced);
    } else {
        setFormData({ ...defaultChartConfig, dataSourceId: dataSources[0]?.id || '' });
        setIsAdvancedQuery(false);
    }
  }, [chart, initialData, dataSources]);

  // Clear available columns if the query or source changes, forcing a re-test.
  useEffect(() => {
    setAvailableColumns([]);
  }, [formData.dataSourceId, formData.query, formData.type]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTestStatus('idle'); 
    setTestMessage('');
    if (name.startsWith('options.')) {
        const optionKey = name.split('.')[1];
        setFormData(prev => ({
            ...prev,
            options: {
                ...prev.options,
                [optionKey]: value,
            }
        }));
    } else if (name === 'refreshInterval') {
        const numValue = value ? parseInt(value, 10) : undefined;
        setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? undefined : numValue }));
    }
    else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleColorSchemeChange = (name: string) => {
    setFormData(prev => ({
        ...prev,
        options: {
            ...prev.options,
            colorScheme: name,
        }
    }));
  };

  const handleTypeChange = (newType: ChartType) => {
    setFormData(prev => ({ ...prev, type: newType }));
  }

  const getNestedValue = (obj: any, path: string): any => {
    if (!path || typeof path !== 'string') return undefined;
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
  };

  const handleTestConfiguration = async () => {
    const dataSource = dataSources.find(ds => ds.id === formData.dataSourceId);
    if (!dataSource) {
        setTestStatus('error');
        setTestMessage('Please select a valid data source.');
        return;
    }
    setTestStatus('testing');
    setTestMessage('');
    setAvailableColumns([]); // Clear previous columns
    try {
        const data = await fetchData(dataSource, formData.query);
        if (!data || data.length === 0) {
            setTestStatus('error');
            setTestMessage('Query returned no data.');
            return;
        }

        const sample = data[0];
        // For table charts, populate the column selector
        if (formData.type === ChartType.Table) {
            setAvailableColumns(Object.keys(sample));
            // Auto-select all columns by default on first successful test
            if (!formData.options.tableColumns) {
                setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, tableColumns: Object.keys(sample) }
                }));
            }
        }

        let keysToTest: string[] = [];
        const { type, options } = formData;

        switch (type) {
            case ChartType.Bar:
            case ChartType.Line:
            case ChartType.StackedBar:
            case ChartType.Area:
            case ChartType.StackedArea:
                if (options.xAxisKey) keysToTest.push(options.xAxisKey);
                if (options.yAxisKey) keysToTest.push(...options.yAxisKey.split(',').map(k => k.trim()));
                break;
            case ChartType.Scatter:
                if (options.xAxisKey) keysToTest.push(options.xAxisKey);
                if (options.yAxisKey) keysToTest.push(options.yAxisKey);
                if (options.zAxisKey) keysToTest.push(options.zAxisKey);
                break;
            case ChartType.Pie:
            case ChartType.Donut:
            case ChartType.Funnel:
            case ChartType.Treemap:
                if (options.labelKey) keysToTest.push(options.labelKey);
                if (options.valueKey) keysToTest.push(options.valueKey);
                break;
            case ChartType.Number:
            case ChartType.Gauge:
                 if (options.valueKey) keysToTest.push(options.valueKey);
                break;
            case ChartType.Heatmap:
                if (options.xAxisKey) keysToTest.push(options.xAxisKey);
                if (options.yAxisKey) keysToTest.push(options.yAxisKey);
                if (options.valueKey) keysToTest.push(options.valueKey);
                break;
        }
        
        const missingKeys = keysToTest.filter(k => getNestedValue(sample, k) === undefined);

        if (missingKeys.length > 0) {
            setTestStatus('error');
            setTestMessage(`Keys not found in data: ${missingKeys.join(', ')}`);
        } else {
            setTestStatus('success');
            setTestMessage('Test successful! Configuration is valid.');
        }

    } catch (error: any) {
        setTestStatus('error');
        setTestMessage(error.message || 'Failed to fetch or parse data.');
    }
  };

  const handleColumnToggle = (column: string) => {
    const currentColumns = formData.options.tableColumns || [];
    const newColumns = currentColumns.includes(column)
      ? currentColumns.filter(c => c !== column)
      : [...currentColumns, column];

    setFormData(prev => ({
        ...prev,
        options: {
            ...prev.options,
            tableColumns: newColumns,
        }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dataSourceId) {
        addToast("Please select a data source.", { type: 'warning' });
        return;
    }

    // Parse numeric options before saving
    const finalOptions = { ...formData.options };
    if (formData.type === ChartType.Gauge) {
        if (finalOptions.minValue !== undefined) {
            finalOptions.minValue = Number(finalOptions.minValue);
        }
        if (finalOptions.maxValue !== undefined) {
            finalOptions.maxValue = Number(finalOptions.maxValue);
        }
    }

    const finalChartConfig: Omit<ChartConfig, 'id'> = {
      ...formData,
      options: finalOptions,
      dashboardId: chart ? chart.dashboardId : dashboardId,
      lastRefreshed: new Date().toISOString(),
    };
    
    if (chart) {
      updateChart({ id: chart.id, ...finalChartConfig });
    } else {
      addChart({ id: crypto.randomUUID(), ...finalChartConfig });
    }
    onSuccess();
  };

  const dataSourceOptions = dataSources.map((ds: DataSource) => ({ 
    value: ds.id, 
    label: `${ds.name} [${ds.type.toUpperCase()}]`
  }));
  
  const selectedDataSource = dataSources.find(ds => ds.id === formData.dataSourceId);
  const isPostgrest = selectedDataSource?.type === DataSourceType.Supabase || 
                      selectedDataSource?.type === DataSourceType.Neon || 
                      selectedDataSource?.type === DataSourceType.Generic;

  const QueryInputSection = () => {
    if (!isPostgrest) {
        return (
            <Textarea
                label="API Endpoint Path (Optional)"
                name="query"
                value={formData.query}
                onChange={handleChange}
                placeholder="e.g., /users?active=true"
                rows={2}
            />
        );
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Query Method</label>
            <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg">
                <button type="button" onClick={() => setIsAdvancedQuery(false)} className={`flex-1 p-2 rounded-md transition-colors text-xs ${!isAdvancedQuery ? 'bg-primary text-white' : 'hover:bg-secondary'}`}>Simple</button>
                <button type="button" onClick={() => setIsAdvancedQuery(true)} className={`flex-1 p-2 rounded-md transition-colors text-xs ${isAdvancedQuery ? 'bg-primary text-white' : 'hover:bg-secondary'}`}>Advanced</button>
            </div>
            
            <div className="pt-2">
                <Textarea
                    label={isAdvancedQuery ? "Custom Query (SQL or REST Path)" : "Table / View Name"}
                    name="query"
                    value={formData.query}
                    onChange={handleChange}
                    placeholder={isAdvancedQuery ? "e.g., SELECT * FROM users OR users?select=name,age" : "e.g., sales_data"}
                    rows={isAdvancedQuery ? 4 : 1}
                />
            </div>
        </div>
    );
  }

  const renderOptions = () => {
    const { options } = formData;
    const keyPlaceholder = isPostgrest ? "e.g., column_name" : "e.g., user.id";
    
    switch (formData.type) {
      case ChartType.Bar:
      case ChartType.Line:
      case ChartType.StackedBar:
      case ChartType.Area:
      case ChartType.StackedArea:
        return (
          <>
            <Input label="X-Axis Key" name="options.xAxisKey" value={options.xAxisKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
            <Input label="Y-Axis Key(s)" name="options.yAxisKey" value={options.yAxisKey || ''} onChange={handleChange} placeholder={isPostgrest ? "e.g., value1,value2" : "e.g., sales.total,cost"} />
            <Input label="X-Axis Label (Optional)" name="options.xAxisLabel" value={options.xAxisLabel || ''} onChange={handleChange} placeholder="e.g., Sales Rep" />
            <Input label="Y-Axis Label (Optional)" name="options.yAxisLabel" value={options.yAxisLabel || ''} onChange={handleChange} placeholder="e.g., Total Revenue" />
          </>
        );
      case ChartType.Scatter:
        return (
          <>
            <Input label="X-Axis Key" name="options.xAxisKey" value={options.xAxisKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
            <Input label="Y-Axis Key" name="options.yAxisKey" value={options.yAxisKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
            <Input label="Bubble Size Key (Optional)" name="options.zAxisKey" value={options.zAxisKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
            <Input label="X-Axis Label (Optional)" name="options.xAxisLabel" value={options.xAxisLabel || ''} onChange={handleChange} placeholder="e.g., User Age" />
            <Input label="Y-Axis Label (Optional)" name="options.yAxisLabel" value={options.yAxisLabel || ''} onChange={handleChange} placeholder="e.g., Purchase Amount" />
            <Input label="Z-Axis Label (Optional)" name="options.zAxisLabel" value={options.zAxisLabel || ''} onChange={handleChange} placeholder="e.g., Order Count" />
          </>
        );
      case ChartType.Pie:
      case ChartType.Donut:
      case ChartType.Funnel:
      case ChartType.Treemap:
        return (
          <>
            <Input label="Label Key" name="options.labelKey" value={options.labelKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
            <Input label="Value Key" name="options.valueKey" value={options.valueKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
          </>
        );
      case ChartType.Heatmap:
        return (
          <>
            <Input label="X-Axis Key (Category)" name="options.xAxisKey" value={options.xAxisKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
            <Input label="Y-Axis Key (Category)" name="options.yAxisKey" value={options.yAxisKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
            <Input label="Value Key" name="options.valueKey" value={options.valueKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
          </>
        );
      case ChartType.Number:
        return (
            <>
                <Input label="Value Key" name="options.valueKey" value={options.valueKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
                <Input label="Unit (Optional)" name="options.unit" value={options.unit || ''} onChange={handleChange} placeholder="e.g., USD, Users, %" />
            </>
        );
      case ChartType.Gauge:
        return (
            <>
                <Input label="Value Key" name="options.valueKey" value={options.valueKey || ''} onChange={handleChange} placeholder={keyPlaceholder} />
                <Input label="Min Value" name="options.minValue" type="number" value={options.minValue ?? '0'} onChange={handleChange} placeholder="e.g., 0" />
                <Input label="Max Value" name="options.maxValue" type="number" value={options.maxValue ?? '100'} onChange={handleChange} placeholder="e.g., 100" />
                <Input label="Unit (Optional)" name="options.unit" value={options.unit || ''} onChange={handleChange} placeholder="e.g., USD, Users, %" />
            </>
        );
      case ChartType.Table:
        return (
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Columns to Display</label>
                {availableColumns.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 bg-secondary/30 rounded-lg max-h-40 overflow-y-auto freeboard-scrollbar">
                        {availableColumns.map(col => (
                            <label key={col} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.options.tableColumns?.includes(col) ?? false}
                                    onChange={() => handleColumnToggle(col)}
                                    className="form-checkbox h-4 w-4 rounded bg-secondary text-primary focus:ring-primary"
                                />
                                {col}
                            </label>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-text-secondary italic">Test your query to see available columns.</p>
                )}
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">Chart Type</label>
        <div className="grid grid-cols-4 lg:grid-cols-7 gap-2 p-1 bg-secondary/30 rounded-lg">
           {CHART_TYPE_OPTIONS.map(({ value, label }) => {
              const Icon = chartTypeIcons[value as ChartType];
              if (!Icon) return null;
              return (
                <button
                    type="button"
                    key={value}
                    onClick={() => handleTypeChange(value as ChartType)}
                    className={`flex-1 p-2 rounded-md transition-colors text-xs flex flex-col items-center gap-1 ${formData.type === value ? 'bg-primary text-white' : 'hover:bg-secondary'}`}
                >
                    <Icon className="w-6 h-6" />
                    {label}
                </button>
              );
           })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Chart Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., Sales Over Time" required />
        <Select label="Data Source" name="dataSourceId" value={formData.dataSourceId} onChange={handleChange} options={dataSourceOptions} />
      </div>

      <QueryInputSection />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-secondary/20">
        {renderOptions()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formData.type !== ChartType.Table && (
          <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Color Scheme</label>
              <div className="space-y-2">
                  {Object.entries(COLOR_SCHEMES).map(([name, colors]) => (
                      <button
                          type="button"
                          key={name}
                          onClick={() => handleColorSchemeChange(name)}
                          className={`w-full p-2 rounded-lg flex items-center gap-3 transition-all ${formData.options.colorScheme === name ? 'ring-2 ring-primary bg-secondary/50' : 'bg-secondary/20 hover:bg-secondary/40'}`}
                      >
                          <span className="font-medium text-sm capitalize flex-grow text-left">{name}</span>
                          <div className="flex gap-1">
                              {colors.map(color => <span key={color} className="h-4 w-4 rounded-full" style={{ backgroundColor: color }}></span>)}
                          </div>
                      </button>
                  ))}
              </div>
          </div>
        )}
        <Input
            label="Refresh Interval (seconds)"
            name="refreshInterval"
            type="number"
            value={formData.refreshInterval || ''}
            onChange={handleChange}
            placeholder="e.g., 60 (optional, min 10)"
            min="10"
        />
      </div>


      <div className="flex justify-between items-center pt-4 border-t border-secondary/20">
        <div className="flex items-center">
            <button type="button" onClick={handleTestConfiguration} disabled={testStatus === 'testing'} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {testStatus === 'testing' ? 'Testing...' : (isPostgrest ? 'Test Query & Keys' : 'Test API & Keys')}
            </button>
             {testMessage && (
                <span className={`ml-4 text-sm font-medium ${testStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {testMessage}
                </span>
            )}
        </div>
        <button type="submit" className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          {chart ? 'Save Changes' : 'Create Chart'}
        </button>
      </div>
    </form>
  );
};

export default ChartForm;