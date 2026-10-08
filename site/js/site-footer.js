// The one shared site footer -- markup lives here and nowhere else.
// Every page includes this as a plain (non-deferred) script exactly where
// the footer belongs:
//
//   <script src="js/site-footer.js"></script>      (or ../js/... in a subfolder)
//
// It runs synchronously and inserts the footer in place of its own <script>
// tag, so the footer is in the DOM before DOMContentLoaded -- js/newsletter.js
// (which wires the .newsletter form on DOMContentLoaded) keeps working
// unchanged. Styles live in Styles/site-footer.css.
//
// Links are resolved against this script's own URL rather than the page's,
// so the same markup works from site root pages and subfolder pages
// (account/, admin/, checkout/, seller/, shared/) alike.
(function () {
  const script = document.currentScript;
  if (!script) return;

  const root = script.src.replace(/js\/site-footer\.js(\?.*)?$/, '');

  const markup = `
  <footer class="contact-footer">
    <div class="footer-cta-band">
      <div class="footer-cta-inner">
        <div class="cta-right">
          <p class="cta-text">READY TO START?</p>
          <h2 class="cta-heading">Contact us<span class="cta-underline"></span></h2>
          <a class="cta-button" href="${root}contact.html" aria-label="Contact us"><i class="fa-solid fa-arrow-right"></i></a>
        </div>
      </div>
    </div>
    <div class="footer-dark-band">
      <div class="footer-dark-inner">
        <div class="footer-contact-row">
          <div class="footer-office">
            <h4 class="office-heading">Office</h4>
            <p class="office-address">Manchester, England</p>
            <p class="office-email"><a href="mailto:kingharrison1999@gmail.com">kingharrison1999@gmail.com</a></p>
          </div>
          <div class="footer-office">
            <h4 class="office-heading">Quick Links</h4>
            <p><a href="${root}browse.html">Browse</a></p>
            <p><a href="${root}terms.html">Terms of Service</a></p>
            <p><a href="${root}shipping-returns.html">Shipping &amp; Returns</a></p>
          </div>
        </div>
        <hr class="footer-divider" />
        <div class="footer-newsletter">
          <h4 class="newsletter-heading">Newsletter</h4>
          <form class="newsletter">
            <input type="email" placeholder="Your email" />
            <button type="submit">Subscribe</button>
          </form>
          <div class="newsletter-message" hidden></div>
        </div>
        <div class="footer-follow">
          <h4 class="social-heading">Follow</h4>
          <div class="footer-social-icons">
            <a href="https://x.com/" target="_blank" rel="noreferrer noopener" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
            <a href="https://instagram.com/" target="_blank" rel="noreferrer noopener" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="https://facebook.com/" target="_blank" rel="noreferrer noopener" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
          </div>
        </div>
      </div>
    </div>
  </footer>

  <footer class="hk-footer">
    <div class="copyright">
      <p>2025 <span class="fa-solid fa-copyright"></span> Copyright Marketplace - All Rights Reserved. Built by Harrison King.</p>
    </div>
  </footer>`;

  script.insertAdjacentHTML('beforebegin', markup);
})();
