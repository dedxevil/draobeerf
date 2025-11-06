import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { DataSource } from '../../types';
import Modal from '../ui/Modal';
import DataSourceForm from '../features/DataSourceForm';
import { DataSourceIcon } from '../layout/Icons';
import Tooltip from '../ui/Tooltip';

const DataSourcesPage: React.FC = () => {
  const { dataSources, deleteDataSource } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<DataSource | null>(null);

  const handleAdd = () => {
    setEditingDataSource(null);
    setIsModalOpen(true);
  };

  const handleEdit = (dataSource: DataSource) => {
    setEditingDataSource(dataSource);
    setIsModalOpen(true);
  };

  const handleDelete = (dataSource: DataSource) => {
    setConfirmingDelete(dataSource);
  };

  const confirmDelete = () => {
    if (confirmingDelete) {
      deleteDataSource(confirmingDelete.id);
      setConfirmingDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Data Sources</h2>
        <Tooltip text="Add a new data source">
          <button
            onClick={handleAdd}
            className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Add Data Source
          </button>
        </Tooltip>
      </div>

      {dataSources.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-secondary/30 rounded-lg">
          <p className="text-text-secondary text-lg mb-4">No data sources found.</p>
          <p className="text-text-secondary">Click "Add Data Source" to connect to your database.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-lg shadow-lg">
          <ul className="divide-y divide-secondary/20">
            {dataSources.map(ds => (
              <li key={ds.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-secondary/10 gap-4">
                <div className="flex items-center gap-4">
                  <DataSourceIcon className="w-8 h-8 text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary truncate">{ds.name}</p>
                    <p className="text-sm text-text-secondary truncate">{ds.type} - {ds.url}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end flex-shrink-0">
                  <Tooltip text="Edit data source">
                    <button onClick={() => handleEdit(ds)} className="text-sm py-1 px-3 bg-secondary hover:bg-secondary/70 rounded">Edit</button>
                  </Tooltip>
                  <Tooltip text="Delete data source">
                    <button onClick={() => handleDelete(ds)} className="text-sm py-1 px-3 bg-red-600 hover:bg-red-700 rounded">Delete</button>
                  </Tooltip>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isModalOpen && (
        <Modal title={editingDataSource ? 'Edit Data Source' : 'Add Data Source'} onClose={() => setIsModalOpen(false)}>
          <DataSourceForm
            dataSource={editingDataSource}
            onSuccess={() => setIsModalOpen(false)}
          />
        </Modal>
      )}

      {confirmingDelete && (
        <Modal title="Confirm Deletion" onClose={() => setConfirmingDelete(null)}>
          <div className="space-y-4">
            <p className="text-text-secondary">Are you sure you want to delete the data source "{confirmingDelete.name}"? This will also delete all associated charts.</p>
             <div className="flex justify-end gap-4 pt-4">
                    <button onClick={() => setConfirmingDelete(null)} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Delete
                    </button>
                </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DataSourcesPage;
