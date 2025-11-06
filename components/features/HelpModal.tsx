import React, { useState } from 'react';
import Modal from '../ui/Modal';
import ReactMarkdown from 'react-markdown';
import { ChevronDownIcon, StarIcon, LayersIcon, BarChartIcon, AIIcon, DashboardIcon, AlertIcon, SettingsIcon, RocketIcon, CodeIcon } from '../layout/Icons';

// A color palette for the section titles to make them more recognizable.
const sectionColors = ['#1A73E8', '#F4A261', '#2A9D8F', '#E76F51', '#8E44AD', '#F1C40F'];

const helpSections = [
  {
    id: 'key-features',
    icon: StarIcon,
    title: 'Key Features',
    color: sectionColors[0],
    content: `
-   **Serverless by Design**: Runs entirely in the browser. All your data source credentials, chart configurations, and dashboards are stored securely in your local browser storage.
-   **Bring Your Own Key (BYOK)**: Provide your own Gemini API key in the settings to power all AI capabilities, giving you full control over your usage.
-   **Versatile Data Connections**: Natively supports PostgREST APIs (Supabase, Neon) and generic REST APIs.
-   **Rich Chart Library**: Visualize your data with a wide array of chart types including Bar, Stacked Bar, Line, Pie, Donut, Gauge, Single Number, and Table.
-   **AI-Powered Assistant**: Ask natural language questions about your dashboard data and get instant, synthesized answers.
-   **Automated Insights**: The AI automatically analyzes data on refresh to identify and notify you of anomalies, trends, and forecasts.
-   **Seamless Querying**: Write simple table names or complex SQL queries. The AI transparently converts SQL to the required PostgREST format for you.
-   **Customizable Dashboards**: Create multiple dashboards to organize your charts by project, team, or any other criteria.
-   **Command Centers**: Build presentation-ready views by arranging charts from any of your dashboards onto a single, dynamic grid layout.
-   **Data-Driven Alerts**: Set up custom alerts on your chart data with various conditions (e.g., value > 100) and receive browser notifications when they trigger.
-   **Secure Workspace Portability**: Export your entire workspace (data sources, charts, dashboards, API key) into a single, password-encrypted file for easy backup, sharing, or migration.
-   **Deep Customization**: Personalize your workspace with multiple themes (e.g., Spotify Dark, Google Light) and a selection of professional fonts.
    `
  },
  {
    id: 'feature-breakdown',
    icon: LayersIcon,
    title: 'Feature Breakdown',
    color: sectionColors[1],
    content: `This section provides more detail on the core features of Freeboard.`
  },
  {
    id: 'charts',
    icon: BarChartIcon,
    title: 'Chart Creation & Visualization',
    color: sectionColors[2],
    content: `
-   **Multiple Chart Types**:
    -   **Bar & Stacked Bar**: Compare values across categories.
    -   **Line**: Track changes over time, with support for multiple lines.
    -   **Pie & Donut**: Show proportional data.
    -   **Gauge**: Monitor a single metric against a target range.
    -   **Single Number**: Highlight a key performance indicator (KPI).
    -   **Table**: Display raw data with filtering and sorting.
-   **Flexible Configuration**: Customize charts with axis keys, labels, units, color schemes, and more.
-   **Auto-Refresh**: Keep your data fresh by setting a custom refresh interval for any chart.
-   **Export to PNG**: Easily export any chart as a high-quality PNG image for reports or presentations.
    `
  },
  {
    id: 'ai-features',
    icon: AIIcon,
    title: 'AI-Powered Features',
    color: sectionColors[3],
    content: `
-   **AI Assistant**: Open the sidebar to chat with the AI. It uses the data from your currently active dashboard as context to answer questions like "Which product had the highest sales last month?" or "Summarize the user activity."
-   **Automated Insights**: Freeboard's AI proactively monitors your data. When a chart refreshes, it compares the new data to historical points and generates a concise, single-sentence insight if it detects a significant anomaly, trend, or pattern.
-   **Smart SQL Conversion**: If you prefer writing SQL, simply type your \`SELECT\` statement into the query box. The app uses an AI model to instantly and automatically convert it into a PostgREST-compatible API path behind the scenes.
    `
  },
  {
    id: 'workspace-management',
    icon: DashboardIcon,
    title: 'Workspace & Layout Management',
    color: sectionColors[4],
    content: `
-   **Dashboards**: The primary space for your charts. Create as many as you need, easily switch between them, and add, edit, or delete charts.
-   **Command Centers**:
    -   Create high-level overview screens for presentations or monitoring.
    -   Select charts from any dashboard to add to a command center.
    -   Enter the drag-and-drop **Edit Mode** to resize and reposition charts on a dynamic grid.
    -   Launch **Presentation Mode** for a clean, full-screen, read-only view.
    `
  },
  {
    id: 'alerting',
    icon: AlertIcon,
    title: 'Alerting System',
    color: sectionColors[5],
    content: `
-   Set up alerts for any chart based on specific data fields.
-   Define trigger conditions using operators like \`>\` (Greater Than), \`<\` (Less Than), \`==\` (Equal To), and more.
-   Triggered alerts are collected in the **Alerts** tab in the right sidebar.
-   Receive native browser notifications the moment an alert's condition is met.
    `
  },
  {
    id: 'customization',
    icon: SettingsIcon,
    title: 'Customization & Portability',
    color: sectionColors[0], // Repeating colors
    content: `
-   **Themes & Fonts**: Instantly change the entire look and feel of the application from the Settings page to match your preference.
-   **Encrypted Import/Export**: Your workspace is your own. Use the password-based encryption feature to generate a secure backup file. Import this file in another browser or share it with a colleague to perfectly replicate your entire setup.
-   **Reset Workspace**: Completely wipe your local workspace from the settings page to start over. This action is irreversible.
    `
  },
  {
    id: 'getting-started',
    icon: RocketIcon,
    title: 'Getting Started',
    color: sectionColors[1],
    content: `
1.  **Add a Data Source**: Navigate to the **Data Sources** page and connect to your database or API.
2.  **(Optional) Add your Gemini API Key**: Go to the **Settings** page and enter your Gemini API key to enable AI features.
3.  **Create a Chart**: Go to the **Dashboards** page and click "Add Chart".
4.  **Configure Your Chart**:
    -   Give it a name and select the data source.
    -   Choose a chart type.
    -   Enter your query (this can be a simple table name, a full SQL query, or an API path).
    -   Configure the options, such as which data keys to use for the X and Y axes.
    -   Test your configuration to ensure it's valid.
5.  **Build & Explore**: Add more charts, create new dashboards, and build a Command Center to see the big picture. Don't forget to ask the AI assistant questions about your data!
    `
  },
  {
    id: 'tech-stack',
    icon: CodeIcon,
    title: 'Technical Stack',
    color: sectionColors[2],
    content: `
-   **Frontend**: React, TypeScript
-   **Styling**: Tailwind CSS
-   **Charting**: Recharts
-   **AI**: Google Gemini API
-   **Storage**: Browser Local Storage
-   **Cryptography**: Web Crypto API (AES-GCM)
    `
  }
];

