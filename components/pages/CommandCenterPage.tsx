import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CommandCenter, ChartConfig } from '../../types';
import ChartWrapper from '../features/ChartWrapper';
import Modal from '../ui/Modal';
import CommandCenterForm from '../features/CommandCenterForm';
import { CloseIcon } from '../layout/Icons';
import Tooltip from '../ui/Tooltip';

type Layout = CommandCenter['layout'];

const CommandCenterPage: React.FC = () => {
    const { 
        commandCenters, 
        charts, 
        settings, 
        updateCommandCenter,
        isCommandCenterEditMode,
        setCommandCenterEditMode
    } = useAppContext();
    
    const [activeCC, setActiveCC] = useState<CommandCenter | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    
    const [layout, setLayout] = useState<Layout>({});
    const [isDirty, setIsDirty] = useState(false);
    const [activeDrag, setActiveDrag] = useState<{ id: string, type: 'move' | 'resize', initialX: number, initialY: number, initialMouseX: number, initialMouseY: number, initialW: number, initialH: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const layoutSaveTimeout = useRef<number | null>(null);
    
    // Sync active CC with context
    useEffect(() => {
        let currentActiveId = settings.activeCommandCenterId;
        if (!currentActiveId && commandCenters.length > 0) {
            currentActiveId = commandCenters[0].id;
        }

        const foundCc = commandCenters.find(c => c.id === currentActiveId) || null;
        setActiveCC(foundCc);

        if (foundCc) {
            setLayout(foundCc.layout || {});
        }
    }, [settings.activeCommandCenterId, commandCenters]);
    
    // Auto-save layout with debounce
    useEffect(() => {
        if (isDirty && activeCC) {
            if (layoutSaveTimeout.current) clearTimeout(layoutSaveTimeout.current);
            layoutSaveTimeout.current = window.setTimeout(() => {
                updateCommandCenter({ ...activeCC, layout });
                setIsDirty(false);
            }, 1000);
        }
        return () => { if (layoutSaveTimeout.current) clearTimeout(layoutSaveTimeout.current); };
    }, [layout, isDirty, activeCC, updateCommandCenter]);

    // Cleanup effect to reset edit mode when navigating away
    useEffect(() => {
        return () => {
            setCommandCenterEditMode(false);
        };
    }, [setCommandCenterEditMode]);

    // Drag and resize handlers
    const handleMouseDown = (e: React.MouseEvent, id: string, type: 'move' | 'resize') => {
        if (!isCommandCenterEditMode || !containerRef.current || !activeCC) return;
        const itemLayout = layout[id];
        const { width, height } = containerRef.current.getBoundingClientRect();
        setActiveDrag({
            id, type,
            initialX: itemLayout.x / 100 * width,
            initialY: itemLayout.y / 100 * height,
            initialW: itemLayout.w / 100 * width,
            initialH: itemLayout.h / 100 * height,
            initialMouseX: e.clientX,
            initialMouseY: e.clientY,
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!activeDrag || !containerRef.current) return;
        e.preventDefault();
        const { width, height } = containerRef.current.getBoundingClientRect();
        const dx = e.clientX - activeDrag.initialMouseX;
        const dy = e.clientY - activeDrag.initialMouseY;
        
        const newLayout = { ...layout };
        let chartLayout = { ...newLayout[activeDrag.id] };

        if (activeDrag.type === 'move') {
            chartLayout.x = Math.max(0, Math.min(100 - chartLayout.w, (activeDrag.initialX + dx) / width * 100));
            chartLayout.y = Math.max(0, Math.min(100 - chartLayout.h, (activeDrag.initialY + dy) / height * 100));
        } else if (activeDrag.type === 'resize') {
            chartLayout.w = Math.max(10, (activeDrag.initialW + dx) / width * 100);
            chartLayout.h = Math.max(10, (activeDrag.initialH + dy) / height * 100);
        }
        
        newLayout[activeDrag.id] = chartLayout;
        setLayout(newLayout);
        setIsDirty(true);
    }, [activeDrag, layout]);

    const handleMouseUp = useCallback(() => setActiveDrag(null), []);

    useEffect(() => {
        if (activeDrag) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [activeDrag, handleMouseMove, handleMouseUp]);
    
    const handleRemoveChart = (chartIdToRemove: string) => {
        if (!activeCC) return;
        const newChartIds = activeCC.chartIds.filter(id => id !== chartIdToRemove);
        updateCommandCenter({ ...activeCC, chartIds: newChartIds });
    };

    if (commandCenters.length === 0) {
        return (
            <>
                <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-secondary/50 rounded-lg">
                    <p className="text-text-secondary text-lg mb-4">No Command Centers created yet.</p>
                    <p className="text-text-secondary text-sm">Click the "Create Command Center" button in the header to begin.</p>
                </div>
                {isFormModalOpen && (
                    <Modal title="Create Command Center" onClose={() => setIsFormModalOpen(false)}>
                        <CommandCenterForm onSuccess={() => setIsFormModalOpen(false)} />
                    </Modal>
                )}
            </>
        );
    }
    
    if (!activeCC) {
        return <div className="text-text-secondary flex items-center justify-center h-full">Select a Command Center to view.</div>;
    }
    
    const activeCcCharts = activeCC.chartIds.map(id => charts.find(c => c.id === id)).filter(Boolean) as ChartConfig[];

    return (
        <div className="flex flex-col h-full">
            {/* Grid Area */}
            <div ref={containerRef} className="flex-grow relative bg-background/50 overflow-hidden">
                {activeCcCharts.map(chart => {
                    const chartLayout = layout[chart.id] || { x: 0, y: 0, w: 33, h: 50 }; // Default layout
                    return (
                        <div key={chart.id} className={`absolute group ${isCommandCenterEditMode ? 'p-4 border-2 border-dashed border-accent/50 rounded-lg bg-surface/20' : 'p-1 transition-all duration-300'} ${activeDrag?.id === chart.id ? 'z-20 ring-2 ring-offset-2 ring-offset-background ring-accent' : 'z-10'}`}
                            style={{ left: `${chartLayout.x}%`, top: `${chartLayout.y}%`, width: `${chartLayout.w}%`, height: `${chartLayout.h}%` }}>
                            <ChartWrapper
                                chart={chart}
                                viewOnly={!isCommandCenterEditMode}
                                onHeaderMouseDown={isCommandCenterEditMode ? (e) => handleMouseDown(e, chart.id, 'move') : undefined}
                                showActions={false}
                            />
                            {isCommandCenterEditMode && (
                                <>
                                    <Tooltip text="Remove from Command Center">
                                        <button 
                                            onClick={() => handleRemoveChart(chart.id)} 
                                            className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-full transform translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                        >
                                            <CloseIcon className="w-3 h-3" />
                                        </button>
                                    </Tooltip>
                                    <div onMouseDown={(e) => handleMouseDown(e, chart.id, 'resize')} className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent cursor-se-resize z-10 rounded-full border-2 border-surface" title={`Resize ${chart.name}`} />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CommandCenterPage;
