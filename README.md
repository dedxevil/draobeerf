# Freeboard : AI-Powered Dashboard Creator

Freeboard is a no-backend, purely client-side dashboard creator that empowers you to connect to your data and build beautiful, insightful visualizations directly in your browser. It's designed for privacy, speed, and ease of use, leveraging your browser's local storage to save all configurations, meaning no data ever leaves your machine to a third-party server.

Connect to PostgREST-enabled databases like Supabase and Neon, or any generic REST API, and start building. An integrated AI assistant helps you write queries, analyze data, and generate automated insights.

## Key Features

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

---

## Feature Breakdown

### Chart Creation & Visualization

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

### AI-Powered Features

-   **AI Assistant**: Open the sidebar to chat with the AI. It uses the data from your currently active dashboard as context to answer questions like "Which product had the highest sales last month?" or "Summarize the user activity."
-   **Automated Insights**: Freeboard's AI proactively monitors your data. When a chart refreshes, it compares the new data to historical points and generates a concise, single-sentence insight if it detects a significant anomaly, trend, or pattern.
-   **Smart SQL Conversion**: If you prefer writing SQL, simply type your `SELECT` statement into the query box. The app uses an AI model to instantly and automatically convert it into a PostgREST-compatible API path behind the scenes.

### Workspace & Layout Management

-   **Dashboards**: The primary space for your charts. Create as many as you need, easily switch between them, and add, edit, or delete charts.
-   **Command Centers**:
    -   Create high-level overview screens for presentations or monitoring.
    -   Select charts from any dashboard to add to a command center.
    -   Enter the drag-and-drop **Edit Mode** to resize and reposition charts on a dynamic grid.
    -   Launch **Presentation Mode** for a clean, full-screen, read-only view.

### Alerting System

-   Set up alerts for any chart based on specific data fields.
-   Define trigger conditions using operators like `>` (Greater Than), `<` (Less Than), `==` (Equal To), and more.
-   Triggered alerts are collected in the **Alerts** tab in the right sidebar.
-   Receive native browser notifications the moment an alert's condition is met.

### Customization & Portability

-   **Themes & Fonts**: Instantly change the entire look and feel of the application from the Settings page to match your preference.
-   **Encrypted Import/Export**: Your workspace is your own. Use the password-based encryption feature to generate a secure backup file. Import this file in another browser or share it with a colleague to perfectly replicate your entire setup.
-   **Reset Workspace**: Completely wipe your local workspace from the settings page to start over. This action is irreversible.

## Getting Started

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

## Technical Stack

-   **Frontend**: React, TypeScript
-   **Styling**: Tailwind CSS
-   **Charting**: Recharts
-   **AI**: Google Gemini API
-   **Storage**: Browser Local Storage
-   **Cryptography**: Web Crypto API (AES-GCM)