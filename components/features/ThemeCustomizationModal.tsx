
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ThemeColors } from '../../types';
import Modal from '../ui/Modal';
import { APP_THEMES } from '../../constants';
import { useToast } from '../../context/ToastContext';

interface ThemeCustomizationModalProps {
  themeId: string;
  onClose: () => void;
}

type ColorKey = keyof ThemeColors;

const colorLabels: Record<ColorKey, string> = {
    'primary': 'Primary',
    'accent': 'Accent',
    'background': 'Background',
    'surface': 'Surface',
    'secondary': 'Secondary',
    'text-primary': 'Primary Text',
    'text-secondary': 'Secondary Text',
};

const ThemeCustomizationModal: React.FC<ThemeCustomizationModalProps> = ({ themeId, onClose }) => {
    const { settings, updateThemeColors, resetThemeColors } = useAppContext();
    const { addToast } = useToast();

    // FIX: Retrieve the full theme object once to get both `name` and `colors`.
    const themeInfo = APP_THEMES.find(t => t.id === themeId);
    const themeDefaults = themeInfo?.colors;
    const themeName = themeInfo?.name || "Unknown Theme";
    const themeCustoms = settings.customColors?.[themeId] || {};
    
    const getInitialColors = () => ({
        ...themeDefaults,
        ...themeCustoms,
    });
    
    const [colors, setColors] = useState<Partial<ThemeColors>>(getInitialColors);

    useEffect(() => {
        setColors(getInitialColors());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [themeId, settings.customColors]);

    if (!themeDefaults) {
        return null;
    }

    const handleColorChange = (key: ColorKey, value: string) => {
        setColors(prev => ({...prev, [key]: value }));
    };

    const handleSave = () => {
        updateThemeColors(themeId, colors);
        // FIX: Use `themeName` which is correctly scoped, instead of trying to access `name` on the `colors` object.
        addToast(`Theme "${themeName}" updated!`, { type: 'success' });
        onClose();
    };

    const handleReset = () => {
        resetThemeColors(themeId);
        // FIX: Use `themeName` which is correctly scoped, instead of trying to access `name` on the `colors` object.
        addToast(`Theme "${themeName}" has been reset.`, { type: 'info' });
    };

    return (
        <Modal title={`Customize Theme: ${themeName}`} onClose={onClose}>
            <div className="space-y-4">
                {Object.entries(colorLabels).map(([key, label]) => {
                    const colorKey = key as ColorKey;
                    return (
                        <div key={key} className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full border border-secondary/50" style={{ backgroundColor: colors[colorKey] }} />
                                <label htmlFor={key} className="font-medium text-text-primary">{label}</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-text-secondary">{colors[colorKey]}</span>
                                <input
                                    id={key}
                                    type="color"
                                    value={colors[colorKey]}
                                    onChange={(e) => handleColorChange(colorKey, e.target.value)}
                                    className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="flex justify-between items-center pt-6 mt-4 border-t border-secondary/20">
                 <button type="button" onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                    Reset to Default
                </button>
                <div className="flex gap-4">
                    <button type="button" onClick={onClose} className="bg-secondary hover:bg-secondary/70 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Save Changes
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ThemeCustomizationModal;
