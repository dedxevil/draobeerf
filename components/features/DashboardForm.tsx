import React, { useState } from 'react';
import Input from '../ui/Input';
import { Dashboard } from '../../types';

interface DashboardFormProps {
  dashboard?: Dashboard | null;
  onSave: (name: string) => void;
  onCancel: () => void;
}

const DashboardForm: React.FC<DashboardFormProps> = ({ dashboard, onSave, onCancel }) => {
  const [name, setName] = useState(dashboard?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Dashboard Name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Marketing KPIs"
        required
        autoFocus
      />
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="submit" className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Save
        </button>
      </div>
    </form>
  );
};

export default DashboardForm;