// [2025-11-02 22:50:00] Script to add common footer to all pages
// This ensures consistent navigation across all pages

const commonFooterHTML = `
<!-- [2025-11-02 22:50:00] Common footer with fixed links -->
<section class="footer-info" aria-label="Site Information">
	<div class="container footergrid">
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
			<h4>Your Account</h4>
			<ul>
				<li><a href="account.html">My Account</a></li>
				<li><a href="order-tracking.html">Track Order</a></li>
				<li><a href="cart.html">View Cart</a></li>
				<!-- [2025-01-30 12:00:00] 移除 My Designs 链接 -->
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

// Function to add footer if not present
function addCommonFooter() {
	// Check if footer-info already exists
	if (document.querySelector('.footer-info')) {
		return; // Footer already exists
	}

	// Find the last script tag or main closing tag
	const scripts = document.querySelectorAll('script');
	const lastScript = scripts[scripts.length - 1];
	
	if (lastScript) {
		lastScript.insertAdjacentHTML('beforebegin', commonFooterHTML);
	} else {
		// Fallback: insert before closing body tag
		document.body.insertAdjacentHTML('beforeend', commonFooterHTML);
	}
}

// Auto-add on page load
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', addCommonFooter);
} else {
	addCommonFooter();
}


