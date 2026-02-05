import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const DOMAIN = process.env.SITE_DOMAIN || 'http://localhost:3000'

interface FeedEntry {
  title: string
  url: string
  date: Date
  category: 'blog' | 'information'
}

async function getFeedEntries(): Promise<FeedEntry[]> {
  const entries: FeedEntry[] = []

  // Get blog posts
  const blogDir = path.join(process.cwd(), 'content/piercing-magazine')
  if (fs.existsSync(blogDir)) {
    const blogFiles = fs.readdirSync(blogDir)
    for (const file of blogFiles) {
      if (file.endsWith('.md')) {
        const filePath = path.join(blogDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(content)
        const slug = file.replace(/\.md$/, '')
        entries.push({
          title: data.title || slug,
          url: `/piercing-magazine/${slug}`,
          date: data.date ? new Date(data.date) : new Date(fs.statSync(filePath).mtime),
          category: 'blog',
        })
      }
    }
  }

  // Get information pages
  const infoDir = path.join(process.cwd(), 'content/information')
  if (fs.existsSync(infoDir)) {
    const infoFiles = fs.readdirSync(infoDir)
    for (const file of infoFiles) {
      if (file.endsWith('.md')) {
        const filePath = path.join(infoDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(content)
        const slug = file.replace(/\.md$/, '')
        entries.push({
          title: data.title || slug,
          url: `/information/${slug}`,
          date: data.date ? new Date(data.date) : new Date(fs.statSync(filePath).mtime),
          category: 'information',
        })
      }
    }
  }

  // Sort by date descending
  return entries.sort((a, b) => b.date.getTime() - a.date.getTime())
}

function generateAtomFeed(entries: FeedEntry[]): string {
  const lastUpdated = entries.length > 0 ? entries[0].date.toISOString() : new Date().toISOString()

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Auricle - Blog &amp; Information</title>
  <link href="${DOMAIN}/feed.xml" rel="self"/>
  <link href="${DOMAIN}/" rel="alternate"/>
  <id>${DOMAIN}/</id>
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
    <published>${entry.date.toISOString()}</published>
    <category term="${entry.category}"/>
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
    const entries = await getFeedEntries()
    const feed = generateAtomFeed(entries)

    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(feed)
  } catch (error) {
    console.error('Error generating feed:', error)
    res.status(500).json('Internal Server Error')
  }
}
