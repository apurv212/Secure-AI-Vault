# Secure AI Vault

A secure web application for storing and managing card details (Credit/Debit, Aadhar, PAN) with AI-powered extraction.

##  Features

- 🔐 **Authentication**
- 📸 **Multiple Input Methods**: Upload from gallery, Camera capture, Manual entry
- 🤖 **AI-Powered Extraction**
- 🏦 **Automatic Bank Categorization** with filtering
- 📋 **Copy Card Details** (number, name, expiry - not CVV)
- 🔄 **Re-extraction Option** for failed extractions
- ⏳ **Skeleton Loaders** during extraction
- 📱 **Responsive Design** for all devices

##  Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Auth
- **AI**: gemini, deepseek, marker
- **UI**: Tailwind CSS + shadcn/ui


```

## Environment Variables

**Client** (`client/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

**Server** (`server/.env`):
```env
PORT=5000
CLIENT_URL=http://localhost:3000
# Optional override (defaults to RENDER_EXTERNAL_URL or PORT)
SHARE_BASE_URL=http://localhost:5000

# Firebase client config served dynamically to hide keys from the build output
PUBLIC_FIREBASE_API_KEY=your_api_key
PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your_project_id
PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
PUBLIC_FIREBASE_APP_ID=your_app_id

GEMINI_API_KEY=your_gemini_api_key
```

## Running the Application

```bash
# Install all dependencies
npm run install-all

# Run both frontend and backend
npm run dev

# Or run separately:
# Backend (port 5000)
cd server && npm run dev

# Frontend (port 3000)
cd client && npm run dev
```


## Future Features

- Share folder functionality (no login required for viewers)
- End-to-end encryption
- Export/Import cards
- Expiry date reminders
- Mobile apps (iOS/Android)
- CVV is never extracted or stored

##  License

MIT

