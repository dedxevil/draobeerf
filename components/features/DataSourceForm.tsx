import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { DataSource, DataSourceType } from '../../types';
import { DATA_SOURCE_TYPE_OPTIONS } from '../../constants';
import { testConnection } from '../../services/postgrestService';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface DataSourceFormProps {
  dataSource?: DataSource | null;
  onSuccess: () => void;
}

const DataSourceForm: React.FC<DataSourceFormProps> = ({ dataSource, onSuccess }) => {
  const { addDataSource, updateDataSource } = useAppContext();
  const [formData, setFormData] = useState<Omit<DataSource, 'id'>>({
    name: dataSource?.name || '',
    type: dataSource?.type || DataSourceType.Supabase,
    url: dataSource?.url || '',
    apiKey: dataSource?.apiKey || '',
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dataSource) {
      updateDataSource({ ...dataSource, ...formData });
    } else {
      addDataSource({ id: crypto.randomUUID(), ...formData });
    }
    onSuccess();
  };
  
  const handleTestConnection = async () => {
    if (!formData.url) {
        setTestStatus('error');
        setTestMessage('URL is required to test the connection.');
        return;
    }
    setTestStatus('testing');
    setTestMessage('');
    try {
        const success = await testConnection(formData);
        if (success) {
            setTestStatus('success');
            setTestMessage('Connection successful!');
        } else {
            setTestStatus('error');
            setTestMessage('Connection failed. Check URL, API Key, and CORS settings.');
        }
    } catch (error) {
        setTestStatus('error');
        setTestMessage('An unexpected error occurred.');
    }
  }

  const getPlaceholder = (field: 'url' | 'apiKey') => {
    if (field === 'url') {
        if (formData.type === DataSourceType.Supabase) return 'https://<project-id>.supabase.co/rest/v1';
        if (formData.type === DataSourceType.Neon) return 'https://<project-id>.neon.tech/rest/v1';
        if (formData.type === DataSourceType.REST) return 'https://your-api.com/base/path';
        return 'https://your-postgrest-api.com';
    }
    if (field === 'apiKey') {
        if (formData.type === DataSourceType.Supabase) return 'Supabase Anon Key';
        if (formData.type === DataSourceType.REST) return 'API Key / Bearer Token (Optional)';
        return 'Bearer Token (Optional)';
    }
    return '';
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Data Source Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g., Production DB"
        required
      />
      <Select
        label="Type"
        name="type"
        value={formData.type}
        onChange={handleChange}
        options={DATA_SOURCE_TYPE_OPTIONS}
      />
      <Input
        label="URL"
        name="url"
        type="url"
        value={formData.url}
        onChange={handleChange}
        placeholder={getPlaceholder('url')}
        required
      />
      <Input
        label="API Key / Bearer Token"
        name="apiKey"
        type="password"
        value={formData.apiKey}
        onChange={handleChange}
        placeholder={getPlaceholder('apiKey')}
      />
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center pt-4 gap-4">
        <div className="flex items-center w-full sm:w-auto">
            <button type="button" onClick={handleTestConnection} disabled={testStatus === 'testing'} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
             {testMessage && (
                <span className={`ml-4 text-sm font-medium ${testStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {testMessage}
                </span>
            )}
        </div>

        <button type="submit" className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto">
          {dataSource ? 'Save Changes' : 'Add Data Source'}
        </button>
      </div>
    </form>
  );
};

export default DataSourceForm;
