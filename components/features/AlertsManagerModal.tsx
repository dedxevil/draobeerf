import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChartConfig, Alert, AlertConditionOperator } from '../../types';
import { useToast } from '../../context/ToastContext';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { PencilIcon, PlusIcon, TrashIcon } from '../layout/Icons';
import Tooltip from '../ui/Tooltip';

interface AlertsManagerModalProps {
  chart: ChartConfig;
  dataSample: any | null;
  relevantFields: string[];
  onClose: () => void;
}

const operatorOptions = [
    { value: AlertConditionOperator.GreaterThanOrEqual, label: 'Greater Than or Equal To (>=)' },
    { value: AlertConditionOperator.LessThanOrEqual, label: 'Less Than or Equal To (<=)' },
    { value: AlertConditionOperator.EqualTo, label: 'Equal To (==)' },
    { value: AlertConditionOperator.GreaterThan, label: 'Greater Than (>)' },
    { value: AlertConditionOperator.LessThan, label: 'Less Than (<)' },
];

interface AlertFormData {
    chartId: string;
    name: string;
    field: string;
    operator: AlertConditionOperator;
    threshold: string; // Use string for form state to allow flexible input
    isEnabled: boolean;
    customMessage: string;
}

const getNestedValue = (obj: any, path: string): any => {
    if (!path || typeof path !== 'string') return undefined;
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
};

const AlertForm: React.FC<{chart: ChartConfig, alertToEdit?: Alert | null, relevantFields: string[], dataSample: any | null, onSave: () => void, onCancel: () => void}> = ({ chart, alertToEdit, relevantFields, dataSample, onSave, onCancel }) => {
    const { addAlert, updateAlert } = useAppContext();
    const { addToast } = useToast();
    const [formData, setFormData] = useState<AlertFormData>({
        chartId: chart.id,
        name: alertToEdit?.name || '',
        field: alertToEdit?.field || '',
        operator: alertToEdit?.operator || AlertConditionOperator.GreaterThanOrEqual,
        threshold: alertToEdit?.threshold != null ? String(alertToEdit.threshold) : '0',
        isEnabled: alertToEdit?.isEnabled ?? true,
        customMessage: alertToEdit?.customMessage || '',
    });

    const dataKeys = relevantFields.map(k => ({ value: k, label: k }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             const { checked } = e.target as HTMLInputElement;
             setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.field) {
            addToast('Please select a field to monitor.', { type: 'warning' });
            return;
        }
        
        const numericThreshold = parseFloat(formData.threshold);
        if (isNaN(numericThreshold)) {
            addToast('Please provide a valid number for the threshold.', { type: 'warning' });
            return;
        }

        if (alertToEdit) {
            updateAlert({ 
                ...alertToEdit, 
                ...formData,
                threshold: numericThreshold // override with number
            });
        } else {
            let initialStatus: 'ok' | 'triggered' = 'ok';

            // Silently set initial state to 'triggered' if condition is already met
            if (dataSample && formData.field) {
                const value = getNestedValue(dataSample, formData.field);
                if (value !== undefined && value !== null) {
                    const sanitizedValue = String(value).replace(/[^0-9.-]+/g, "");
                    const numericValue = sanitizedValue === '' ? NaN : Number(sanitizedValue);
                    if (!isNaN(numericValue)) {
                        let conditionMet = false;
                        switch (formData.operator) {
                            case AlertConditionOperator.GreaterThan: conditionMet = numericValue > numericThreshold; break;
                            case AlertConditionOperator.LessThan: conditionMet = numericValue < numericThreshold; break;
                            case AlertConditionOperator.EqualTo: conditionMet = numericValue === numericThreshold; break;
                            case AlertConditionOperator.GreaterThanOrEqual: conditionMet = numericValue >= numericThreshold; break;
                            case AlertConditionOperator.LessThanOrEqual: conditionMet = numericValue <= numericThreshold; break;
                        }
                        if (conditionMet) {
                            initialStatus = 'triggered';
                        }
                    }
                }
            }

            addAlert({
                id: crypto.randomUUID(),
                chartId: formData.chartId,
                name: formData.name,
                field: formData.field,
                operator: formData.operator,
                isEnabled: formData.isEnabled,
                threshold: numericThreshold,
                customMessage: formData.customMessage,
                lastChecked: new Date().toISOString(),
                status: initialStatus,
            });
        }
        onSave();
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-secondary/30 rounded-lg mt-4 space-y-4">
             <Input label="Alert Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., High Revenue Threshold" required />
             <div className="grid grid-cols-3 gap-2">
                 <div className="col-span-1">
                    <Select label="Field" name="field" value={formData.field} onChange={handleChange} options={[{value: '', label: 'Select Field'}, ...dataKeys]} required/>
                 </div>
                 <div className="col-span-1">
                    <Select label="Condition" name="operator" value={formData.operator} onChange={handleChange} options={operatorOptions} />
                 </div>
                 <div className="col-span-1">
                    <Input label="Threshold" name="threshold" type="number" value={formData.threshold} onChange={handleChange} required step="any" />
                 </div>
             </div>
            <Input label="Custom Message (Optional)" name="customMessage" value={formData.customMessage} onChange={handleChange} placeholder="Overrides default notification message" />
             <div className="flex justify-between items-center pt-2">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input type="checkbox" name="isEnabled" checked={formData.isEnabled} onChange={handleChange} className="form-checkbox h-4 w-4 rounded bg-secondary text-primary focus:ring-primary" />
                    Enabled
                </label>
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Cancel</button>
                    <button type="submit" className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                        {alertToEdit ? 'Save Alert' : 'Add Alert'}
                    </button>
                </div>
             </div>
        </form>
    )
}


