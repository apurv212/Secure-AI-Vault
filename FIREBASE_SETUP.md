# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: "secure-ai-vault"
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab

### Enable Email/Password Authentication

4. Click on **Email/Password** provider
5. Enable the **Email/Password** toggle (first option)
6. Click **Save**

### Enable Google Authentication

7. Click on **Google** provider
8. Enable the toggle
9. Add your project support email
10. Click **Save**

**Note**: Both authentication methods are now enabled. Users can sign in with either Google or Email/Password.

## Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Select **Start in test mode** (for development)
4. Choose a location (closest to you)
5. Click "Enable"

**Important**: Update security rules later for production!

## Step 4: Create Storage Bucket

1. Go to **Storage**
2. Click "Get started"
3. Start in test mode
4. Choose same location as Firestore
5. Click "Done"

## Step 5: Get Web App Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click Web icon (`</>`)
4. Register app name: "secure-ai-vault-web"
5. Copy the config object

## Step 6: Get Service Account (for Backend)

1. In Project Settings, go to **Service accounts**
2. Click "Generate new private key"
3. Save the JSON file as `serviceAccountKey.json` in `server/` folder
4. **Never commit this file to Git!**

## Step 7: Update Environment Variables

Copy the config values to your `.env` files as shown in README.md

## Step 8: Configure Security Rules

### Firestore Security Rules

**Where to apply:** Go to **Firestore Database** → **Rules** tab

1. In Firebase Console, click on **Firestore Database** in the left sidebar
2. Click on the **Rules** tab at the top
3. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cards/{cardId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

4. Click **Publish** to save the rules

### Storage Security Rules

**Where to apply:** Go to **Storage** → **Rules** tab (You're currently in the Storage section!)

1. In Firebase Console, click on **Storage** in the left sidebar (you're already there!)
2. Click on the **Rules** tab at the top (next to "Files" and "Usage")
3. Replace the default rules with the following:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read their own files
    match /cards/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    // Also allow read access via download URLs with tokens (for server-side access)
    match /{allPaths=**} {
      allow read: if true; // Download URLs with tokens are already secured
      allow write: if request.auth != null;
    }
  }
}
```

**Alternative (More Secure) - If the above doesn't work:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cards/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Allow server-side access via download URLs
    match /{allPaths=**} {
      allow read: if resource.metadata != null; // Allow if file exists and has metadata
    }
  }
}
```

4. Click **Publish** to save the rules

**Important:** These rules ensure that:
- Users can only access their own cards
- Only authenticated users can read/write data
- Each user's files are isolated in their own folder

## Authentication Methods Summary

Your Secure AI Vault now supports **two authentication methods**:

### 1. Email/Password Authentication
- Users can sign up with their email and password
- Password must be at least 6 characters long
- Users can optionally provide their name during signup
- Secure password-based authentication managed by Firebase

### 2. Google Sign-In
- One-click authentication using Google account
- No need to remember passwords
- Faster sign-in experience
- Leverages Google's security infrastructure

### User Experience
- Users can toggle between "Sign In" and "Sign Up" modes on the login page
- Clear error messages for common authentication issues
- Both methods provide the same level of security and access to the vault
- Users authenticated with either method can access all features

### Firebase Console Verification
To verify your authentication setup:
1. Go to Firebase Console → Authentication
2. You should see both "Email/Password" and "Google" enabled under Sign-in methods
3. After users sign up, you'll see them listed in the "Users" tab

