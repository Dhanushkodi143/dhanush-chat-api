// Deploy this folder as its OWN separate Vercel project (free tier).
// It acts as a secure proxy so your Anthropic API key never reaches the browser.
//
// SETUP:
// 1. Create a new folder, copy this file into it as `api/chat.js`
// 2. In that folder, run: npm init -y && npm install @anthropic-ai/sdk
// 3. Push to a new GitHub repo, import it into Vercel (vercel.com)
// 4. In Vercel project settings -> Environment Variables, add:
//      ANTHROPIC_API_KEY = your key from console.anthropic.com
// 5. Deploy. Vercel gives you a URL like: https://your-project.vercel.app
// 6. Set VITE_CHAT_API_URL=https://your-project.vercel.app/api/chat
//    in your portfolio's .env file (see .env.example in the main repo)
//
// This keeps your GitHub Pages site fully static while the chatbot calls
// out to this small, separately-hosted function.

import Anthropic from '@anthropic-ai/sdk';
import { resumeContext } from './resumeContext.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 400,
            system: resumeContext,
            messages: messages.map(m => ({ role: m.role, content: m.content }))
        });

        const reply = response.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n');

        return res.status(200).json({ reply });
    } catch (err) {
        console.error('Chat API error:', err);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
}
