# Velto — electric car rental website

One-page site for Velto, a Tesla rental service in Europe, plus legal pages and one serverless function for the booking form. It's static HTML, CSS and JS on Vercel, with no framework and no build step on Vercel's side.

Live: https://veltocars.vercel.app

## Structure

```
index.html              Home page: pre-rendered HTML, critical CSS inline, SEO and Open Graph tags,
                        JSON-LD (Organization, WebSite, WebPage)
privacy.html            Privacy Policy (GDPR), served at /privacy
terms.html              Terms of Service (EU consumer law), served at /terms
imprint.html            Imprint / legal notice, served at /imprint
404.html                Not-found page (noindex)
api/booking.js          Serverless function: POST /api/booking (validation, CSRF, rate limit, delivery)
js/app.<hash>.js        Page logic: Preact 10 (MIT) + small renderer + app, minified, deferred
js/consent.<hash>.js    Cookie consent (GDPR / ePrivacy opt-in)
assets/opt/             WebP images (phone + desktop sizes), videos, legal stylesheet, social image
assets/fonts/           Aspekta 400/500 (SIL OFL), preloaded, font-display: swap
assets/icons/           Favicons and touch icons
robots.txt, sitemap.xml, site.webmanifest, .well-known/security.txt
vercel.json             Security headers, caching, clean URLs, function settings
.env.example            Environment variables for Vercel
```

Files with a hash in their name never change, so they're cached for a year. A new version gets a new name.

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, click **Add New → Project**, import the repository and set the framework preset to **Other**. Leave the build command and output directory empty, then deploy.
3. Open **Settings → Environment Variables** and add the variables from `.env.example` (see below), then redeploy.
4. On a custom domain:
   - Add the domain under **Settings → Domains**.
   - Rebuild the site with `SITE_URL=https://your-domain`. The site URL is baked into the canonical, Open Graph and sitemap URLs.
   - Optionally submit `https://your-domain/sitemap.xml` in Google Search Console.

### Environment variables

| Variable | Required | What it does |
|---|---|---|
| `BOOKING_MODE` | no | `demo` (default) means bookings are validated and confirmed, but nothing is sent anywhere. `live` refuses bookings while no delivery channel is set. |
| `BOOKING_WEBHOOK_URL` | one of these two | Each booking is sent here as JSON (Make, Zapier, n8n, a CRM…). |
| `BOOKING_WEBHOOK_SECRET` | recommended with webhook | The webhook request carries an `X-Velto-Signature: sha256=<HMAC>` header. Verify it on the receiving side. |
| `RESEND_API_KEY`, `BOOKING_EMAIL_FROM`, `BOOKING_EMAIL_TO` | one of these two | Team notification e-mail sent through Resend. |
| `ALLOWED_ORIGINS` | no | Extra origins allowed to post bookings, comma separated. |

Secrets exist only on the server. The browser code contains no keys.

## Security

- **HTTP headers** (`vercel.json`, all routes):
  - Content-Security-Policy:
    - Scripts load only from this domain: no inline scripts, no `eval`.
    - Pages can't be framed (`frame-ancestors 'none'`).
    - `object-src 'none'`.
    - `base-uri` and `form-action` are limited to `'self'`.
  - HSTS: 2 years, includeSubDomains, preload.
  - `X-Frame-Options: DENY`.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy` turns off camera, microphone, geolocation, payment and USB, among others.
  - `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy` are set to `same-origin`.
- **Inline styles.** `style-src` allows `'unsafe-inline'` because the design uses inline style attributes. Scripts stay strictly `'self'`.
- **Booking form** (`api/booking.js`):
  - Every field is validated and normalised in the browser and again on the server, using the same rules. The server is the authority.
  - Only same-origin JSON requests are accepted. The server checks Origin / Sec-Fetch-Site and requires the JSON content type, which blocks cross-site form posts (CSRF).
  - Protection against bots and abuse:
    - a honeypot field;
    - a request body limit of 4 KB;
    - a per-IP rate limit of 5 requests per 10 minutes per function instance. For hard limits, add a Vercel Firewall rule on `/api/booking`.
  - Outgoing e-mail HTML is escaped, and logs contain no personal data.
  - Responses are `no-store` and `noindex`.
- **No database.** That leaves no SQL to inject. If you add one later, use parameterised queries only.
- **Vulnerability reports** go to the contact in `/.well-known/security.txt`.

## Privacy and cookies (GDPR)

- **Opt-in cookie banner** in the site's design.
  - Categories: Strictly necessary (always on), Analytics, Marketing.
  - "Reject all" is as prominent as "Accept all".
- **Where the choice is stored:**
  - in `localStorage` (`velto-consent`);
  - in a first-party cookie (`velto_consent`, 6 months, SameSite=Lax, Secure).
- **When the banner asks again:** after 6 months, or when `CONSENT_VERSION` in the consent script changes.
- **Changing the choice:** visitors can do it at any time via "Cookies" in the footer, or any link to `#cookie-settings`.
- **Adding analytics or marketing tags.** Nothing non-essential runs before consent. Add a tag like this:
  ```html
  <script type="text/plain" data-consent="analytics" data-src="https://plausible.io/js/script.js" data-domain="your-domain"></script>
  ```
  It is turned into a real script only after the visitor agrees. You also need to add the provider's domains to `script-src` and `connect-src` in `vercel.json`. Other code can listen for the `velto:consent` event.
- **Legal pages are templates.** Fill in every highlighted `[placeholder]`: company, address, register, processors, retention periods. Have the texts checked by a lawyer before launch.

## SEO

- One `h1`, semantic landmarks (`header`, `main`, `section`, `article`, `footer`).
- The page HTML is pre-rendered, so crawlers that don't run JavaScript still see all content.
- Every page has a title, description, canonical URL and robots meta.
- Home page metadata:
  - Open Graph and Twitter Card tags with a 1200×630 social image;
  - JSON-LD structured data.
- `robots.txt` (with `/api/` blocked), `sitemap.xml` and a web app manifest.
- Core Web Vitals:
  - WebP images in two sizes with `srcset`/`sizes`, explicit width and height, lazy loading below the fold;
  - preloaded hero images and fonts;
  - one deferred script;
  - the video loads only when it comes close to the screen.

## Before going live

- Replace placeholder prices, phone numbers, the e-mail address and sample reviews.
- Configure a booking delivery channel and set `BOOKING_MODE=live`.
- Complete and legally review the Privacy Policy, Terms and Imprint.
- Make sure you hold commercial rights to all photos and video.
