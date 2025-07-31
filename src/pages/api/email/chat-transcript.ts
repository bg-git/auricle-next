import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import ChatTranscript from '@/emails/ChatTranscript';


const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { email, name, messages } = req.body;

  if (!email || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing required fields: email, messages' });
  }

  try {
    const result = await resend.emails.send({
      from: 'AURICLE Support <support@auricle.co.uk>',
      to: [email, 'admin@auricle.co.uk'], // 👈 CC to admin
      subject: 'Your AURICLE Chat Transcript',
      react: ChatTranscript({ name, messages }),
    });

    res.status(200).json({ success: true, result });
  } catch (error: unknown) {
  const err = error as Error;
  res.status(500).json({ success: false, error: err.message });
}
}
