// Deploy this folder as its OWN separate Vercel project (free tier).
// It acts as a secure proxy so your Google Gemini API key never reaches the browser.
//
// SETUP:
// 1. Create a new folder, copy this file into it as `api/chat.js`
// 2. Also copy `resumeContext.js` into that same `api/` folder
// 3. In that folder, run: npm init -y   (no extra packages needed - uses built-in fetch)
// 4. Push to a new GitHub repo, import it into Vercel (vercel.com)
// 5. In Vercel project settings -> Environment Variables, add:
//      GEMINI_API_KEY = your key from aistudio.google.com/apikey
// 6. Deploy. Vercel gives you a URL like: https://your-project.vercel.app
// 7. Set VITE_CHAT_API_URL=https://your-project.vercel.app/api/chat
//    in your portfolio's .env file (see .env.example in the main repo)
//
// This keeps your GitHub Pages site fully static while the chatbot calls
// out to this small, separately-hosted function. Uses Gemini's free tier
// (gemini-2.5-flash) - no credit card required to get started.

import { resumeContext } from './resumeContext.js';

const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export default async function handler(req, res) {
    // CORS - restrict this to your actual portfolio domain once deployed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { messages } = req.body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        // Gemini uses "model" instead of "assistant" for the AI's turns
        const contents = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const geminiResponse = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: resumeContext }]
                },
                contents,
                generationConfig: {
                    maxOutputTokens: 400
                }
            })
        });

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            console.error('Gemini API error:', errText);
            return res.status(502).json({ error: 'Upstream AI request failed' });
        }

        const data = await geminiResponse.json();
        const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n')
            || "Sorry, I couldn't come up with a response. Please try again.";

        return res.status(200).json({ reply });
    } catch (err) {
        console.error('Chat API error:', err);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
}
