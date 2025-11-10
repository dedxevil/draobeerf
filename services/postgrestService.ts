import { DataSource, DataSourceType } from '../types';
import { convertSqlToRest } from './geminiService';

const getHeaders = (dataSource: Pick<DataSource, 'type' | 'apiKey'>): Record<string, string> => {
  const headers: Record<string, string> = {};

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
      headers['Authorization'] = `Bearer ${dataSource.apiKey}`;
      break;
    case DataSourceType.Airtable:
    case DataSourceType.Neon:
    case DataSourceType.Generic:
    case DataSourceType.REST:
      headers['Authorization'] = `Bearer ${dataSource.apiKey}`;
      break;
  }
  return headers;
}

const getSpreadsheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};

export const testConnection = async (dataSource: Omit<DataSource, 'id'>): Promise<boolean> => {
  try {
    let testUrl = dataSource.url;
    let options: RequestInit = {
        method: 'GET',
        mode: 'cors',
        headers: getHeaders({ type: dataSource.type, apiKey: dataSource.apiKey }),
    };

    switch (dataSource.type) {
        case DataSourceType.Airtable:
            testUrl = `${dataSource.url.split('?')[0]}?maxRecords=1`;
            break;
        case DataSourceType.GoogleSheets:
            const spreadsheetId = getSpreadsheetId(dataSource.url);
            if (!spreadsheetId) throw new Error("Invalid Google Sheets URL format.");
            testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${dataSource.apiKey}`;
            options.headers = {}; // API key is in URL
            break;
        case DataSourceType.Supabase:
        case DataSourceType.Neon:
        case DataSourceType.Generic:
            // PostgREST root returns OpenAPI spec
            break;
    }

    const response = await fetch(testUrl, options);
    return response.ok;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

export const fetchData = async (dataSource: DataSource, query: string, geminiApiKey?: string): Promise<any[]> => {
  let path = query;
  
  if (path.trim().toLowerCase().startsWith('select')) {
    if (!geminiApiKey) {
      throw new Error("Cannot convert SQL query to REST path without a Gemini API key. Please add one in Settings.");
    }
    try {
      path = await convertSqlToRest(path, geminiApiKey);
    } catch (e: any) {
      throw new Error(`AI conversion of SQL failed: ${e.message}`);
    }
  }

  let finalUrl: string;
  const headers = getHeaders(dataSource);

  if (dataSource.type === DataSourceType.GoogleSheets) {
    finalUrl = `${dataSource.url}&key=${dataSource.apiKey}`;
    delete headers['Authorization'];
  } else if (dataSource.type === DataSourceType.Airtable) {
    finalUrl = path ? `${dataSource.url}?${path}` : dataSource.url;
  } else {
    finalUrl = [dataSource.url.replace(/\/$/, ''), path.replace(/^\//, '')]
      .filter(Boolean)
      .join('/');
  }
  
  try {
    const response = await fetch(finalUrl, {
      method: 'GET',
      mode: 'cors',
      headers: { ...headers, 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Request failed with status ${response.status}.`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
            errorMessage += ` Message: ${errorJson.message}`;
        } else if (errorJson.error?.message) {
            errorMessage += ` Message: ${errorJson.error.message}`;
        }
      } catch {
        errorMessage += ` Body: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Data Transformation Layer
    switch (dataSource.type) {
        case DataSourceType.Airtable:
            if (data && Array.isArray(data.records)) {
                return data.records.map((rec: any) => ({ ...rec.fields, _airtableId: rec.id }));
            }
            return [];
        case DataSourceType.GoogleSheets:
            if (data && Array.isArray(data.values) && data.values.length > 1) {
                const [header, ...rows] = data.values;
                return rows.map(row => {
                    const rowObject: Record<string, any> = {};
                    header.forEach((key: string, index: number) => {
                        rowObject[key] = row[index];
                    });
                    return rowObject;
                });
            }
            return [];
        default:
             if (data && typeof data === 'object' && !Array.isArray(data)) {
                const dataKey = Object.keys(data).find(key => Array.isArray(data[key]));
                if (dataKey) {
                    return data[dataKey];
                }
                return [data];
            }
            return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    if (!(error instanceof Error && (error.message.startsWith('AI conversion') || error.message.startsWith('Request failed')))) {
        console.error('Fetch data failed:', error);
    }
    throw error;
  }
};
