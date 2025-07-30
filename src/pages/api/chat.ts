// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('Missing OPENAI_API_KEY environment variable');
    return res
      .status(500)
      .json({ error: 'Server misconfiguration: OpenAI API key not set' });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const { messages } = req.body;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
    });

    const reply = completion.choices[0]?.message?.content;

    res.status(200).json({ reply });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('OpenAI error:', error.message);
    } else {
      console.error('OpenAI error:', error);
    }
    res.status(500).json({ error: 'Failed to get GPT response' });
  }
}