interface AccordionItemProps {
  section: typeof helpSections[0];
  isOpen: boolean;
  onClick: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ section, isOpen, onClick }) => {
  const Icon = section.icon;

  return (
    <div className="border-b border-secondary/20">
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center p-4 text-left hover:bg-secondary/20 transition-colors duration-200"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4">
          <Icon className="w-6 h-6 text-primary flex-shrink-0" />
          <span className="font-semibold" style={{ color: section.color }}>
            {section.title}
          </span>
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0">
            <article className="prose prose-sm md:prose-base prose-invert max-w-none 
                              prose-headings:text-primary prose-a:text-accent prose-strong:text-text-primary 
                              prose-code:text-accent/80 prose-code:before:content-[''] prose-code:after:content-['']
                              prose-blockquote:border-l-primary/50 prose-li:marker:text-primary">
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};

const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [openSectionId, setOpenSectionId] = useState<string | null>(helpSections[0].id);

  const handleToggle = (id: string) => {
    setOpenSectionId(prevId => (prevId === id ? null : id));
  };

  return (
    <Modal title="Freeboard Help Manual" onClose={onClose} size="large">
      <div className="space-y-2">
        {helpSections.map(section => (
          <AccordionItem
            key={section.id}
            section={section}
            isOpen={openSectionId === section.id}
            onClick={() => handleToggle(section.id)}
          />
        ))}
      </div>
    </Modal>
  );
};

export default HelpModal;