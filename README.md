# 📬 Inbox Classifier

**Inbox Classifier** is a full-stack web application that connects to your Google account and automatically analyzes, categorizes, and visualizes your **Gmail emails** and **Google Calendar events** using AI.

🔗 **Live Demo:**  
👉 https://inbox-classifier-drab.vercel.app/

---

## ✨ Features

- 🔐 **Google OAuth Authentication**
    - Secure login with Google
    - Gmail & Calendar permissions handling
    - HttpOnly JWT cookies

- 📧 **Gmail Analysis**
    - Fetch and refresh emails from Gmail
    - AI-based categorization
    - Category statistics and visualization

- 📅 **Google Calendar Analysis**
    - Fetch and refresh calendar events
    - Automatic event categorization
    - Insights based on event types

- 🧠 **AI-Powered Classification**
    - LLM-based categorization logic
    - Confidence scores per category

- 🧹 **Account Management**
    - Secure logout
    - Full account deletion (with cascading data removal)

- 🚀 **Production-ready Deployment**
    - Frontend on Vercel
    - Backend & PostgreSQL on Render
    - Zero-downtime frontend deployments

---

## 🧱 Tech Stack

### Frontend

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- Cookie-based authentication (`credentials: include`)

### Backend

- **Node.js**
- **Express**
- **PostgreSQL**
- **Google OAuth 2.0**
- **JWT (HttpOnly Cookies)**
- **OpenAI API** (LLM integration)

### Infrastructure

- **Vercel** – Frontend hosting
- **Render** – Backend & PostgreSQL
- **GitHub** – CI/CD (auto-deploy)

---

## 🗂 Project Structure

```
inboxClassifier/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── db/
│   └── server.js
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── public/
│   └── styles/
```

---

## 🔐 Authentication Flow

1. User logs in with Google
2. Backend receives OAuth callback
3. JWT is issued and stored as an **HttpOnly cookie**
4. Frontend communicates with backend using `credentials: include`
5. All protected routes validate JWT via middleware

---

## 🗄 Database Design

- **users**
- **mails**
- **events**
- **oauth_tokens**

All related data is linked via foreign keys with  
`ON DELETE CASCADE` for safe account deletion.

---

## ⚙️ Environment Variables (Example)

### Backend

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_COOKIE_HTTPS_ONLY=true

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_SECRET_KEY=...
```

### Frontend

```env
NEXT_PUBLIC_API_URL=https://<backend-domain>
```

---

## 🧪 Local Development

```bash
# backend
cd backend
npm install
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

Frontend runs on `localhost:4000`, backend on `localhost:3000`.

---

## 🎯 Why This Project?

This project was built to demonstrate:

- Secure real-world OAuth flows
- Cross-domain authentication with cookies
- AI-powered data classification
- Clean frontend–backend separation
- Production deployment practices

It is designed as a **real product MVP**, not a toy project.

---

## 👤 Author

**Miraç Sucu**  
Computer Engineering Student  
Interested in AI-powered products & full-stack systems

🔗 GitHub: https://github.com/miracsucu4417

---

## 📜 License

MIT License
