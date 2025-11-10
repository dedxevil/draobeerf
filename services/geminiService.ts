import { GoogleGenAI, Type } from "@google/genai";
import { ChartType, DataHistoryPoint, InsightCategory } from "../types";

export const generateText = async (prompt: string, dataContext: string, apiKey: string): Promise<string> => {
  if (!apiKey) {
    return "AI features require a Gemini API key. Please configure one in the application settings.";
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
You are a helpful and expert data analysis assistant for a dashboarding tool.
Your mission is to answer user questions by analyzing the data context provided from their current dashboard.

**Instructions:**
1.  **Analyze the Data:** The user's dashboard data is provided below under "Data Context". This includes chart names, types, the fields used for visualization (e.g., X/Y axis), and a sample of the data.
2.  **Synthesize Information:** Answer the user's question by synthesizing information from one or more charts.
3.  **Be Conversational:** Provide answers in a clear, conversational, and easy-to-understand manner.
4.  **Acknowledge Limits:** If the provided data context is insufficient to answer the question accurately, clearly state that you don't have enough information from the dashboard to answer.
5.  **DO NOT mention SQL:** You are an analyst, not a query writer. Do not generate or refer to SQL queries.

**Data Context:**
---
${dataContext}
---

**User Question:**
"${prompt}"
`,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Sorry, I encountered an error while processing your request. Please check your API key and try again.";
  }
};

export const convertSqlToRest = async (sqlQuery: string, apiKey: string): Promise<string> => {
    if (!sqlQuery.trim()) {
        return "";
    }
    if (!apiKey) {
        throw new Error("A Gemini API key is required to convert SQL. Please add one in Settings.");
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
You are an expert in PostgREST. Your task is to convert a given SQL query into a PostgREST URL path with query parameters.
- The response MUST be only the URL path and parameters, starting with the table name.
- DO NOT include the base URL, domain, or "/rest/v1/".
- DO NOT wrap the response in markdown code blocks, JSON, or any other formatting. Just return the raw path.
- Be accurate with PostgREST operators (e.g., 'ILIKE' becomes 'ilike', '>' becomes 'gt.').

Example 1:
SQL: SELECT title, description FROM books WHERE description ILIKE '%cheese%' ORDER BY title DESC LIMIT 5 OFFSET 10;
Response: books?select=title,description&description=ilike.*cheese*&order=title.desc&limit=5&offset=10

Example 2:
SQL: SELECT * FROM users WHERE age > 30;
Response: users?age=gt.30

Example 3:
SQL: SELECT name FROM customers LIMIT 1;
Response: customers?select=name&limit=1

Convert the following SQL query:
"${sqlQuery}"
`,
        });
        return response.text.trim().replace(/^`+|`+$/g, '');
    } catch (error) {
        console.error("Error calling Gemini API for SQL conversion:", error);
        throw new Error("Sorry, I encountered an error while converting your SQL query. Check your Key.");
    }
};

export const generateChartInsight = async (
    chartName: string,
    chartType: ChartType,
    currentData: any[],
    historicalData: DataHistoryPoint[],
    apiKey: string
): Promise<{ category: InsightCategory; insight: string } | null> => {
    if (!currentData || currentData.length === 0 || !apiKey) {
        return null;
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Prepare a summary of historical data to keep the prompt concise
        const historySummary = historicalData.map(h => ({
            timestamp: h.timestamp,
            // Summarize data points to avoid huge prompts.
            // For example, take the first item if it's a single number/pie chart, or just the count.
            summary: Array.isArray(h.data) ? `(${h.data.length} rows)` : JSON.stringify(h.data)
        })).slice(0, 5); // Use last 5 historical points for context

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a data analyst AI for a dashboarding tool. Your task is to provide a concise, single-sentence insight based on new data for a chart.
- Analyze the current data in context of the historical data.
- Identify the most important change: is it an anomaly (unusual spike/dip), a trend (consistent increase/decrease), or a simple forecast?
- If nothing is noteworthy, provide a simple informational insight.
- The insight text MUST be a single, concise sentence.
- The category MUST be one of: "anomaly", "trend", "forecast", "info", or "error".

Chart Name: "${chartName}"
Chart Type: "${chartType}"
Current Data (sample): ${JSON.stringify(currentData.slice(0, 5))}
Historical Data (summary of last 5 refreshes): ${JSON.stringify(historySummary)}
`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { 
                            type: Type.STRING,
                            enum: ["anomaly", "trend", "forecast", "info", "error"],
                            description: "The category of the insight."
                        },
                        insight: { 
                            type: Type.STRING,
                            description: "The single-sentence insight text."
                        }
                    },
                    required: ["category", "insight"]
                },
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error generating chart insight:", error);
        // Don't throw, just return null so the app doesn't crash on an insight failure
        return null;
    }
};
