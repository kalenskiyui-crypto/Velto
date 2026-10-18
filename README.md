# Velto — electric car rental website

One-page website for Velto, a Tesla rental service in Europe. Static HTML, CSS and JavaScript, no build step.

## Run it locally

Open a terminal in this folder and start any static server, for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk also works in most browsers, but the video and fonts load more reliably through a server.

## Publish with GitHub Pages

1. Create a new repository on GitHub and upload the contents of this folder (keep the folder structure).
2. In the repository go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/<repository-name>/`.

The empty `.nojekyll` file tells GitHub Pages to serve the files as they are.

## Structure

```
index.html          page markup, inside <template id="vl-tpl">
css/style.css       all styles (fonts, buttons, cards, pop-up, footer, mobile)
js/app.js           page logic: hero band, scroll car, offer timer, city picker,
                    booking pop-up, scroll reveals, halftone footer
js/runtime.js       small renderer: fills {{holes}}, <sc-for> loops and events
js/preact.min.js    Preact 10 (MIT), used by the renderer
assets/fonts        Aspekta 400 and 500 (SIL Open Font License)
assets/hero         photos for the curved hero band
assets/fleet        car photos for the fleet cards
assets/img          car, wheel, "What we do" photos, review portraits
assets/video        offer video and its poster
```

## Editing content

- Text and layout: edit the markup in `index.html`. Values in `{{double braces}}` come from `renderVals()` in `js/app.js`.
- Fleet cars, prices and distances: the `VL_FLEET` list at the top of `js/app.js`.
- Cities in the picker: `VL_CITIES` in `js/app.js`.
- Booking extras (delivery, child seat, extra driver): `VL_FEES` in `js/app.js`.
- Colors, spacing and mobile layout: `css/style.css`.

## Before going live

- Prices, ranges, distances, phone numbers and the email address are placeholders.
- The two reviews are sample copy. Replace them with real customer reviews before launch.
- The booking pop-up shows a confirmation but does not send data anywhere yet; connect it to your booking backend.
- The offer timer counts down to midnight every day; link it to a real end date for an actual promotion.
- Make sure you hold the rights to every photo and the video for commercial use.
