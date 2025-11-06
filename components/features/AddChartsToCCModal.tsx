import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CommandCenter } from '../../types';
import Modal from '../ui/Modal';

interface AddChartsToCCModalProps {
  commandCenter: CommandCenter;
  onClose: () => void;
}

const AddChartsToCCModal: React.FC<AddChartsToCCModalProps> = ({ commandCenter, onClose }) => {
  const { updateCommandCenter, charts, dashboards } = useAppContext();
  
  const availableCharts = charts.filter(c => !commandCenter.chartIds.includes(c.id));
  const [selectedChartIds, setSelectedChartIds] = useState<string[]>([]);
  
  const handleChartToggle = (chartId: string) => {
    setSelectedChartIds(prev =>
      prev.includes(chartId)
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    );
  };
  
  const handleAddCharts = () => {
    if (selectedChartIds.length === 0) {
        onClose();
        return;
    }
    const newChartIds = [...commandCenter.chartIds, ...selectedChartIds];
    updateCommandCenter({
        ...commandCenter,
        chartIds: newChartIds,
    });
    onClose();
  };
  
  const dashboardMap = new Map(dashboards.map(d => [d.id, d.name]));

  return (
    <Modal title={`Add Charts to "${commandCenter.name}"`} onClose={onClose}>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                Available Charts
                </label>
                {availableCharts.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2 p-3 bg-secondary/30 rounded-lg snapdash-scrollbar">
                    {availableCharts.map(chart => (
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
                    <p className="text-sm text-text-secondary italic text-center p-4">All available charts are already in this Command Center.</p>
                )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onClose} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Cancel
                </button>
                <button 
                    type="button" 
                    onClick={handleAddCharts} 
                    className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    disabled={selectedChartIds.length === 0}
                >
                Add Selected Charts
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default AddChartsToCCModal;