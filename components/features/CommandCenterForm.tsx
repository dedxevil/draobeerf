import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CommandCenter } from '../../types';
import Input from '../ui/Input';

interface CommandCenterFormProps {
  commandCenter?: CommandCenter | null;
  onSuccess: () => void;
}

const CommandCenterForm: React.FC<CommandCenterFormProps> = ({ commandCenter, onSuccess }) => {
  const { addCommandCenter, updateCommandCenter, charts, dashboards } = useAppContext();
  const [name, setName] = useState(commandCenter?.name || '');
  const [selectedChartIds, setSelectedChartIds] = useState<string[]>(commandCenter?.chartIds || []);

  const handleChartToggle = (chartId: string) => {
    setSelectedChartIds(prev =>
      prev.includes(chartId)
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    );
  };
  
  const handleSelectAll = () => {
    if (selectedChartIds.length === charts.length) {
        setSelectedChartIds([]); // Deselect all
    } else {
        setSelectedChartIds(charts.map(c => c.id)); // Select all
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commandCenter) {
      updateCommandCenter({ 
          ...commandCenter, 
          name, 
          chartIds: selectedChartIds,
        });
    } else {
      addCommandCenter(name, selectedChartIds);
    }
    onSuccess();
  };
  
  const dashboardMap = new Map(dashboards.map(d => [d.id, d.name]));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Command Center Name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Q3 Operations Overview"
        required
      />
      <div>
        <div className="flex justify-between items-center mb-1">
             <label className="block text-sm font-medium text-text-secondary">
              Charts to Include
            </label>
            {charts.length > 0 && (
                <button type="button" onClick={handleSelectAll} className="text-sm text-accent hover:underline">
                    {selectedChartIds.length === charts.length ? 'Deselect All' : 'Select All'}
                </button>
            )}
        </div>
        {charts.length > 0 ? (
            <div className="max-h-60 overflow-y-auto space-y-2 p-3 bg-secondary/30 rounded-lg freeboard-scrollbar">
            {charts.map(chart => (
                <label key={chart.id} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer p-2 hover:bg-secondary/50 rounded-md">
                <input
                    type="checkbox"
                    checked={selectedChartIds.includes(chart.id)}
                    onChange={() => handleChartToggle(chart.id)}
                    className="form-checkbox h-4 w-4 rounded bg-secondary text-primary focus:ring-primary"
                />
                {chart.name}
                <span className="text-xs text-text-secondary">({dashboardMap.get(chart.dashboardId) || 'Unknown'})</span>
                </label>
            ))}
            </div>
        ) : (
            <p className="text-sm text-text-secondary italic">No charts have been created yet. Go to a dashboard to add charts first.</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <button type="button" onClick={onSuccess} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="submit" className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          {commandCenter ? 'Save Changes' : 'Create Command Center'}
        </button>
      </div>
    </form>
  );
};

export default CommandCenterForm;