# Node Contact MVC Project

**Features**
- Add contacts
- Click CALL button (tel:) — client logs call to server and then opens the dialer
- Save notes per contact; notes are stored in MongoDB and appended to a Google Sheet (via Google Sheets API)
- MVC structure: models, controllers, routes, views (EJS)
- Simple Bootstrap UI

**Setup**
1. Copy `.env.example` to `.env` and fill values (MONGO_URL, GOOGLE_*). For local testing you can omit Google credentials; note sync will then be skipped with a console warning.
2. `npm install`
3. `npm run dev` (or `npm start`)
4. Open `http://localhost:3000`

**Google Sheets**
- Create a Google Cloud service account and enable the Google Sheets API.
- Share the Google Sheet with the service account email (edit access).
- Put the `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` into `.env`.
- Set `GOOGLE_SHEET_ID` to your sheet ID (from the sheet URL).

**Notes on CALL flow**
- Clicking the CALL button triggers a `fetch` POST to `/contacts/:id/call` which records the timestamp in the contact document, then navigates to `tel:` so the device will attempt to call.



---

## Extras added

### Seed data
A seed script is available at `seed/seed.js`. Run it with:

```
# Install dependencies first
npm install
# Set MONGO_URL in .env (or use default local)
node seed/seed.js
```

### Deploying on Heroku
1. Create a Heroku app.
2. Add `MONGO_URL` and Google env vars in Heroku config.
3. Push the repo and set Procfile (already included).

```
git init
heroku create my-app-name
git add .
git commit -m "initial"
git push heroku main
heroku config:set MONGO_URL=<your_mongo_url>
```

### Deploying on Render.com
A basic `render.yaml` is included. You can deploy via Render dashboard and set environment variables (`MONGO_URL`, `GOOGLE_*`).

### Google Service Account (step-by-step)
1. Visit Google Cloud Console: Create a project or use an existing one.
2. Enable the **Google Sheets API** for the project.
3. Create a **Service Account** (IAM & Admin → Service Accounts).
4. Create and download a **JSON key** for the service account. Keep it safe.
5. Share your Google Sheet with the service account email (found in the JSON, e.g., `...@...iam.gserviceaccount.com`) with Edit access.
6. In your `.env`, add:

```
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_CLIENT_EMAIL=service-account-email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Note: When copying the private key into environment variables, replace raw newlines with `\\n` or wrap the value in quotes as shown.

If you want, I can also format the JSON key into `.env`-friendly values — paste the JSON here (do NOT paste secret keys in public channels unless you're comfortable).