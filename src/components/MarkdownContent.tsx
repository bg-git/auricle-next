'use client';

import { useEffect, useRef } from 'react';

interface MarkdownContentProps {
  html: string;
}

/**
 * Renders markdown HTML and enhances internal links with Next.js Link component.
 * Links marked with data-internal-link="true" are converted to use NextLink for
 * client-side navigation and prefetching.
 */
export default function MarkdownContent({ html }: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Find all internal links
    const internalLinks = containerRef.current.querySelectorAll(
      'a[data-internal-link="true"]'
    );

    internalLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const text = link.textContent || '';
      const className = link.className;

      if (!href) return;

      // Create a wrapper span that we'll replace with NextLink content
      const wrapper = document.createElement('span');
      wrapper.innerHTML = `<a href="${href}" class="${className}">${text}</a>`;

      // Get the new link element
      const newLink = wrapper.querySelector('a') as HTMLAnchorElement;

      // Add data attribute so it can be targeted by CSS if needed
      newLink?.setAttribute('data-internal-link', 'true');

      // Replace the original link
      link.replaceWith(newLink || wrapper);
    });
  }, [html]);

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />;
}
