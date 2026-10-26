import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEOHead Component
 * Dynamically manages document title, meta descriptions, robots directives,
 * Open Graph tags, Twitter card tags, and canonical URLs for React client-side routing.
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
    const displayTitle = title 
      ? `${title} | ${baseTitle}` 
      : 'Digital Visitor Access Management System | AccessPass';
    
    document.title = displayTitle;

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

    // 3. Set Robots Directive
    const robotsContent = noIndex ? 'noindex, nofollow' : 'index, follow';
    setMetaTag('name', 'robots', robotsContent);

    // 4. Open Graph & Twitter Card Metadata
    setMetaTag('property', 'og:site_name', 'AccessPass');
    setMetaTag('property', 'og:title', displayTitle);
    setMetaTag('name', 'twitter:title', displayTitle);
    setMetaTag('property', 'og:type', ogType);

    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://access-pass-five.vercel.app';
    const ogImageUrl = `${siteUrl}/og-image.png`;

    setMetaTag('property', 'og:image', ogImageUrl);
    setMetaTag('property', 'og:image:secure_url', ogImageUrl);
    setMetaTag('property', 'og:image:type', 'image/png');
    setMetaTag('property', 'og:image:width', '1200');
    setMetaTag('property', 'og:image:height', '630');
    setMetaTag('property', 'og:image:alt', 'AccessPass Digital Visitor Access Management System Banner');
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:image', ogImageUrl);

    // 5. Canonical URL
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
