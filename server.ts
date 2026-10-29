/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Full-Stack Server
 * Express + Vite middlewares + Gemini API + Science APIs
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// 1. Intelligence Endpoint (gemini-4-argon, gemini-3.8-flash, gemini-3.1-flash-lite)
app.post('/api/gemini/intel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, modelChoice, enableThinking, enableSearch, systemInstruction } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    // Model selection based on requirements:
    // - gemini-4-argon: complex tasks, high thinking
    // - gemini-3.8-flash: general tasks, Google search grounding
    // - gemini-3.1-flash-lite: fast tasks
    let model = 'gemini-3.8-flash';
    if (modelChoice === 'gemini-4-argon' || enableThinking) {
      model = 'gemini-4-argon';
    } else if (modelChoice === 'gemini-3.1-flash-lite') {
      model = 'gemini-3.1-flash-lite';
    }

    const config: Record<string, any> = {};

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    // High thinking configuration for gemini-4-argon (Do NOT set maxOutputTokens)
    if (enableThinking && model === 'gemini-4-argon') {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH,
      };
    }

    // Search grounding (available on gemini-3.8-flash)
    if (enableSearch && model === 'gemini-3.8-flash') {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    const text = response.text || '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    res.json({
      text,
      modelUsed: model,
      groundingMetadata,
    });
  } catch (err: any) {
    console.error('Gemini intel error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate response' });
  }
});

// 2. Multimodal Image Understanding (gemini-4-argon)
app.post('/api/gemini/analyze-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', prompt, imageType } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Image base64 data is required' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/]+;base64,/, '');

    const defaultPrompt =
      imageType === 'thermal'
        ? 'Analyze this thermal infrared leaf thermogram for canopy temperature depression (Delta T = T_leaf - T_air). Identify localized thermal hotspots indicating stomatal closure and early pathogen recognition. Provide estimated Delta T values, affected leaf sectors, and correlation with defense lncRNA activation.'
        : imageType === 'micrograph'
        ? 'Analyze this stomatal aperture microscopic image. Quantify average stomatal pore width vs length, percentage of closed vs open stomata, and provide an assessment of pathogen-induced stomatal closure (PAMP-triggered immunity PTI response).'
        : 'Analyze this plant pathology image. Identify any visible biotic stress lesions, symptoms (e.g. blast lesions, water-soaked streaks, powdery mildew, rust, leaf curl), estimated disease severity (1-9 scale), host species, and recommend candidate defense lncRNAs and molecular screening markers.';

    const finalPrompt = prompt || defaultPrompt;

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: finalPrompt,
          },
        ],
      },
      config: {
        systemInstruction:
          'You are a senior plant pathologist and molecular bioinformatics expert. Provide detailed, rigorous scientific observations with quantitative estimates.',
      },
    });

    res.json({
      analysis: response.text || '',
      modelUsed: 'gemini-4-argon',
    });
  } catch (err: any) {
    console.error('Image analysis error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze image' });
  }
});

// 3. High-Quality Image Generation (gemini-3-pro-image or gemini-nano-banana-2.1)
// With size affordance (1K, 2K, 4K) and aspect ratios (1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9)
app.post('/api/gemini/generate-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      prompt,
      aspectRatio = '16:9',
      imageSize = '1K',
      model = 'gemini-3-pro-image',
    } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const validAspectRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
    const chosenAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '16:9';
    const chosenSize = ['1K', '2K', '4K'].includes(imageSize) ? imageSize : '1K';
    const chosenModel = model === 'gemini-nano-banana-2.1' ? 'gemini-nano-banana-2.1' : 'gemini-3-pro-image';

    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: chosenAspectRatio as any,
          imageSize: chosenSize as any,
        },
      },
    });

    let imageUrl = '';
    let textFeedback = '';

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textFeedback += part.text;
        }
      }
    }

    if (!imageUrl) {
      res.status(500).json({ error: 'No image was returned by the model', textFeedback });
      return;
    }

    res.json({
      imageUrl,
      modelUsed: chosenModel,
      aspectRatio: chosenAspectRatio,
      imageSize: chosenSize,
      textFeedback,
    });
  } catch (err: any) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate image' });
  }
});

// 4. Edit Images (gemini-nano-banana-2.1)
app.post('/api/gemini/edit-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType = 'image/png', prompt } = req.body;
    if (!imageBase64 || !prompt) {
      res.status(400).json({ error: 'imageBase64 and prompt are required' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    let imageUrl = '';
    let textFeedback = '';

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textFeedback += part.text;
        }
      }
    }

    res.json({
      imageUrl,
      modelUsed: 'gemini-nano-banana-2.1',
      textFeedback,
    });
  } catch (err: any) {
    console.error('Image edit error:', err);
    res.status(500).json({ error: err.message || 'Failed to edit image' });
  }
});

// 5. Scientific Literature Proxy (Europe PMC REST API)
app.get('/api/science/literature', async (req: Request, res: Response): Promise<void> => {
  try {
    const queryTerm = (req.query.q as string) || 'lncRNA plant biotic stress';
    const limit = Math.min(25, Number(req.query.limit) || 8);
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
      queryTerm
    )}&format=json&pageSize=${limit}&resultType=core`;

    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'LISHA-Bioinformatics/1.0 (mailto:scientist@icar.org.in)',
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Europe PMC upstream error' });
      return;
    }

    const data = await upstream.json();
    const articles = (data.resultList?.result || []).map((art: any) => ({
      id: art.id,
      pmid: art.pmid,
      doi: art.doi,
      title: art.title,
      authorString: art.authorString,
      journalTitle: art.journalTitle,
      pubYear: art.pubYear,
      abstractText: art.abstractText,
      citedByCount: art.citedByCount || 0,
      isOpenAccess: art.isOpenAccess === 'Y',
      fullTextUrl: art.fullTextUrlList?.fullTextUrl?.[0]?.url || `https://europepmc.org/article/MED/${art.pmid}`,
    }));

    res.json({ articles, total: data.hitCount || articles.length });
  } catch (err: any) {
    console.error('Europe PMC error:', err);
    res.status(500).json({ error: 'Failed to query scientific literature' });
  }
});

// 6. NCBI Sequence Fetch Proxy
app.get('/api/science/ncbi', async (req: Request, res: Response): Promise<void> => {
  try {
    const accession = (req.query.accession as string)?.trim();
    if (!accession) {
      res.status(400).json({ error: 'Accession is required' });
      return;
    }

    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=${encodeURIComponent(
      accession
    )}&rettype=fasta&retmode=text`;

    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'LISHA-Bioinformatics/1.0 (mailto:scientist@icar.org.in)',
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'NCBI E-utilities upstream error' });
      return;
    }

    const fasta = await upstream.text();
    const lines = fasta.split('\n');
    const header = lines[0] || '';
    const sequence = lines.slice(1).join('').replace(/\s/g, '');

    res.json({
      accession,
      header,
      sequence,
      length: sequence.length,
    });
  } catch (err: any) {
    console.error('NCBI fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch sequence from NCBI' });
  }
});

// Mount Vite or serve static assets
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LISHA Server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
