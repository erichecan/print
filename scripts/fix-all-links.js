// Script to fix all internal links across pages
// This ensures all navigation links work correctly for Netlify deployment

/**
 * Fix all navigation links in a page
 * Run this in browser console on each page, or use as build script
 */

function fixNavigationLinks() {
  // Fix all # links to point to actual pages
  const linkMappings = {
    '#about': 'about.html',
    '#careers': 'about.html',
    '#press': 'about.html',
    '#reviews': 'design-gallery.html',
    '#chat': 'contact.html',
    '#email': 'contact.html',
    '#hours': 'contact.html',
    '#quote': 'checkout.html',
    '#guidelines': 'help.html',
    '#accessibility': 'help.html',
    '#tshirts': 'long-sleeve.html',
    '#promotional': 'long-sleeve.html',
    '#fundraising': 'promotions.html',
    '#sitemap': 'sitemap.xml',
    '#privacy': 'privacy-policy.html',
    '#ca-privacy': 'privacy-policy.html',
    '#terms': 'terms-of-service.html',
    '#donotsell': 'privacy-policy.html',
    '#demo': 'design-lab.html'
  };

  // Find all links and fix them
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const href = link.getAttribute('href');
    if (linkMappings[href]) {
      link.setAttribute('href', linkMappings[href]);
    }
  });

  console.log('✅ Navigation links fixed');
}

// Auto-run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixNavigationLinks);
} else {
  fixNavigationLinks();
}

