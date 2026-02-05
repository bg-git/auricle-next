import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const DOMAIN = process.env.SITE_DOMAIN || 'http://localhost:3000'

interface FeedEntry {
  title: string
  url: string
  date: Date
  description?: string
}

async function getQAEntries(): Promise<FeedEntry[]> {
  const entries: FeedEntry[] = []

  const qaDir = path.join(process.cwd(), 'content/quality-assurance')
  if (fs.existsSync(qaDir)) {
    const qaFiles = fs.readdirSync(qaDir)
    for (const file of qaFiles) {
      if (file.endsWith('.md')) {
        const filePath = path.join(qaDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(content)
        const slug = file.replace(/\.md$/, '')
        entries.push({
          title: data.title || slug,
          url: `/quality-assurance/${slug}`,
          date: data.date ? new Date(data.date) : new Date(fs.statSync(filePath).mtime),
          description: data.description,
        })
      }
    }
  }

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime())
}

function generateAtomFeed(entries: FeedEntry[]): string {
  const lastUpdated = entries.length > 0 ? entries[0].date.toISOString() : new Date().toISOString()

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Auricle - Quality Assurance</title>
  <subtitle>Piercing jewelry quality standards, certifications, and policies</subtitle>
  <link href="${DOMAIN}/qa-feed.xml" rel="self"/>
  <link href="${DOMAIN}/quality-assurance" rel="alternate"/>
  <id>${DOMAIN}/quality-assurance</id>
  <updated>${lastUpdated}</updated>
  <author>
    <name>Auricle</name>
  </author>
  <rights>Copyright © ${new Date().getFullYear()} Auricle. All rights reserved.</rights>
`

  for (const entry of entries) {
    xml += `  <entry>
    <title>${escapeXml(entry.title)}</title>
    <link href="${DOMAIN}${entry.url}" rel="alternate"/>
    <id>${DOMAIN}${entry.url}</id>
    <updated>${entry.date.toISOString()}</updated>
    <published>${entry.date.toISOString()}</published>`

    if (entry.description) {
      xml += `
    <summary>${escapeXml(entry.description)}</summary>`
    }

    xml += `
  </entry>
`
  }

  xml += `</feed>`
  return xml
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string>
) {
  if (req.method !== 'GET') {
    res.status(405).json('Method Not Allowed')
    return
  }

  try {
    const entries = await getQAEntries()
    const feed = generateAtomFeed(entries)

    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(feed)
  } catch (error) {
    console.error('Error generating feed:', error)
    res.status(500).json('Internal Server Error')
  }
}
