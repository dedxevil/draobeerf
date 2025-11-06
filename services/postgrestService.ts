import { DataSource, DataSourceType } from '../types';
import { convertSqlToRest } from './geminiService';

const getHeaders = (dataSource: Pick<DataSource, 'type' | 'apiKey'>): Record<string, string> => {
  const headers: Record<string, string> = {};

  // For PostgREST-based requests, we always expect a JSON response.
  // Stricter API gateways might reject requests without this header.
  if (dataSource.type === DataSourceType.Supabase ||
      dataSource.type === DataSourceType.Neon ||
      dataSource.type === DataSourceType.Generic) {
    headers['Accept'] = 'application/json';
  }

  if (!dataSource.apiKey) {
    return headers;
  }

  switch (dataSource.type) {
    case DataSourceType.Supabase:
      headers['apikey'] = dataSource.apiKey;
      // Authorization is often needed as well for RLS
      headers['Authorization'] = `Bearer ${dataSource.apiKey}`;
      break;
    case DataSourceType.Neon:
    case DataSourceType.Generic:
    case DataSourceType.REST:
      headers['Authorization'] = `Bearer ${dataSource.apiKey}`;
      break;
  }
  return headers;
}

export const testConnection = async (dataSource: Omit<DataSource, 'id'>): Promise<boolean> => {
  try {
    // A GET request to the PostgREST root returns the OpenAPI schema,
    // which is a reliable way to confirm connectivity and authentication.
    const response = await fetch(dataSource.url, {
      method: 'GET',
      mode: 'cors',
      headers: getHeaders({ type: dataSource.type, apiKey: dataSource.apiKey }),
    });
    return response.ok;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

export const fetchData = async (dataSource: DataSource, query: string, geminiApiKey?: string): Promise<any[]> => {
  let path = query;
  
  // If the query looks like SQL, convert it to a PostgREST path using AI.
  // This happens seamlessly without user interaction.
  if (path.trim().toLowerCase().startsWith('select')) {
    if (!geminiApiKey) {
      throw new Error("Cannot convert SQL query to REST path without a Gemini API key. Please add one in Settings.");
    }
    try {
      path = await convertSqlToRest(path, geminiApiKey);
    } catch (e: any) {
      // Re-throw a more user-friendly error that will be displayed in the UI.
      throw new Error(`AI conversion of SQL failed: ${e.message}`);
    }
  }

  // Robustly join URL parts, handling optional query and avoiding double slashes.
  const url = [dataSource.url.replace(/\/$/, ''), path.replace(/^\//, '')]
    .filter(Boolean)
    .join('/');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors', // FIX: Explicitly set CORS mode to align with best practices.
      headers: { ...getHeaders(dataSource), 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Request failed with status ${response.status}.`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
            errorMessage += ` Message: ${errorJson.message}`;
        }
      } catch {
        errorMessage += ` Body: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // If the API returns a single object, wrap it in an array for consistency.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Handle cases where the actual array might be nested, e.g., { "data": [...] }
        const dataKey = Object.keys(data).find(key => Array.isArray(data[key]));
        if (dataKey) {
            return data[dataKey];
        }
        return [data];
    }
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Re-throwing the error to be caught by the UI component.
    // If it's a fetch error from the network, log it. Otherwise, the custom error from above or the fetch logic will be used.
    if (!(error instanceof Error && (error.message.startsWith('AI conversion') || error.message.startsWith('Request failed')))) {
        console.error('Fetch data failed:', error);
    }
    throw error;
  }
};
