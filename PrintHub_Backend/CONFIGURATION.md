# PrintHub System Configuration Guide

This document provides a complete reference for configuring environment variables, database connections, payment gateways, email services, AI integrations, frontend settings, and mobile settings across the PrintHub platform.

---

## Workspace Directory Overview

- **Backend**: [`PrintHub_Backend`]
- **Frontend**: [`PrintHub_FrontEnd`]
- **Mobile**: [`PrintHub_Mobile`]

---

## 1. Backend Configuration (`PrintHub_Backend/.env`)

Copy `.env.example` to `.env` in the `PrintHub_Backend` directory:

```bash
cp PrintHub_Backend/.env.example PrintHub_Backend/.env
```

### Environment Variable Reference

#### Database Configuration (PostgreSQL / Prisma)
| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | Primary PostgreSQL connection URI. |
| `DIRECT_URL` | Optional | Direct connection URI bypassing connection poolers. |
| `RUN_MIGRATIONS` | Optional | Set `true` to run migrations on server start. |

#### Server & Network Settings
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `3000` | HTTP port for the Express backend server. |
| `NODE_ENV` | Optional | `development` | Server mode (`development`/`production`). |
| `FRONTEND_URL` | Optional | Local origin | Main web frontend URL allowed by CORS. |
| `PAYMENT_RETURN_BASE` | Optional | Frontend URL | Base URL used for payment redirects. |

#### SMTP / Gmail Email Service
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `SMTP_ENABLED` | Optional | `true` | Set to `false` to disable actual email sending. |
| `EMAIL_USER` | For SMTP | None | Sender email address (e.g., Gmail address). |
| `EMAIL_PASS` | For App Pass | None | Google App Password (16 characters). |
| `OAUTH_CLIENT_ID` | For OAuth2 | None | Google OAuth2 Client ID. |
| `OAUTH_CLIENT_SECRET` | For OAuth2 | None | Google OAuth2 Client Secret. |
| `OAUTH_REFRESH_TOKEN` | For OAuth2 | None | Google OAuth2 Refresh Token. |

#### Payment Gateway (PayMongo)
| Variable | Required | Description |
| :--- | :--- | :--- |
| `PAYMONGO_SECRET_KEY` | **Yes** | PayMongo API secret key (`sk_test_...`). |
| `PAYMONGO_WEBHOOK_SECRET` | **Yes** | PayMongo Webhook signature secret (`whsk_...`). |
| `PAYMONGO_PAYMENT_METHOD_TYPES` | Optional | Comma-separated payment methods. |

#### Storage Service (Supabase)
| Variable | Required | Description |
| :--- | :--- | :--- |
| `SUPABASE_URL` | **Yes** | Supabase project endpoint URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Secret service role API key. |

#### AI & Generative Services
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional | None | API key for Google Gemini AI. |
| `GEMINI_MODEL` | Optional | `gemini-3.1-flash-lite` | Gemini model identifier. |
| `AI_IMAGE_PROVIDER` | Optional | `fal` | Set to `huggingface` to use the free test image generator. |
| `HF_TOKEN` | For Hugging Face test mode | None | Free Hugging Face token with **Inference Providers** permission; keep it server-side. |
| `HF_IMAGE_MODEL` | Optional | `black-forest-labs/FLUX.1-Krea-dev` | Optional Hugging Face text-to-image model override. |
| `FAL_KEY` | Optional | None | Fal.ai API key for FLUX image generation. |
| `MESHY_API_KEY` | Optional | None | API key for Meshy 3D generation. |

---

## 2. Frontend Configuration (`PrintHub_FrontEnd/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `REACT_APP_API_URL` | `http://localhost:3000` | URL pointing to the Express backend. |
| `REACT_APP_PUBLIC_FRONTEND_URL` | None | Public canonical URL for web app. |
| `REACT_APP_PAYMENT_RETURN_BASE` | None | Return path override for checkout. |
| `REACT_APP_CUSTOMER_ONLY` | `false` | Set `true` to build customer-facing UI only. |

---

## 3. Mobile Configuration (`PrintHub_Mobile/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:3000` | Backend API base URL for mobile app. |
| `EXPO_PUBLIC_WEB_APP_URL` | None | Public web application URL. |
