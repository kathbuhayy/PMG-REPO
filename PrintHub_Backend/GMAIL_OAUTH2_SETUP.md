# Gmail OAuth2 Setup Guide

This guide walks you through setting up Google OAuth2 credentials to allow Nodemailer to send emails from a personal `@gmail.com` account reliably on hosted environments such as **Render**, without being blocked by Google's IP security checks.

---

## Why OAuth2 Instead of App Passwords?

Google's security system evaluates the **IP address** of each SMTP login attempt. Cloud hosting providers (like Render) share large pools of IPs that Google flags as suspicious, causing your App Password authentication to fail even when the credentials are correct.

OAuth2 authenticates using a **cryptographically signed token** that you pre-authorize via your Google Account. Google validates the token signature, not the server's IP, so cloud environments are never blocked.

---

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Enter a name (e.g., `PrintHub Mailer`) and click **Create**.
4. Ensure the new project is selected in the project dropdown.

---

## Step 2: Enable the Gmail API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**.
2. Search for **Gmail API** and click on it.
3. Click **Enable**.

---

## Step 3: Configure the OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** as the user type and click **Create**.
3. Fill in the required fields:
   - **App name**: `PrintHub Mailer`
   - **User support email**: your personal `@gmail.com` address
   - **Developer contact information**: your personal `@gmail.com` address
4. Click **Save and Continue** through the Scopes step (no extra scopes needed here yet).
5. On the **Test Users** step, click **Add Users** and add your personal `@gmail.com` address.
6. Click **Save and Continue**, then **Back to Dashboard**.

---

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Under **Application type**, select **Web application**.
4. Under **Authorized redirect URIs**, click **Add URI** and enter:
   ```
   https://developers.google.com/oauthplayground
   ```
5. Click **Create**.
6. A dialog will appear with your credentials. Save both:
   - **Client ID** (looks like: `xxxxxxxxxx.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-xxxxxxxxxx`)

---

## Step 5: Generate a Refresh Token via OAuth2 Playground

1. Open the [Google OAuth2 Playground](https://developers.google.com/oauthplayground).
2. Click the **gear icon** (⚙️) in the top-right corner.
3. Check the box **Use your own OAuth credentials**.
4. Enter your **Client ID** and **Client Secret** from Step 4, then close the settings panel.
5. In the left panel, scroll down to **Gmail API v1** and select the scope:
   ```
   https://mail.google.com/
   ```
6. Click **Authorize APIs** and sign in with the personal Gmail account you want to send mail from.
7. You will be shown a consent screen. Click **Allow**.
8. In Step 2 of the playground, click **Exchange authorization code for tokens**.
9. Copy the **Refresh Token** value from the response. Save it — it will not be shown again.

> [!IMPORTANT]
> Do NOT click "Refresh access token" yet. Copy and save the **Refresh Token** immediately as it is only shown once.

---

## Step 6: Configure Environment Variables

Add the following credentials to your [`PrintHub_Backend/.env`](file:///c:/Users/Matmat/Documents/GitHub/pgm/PrintHub_Backend/.env) file or to your Render environment dashboard:

```env
# Email (Gmail OAuth2)
SMTP_ENABLED=true
EMAIL_USER=your-email@gmail.com
OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
OAUTH_CLIENT_SECRET=GOCSPX-your-client-secret
OAUTH_REFRESH_TOKEN=your-refresh-token

# Leave EMAIL_PASS blank or omitted when using OAuth2
```

> [!NOTE]
> `EMAIL_PASS` is no longer used once OAuth2 is configured. The new code reads `OAUTH_REFRESH_TOKEN` instead.

---

## Step 7: Fixing Token Expiry (Publish App to Production)

By default, while your Google Cloud project's OAuth consent screen is in **Testing** mode, refresh tokens expire after **7 days**. To prevent this:

1. Go to **APIs & Services** > **OAuth consent screen** in the Google Cloud Console.
2. Click **Publish App** under the Publishing Status section.
3. You will be prompted to confirm the publishing action. Click **Confirm**.
4. Once published, your refresh tokens will no longer expire.

> [!WARNING]
> Publishing makes your OAuth consent screen publicly visible in Google's directory. It does **not** grant anyone access — it simply removes the 7-day token expiry restriction on test users.

---

## Verification

After deploying to Render with the updated environment variables, check your server logs for:

```
✅ Email transporter ready: true
```

If you see an error instead, double-check:
- `EMAIL_USER` matches the exact Gmail address you authorized in the OAuth2 Playground.
- `OAUTH_REFRESH_TOKEN` was copied in full (no leading/trailing spaces).
- The **Gmail API** is enabled in your Google Cloud project.
