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
index.html          page markup inside <template id="vl-tpl">, with all CSS inlined in <head>
js/app.<hash>.js    one minified file: Preact 10 (MIT), the small renderer and the page logic
assets/opt          WebP images in two sizes each (phone / desktop), the offer video
                    (landscape cut for desktop, portrait cut for phones), hashed file names
assets/fonts        Aspekta 400 and 500 (SIL Open Font License)
assets/icons        favicon and touch icons
vercel.json         long cache headers for the hashed files
```

The site is generated from the design source and then passed through a speed step
(image and video compression, inlined CSS, one deferred script, lazy video).
Files with a hash in the name can be cached forever; a changed file gets a new name.

## Editing content

- Text and layout: edit the markup in `index.html`. Values in `{{double braces}}` come from the page logic in `js/app.<hash>.js`.
- Fleet cars, prices, cities and booking extras live in the page logic (`VL_FLEET`, `VL_CITIES`, `VL_FEES`).
- Colors, spacing and mobile layout: the `<style>` block in `index.html`.
- For bigger changes ask for a rebuild from the design source rather than editing the minified script.

## Before going live

- Prices, ranges, distances, phone numbers and the email address are placeholders.
- The two reviews are sample copy. Replace them with real customer reviews before launch.
- The booking pop-up shows a confirmation but does not send data anywhere yet; connect it to your booking backend.
- The offer timer counts down to midnight every day; link it to a real end date for an actual promotion.
- Make sure you hold the rights to every photo and the video for commercial use.
