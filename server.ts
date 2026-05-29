import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const PORT = 3000;

async function startServer() {
  const app = express();
  
  app.use(express.json({ limit: '50mb' }));

  // Initialize Gemini client. 
  // It uses process.env.GEMINI_API_KEY automatically if present,
  // but explicitly passing it is fine too.
  let ai: GoogleGenAI | null = null;
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (error) {
    console.error("Warning: Gemini API Key not found or invalid.");
  }


  // API Routes
  app.post('/api/generate-poem', async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API not initialized (Missing API Key)' });
    }

    try {
      const { imageBase64, mimeType, poemStyle, poemLength, poemLanguage } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image base64 data is required' });
      }

      const stylePromptPart = poemStyle ? ` Write it as a ${poemStyle}.` : '';
      const lengthPromptPart = poemLength ? ` Make the poem ${poemLength.toLowerCase()} in length.` : '';
      const langPromptPart = (poemLanguage && poemLanguage !== 'Auto-detect') ? ` Please write the poem in ${poemLanguage}.` : '';

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType || 'image/jpeg'
            }
          },
          `Write a beautifully evocative, creative poem inspired by this photo.${stylePromptPart}${lengthPromptPart}${langPromptPart} Include rich imagery. Format it gracefully. Please provide a creative title for the poem.
          Additionally, analyze the image to determine the best placement for overlaying text without obscuring the main subject or busy focal points. Choose ONE 'textPlacement' from: "top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right".
          Also suggest a matching 'fontStyle' based on the poem's mood. Choose ONE from: "elegant", "modern", "handwritten", "typewriter".
          Provide a 'shortExcerpt' (2-4 lines max) containing the most poetic and expressive part of the poem, to be used for image overlay if the full poem is too long.
          Return the result in JSON format with exactly 5 fields: "title", "poem", "textPlacement", "fontStyle", "shortExcerpt".`
        ],
        config: {
          responseMimeType: 'application/json',
        }
      });

      let generatedData = { title: '', poem: '' };
      try {
        generatedData = JSON.parse(response.text || '{}');
      } catch (e) {
        console.error('Error parsing JSON:', e);
        return res.status(500).json({ error: 'Failed to parse generated poem data.' });
      }

      res.json(generatedData);
    } catch (error: any) {
      console.error('Error generating poem:', error);
      res.status(500).json({ error: error.message || 'Failed to generate poem' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Static production build
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