const AlertsManagerModal: React.FC<AlertsManagerModalProps> = ({ chart, dataSample, relevantFields, onClose }) => {
  const { alerts, deleteAlert, updateAlert } = useAppContext();
  const chartAlerts = alerts.filter(a => a.chartId === chart.id);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  const handleAddClick = () => {
    setEditingAlert(null);
    setIsFormVisible(true);
  }

  const handleEditClick = (alert: Alert) => {
    setEditingAlert(alert);
    setIsFormVisible(true);
  }
  
  const handleToggle = (alert: Alert) => {
    updateAlert({...alert, isEnabled: !alert.isEnabled});
  }

  const handleSave = () => {
    setIsFormVisible(false);
    setEditingAlert(null);
  }

  return (
    <Modal title={`Manage Alerts for "${chart.name}"`} onClose={onClose}>
      <div className="space-y-4">
        <div>
            {chartAlerts.length === 0 && !isFormVisible && (
                <p className="text-text-secondary text-center p-4">No alerts configured for this chart.</p>
            )}
            <ul className="space-y-2">
                {chartAlerts.map(alert => (
                    <li key={alert.id} className="p-3 bg-secondary/20 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-text-primary">{alert.name}</p>
                            <p className="text-sm text-text-secondary">{`When ${alert.field} ${alert.operator} ${alert.threshold}`}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${alert.status === 'triggered' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>{alert.status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tooltip text={alert.isEnabled ? 'Disable alert' : 'Enable alert'}>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={alert.isEnabled} onChange={() => handleToggle(alert)} className="sr-only peer" />
                                  <div className="w-11 h-6 bg-secondary rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                              </label>
                            </Tooltip>
                            <Tooltip text="Edit alert">
                              <button onClick={() => handleEditClick(alert)} className="p-2 hover:bg-secondary/40 rounded-full"><PencilIcon className="w-4 h-4 text-text-secondary" /></button>
                            </Tooltip>
                            <Tooltip text="Delete alert">
                              <button onClick={() => deleteAlert(alert.id)} className="p-2 hover:bg-secondary/40 rounded-full"><TrashIcon className="w-4 h-4 text-red-500" /></button>
                            </Tooltip>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
        
        {!isFormVisible && (
             <Tooltip text={relevantFields.length === 0 ? "Configure chart with valid keys before adding an alert" : "Configure a new alert"}>
               <button
                  onClick={handleAddClick}
                  disabled={relevantFields.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-primary/20 text-primary hover:bg-primary/30 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  <PlusIcon className="w-5 h-5" />
                  Add New Alert
              </button>
            </Tooltip>
        )}
        {relevantFields.length === 0 && <p className="text-xs text-center text-text-secondary">Data must be loaded and chart configured with valid keys before adding an alert.</p>}
        
        {isFormVisible && (
            <AlertForm 
                chart={chart} 
                alertToEdit={editingAlert} 
                relevantFields={relevantFields} 
                dataSample={dataSample}
                onSave={handleSave} 
                onCancel={() => { setIsFormVisible(false); setEditingAlert(null); }}
            />
        )}
      </div>
    </Modal>
  );
};

export default AlertsManagerModal;