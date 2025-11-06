import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { AppState } from '../../types';
import { useToast } from '../../context/ToastContext';
import Modal from '../ui/Modal';
import { APP_THEMES, APP_FONTS } from '../../constants';
import { encryptWorkspace, decryptWorkspace } from '../../services/cryptoService';
import Input from '../ui/Input';
import Tooltip from '../ui/Tooltip';

type PersistedState = Omit<AppState, 'triggeredAlerts' | 'lastTriggeredAlertTimestamp' | 'isCommandCenterEditMode'>;

const SettingsPage: React.FC = () => {
  const { 
    importWorkspace, 
    dataSources,
    charts,
    dashboards,
    commandCenters,
    settings,
    alerts,
    insights,
    toggleAIFeatures,
    updateGeminiApiKey,
    setTheme,
    setFont,
    resetWorkspace,
  } = useAppContext();
  const { addToast } = useToast();
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordModalMode, setPasswordModalMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [processing, setProcessing] = useState(false);
  
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [importData, setImportData] = useState<string | null>(null); // Store file content for decryption
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  const navigate = useNavigate();

  const [localApiKey, setLocalApiKey] = useState(settings.geminiApiKey || '');
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState<'idle' | 'saved'>('idle');

  const handleSaveApiKey = () => {
    updateGeminiApiKey(localApiKey);
    setApiKeySaveStatus('saved');
    setTimeout(() => setApiKeySaveStatus('idle'), 2000);
  };
  
  const handleExportRequest = () => {
    setPasswordModalMode('encrypt');
    setPassword('');
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };
  
  const executeExport = async () => {
    if (!password) {
        setPasswordError('Password cannot be empty.');
        return;
    }
    setProcessing(true);
    setPasswordError('');
    
    const stateToExport: PersistedState = {
        dataSources,
        charts,
        dashboards,
        commandCenters,
        settings,
        alerts,
        insights,
    };
    
    try {
        const jsonString = JSON.stringify(stateToExport, null, 2);
        const encryptedData = await encryptWorkspace(jsonString, password);
        
        const blob = new Blob([encryptedData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `freeboard-workspace-encrypted-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Encryption failed', error);
        addToast('Could not encrypt workspace. Please try again.', { type: 'error' });
    } finally {
        setProcessing(false);
        setIsPasswordModalOpen(false);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('Could not read file content.');
        
        // Try to parse to see if it's JSON
        const parsed = JSON.parse(text);

        // Check for encrypted structure
        if (parsed.salt && parsed.iv && parsed.ciphertext) {
            setImportData(text);
            setPasswordModalMode('decrypt');
            setPassword('');
            setPasswordError('');
            setIsPasswordModalOpen(true);
        } else if (parsed.dataSources && parsed.charts && parsed.settings) {
            // Assume it's a legacy unencrypted file
            importWorkspace(parsed);
            addToast('Unencrypted workspace imported successfully!', { type: 'success' });
            navigate('/dashboards');
        } else {
             throw new Error('Invalid or corrupted workspace file format.');
        }
        
      } catch (error) {
        // This might catch JSON.parse error for non-JSON files.
        const message = error instanceof Error ? error.message : "File is not a valid workspace file.";
        addToast(`Error importing file: ${message}`, { type: 'error' });
      }
    };
    reader.onerror = () => {
      addToast('Failed to read the file.', { type: 'error' });
    }
    reader.readAsText(file);
  };
  
  const executeImport = async () => {
    if (!password) {
      setPasswordError('Password is required to decrypt the file.');
      return;
    }
    if (!importData) return;

    setProcessing(true);
    setPasswordError('');

    try {
      const decryptedJson = await decryptWorkspace(importData, password);
      const importedState = JSON.parse(decryptedJson) as Partial<PersistedState>;
      importWorkspace(importedState);
      addToast('Workspace decrypted and imported successfully!', { type: 'success' });
      navigate('/dashboards');
      setIsPasswordModalOpen(false);
    } catch (error: any) {
      setPasswordError(error.message || 'Decryption failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleImportRequest = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isFreshWorkspace = dataSources.length === 0 &&
                             charts.length === 0 &&
                             dashboards.length <= 1 &&
                             alerts.length === 0 &&
                             commandCenters.length === 0;

    if (isFreshWorkspace) {
      processFile(file);
    } else {
      setFileToImport(file);
      setIsConfirmModalOpen(true);
    }
    event.target.value = '';
  };
  
  const confirmImport = () => {
    if (!fileToImport) return;
    processFile(fileToImport);
    setIsConfirmModalOpen(false);
    setFileToImport(null);
  };

  const handlePasswordModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordModalMode === 'encrypt') {
        executeExport();
    } else {
        executeImport();
    }
  }

  const handleConfirmReset = () => {
    resetWorkspace();
    setIsResetModalOpen(false);
    navigate('/dashboards');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      
       <div className="bg-surface rounded-lg shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">API Keys</h3>
        <p className="text-text-secondary text-sm">
          Provide your own Gemini API key to enable AI features like the assistant, automated insights, and SQL-to-REST conversion. Your key is stored locally in your browser and is never shared.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 items-end pt-2">
            <div className="w-full">
                <Input
                    label="Gemini API Key"
                    type="password"
                    name="geminiApiKey"
                    value={localApiKey}
                    onChange={(e) => { setLocalApiKey(e.target.value); setApiKeySaveStatus('idle'); }}
                    placeholder="Enter your Gemini API key"
                />
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
                <button 
                  onClick={handleSaveApiKey} 
                  className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full"
                >
                  {apiKeySaveStatus === 'saved' ? 'Saved!' : 'Save Key'}
                </button>
            </div>
        </div>
        <p className="text-xs text-text-secondary">
          Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google AI Studio</a>.
        </p>
      </div>

      <div className="bg-surface rounded-lg shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">AI Features</h3>
        <div className="flex justify-between items-center">
            <div>
                <p className="text-text-primary">AI Chart Analysis & Assistant</p>
                <p className="text-text-secondary text-sm">
                    Enable or disable AI features. An API key must be provided above for these to function.
                </p>
                 {settings.aiFeaturesEnabled && !settings.geminiApiKey && (
                  <p className="text-xs text-yellow-400 mt-1">Warning: AI features are enabled, but no API key has been provided.</p>
                )}
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.aiFeaturesEnabled} onChange={toggleAIFeatures} className="sr-only peer" />
                <div className="w-11 h-6 bg-secondary rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Font</h3>
        <p className="text-text-secondary text-sm">
          Select a font for the application interface.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {APP_FONTS.map((font) => (
            <button
                key={font.id}
                onClick={() => setFont(font.id)}
                className={`p-3 rounded-lg transition-all duration-200 border-2 text-left ${
                settings.font === font.id
                    ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-surface'
                    : 'border-secondary/30 hover:border-primary/50'
                }`}
            >
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-text-primary" style={{ fontFamily: font.family }}>{font.name}</span>
                </div>
                <p className="text-xl text-text-secondary truncate mt-2" style={{ fontFamily: font.family }}>Aa Bb Cc</p>
            </button>
            ))}
        </div>
      </div>
      
      <div className="bg-surface rounded-lg shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Appearance</h3>
        <p className="text-text-secondary text-sm">
          Customize the look and feel of your Freeboard workspace. Select a theme that suits your style.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
          {APP_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`p-3 rounded-lg transition-all duration-200 border-2 text-left ${
                settings.theme === theme.id
                  ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-surface'
                  : 'border-secondary/30 hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-text-primary">{theme.name}</span>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
              </div>
              <div className="flex gap-1 h-8 rounded" style={{ backgroundColor: theme.colors.background }}>
                <div className="w-1/3 rounded-l" style={{ backgroundColor: theme.colors.surface }}></div>
                <div className="w-2/3 flex items-center justify-end pr-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                </div>
              </div>
              <div className={`text-xs mt-2 text-text-secondary capitalize`}>{theme.base}</div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-surface rounded-lg shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Workspace Management</h3>
        <p className="text-text-secondary text-sm">
          Export your entire workspace as a single encrypted JSON file for backup or sharing. You can import it later to restore your setup.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
           <button onClick={handleExportRequest} className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Export Encrypted Workspace
           </button>
           <label className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer text-center">
              Import Workspace
              <input type="file" accept=".json" className="hidden" onChange={handleImportRequest} />
           </label>
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow-lg p-6 space-y-4 border-2 border-red-500/50">
        <h3 className="text-lg font-semibold text-red-500">Danger Zone</h3>
        <p className="text-text-secondary text-sm">
            This action is irreversible and will delete all dashboards, charts, and data sources.
        </p>
        <div className="flex pt-2">
            <button onClick={() => setIsResetModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Reset Workspace
            </button>
        </div>
      </div>

      {isConfirmModalOpen && (
        <Modal title="Confirm Workspace Import" onClose={() => setIsConfirmModalOpen(false)}>
            <div className="space-y-4">
                <p className="text-text-secondary">This will overwrite your entire workspace, including all dashboards, data sources, and alerts. This action cannot be undone.</p>
                <p className="font-bold">Are you sure you want to continue?</p>
                <div className="flex justify-end gap-4 pt-4">
                    <button onClick={() => setIsConfirmModalOpen(false)} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={confirmImport} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Confirm & Overwrite
                    </button>
                </div>
            </div>
        </Modal>
      )}
      
      {isPasswordModalOpen && (
        <Modal 
            title={passwordModalMode === 'encrypt' ? "Set Encryption Password" : "Enter Decryption Password"}
            onClose={() => setIsPasswordModalOpen(false)}
        >
            <form onSubmit={handlePasswordModalSubmit} className="space-y-4">
                <p className="text-text-secondary text-sm">
                    {passwordModalMode === 'encrypt' 
                        ? 'Please enter a strong password to encrypt your workspace file.'
                        : 'This workspace file is encrypted. Please enter the password to decrypt it.'}
                </p>
                <Input 
                    label="Password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                    autoFocus
                    required
                />
                {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={processing} className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                        {processing 
                            ? 'Processing...' 
                            : (passwordModalMode === 'encrypt' ? 'Encrypt & Export' : 'Decrypt & Import')
                        }
                    </button>
                </div>
            </form>
        </Modal>
      )}

      {isResetModalOpen && (
        <Modal title="Confirm Workspace Reset" onClose={() => setIsResetModalOpen(false)}>
            <div className="space-y-4">
                <p className="text-text-secondary">This will permanently delete all your data sources, dashboards, charts, alerts, and settings. This action cannot be undone.</p>
                <p className="font-bold text-text-primary">Are you sure you want to completely reset your workspace?</p>
                <div className="flex justify-end gap-4 pt-4">
                    <button onClick={() => setIsResetModalOpen(false)} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleConfirmReset} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Yes, Reset Workspace
                    </button>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default SettingsPage;