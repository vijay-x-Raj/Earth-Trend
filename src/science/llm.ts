import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { StructuredQuery } from '../types';

// The user must provide their API key in an environment variable
// e.g. VITE_GEMINI_API_KEY=... in a .env.local file
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function parseQuestionWithLLM(question: string, fallbackParser: (q: string) => StructuredQuery): Promise<StructuredQuery> {
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY is not set. Falling back to rule-based parser.');
    return fallbackParser(question);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            intent: {
              type: SchemaType.STRING,
              description: 'The user intent. One of: trend, comparison, extreme, minimum, location, relationship, significance',
            },
            operation: {
              type: SchemaType.STRING,
              description: 'The specific operation to perform based on intent.',
            },
            variable: {
              type: SchemaType.STRING,
              description: 'The primary climate variable. One of: temperature, precipitation, vegetation',
            },
            variable2: {
              type: SchemaType.STRING,
              description: 'Optional secondary climate variable for relationships. One of: temperature, precipitation, vegetation',
            },
            timeStart: {
              type: SchemaType.INTEGER,
              description: 'The starting year (between 2000 and 2023). Defaults to 2000 if not specified.',
            },
            timeEnd: {
              type: SchemaType.INTEGER,
              description: 'The ending year (between 2000 and 2023). Defaults to 2023 if not specified.',
            },
            geography: {
              type: SchemaType.OBJECT,
              properties: {
                level: {
                  type: SchemaType.STRING,
                  description: 'The geographic scale. One of: global, continent, country',
                },
                parent: {
                  type: SchemaType.STRING,
                  description: 'The name of the continent, if specified.',
                },
                entities: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: 'A list of specific countries mentioned.',
                },
              },
              required: ['level'],
            },
          },
          required: ['intent', 'operation', 'variable', 'timeStart', 'timeEnd', 'geography'],
        },
      },
    });

    const prompt = `
You are a geospatial data parser. Parse the following user query about climate data into a structured query format.
Valid variables are: temperature, precipitation, vegetation.
Valid geographic levels are: global, continent, country.

User Query: "${question}"
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = JSON.parse(text);
    
    // Validate output
    if (!['temperature', 'precipitation', 'vegetation'].includes(json.variable)) {
        json.variable = 'temperature';
    }

    return json as StructuredQuery;
  } catch (err) {
    console.error('LLM parsing failed, falling back to rule-based', err);
    return fallbackParser(question);
  }
}

export async function generatePlaygroundUIWithLLM(
  question: string,
  query: StructuredQuery,
  regions: any[],
  defaultUI: any
): Promise<{ headline: string; explanation: string; chartType: 'line'|'bar'|'scatter'; mapType: 'choropleth'|'scatter'; highlightedRegion?: string }> {
  if (!apiKey) return defaultUI;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            headline: { type: SchemaType.STRING, description: 'A short, punchy headline summarizing the answer.' },
            explanation: { type: SchemaType.STRING, description: 'A detailed, scientifically accurate explanation of the data based ONLY on the provided stats.' },
            chartType: { type: SchemaType.STRING, description: 'The best chart type for this data: line, bar, or scatter.' },
            mapType: { type: SchemaType.STRING, description: 'The best map type: choropleth or scatter.' },
            highlightedRegion: { type: SchemaType.STRING, description: 'ISO code of the region to highlight, if any specific region is the primary focus.' },
          },
          required: ['headline', 'explanation', 'chartType', 'mapType'],
        }
      }
    });

    // Provide the top 10 regions to avoid overloading prompt, or all if small
    const topRegions = regions.slice(0, 15).map(r => ({ name: r.name, iso: r.iso, trend: r.trend, significant: r.significant }));

    const prompt = `
You are an expert climate scientist and data visualization specialist.
A user asked: "${question}"

The data engine processed this query and returned the following regional trends (Top 15 sorted):
${JSON.stringify(topRegions, null, 2)}

Variable: ${query.variable}
Period: ${query.timeStart} to ${query.timeEnd}

Write a detailed, engaging explanation answering the user's question using ONLY the provided data.
Choose the most appropriate chartType (line for time series, bar for comparisons/extremes, scatter for relationships).
Choose the most appropriate mapType (choropleth is standard).
Provide the ISO code of a region to highlight if the user asked about a specific country or an extreme.
`;

    const result = await model.generateContent(prompt);
    const json = JSON.parse(result.response.text());
    
    return {
      headline: json.headline,
      explanation: json.explanation,
      chartType: ['line', 'bar', 'scatter'].includes(json.chartType) ? json.chartType : defaultUI.chartType,
      mapType: ['choropleth', 'scatter'].includes(json.mapType) ? json.mapType : defaultUI.mapType,
      highlightedRegion: json.highlightedRegion || defaultUI.highlightedRegion,
    };
  } catch(err) {
    console.error('LLM UI generation failed', err);
    return defaultUI;
  }
}
