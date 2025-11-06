import React, { useState, useEffect, useRef } from 'react';
import { generateText } from '../../services/geminiService';
import { AIIcon, LightbulbIcon } from '../layout/Icons';
import ReactMarkdown from 'react-markdown';
import Tooltip from '../ui/Tooltip';
import { Insight, InsightCategory, ChartType } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

type DisplayItem = 
    | { type: 'chat', data: Message }
    | { type: 'insight', data: Insight };

// New type for grouped items
type ProcessedDisplayItem =
    | { type: 'chat', data: Message }
    | { type: 'insight-group', data: Insight[] };


interface AIAssistantProps {
    insights: Insight[];
}

const INSIGHT_CATEGORY_STYLES: Record<InsightCategory, { bgColor: string, borderColor: string, name: string }> = {
    anomaly: { bgColor: 'bg-red-500', borderColor: 'border-red-500', name: 'Anomaly' },
    trend: { bgColor: 'bg-blue-500', borderColor: 'border-blue-500', name: 'Trend' },
    forecast: { bgColor: 'bg-purple-500', borderColor: 'border-purple-500', name: 'Forecast' },
    info: { bgColor: 'bg-green-500', borderColor: 'border-green-500', name: 'Info' },
    error: { bgColor: 'bg-gray-500', borderColor: 'border-gray-500', name: 'Error' },
};

