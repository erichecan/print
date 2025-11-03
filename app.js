// 2025-10-31 00:20:40 Mobile nav toggle and testimonials auto-rotate
// 2025-10-31 00:28:20 Expanded interactions: debounce, sticky header, hero carousel, lazy loading, CTA ripple

(function () {
  // 2025-10-31 00:28:20 Utilities: debounce
  function debounce(fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  // 2025-10-31 00:20:40 Mobile navigation toggle
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // 2025-10-31 00:28:20 Sticky header on scroll
  var header = document.getElementById('main-header');
  if (header) {
    var onScroll = debounce(function () {
      if (window.scrollY > 10) header.classList.add('sticky');
      else header.classList.remove('sticky');
    }, 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // 2025-10-31 00:20:40 Testimonials auto-rotate
  var carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    var slides = Array.from(carousel.querySelectorAll('.review-slide'));
    if (slides.length > 1) {
      var index = 0;
      function show(i) {
        slides.forEach(function (el, idx) {
          var hidden = idx !== i;
          el.setAttribute('aria-hidden', String(hidden));
        });
      }
      show(index);
      setInterval(function () {
        index = (index + 1) % slides.length;
        show(index);
      }, 5000);
      var prevBtn = document.querySelector('.reviews-prev');
      var nextBtn = document.querySelector('.reviews-next');
      if (prevBtn) prevBtn.addEventListener('click', function(){ index = (index - 1 + slides.length) % slides.length; show(index); });
      if (nextBtn) nextBtn.addEventListener('click', function(){ index = (index + 1) % slides.length; show(index); });
    }
  }

  // 2025-10-31 00:28:20 Hero carousel auto-rotate
  var hero = document.querySelector('[data-hero-carousel]');
  if (hero) {
    var heroSlides = Array.from(hero.querySelectorAll('[data-hero-slide]'));
    if (heroSlides.length) {
      var hi = 0;
      function setHero(i) {
        heroSlides.forEach(function (el, idx) {
          if (idx === i) el.classList.add('active');
          else el.classList.remove('active');
        });
      }
      setHero(hi);
      setInterval(function () {
        hi = (hi + 1) % heroSlides.length;
        setHero(hi);
      }, 5000);
    }
  }

  // 2025-10-31 00:28:20 Lazy load images via IntersectionObserver
  var io;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          var src = img.getAttribute('data-src');
          if (src) {
            img.onload = function(){ img.classList.add('is-loaded'); };
            img.src = src;
            img.removeAttribute('data-src');
          }
          io.unobserve(img);
        }
      });
    }, { rootMargin: '200px 0px' });
    document.querySelectorAll('img[data-src]').forEach(function (img) { io.observe(img); });
  } else {
    // Fallback: eager load
    document.querySelectorAll('img[data-src]').forEach(function (img) {
      var s = img.getAttribute('data-src');
      img.onload = function(){ img.classList.add('is-loaded'); };
      img.src = s;
      img.removeAttribute('data-src');
    });
  }

  // 2025-10-31 00:28:20 CTA ripple effect
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('a[role="button"], button');
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    var size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 600);
  }, { passive: true });

  // 2025-10-31 02:25:00 Load hero assets from CMS-friendly config
  (function loadHeroFromConfig() {
    try {
      fetch('./assets/hero/hero.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (cfg) {
          if (!cfg) return;
          var overlay = document.querySelector('.superHeroText__svg');
          if (overlay && cfg.overlaySvg) {
            overlay.src = cfg.overlaySvg;
          }
          var picture = document.querySelector('#home-rotator .hero-picture');
          if (picture && cfg.sources) {
            var sources = picture.querySelectorAll('source');
            if (sources[0] && cfg.sources.lg) sources[0].setAttribute('srcset', cfg.sources.lg);
            if (sources[1] && cfg.sources.md) sources[1].setAttribute('srcset', cfg.sources.md);
            var img = picture.querySelector('img.hero-image');
            if (img) {
              img.src = cfg.sources.md || cfg.sources.lg || img.src;
            }
          }
        })
        .catch(function () {});
    } catch (e) {}
  })();
  
})();


