import React, { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChartConfig } from '../../types';
import Modal from '../ui/Modal';
import ChartForm from '../features/ChartForm';
import ChartWrapper from '../features/ChartWrapper';

const DashboardPage: React.FC = () => {
  const { charts, deleteChart, settings, dashboards } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  const [chartToCopy, setChartToCopy] = useState<ChartConfig | null>(null);
  const [confirmingDeleteChartId, setConfirmingDeleteChartId] = useState<string | null>(null);

  const activeDashboard = dashboards.find(d => d.id === settings.activeDashboardId) || dashboards[0];
  const dashboardCharts = charts.filter(c => c.dashboardId === activeDashboard?.id);

  const handleAddChart = useCallback(() => {
    setEditingChart(null);
    setChartToCopy(null);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    const handleOpenModal = () => handleAddChart();
    document.addEventListener('openAddChartModal', handleOpenModal);
    return () => {
      document.removeEventListener('openAddChartModal', handleOpenModal);
    };
  }, [handleAddChart]);

  const handleEditChart = (chart: ChartConfig) => {
    setChartToCopy(null);
    setEditingChart(chart);
    setIsModalOpen(true);
  };

  const handleCopyRequest = (chart: ChartConfig) => {
    setEditingChart(null);
    setChartToCopy(chart);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (chartId: string) => {
    setConfirmingDeleteChartId(chartId);
  };

  const confirmDeleteChart = () => {
    if (confirmingDeleteChartId) {
        deleteChart(confirmingDeleteChartId);
        setConfirmingDeleteChartId(null);
    }
  };
  
  const closeModal = () => {
      setIsModalOpen(false);
      setEditingChart(null);
      setChartToCopy(null);
  }

  const chartToDelete = charts.find(c => c.id === confirmingDeleteChartId);

  if (!activeDashboard) {
    return (
        <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-secondary/50 rounded-lg">
            <p className="text-text-secondary text-lg mb-4">No dashboard selected.</p>
            <p className="text-text-secondary">Create a new dashboard to get started.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* The "Add Chart" button has been moved to the Header */}
      
      {dashboardCharts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-secondary/50 rounded-lg">
          <p className="text-text-secondary text-lg mb-4">Your dashboard is empty.</p>
          <p className="text-text-secondary">Click "Add Chart" in the header to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardCharts.map(chart => (
              <div key={chart.id} className="h-96">
                <ChartWrapper 
                  chart={chart} 
                  onEdit={handleEditChart} 
                  onDelete={handleDeleteRequest}
                  onCopy={handleCopyRequest}
                />
              </div>
            ))}
        </div>
      )}

      {isModalOpen && (
        <Modal 
          title={editingChart ? 'Edit Chart' : chartToCopy ? 'Copy Chart' : 'Add New Chart'} 
          onClose={closeModal}
        >
          <ChartForm
            chart={editingChart}
            initialData={chartToCopy}
            onSuccess={closeModal}
            dashboardId={activeDashboard.id}
          />
        </Modal>
      )}

      {chartToDelete && (
        <Modal title="Confirm Chart Deletion" onClose={() => setConfirmingDeleteChartId(null)}>
            <div className="space-y-4">
                <p className="text-text-secondary">Are you sure you want to delete the chart "{chartToDelete.name}"?</p>
                <div className="flex justify-end gap-4 pt-4">
                    <button onClick={() => setConfirmingDeleteChartId(null)} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={confirmDeleteChart} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Delete
                    </button>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default DashboardPage;