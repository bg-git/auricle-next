import { marked } from 'marked';

/**
 * Custom marked renderer that converts internal markdown links for Next.js optimization.
 * Internal links (starting with /) are marked with data-internal-link attribute.
 * This allows components to enhance them with NextLink for client-side navigation.
 * External links get target="_blank" and rel="noopener noreferrer".
 */
export function initializeMarkedRenderer() {
  const renderer = {
    link(token: any) {
      const href = token.href || '';
      const text = token.text || '';

      // Check if it's an internal link
      if (href && href.startsWith('/')) {
        // Mark internal links for client-side enhancement
        return `<a href="${href}" data-internal-link="true">${text}</a>`;
      }

      // External links: add target and rel attributes
      if (href) {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }

      return `<a>${text}</a>`;
    },
  };

  marked.use({ renderer } as any);
}

/**
 * Call this once at module load to set up the marked renderer
 */
initializeMarkedRenderer();
