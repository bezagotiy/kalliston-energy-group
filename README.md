# Kalliston Energy Group Ltd — Website

A simple, trust-focused one-page site for a maritime crewing company.
Seafarers can apply online and **attach their CV / application form**, which is
delivered to your email as an attachment.

## Structure

```
index.html            # the page (includes an inline SVG icon sprite)
css/styles.css        # all styling
js/main.js            # form handling, validation, file upload, animations
js/globe.js           # sets up the interactive 3D hero globe
js/vendor/cobe.js     # COBE globe library (bundled locally, MIT licensed)
assets/               # logo image
```

## Run locally

Serve it over HTTP (the file-upload form **and** the 3D globe need this — the
globe is loaded as an ES module, which browsers block on `file://`):

```bash
# from the project folder
python3 -m http.server 8000
# then open http://localhost:8000
```

## Modern visuals — globe & icons

Both are free, open-source and already bundled into the project (no external
CDN needed at runtime):

- **3D globe** — [COBE](https://github.com/shuding/cobe) (MIT). A rotating WebGL
  globe in the hero with champagne markers on major maritime ports. Drag it to
  spin. Colours and the port list live in `js/globe.js` (edit the `markers`
  array — each entry is `{ location: [latitude, longitude], size }`). If a
  visitor's browser has no WebGL, the globe hides itself and the layout stays
  intact.
- **Icons** — [Lucide](https://lucide.dev) (ISC). Clean line icons replace the
  old emoji. They live as an inline `<svg>` sprite at the top of `index.html`
  and are used with `<svg class="icon"><use href="#i-name"/></svg>`. To add a
  new one, copy its SVG paths from lucide.dev into a new `<symbol>`.

## Enable application sending (IMPORTANT)

The form uses **Web3Forms** — a free service that emails you the submission
**with the attached file**. No server required.

1. Go to https://web3forms.com and enter the email address where applications
   should arrive (e.g. your crewing inbox). You'll get an **Access Key**.
2. Open `index.html`, find this line and paste your key:

   ```html
   <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY" />
   ```

3. That's it — submissions (with the uploaded file) now arrive in your inbox.

Free plan: file attachments up to 5 MB (already enforced in the form).

## Replace the placeholder details

Search `index.html` for these placeholders and update them:

- `info@kalliston-energy.com` — contact email (2 places + form intro)
- `+00 (000) 000-00-00` / `tel:+000000000000` — phone / WhatsApp
- `Address line 1, City, Country` — office address
- Working hours in the **Contact** section
- The stat numbers (`15+`, `2000+`, `120+`, `40+`) in the **stats** section

## Deploy (free options)

- **Netlify:** drag the project folder onto https://app.netlify.com/drop
- **GitHub Pages:** push the folder to a repo → Settings → Pages → deploy from branch
- **Vercel / Cloudflare Pages:** import the folder as a static site

All work as-is because the site is fully static.
