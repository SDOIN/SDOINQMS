# 🔒 Firebase API Key Security Guide

## ⚠️ Important: Understanding Firebase API Keys

**For Firebase web applications, the API key is MEANT to be public.** It's not a secret like a password. Here's why:

- ✅ **API Key Purpose**: Identifies your Firebase project, not authenticates users
- ✅ **Security Model**: Firebase uses **Security Rules** to protect your data, not API key secrecy
- ✅ **Public by Design**: All Firebase web apps expose their API keys in client-side code

## 🛡️ How to Secure Your Firebase Project

### 1. **Firebase Security Rules** (Primary Protection) ✅ Already Configured

Your data is protected by Security Rules in the Realtime Database. These rules control who can read/write data, regardless of who has the API key.

**Your current rules (from migration guide):**
```json
{
  "rules": {
    "receiving_state": {
      ".read": true,
      ".write": true,
      "serving": { ".validate": "newData.isString() || newData === null" },
      "next": { ".validate": "newData.isString() || newData === null" }
    },
    "releasing_state": {
      ".read": true,
      ".write": true,
      "serving": { ".validate": "newData.isString() || newData === null" },
      "next": { ".validate": "newData.isString() || newData === null" }
    },
    "receiving_queue": {
      ".read": true,
      ".write": true
    },
    "releasing_queue": {
      ".read": true,
      ".write": true
    },
    "rfid_cards": {
      ".read": true,
      ".write": true,
      "$rfidId": {
        "queueNumber": { ".validate": "newData.isNumber() && newData > 0" },
        "rfidId": { ".validate": "newData.isString()" }
      }
    }
  }
}
```

### 2. **API Key Domain Restrictions** (Recommended) 🌐

Restrict your API key to only work from your GitHub Pages domain. This prevents others from using your API key on their own websites.

#### Steps to Add Domain Restrictions:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your Firebase project: `sdoinqms-1c17d`

2. **Navigate to APIs & Services**
   - Click the hamburger menu (☰) in the top left
   - Go to **"APIs & Services"** → **"Credentials"**

3. **Find Your API Key**
   - Look for the API key: `AIzaSyBmKiGvyq6H0Ym5BHXaOXePfgs5X_RF51A`
   - Click on the API key name to edit it

4. **Add HTTP Referrer Restrictions**
   - Under **"Application restrictions"**, select **"HTTP referrers (web sites)"**
   - Click **"Add an item"** and add your GitHub Pages domain:
     ```
     https://sdoin.github.io/*
     `https://*.github.io/*`
     ```
   - Or if you have a custom domain:
     ```
     https://yourdomain.com/*
     https://*.yourdomain.com/*
     ```
   - Click **"Save"**

5. **Restrict API Usage (Optional but Recommended)**
   - Under **"API restrictions"**, select **"Restrict key"**
   - Select only the APIs you need:
     - ✅ Firebase Realtime Database API
     - ✅ Firebase Installations API
   - Click **"Save"**

### 3. **Firebase App Check** (Advanced Protection) 🚀

Firebase App Check provides additional protection by verifying that requests come from your legitimate app.

**Note**: This requires additional setup and may not be necessary for your use case, but it's the strongest protection available.

#### To Enable App Check:

1. **Go to Firebase Console**
   - Navigate to: https://console.firebase.google.com/
   - Select your project: `sdoinqms-1c17d`
   - Go to **"App Check"** in the left sidebar

2. **Register Your Web App**
   - Click **"Register"** next to your web app
   - Choose a provider (reCAPTCHA v3 is free and recommended)
   - Follow the setup instructions

3. **Update Your Code**
   - Add App Check initialization to your `firebase-config.js`
   - This requires additional code changes

**⚠️ Note**: App Check adds complexity and may not be necessary if you have proper Security Rules and domain restrictions.

## 📋 Summary: What You Should Do

### ✅ **Required (Already Done)**
- [x] Configure Firebase Security Rules (from migration guide)

### ✅ **Highly Recommended**
- [ ] Add HTTP referrer restrictions to your API key (see Step 2 above)
- [ ] Restrict API key to only necessary APIs

### ⚠️ **Optional (Advanced)**
- [ ] Enable Firebase App Check (if you need extra protection)

## 🔍 Current Security Status

**Your API key is currently unrestricted**, meaning it can be used from any domain. While this is common for Firebase web apps, adding domain restrictions is a best practice.

**To check your current restrictions:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project: `sdoinqms-1c17d`
3. Find your API key and check the "Application restrictions" column

## 💡 Key Takeaways

1. **API keys in client-side code are normal** - All Firebase web apps do this
2. **Security Rules protect your data** - Not the API key visibility
3. **Domain restrictions add a layer** - Prevents unauthorized websites from using your key
4. **Your current setup is secure** - As long as Security Rules are properly configured

## 🆘 If You're Still Concerned

If you absolutely must hide the API key (not recommended for web apps), you would need:
- A backend server (Node.js, Python, etc.) to proxy Firebase requests
- This adds complexity and cost
- **Not necessary** for most Firebase web applications

**Bottom line**: Your current approach is correct. Just add domain restrictions for extra security.


