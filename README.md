# Varanasi Sports Live — Privacy / Secure Admin Version

This version replaces the earlier browser-only admin system with a **server-side authenticated** admin system.

## Privacy and security changes
- No admin username/password is embedded in the website JavaScript.
- No website content is saved to browser storage.
- Admin login is checked on the server using Node.js `scrypt` password hashing.
- Admin session uses an `HttpOnly` + `SameSite=Strict` cookie.
- Admin write requests require a CSRF token.
- Security headers include CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and a restrictive Permissions Policy.
- Admin content is stored server-side in `data/site.json`.
- Client event enquiries are **not stored in the website database**. The form opens a pre-filled WhatsApp message to **9506117861**.
- Client phone number remains optional.

## First admin password
A strong first password has been generated for this package. It is stored separately in `FIRST_ADMIN_PASSWORD.txt` so it is not exposed in the website source.

**Change it after first login.** The safest way is to generate a new hash and replace `ADMIN_PASSWORD_HASH` in `.env`.

Generate a new hash:

`node server.js --hash "YOUR-NEW-STRONG-PASSWORD"`

Then put the result in `.env`:

`ADMIN_PASSWORD_HASH=...`

## Run locally
1. Install Node.js 20+.
2. Keep `.env`, `data/` and `server.js` on the server; do not put them inside the public web root.
3. Run `npm start`.
4. Open `http://localhost:3000`.
5. Use **Admin Login** to manage events, gallery, rates and the main page image.

## Production deployment
Use HTTPS and a Node-compatible host/VPS. Set `NODE_ENV=production`. The server automatically adds the `Secure` flag to the admin cookie in production.

Do **not** deploy this to a static-only host if you need the secure admin system. Static hosting cannot protect the admin credentials.

## Important security reality
This is materially safer than the previous front-end-only login, but it is still a small custom application. For a high-value commercial system, add a proper database, backups, rate limiting, audit logs, account recovery, 2FA and a managed identity provider.


### Updated Admin Password
The Admin Login password has been updated as requested. Username remains `admin`.

**Password:** `T@smiya1`

## Latest fixes
- Admin Login now works when started with either `node server.js` or `npm start`; the server loads `.env` automatically.
- Local HTTP sessions no longer fail because of an inappropriate `Secure` cookie; `Secure` is enabled automatically when the connection is HTTPS.
- Login UI now uses explicit DOM references and shows a clear message if the HTML is opened directly from `file://`.
- Client phone number is **mandatory** for event queries.
- Queries can be sent through **WhatsApp** to the configured WhatsApp number or through **Email** to the configured business email.
- Configure the business email under Admin → Site Settings before using the Email button.
- Do not open `public/index.html` directly. Run `start-server.bat` on Windows or `node server.js`, then visit `http://localhost:3000`.
