import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import ChartWrapper from '../features/ChartWrapper';
import { CommandCenter, ChartConfig } from '../../types';
import { ChevronLeftIcon } from '../layout/Icons';
import Tooltip from '../ui/Tooltip';

const CommandCenterPresentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { commandCenters, charts } = useAppContext();
  const navigate = useNavigate();
  
  const cc = commandCenters.find(c => c.id === id);

  // Effect to enter fullscreen on component mount
  useEffect(() => {
    const element = document.documentElement;
    const requestFullScreen = 
        element.requestFullscreen ||
        (element as any).mozRequestFullScreen ||
        (element as any).webkitRequestFullscreen ||
        (element as any).msRequestFullscreen;

    if (requestFullScreen) {
        requestFullScreen.call(element).catch((err: Error) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    }
  }, []);

  // Effect to handle exiting fullscreen (e.g., via ESC key)
  useEffect(() => {
    const handleFullScreenChange = () => {
        if (!document.fullscreenElement && !(document as any).webkitIsFullScreen && !(document as any).mozFullScreen) {
            navigate('/command-centers', { replace: true });
        }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);

    return () => {
        document.removeEventListener('fullscreenchange', handleFullScreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    };
  }, [navigate]);

  const handleExit = () => {
     const exitFullScreen = 
        document.exitFullscreen ||
        (document as any).mozCancelFullScreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).msExitFullscreen;

    if (exitFullScreen) {
        exitFullScreen.call(document);
    } else {
        // Fallback if not in fullscreen for some reason
        navigate('/command-centers', { replace: true });
    }
  };

  if (!cc) {
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-background text-text-primary">
            <h1 className="text-2xl font-bold mb-4">Command Center Not Found</h1>
            <p className="text-text-secondary mb-6">The requested command center does not exist or has been deleted.</p>
            <button onClick={() => navigate('/command-centers')} className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Return to Command Centers
            </button>
        </div>
    );
  }

  const layout = cc.layout || {};
  const ccCharts = cc.chartIds.map(chartId => charts.find(c => c.id === chartId)).filter(Boolean) as ChartConfig[];

  return (
    <div className="w-screen h-screen bg-background text-text-primary flex flex-col overflow-hidden">
        {/* Persistent, Opaque Header */}
        <header className="flex-shrink-0 h-16 bg-surface border-b border-secondary/20 flex items-center justify-between px-4 z-10">
            {/* Back Button */}
            <div className="flex-1 flex justify-start">
                <Tooltip text="Exit Presentation (Esc)" position="right">
                    <button onClick={handleExit} className="p-2 text-text-secondary hover:text-text-primary hover:bg-secondary/20 rounded-full">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                </Tooltip>
            </div>
            
            {/* Title */}
            <div className="flex-1 text-center">
                 <h1 className="text-xl font-semibold text-text-primary truncate" title={cc.name}>{cc.name}</h1>
            </div>

            {/* Spacer to keep title centered */}
            <div className="flex-1"></div>
        </header>

        <div className="flex-grow relative p-2">
            {ccCharts.map(chart => {
                const chartLayout = layout[chart.id] || { x: 0, y: 0, w: 33, h: 50 }; // Default layout
                if (!chartLayout) return null;
                return (
                    <div
                        key={chart.id}
                        className="absolute p-1"
                        style={{ left: `${chartLayout.x}%`, top: `${chartLayout.y}%`, width: `${chartLayout.w}%`, height: `${chartLayout.h}%` }}
                    >
                        <div className="w-full h-full overflow-hidden">
                            <ChartWrapper chart={chart} viewOnly={true} showTitleWhenViewOnly={true} />
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default CommandCenterPresentView;