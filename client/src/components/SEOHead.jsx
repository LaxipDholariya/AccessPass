import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEOHead Component
 * Dynamically manages document title, meta descriptions, robots directives,
 * Open Graph tags, and canonical URLs for React client-side routing.
 * 
 * Complies with Sitechecker.pro on-page SEO standards:
 * - Unique, descriptive title per page (50-60 chars)
 * - Unique meta description (120-160 chars)
 * - Strict 'noindex, nofollow' for private/visitor pass routes
 * - Canonical link management
 */
export default function SEOHead({
  title,
  description,
  noIndex = false,
  canonicalPath,
  ogType = 'website',
}) {
  const location = useLocation();

  useEffect(() => {
    // 1. Set Page Title
    const baseTitle = 'AccessPass';
    document.title = title ? `${title} | ${baseTitle}` : 'AccessPass — Digital Visitor Access Management System';

    // Helper to set or create a <meta> tag
    const setMetaTag = (attrName, attrValue, content) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Set Meta Description
    if (description) {
      setMetaTag('name', 'description', description);
      setMetaTag('property', 'og:description', description);
      setMetaTag('name', 'twitter:description', description);
    }

    // 3. Set Robots Directive (Privacy & indexing control)
    // Never index private visitor badges, pass details, or staff dashboards!
    const robotsContent = noIndex ? 'noindex, nofollow' : 'index, follow';
    setMetaTag('name', 'robots', robotsContent);

    // 4. Open Graph & Twitter Titles
    const displayTitle = title ? `${title} | ${baseTitle}` : 'AccessPass — Digital Visitor Access Management System';
    setMetaTag('property', 'og:title', displayTitle);
    setMetaTag('name', 'twitter:title', displayTitle);
    setMetaTag('property', 'og:type', ogType);

    // 5. Canonical URL
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const currentCanonical = canonicalPath 
      ? `${siteUrl}${canonicalPath}` 
      : `${siteUrl}${location.pathname}`;

    setMetaTag('property', 'og:url', currentCanonical);

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', currentCanonical);

  }, [title, description, noIndex, canonicalPath, ogType, location.pathname]);

  return null;
}
