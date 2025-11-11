# Secure AI Vault

A secure web application for storing and managing card details (Credit/Debit, Aadhar, PAN) with AI-powered extraction.

## ✨ Features

- 🔐 **Authentication**
- 📸 **Multiple Input Methods**: Upload from gallery, Camera capture, Manual entry
- 🤖 **AI-Powered Extraction**
- 🏦 **Automatic Bank Categorization** with filtering
- 📋 **Copy Card Details** (number, name, expiry - not CVV)
- 🔄 **Re-extraction Option** for failed extractions
- ⏳ **Skeleton Loaders** during extraction
- 📱 **Responsive Design** for all devices

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Auth
- **AI**: gemini, deepseek, marker


```

## 🔧 Environment Variables

**Client** (`client/.env`):
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_API_URL=http://localhost:5000/api
```

**Server** (`server/.env`):
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
```

## 🏃 Running the Application

```bash
# Install all dependencies
npm run install-all

# Run both frontend and backend
npm run dev

# Or run separately:
# Backend (port 5000)
cd server && npm run dev

# Frontend (port 3000)
cd client && npm start
```


## 🔮 Future Features

- Share folder functionality (no login required for viewers)
- End-to-end encryption
- Export/Import cards
- Expiry date reminders
- Mobile apps (iOS/Android)
- CVV is never extracted or stored

## 📝 License

MIT

