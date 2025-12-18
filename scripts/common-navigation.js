// [2025-11-02 22:30:00] Common navigation component for all pages
/**
 * Common Navigation
 * Provides consistent navigation across all pages
 */

// Insert common footer HTML
function insertCommonFooter() {
  const footerInfo = `
    <section class="footer-info" aria-label="Site Information">
      <div class="container footergrid">
        <div>
          <h4>About Us</h4>
          <ul>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact Us</a></li>
            <li><a href="promotions.html">Promotions</a></li>
            <li><a href="design-gallery.html">Design Gallery</a></li>
          </ul>
        </div>
        <div>
          <h4>Your Account</h4>
          <ul>
            <li><a href="account.html">My Account</a></li>
            <!-- [2025-01-30 12:00:00] 移除 My Designs 链接 -->
            <li><a href="order-tracking.html">Track Your Order</a></li>
            <li><a href="cart.html">View Cart</a></li>
          </ul>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><a href="long-sleeve.html">All Products</a></li>
            <li><a href="design-lab.html">Design Lab</a></li>
            <li><a href="promotions.html">Promotions</a></li>
            <li><a href="help.html">Help Center</a></li>
          </ul>
        </div>
        <div>
          <h4>Support</h4>
          <ul>
            <li><a href="help.html">Help Center</a></li>
            <li><a href="contact.html">Contact Us</a></li>
            <li><a href="shipping-info.html">Shipping Info</a></li>
            <li><a href="returns.html">Returns</a></li>
          </ul>
        </div>
        <div>
          <h4>Legal</h4>
          <ul>
            <li><a href="privacy-policy.html">Privacy Policy</a></li>
            <li><a href="terms-of-service.html">Terms of Service</a></li>
            <li><a href="size-guide.html">Size Guide</a></li>
            <li><a href="sitemap.xml">Sitemap</a></li>
          </ul>
        </div>
      </div>
    </section>

    <footer class="site-footer" role="contentinfo">
      <div class="container">
        <small>© 2025 suvernire plus. All rights reserved.</small>
        <nav aria-label="Legal Links">
          <a href="privacy-policy.html">Privacy Policy</a>
          <span aria-hidden="true"> | </span>
          <a href="terms-of-service.html">Terms of Service</a>
          <span aria-hidden="true"> | </span>
          <a href="returns.html">Returns</a>
          <span aria-hidden="true"> | </span>
          <a href="contact.html">Contact</a>
        </nav>
      </div>
    </footer>
  `;

  // Insert before closing body tag
  const scripts = document.querySelectorAll('script[src]');
  if (scripts.length > 0) {
    scripts[scripts.length - 1].insertAdjacentHTML('beforebegin', footerInfo);
  } else {
    document.body.insertAdjacentHTML('beforeend', footerInfo);
  }
}

// Auto-insert footer on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', insertCommonFooter);
} else {
  insertCommonFooter();
}