const AIAssistant: React.FC<AIAssistantProps> = ({ insights }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [processedDisplayItems, setProcessedDisplayItems] = useState<ProcessedDisplayItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { charts, settings } = useAppContext();
  const { aiFeaturesEnabled, geminiApiKey } = settings;

  useEffect(() => {
    const chatItems: DisplayItem[] = messages.map(m => ({ type: 'chat', data: m }));
    const insightItems: DisplayItem[] = insights.map(i => ({ type: 'insight', data: i }));

    const allItems = [...chatItems, ...insightItems];
    allItems.sort((a, b) => new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime());

    const newProcessedItems: ProcessedDisplayItem[] = [];
    let currentInsightGroup: Insight[] = [];

    for (const item of allItems) {
        if (item.type === 'insight') {
            currentInsightGroup.push(item.data);
        } else {
            if (currentInsightGroup.length > 0) {
                newProcessedItems.push({ type: 'insight-group', data: currentInsightGroup });
                currentInsightGroup = [];
            }
            newProcessedItems.push(item);
        }
    }
    // Add any remaining insights at the end
    if (currentInsightGroup.length > 0) {
        newProcessedItems.push({ type: 'insight-group', data: currentInsightGroup });
    }

    setProcessedDisplayItems(newProcessedItems);
  }, [messages, insights]);

  useEffect(() => {
    // Auto-scroll to bottom on new message
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [processedDisplayItems, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !geminiApiKey) return;
    const userMessage: Message = { id: crypto.randomUUID(), sender: 'user', text: input, timestamp: new Date().toISOString() };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    // Build data context from active dashboard charts
    const activeDashboardCharts = charts.filter(c => c.dashboardId === settings.activeDashboardId);
    const dataContext = activeDashboardCharts.map(chart => {
        const latestData = chart.dataHistory?.[0]?.data;
        const { type, name, options } = chart;

        let chartInfo = `Chart: "${name}" (Type: ${type})`;
        
        switch(type) {
            case ChartType.Bar:
            case ChartType.Line:
            case ChartType.StackedBar:
            case ChartType.Area:
            case ChartType.StackedArea:
                chartInfo += `\n- X-Axis: ${options.xAxisKey}\n- Y-Axis: ${options.yAxisKey}`;
                break;
            case ChartType.Scatter:
                chartInfo += `\n- X-Axis: ${options.xAxisKey}\n- Y-Axis: ${options.yAxisKey}`;
                if (options.zAxisKey) chartInfo += `\n- Bubble Size: ${options.zAxisKey}`;
                break;
            case ChartType.Pie:
            case ChartType.Donut:
            case ChartType.Funnel:
            case ChartType.Treemap:
                chartInfo += `\n- Labels: ${options.labelKey}\n- Values: ${options.valueKey}`;
                break;
            case ChartType.Heatmap:
                chartInfo += `\n- X-Category: ${options.xAxisKey}\n- Y-Category: ${options.yAxisKey}\n- Value: ${options.valueKey}`;
                break;
            case ChartType.Number:
            case ChartType.Gauge:
                chartInfo += `\n- Value: ${options.valueKey}`;
                if (options.unit) chartInfo += ` (${options.unit})`;
                break;
            case ChartType.Table:
                if (options.tableColumns && options.tableColumns.length > 0) {
                    chartInfo += `\n- Displayed Columns: ${options.tableColumns.slice(0,5).join(', ')}`;
                }
                break;
        }

        if (!latestData || latestData.length === 0) {
            return `${chartInfo}\n- Data: Not available or empty.`;
        }
        
        const dataSample = JSON.stringify(latestData.slice(0, 5)); 
        return `${chartInfo}\n- Data Sample: ${dataSample}`;
    }).join('\n\n---\n\n');


    try {
      const aiResponse = await generateText(input, dataContext, geminiApiKey);
      const aiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: aiResponse, timestamp: new Date().toISOString() };
      setMessages([...newMessages, aiMessage]);
    } catch (error) {
      const errorMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: 'Sorry, I had trouble connecting. Please try again.', timestamp: new Date().toISOString() };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (!aiFeaturesEnabled) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <AIIcon className="w-12 h-12 text-text-secondary mb-4" />
          <p className="font-semibold">AI Features Disabled</p>
          <p className="text-sm text-text-secondary">
            You can enable the AI Assistant and other AI-powered features in the Settings page.
          </p>
        </div>
      );
    }

    if (!geminiApiKey) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <AIIcon className="w-12 h-12 text-text-secondary mb-4" />
          <p className="font-semibold">Gemini API Key Required</p>
          <p className="text-sm text-text-secondary">
            Please add your Gemini API key in the Settings page to use the AI Assistant.
          </p>
        </div>
      );
    }

    return (
      <>
        <div 
            ref={scrollContainerRef} 
            className="flex-grow p-4 overflow-y-auto freeboard-scrollbar"
        >
            <div className="flex flex-col gap-4">
                {processedDisplayItems.map((item) => {
                if (item.type === 'chat') {
                    const msg = item.data;
                    const key = `chat-${msg.id}`;
                    return (
                        <div key={key} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`rounded-lg px-4 py-2 max-w-xs lg:max-w-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-secondary/40'}`}>
                                <div className="prose prose-sm prose-invert">
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    );
                }
                if (item.type === 'insight-group') {
                    const insightsGroup = item.data;
                    const key = `insight-group-${insightsGroup[0].id}`;
                    return (
                        <div key={key} className="p-3 rounded-lg bg-secondary/30">
                            <p className="text-xs font-semibold mb-2 text-text-secondary uppercase">Automated Insights</p>
                            <ul className="space-y-3">
                                {insightsGroup.map(insight => {
                                    const style = INSIGHT_CATEGORY_STYLES[insight.category];
                                    return (
                                        <li key={insight.id} className="flex items-start gap-3">
                                            <LightbulbIcon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"/>
                                            <div className="flex-1">
                                                    <p className="text-sm text-text-secondary break-words">{insight.text}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${style.bgColor}`}>{style.name}</span>
                                                        <p className="text-xs text-text-secondary/70">{new Date(insight.timestamp).toLocaleString()}</p>
                                                    </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                }
                return null;
                })}
            </div>
            {isLoading && (
                <div className="flex justify-start mt-4">
                    <div className="rounded-lg px-4 py-2 bg-secondary/40">
                        <div className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"></span>
                            <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse delay-75"></span>
                            <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse delay-150"></span>
                        </div>
                    </div>
                </div>
            )}
        </div>
        <div className="p-4 border-t border-secondary/20">
            <div className="relative">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask about your data..."
                className="w-full bg-secondary text-text-primary rounded-lg p-2 pr-10 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                rows={2}
                disabled={isLoading || !geminiApiKey}
            />
            <Tooltip text="Send message (Enter)" position="left">
                <button
                onClick={handleSend}
                disabled={isLoading || !geminiApiKey}
                className="absolute right-2 bottom-2 text-accent disabled:text-secondary p-1 rounded-full hover:bg-secondary/40 disabled:hover:bg-transparent"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                </button>
            </Tooltip>
            </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {renderContent()}
    </div>
  );
};

export default AIAssistant;