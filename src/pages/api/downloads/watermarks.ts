import { NextApiRequest, NextApiResponse } from 'next';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const zip = new JSZip();
    
    // Add watermark files to zip
    const watermarksDir = path.join(process.cwd(), 'public', 'downloads', 'watermarks');
    
    console.log('Watermarks directory:', watermarksDir);
    console.log('Directory exists:', fs.existsSync(watermarksDir));
    
    // Read watermark files with correct filenames
    const whitePath = path.join(watermarksDir, 'AURICLE_White_watermark.png');
    const blackPath = path.join(watermarksDir, 'AURICLE_Black_Watermark.png');
    
    console.log('White watermark path:', whitePath, 'exists:', fs.existsSync(whitePath));
    console.log('Black watermark path:', blackPath, 'exists:', fs.existsSync(blackPath));
    
    const whiteWatermark = fs.readFileSync(whitePath);
    const blackWatermark = fs.readFileSync(blackPath);
    
    // Add files to zip with clean names
    zip.file('watermark-white.png', whiteWatermark);
    zip.file('watermark-black.png', blackWatermark);
    
    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="auricle-watermarks.zip"');
    res.setHeader('Content-Length', zipBuffer.length);
    
    // Send zip file
    res.send(zipBuffer);
  } catch (error) {
    console.error('Error generating watermarks zip:', error);
    res.status(500).json({ error: 'Failed to generate watermarks zip', details: (error as Error).message });
  }
}
