import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemMessage = {
  role: 'system',
  content: `
You are a helpful and professional support assistant for AURICLE, a boutique wholesale body jewellery brand.

AURICLE sells high-quality titanium and 14k gold piercing jewellery exclusively to professional piercers and jewellery studios. 
Only verified businesses can register for an account. Once approved, customers can log in to see pricing and order without any minimum quantity. 
You should help customers with account registration, pricing access, product questions, aftercare, and documentation (like mill certificates). 
Always keep responses clear, concise, and brand-appropriate. Do not offer personal opinions or go off-topic.
`,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...messages],
    });

    const reply = completion.choices[0]?.message?.content ?? '';

    return res.status(200).json({ reply });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('OpenAI error:', error.message);
    } else {
      console.error('Unknown OpenAI error:', error);
    }
    return res.status(500).json({ error: 'Failed to get GPT response' });
  }
}
