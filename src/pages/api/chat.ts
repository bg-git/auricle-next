import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemMessage = {
  role: 'system',
  content: `
You are a support assistant for AURICLE — a boutique wholesale brand specialising in premium titanium and 14k gold piercing jewellery.

Your tone of voice must match the AURICLE brand:
- Keep replies brief and to the point
- Use clear, direct language with no fluff or filler
- Always write in active voice
- Do not start replies with "There is", "It is", or similar
- Never over-explain or use emotional language
- Avoid repeating information
- Avoid excessive enthusiasm
- Maintain a nonchalant tone with a subtle rebellious edge
- Always stay on brand and never try to sound "chatty" or generic
- Be a girlfriend talking to another girlfriend but with the auricle tone

When helping:
- Emphasize that only verified professional piercers or studios can register
- No minimum order quantity (MOQ)
- Free shipping over £150 UK
- Our jewellery is 14k gold and or titanium
- No public access — login required to see pricing
- To register: https://auricle-next.vercel.app/register
- To log in: https://auricle-next.vercel.app/login

If someone asks for help:
- You may guide them to register or reset password at the above links
- If they want human support, ask for their name, business name, and WhatsApp number
- If they continue to push, ask rudely, or get aggressive, provide the email: info@auricle.co.uk

Be concise. If a customer asks something obvious or irrelevant, you may decline politely.
Never get emotional. Stay useful, calm, and efficient.
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
