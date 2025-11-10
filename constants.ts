import { ChartType, DataSourceType } from './types';

export const LOCAL_STORAGE_KEY = 'freeboard-workspace';

export const DATA_SOURCE_TYPE_OPTIONS = [
  { value: DataSourceType.Supabase, label: 'Supabase (PostgREST)' },
  { value: DataSourceType.Neon, label: 'Neon (PostgREST)' },
  { value: DataSourceType.Generic, label: 'Generic PostgREST' },
  { value: DataSourceType.REST, label: 'Generic REST API' },
  { value: DataSourceType.Airtable, label: 'Airtable' },
  { value: DataSourceType.GoogleSheets, label: 'Google Sheets' },
];

export const CHART_TYPE_OPTIONS = [
    { value: ChartType.Bar, label: 'Bar Chart' },
    { value: ChartType.StackedBar, label: 'Stacked Bar' },
    { value: ChartType.Line, label: 'Line Chart' },
    { value: ChartType.Area, label: 'Area Chart' },
    { value: ChartType.StackedArea, label: 'Stacked Area' },
    { value: ChartType.Scatter, label: 'Scatter Plot' },
    { value: ChartType.Pie, label: 'Pie Chart' },
    { value: ChartType.Donut, label: 'Donut Chart' },
    { value: ChartType.Funnel, label: 'Funnel Chart' },
    { value: ChartType.Treemap, label: 'Treemap' },
    { value: ChartType.Gauge, label: 'Gauge' },
    { value: ChartType.Heatmap, label: 'Heatmap' },
    { value: ChartType.Number, label: 'Single Number' },
    { value: ChartType.Table, label: 'Table' },
];

// FIX: Replaced monochromatic color schemes with new high-contrast, categorical palettes
// to improve differentiability between series in multi-line and stacked bar charts.
export const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#1A73E8', '#F4A261', '#2A9D8F', '#E76F51', '#8E44AD', '#F1C40F'],
  ocean: ['#0077B6', '#00B4D8', '#90E0EF', '#2D6A4F', '#40916C', '#52B788'],
  sunset: ['#E63946', '#F77F00', '#FCBF49', '#7209B7', '#B5179E', '#D00000'],
  candy: ['#FF70A6', '#FF9770', '#FFD670', '#E9FF70', '#70D6FF', '#A970FF'],
  forest: ['#4C956C', '#A5A58D', '#B7B7A4', '#D4A373', '#A98467', '#6B705C'],
};

export const APP_THEMES = [
  { id: 'theme-spotify-dark', name: 'Spotify', base: 'dark', colors: { primary: '#1DB954', background: '#121212', surface: '#181818' } },
  { id: 'theme-msteams-dark', name: 'MS Teams', base: 'dark', colors: { primary: '#6264A7', background: '#1F1F1F', surface: '#252525' } },
  { id: 'theme-discord-dark', name: 'Discord', base: 'dark', colors: { primary: '#5865F2', background: '#313338', surface: '#2B2D31' } },
  { id: 'theme-slack-dark', name: 'Slack', base: 'dark', colors: { primary: '#ECB22E', background: '#1A1D21', surface: '#222529' } },
  { id: 'theme-twitter-dark', name: 'Twitter', base: 'dark', colors: { primary: '#1D9BF0', background: '#000000', surface: '#16181C' } },
  { id: 'theme-google-light', name: 'Google', base: 'light', colors: { primary: '#1A73E8', background: '#F8F9FA', surface: '#FFFFFF' } },
  { id: 'theme-notion-light', name: 'Notion', base: 'light', colors: { primary: '#37352F', background: '#F7F7F5', surface: '#FFFFFF' } },
  { id: 'theme-amazon-light', name: 'Amazon', base: 'light', colors: { primary: '#FF9900', background: '#EAEDED', surface: '#FFFFFF' } },
];

export const APP_FONTS = [
  { id: 'barlow', name: 'Barlow', family: "'Barlow'" },
  { id: 'inter', name: 'Inter', family: "'Inter'" },
  { id: 'roboto', name: 'Roboto', family: "'Roboto'" },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat'" },
  { id: 'rubik', name: 'Rubik', family: "'Rubik'" },
  { id: 'nunito', name: 'Nunito', family: "'Nunito'" },
  { id: 'quicksand', name: 'Quicksand', family: "'Quicksand'" },
];
