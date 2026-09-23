# Putting your website live on Azure — simple walkthrough

Your site is built for **Azure Static Web Apps** with:
- the **web pages** served as a static site,
- an **Azure Functions** app (the `api` folder) as the backend,
- **Azure Table Storage** as the database.

Follow these steps in order. You only do this once. Nothing here needs coding.

Everything you type is marked in **bold**. Where you copy a value, paste it somewhere safe (a notes app) so you can use it later.

---

## Step 1 — Create the database (Table Storage)

1. Go to **https://portal.azure.com** and sign in.
2. In the top search bar type **Storage accounts** and open it.
3. Click **+ Create**.
4. Fill in:
   - **Resource group** → click **Create new** → name it **makeup-site** → OK.
   - **Storage account name** → something unique like **makeupbyanastasia** (lowercase letters/numbers only).
   - **Region** → the one closest to you (e.g. UK South).
   - Leave everything else as default.
5. Click **Review + create**, then **Create**. Wait for it to finish, then click **Go to resource**.
6. On the left menu, under **Security + networking**, click **Access keys**.
7. Click **Show** next to **key1 → Connection string**, then copy it.
   **Save this — it's your `AZURE_STORAGE_CONNECTION_STRING`.**

---

## Step 2 — Put your website code on GitHub

Azure builds your site straight from GitHub.

1. Create a free account at **https://github.com** if you don't have one.
2. Install **GitHub Desktop** from **https://desktop.github.com** (easiest, no commands).
3. Open GitHub Desktop → **File → Add local repository** → choose this project folder
   (`Makeup-by-Anastasia-Website`).
4. Click **Publish repository** (top right). Untick "Keep this code private" only if you want it public;
   private is fine. Click **Publish**.

Your code is now on GitHub.

---

## Step 3 — Create the Static Web App

1. Back in **https://portal.azure.com**, search **Static Web Apps** → open it → **+ Create**.
2. Fill in:
   - **Resource group** → choose **makeup-site** (the one from Step 1).
   - **Name** → **makeup-by-anastasia**.
   - **Plan type** → **Free**.
   - **Region** → closest to you.
   - **Source** → **GitHub**. Click **Sign in with GitHub** and authorise.
   - **Organization** → your GitHub username.
   - **Repository** → **Makeup-by-Anastasia-Website**.
   - **Branch** → **main**.
3. Under **Build Details**:
   - **Build Presets** → choose **Next.js**.
   - **App location** → `/`
   - **Api location** → `api`
   - **Output location** → `out`
4. Click **Review + create**, then **Create**.

Azure now builds and deploys your site automatically (takes a few minutes). When it's done,
open the resource and copy the **URL** at the top (looks like
`https://something-nice.azurestaticapps.net`). **Save this URL.**

> If the first build is still running, wait for the green tick, then reload the page.

---

## Step 4 — Add your settings (this switches the database on)

1. In your Static Web App, on the left menu click **Environment variables** (under Settings).
2. Make sure the environment is **Production**. Click **+ Add** for each of these:

   | Name | Value |
   |---|---|
   | `AZURE_STORAGE_CONNECTION_STRING` | the connection string you saved in Step 1 |
   | `AUTH_SECRET` | any long random text (30+ characters, e.g. mash the keyboard) |
   | `SITE_URL` | your site URL from Step 3 (e.g. `https://something.azurestaticapps.net`) |

3. Click **Apply** / **Save**.

That's it — your site is live and working.

---

## Step 5 — Set yourself up (first login)

1. Open your site URL, then add `/admin` to the end and go there
   (e.g. `https://something.azurestaticapps.net/admin`).
2. You'll see the **first-time setup** screen. Create your password and scan the QR code with an
   authenticator app on your phone (Google Authenticator, Authy, or 1Password), then enter the 6-digit code.
3. You're in! Now fill in your real details:
   - **Settings** → your business name, contact email/phone, Instagram, currency, timezone.
   - **Services** → add your services with prices, durations and deposits.
   - **Travel zones** → add your mobile areas and fees.
   - **Availability** → set your working hours and block any days off.

Customers can now book at your main site address.

---

## Step 6 — (Optional) Turn on deposits with Stripe

Skip this to launch without online payments (bookings still come through as requests).
To take deposits later:

1. Create an account at **https://stripe.com**.
2. In Stripe → **Developers → API keys**, copy your **Secret key**.
3. In Stripe → **Developers → Webhooks → Add endpoint**:
   - Endpoint URL → your site URL + `/api/stripe-webhook`
     (e.g. `https://something.azurestaticapps.net/api/stripe-webhook`)
   - Event → **checkout.session.completed** → add endpoint.
   - Copy the endpoint's **Signing secret**.
4. Back in Azure → your Static Web App → **Environment variables**, add:

   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | your Stripe secret key |
   | `STRIPE_WEBHOOK_SECRET` | the signing secret from the webhook |

5. Click **Apply**. Set your deposit amount in **Admin → Settings → Default deposit** (or per service).

---

## Step 7 — (Optional) Use your own web address

In your Static Web App → **Custom domains** → **+ Add**, and follow the steps to point a domain
like `book.yourname.com` at the site. Afterwards, update the `SITE_URL` environment variable
(Step 4) to your custom domain so Stripe redirects stay correct.

---

## Making changes later
Edit your services/hours/prices any time from the **Admin** area — no redeploy needed.
If you (or a developer) change the *code*, just push it to GitHub and Azure rebuilds automatically.

## If something looks wrong
- **Site loads but says "something went wrong" / no services:** check the three Step 4 variables are
  set on **Production** and you clicked Apply, then reload.
- **Build failed in GitHub:** in Azure → your Static Web App → the deployment/Actions link shows the log.
  The three build values must be exactly: App `/`, Api `api`, Output `out`.
