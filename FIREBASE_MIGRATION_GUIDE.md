# Firebase Account Migration Guide
## Complete Step-by-Step Instructions for Changing Firebase Account

This guide will help you migrate your SDOIN Queueing Management System from one Firebase account to another. **You will start with a fresh, empty database** (no data migration).

---

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ Access to your **NEW Gmail account** (the one you want to use)
- ✅ Access to your code repository (to update the configuration)
- ✅ A web browser (Chrome, Firefox, or Edge recommended)
- ⏱️ **Time required:** 15-30 minutes

---

## 🔄 Step 1: Sign In to Firebase Console with New Account

1. **Open Firebase Console**
   - Go to: **https://console.firebase.google.com/**
   - Make sure you're signed out of any existing Firebase account

2. **Sign In with New Gmail Account**
   - Click **"Sign in"** or **"Get started"**
   - Enter your **NEW Gmail account** credentials
   - Complete any verification steps (if prompted)

3. **Verify You're on the Right Account**
   - Check the top-right corner of the page
   - You should see your new Gmail account email address
   - If you see the old account, click on it and sign out, then sign in again

---

## 🆕 Step 2: Create a New Firebase Project

1. **Start Project Creation**
   - On the Firebase Console homepage, click the **"Add project"** button (or **"Create a project"** if this is your first project)
   - You'll see a dialog box titled "Create a project"

2. **Enter Project Name**
   - In the **"Project name"** field, enter: `sdoinqms` (or any name you prefer, like `sdoinqms-new`)
   - ⚠️ **Note:** Project names must be unique across all Firebase projects
   - If the name is taken, try: `sdoinqms-v2`, `sdoinqms-2025`, or add your initials

3. **Continue to Next Step**
   - Click the **"Continue"** button
   - Wait a moment for Firebase to check if the name is available

4. **Configure Google Analytics (Optional)**
   - You'll see a screen asking about Google Analytics
   - **Option A:** Enable Analytics (recommended if you want usage statistics)
     - Toggle **"Enable Google Analytics for this project"** to ON
     - Select or create a Google Analytics account
   - **Option B:** Skip Analytics (faster setup)
     - Toggle **"Enable Google Analytics for this project"** to OFF
   - Click **"Continue"**

5. **Create the Project**
   - Review your project settings
   - Click **"Create project"**
   - ⏱️ **Wait 30-60 seconds** while Firebase sets up your project
   - You'll see a progress indicator

6. **Complete Setup**
   - When you see **"Your new project is ready"**, click **"Continue"**
   - You'll be taken to your new project's dashboard

---

## 🔧 Step 3: Enable Realtime Database

1. **Navigate to Realtime Database**
   - In the left sidebar, look for **"Build"** section
   - Click on **"Realtime Database"**
   - If you don't see it, click the **"Build"** dropdown first, then select **"Realtime Database"**

2. **Create Database**
   - You'll see a page with information about Realtime Database
   - Click the **"Create Database"** button (usually a large blue button)

3. **Choose Database Location**
   - A dialog will appear asking you to select a location
   - **Recommended:** Choose `asia-southeast1` (Singapore) if you're in the Philippines
   - **Alternative locations:**
     - `us-central1` (Iowa, USA) - if you prefer US-based
     - `europe-west1` (Belgium) - if you prefer Europe-based
   - Select your preferred location
   - Click **"Next"**

4. **Set Initial Security Rules**
   - You'll see two options:
     - **"Start in test mode"** - Allows read/write for 30 days (we'll change this)
     - **"Start in production mode"** - Requires custom rules immediately
   - **Select "Start in test mode"** (we'll configure proper rules in Step 5)
   - Click **"Enable"**
   - ⏱️ Wait 10-20 seconds for the database to be created

5. **Verify Database is Created**
   - You should see your database URL at the top (e.g., `https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app/`)
   - The database should show as empty (no data yet)
   - ✅ **Success!** Your Realtime Database is now enabled

---

## 📝 Step 4: Get Firebase Configuration for Your Web App

1. **Open Project Settings**
   - Look for the **gear icon (⚙️)** in the left sidebar, next to "Project Overview"
   - Click on the gear icon
   - Select **"Project settings"** from the dropdown menu

2. **Navigate to Your Apps Section**
   - In the Project settings page, scroll down
   - Find the section titled **"Your apps"** or **"SDK setup and configuration"**
   - You'll see icons for different platforms (iOS, Android, Web, etc.)

3. **Add a Web App**
   - Click on the **Web icon (</>)** - it looks like `</>` or says "Web"
   - A dialog will appear titled "Add Firebase to your web app"

4. **Register Your Web App**
   - In the **"App nickname"** field, enter: `SDOIN QMS Web` (or any name you prefer)
   - **Optional:** Check the box **"Also set up Firebase Hosting"** if you plan to use Firebase Hosting (you can skip this)
   - Click **"Register app"**

5. **Copy Firebase Configuration**
   - After registering, you'll see a code block with your Firebase configuration
   - It will look like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app",
     projectId: "your-project-id",
     storageBucket: "your-project.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456"
   };
   ```
   - **IMPORTANT:** Copy this entire configuration object
   - You can either:
     - Click the **"Copy"** button if available
     - Or manually select and copy (Ctrl+C / Cmd+C) the entire `firebaseConfig` object
   - ⚠️ **Save this configuration** - you'll need it in Step 6

6. **Close the Dialog**
   - Click **"Continue to console"** or close the dialog
   - Your web app is now registered

---

## 🔐 Step 5: Configure Security Rules (Option 1 - Recommended)

1. **Navigate to Database Rules**
   - In the left sidebar, click **"Realtime Database"**
   - At the top of the page, you'll see tabs: **"Data"** and **"Rules"**
   - Click on the **"Rules"** tab

2. **Replace Default Rules**
   - You'll see the current rules (probably test mode rules)
   - **Select all** the existing rules (Ctrl+A / Cmd+A)
   - **Delete** them (Delete key)

3. **Paste the Recommended Rules**
   - Copy and paste the following rules exactly:
   ```json
   {
     "rules": {
       "receiving_queue": {
         ".read": true,
         ".write": true,
         "$queueId": {
           ".validate": "newData.hasChildren(['number', 'status', 'createdAt']) && newData.child('number').isString() && newData.child('status').isString() && newData.child('createdAt').isNumber()"
         }
       },
       "releasing_queue": {
         ".read": true,
         ".write": true,
         "$queueId": {
           ".validate": "newData.hasChildren(['number', 'status', 'createdAt']) && newData.child('number').isString() && newData.child('status').isString() && newData.child('createdAt').isNumber()"
         }
       },
       "receiving_state": {
         ".read": true,
         ".write": true,
         ".validate": "newData.hasChildren(['serving', 'next']) || newData.hasChild('serving') || newData.hasChild('next')"
       },
       "releasing_state": {
         ".read": true,
         ".write": true,
         ".validate": "newData.hasChildren(['serving', 'next']) || newData.hasChild('serving') || newData.hasChild('next')"
       },
       "rfid_cards": {
         ".read": true,
         ".write": true,
         "$rfidId": {
           ".validate": "newData.hasChildren(['rfidId', 'queueNumber', 'createdAt']) && newData.child('rfidId').isString() && newData.child('queueNumber').isNumber() && newData.child('createdAt').isNumber()"
         }
       }
     }
   }
   ```

4. **Verify Rules Syntax**
   - Make sure there are no red error indicators
   - The rules should be properly formatted JSON
   - Check that all brackets `{}` and quotes `""` are correct

5. **Publish the Rules**
   - Click the **"Publish"** button at the top right
   - A confirmation dialog may appear - click **"Publish"** to confirm
   - ✅ You should see a success message: "Rules published successfully"

6. **What These Rules Do:**
   - ✅ Allow anyone to read/write (required for public queue system)
   - ✅ Validate that queue items have required fields (number, status, createdAt)
   - ✅ Validate that state objects have proper structure
   - ✅ Validate that RFID cards have required fields (rfidId, queueNumber, createdAt)
   - ✅ Prevent invalid or malicious data from being written

---

## 💻 Step 6: Update Your Code with New Configuration

1. **Open Your Project in Code Editor**
   - Navigate to your project folder: `SDOIN Queuing Management System`
   - Open the file: `scripts/firebase-config.js`
   - This is the only file you need to modify

2. **Locate the Current Configuration**
   - Find the `firebaseConfig` object (around lines 8-16)
   - It currently looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyB-dlPoUqEjwgJgDnVP6zeB0n4PEFtuoY0",
     authDomain: "sdoinqms.firebaseapp.com",
     databaseURL: "https://sdoinqms-default-rtdb.asia-southeast1.firebasedatabase.app",
     projectId: "sdoinqms",
     storageBucket: "sdoinqms.firebasestorage.app",
     messagingSenderId: "86692942325",
     appId: "1:86692942325:web:0b7ba2f5385ff72e4dd0bc"
   };
   ```

3. **Replace with New Configuration**
   - **Select the entire `firebaseConfig` object** (from `const firebaseConfig = {` to `};`)
   - **Delete** the old configuration
   - **Paste** the new configuration you copied from Step 4
   - Make sure the new configuration looks like this format:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_NEW_API_KEY",
     authDomain: "YOUR_NEW_AUTH_DOMAIN",
     databaseURL: "YOUR_NEW_DATABASE_URL",
     projectId: "YOUR_NEW_PROJECT_ID",
     storageBucket: "YOUR_NEW_STORAGE_BUCKET",
     messagingSenderId: "YOUR_NEW_MESSAGING_SENDER_ID",
     appId: "YOUR_NEW_APP_ID"
   };
   ```

4. **Verify the Update**
   - Double-check that all 7 fields are present:
     - ✅ `apiKey`
     - ✅ `authDomain`
     - ✅ `databaseURL`
     - ✅ `projectId`
     - ✅ `storageBucket`
     - ✅ `messagingSenderId`
     - ✅ `appId`
   - Make sure all values are in quotes
   - Make sure there are commas between each field (except the last one)

5. **Save the File**
   - Press **Ctrl+S** (Windows) or **Cmd+S** (Mac) to save
   - ✅ The file is now updated with your new Firebase configuration

---

## ✅ Step 7: Test the Migration Locally

1. **Open Your Application Locally**
   - Open your project in a web browser
   - You can either:
     - Use a local server (if you have one set up)
     - Or simply open `index.html` in your browser
   - Navigate to the main dashboard

2. **Test User Receiving Station**
   - Go to: `userReceiving/index.html`
   - Enter a test queue number (e.g., "001")
   - Enter a DTS number (optional, e.g., "DTS001")
   - Click **"ADD TO QUEUE"**
   - ✅ **Expected:** Modal should appear showing your queue number
   - ✅ **Check Firebase Console:** Go to Realtime Database → Data tab
   - ✅ **Verify:** You should see `receiving_queue` with your test entry

3. **Test User Releasing Station**
   - Go to: `userReleasing/index.html`
   - Enter a test queue number (e.g., "002")
   - Enter a DTS number (optional)
   - Click **"ADD TO QUEUE"**
   - ✅ **Expected:** Modal should appear
   - ✅ **Check Firebase Console:** You should see `releasing_queue` with your test entry

4. **Test Queue Monitor**
   - Go to: `queueMonitor/index.html`
   - ✅ **Expected:** You should see the queues you just added
   - ✅ **Verify:** Both receiving and releasing queues should be visible

5. **Test Admin Receiving Station**
   - Go to: `adminReceivingStation/index.html`
   - Login with admin credentials
   - ✅ **Expected:** You should see the queue you added in step 2
   - Try clicking **"Call Next Customer"** button
   - ✅ **Verify:** Queue should move to "ON QUEUE" section

6. **Test Admin Releasing Station**
   - Go to: `adminReleasingStation/index.html`
   - Login with admin credentials
   - ✅ **Expected:** You should see the queue you added
   - Test the queue management functions

7. **Check Browser Console for Errors**
   - Press **F12** to open Developer Tools
   - Click on the **"Console"** tab
   - Look for any red error messages
   - ✅ **Expected:** No Firebase-related errors
   - ⚠️ **If you see errors:** Check that your configuration values are correct

8. **Verify Data Structure in Firebase**
   - Go back to Firebase Console
   - Navigate to **Realtime Database** → **Data** tab
   - ✅ **Expected structure:**
     ```
     receiving_queue
       └── [auto-generated-key]
             ├── number: "001"
             ├── dts: "DTS001"
             ├── status: "waiting"
             └── createdAt: [timestamp]
     receiving_state
       ├── serving: null (or queue key)
       └── next: [queue key or null]
     releasing_queue
       └── [similar structure]
     releasing_state
       └── [similar structure]
     ```

---

## 🚀 Step 8: Commit and Deploy Your Changes

1. **Open Terminal/Command Prompt**
   - Navigate to your project directory
   - Or use Git Bash / PowerShell in your project folder

2. **Check Git Status**
   ```bash
   git status
   ```
   - You should see `scripts/firebase-config.js` as modified

3. **Stage the Changes**
   ```bash
   git add scripts/firebase-config.js
   ```

4. **Commit the Changes**
   ```bash
   git commit -m "Migrate to new Firebase account - Updated firebase-config.js"
   ```

5. **Push to Remote Repository**
   ```bash
   git push origin main
   ```
   - ⏱️ Wait for the push to complete
   - ✅ You should see a success message

6. **Verify Deployment** (if using GitHub Pages or other hosting)
   - Wait 1-2 minutes for deployment to complete
   - Visit your live website
   - Test all features on the live site
   - ✅ **Expected:** Everything should work as it did locally

---

## 📋 Final Checklist

Use this checklist to ensure everything is complete:

- [ ] ✅ Signed in to Firebase Console with new Gmail account
- [ ] ✅ Created new Firebase project
- [ ] ✅ Enabled Realtime Database
- [ ] ✅ Got Firebase configuration (copied all 7 values)
- [ ] ✅ Configured security rules (Option 1 - with validation)
- [ ] ✅ Updated `scripts/firebase-config.js` with new configuration
- [ ] ✅ Tested user receiving station locally
- [ ] ✅ Tested user releasing station locally
- [ ] ✅ Tested queue monitor locally
- [ ] ✅ Tested admin receiving station locally
- [ ] ✅ Tested admin releasing station locally
- [ ] ✅ Verified no errors in browser console
- [ ] ✅ Verified data structure in Firebase Console
- [ ] ✅ Committed changes to Git
- [ ] ✅ Pushed changes to remote repository
- [ ] ✅ Tested live website (if deployed)

---

## ⚠️ Important Notes

1. **Fresh Start:** Your new database starts empty. All previous queue data remains in the old Firebase project.

2. **No Data Loss:** The old Firebase project and its data are not deleted. You can access it anytime with the old Gmail account.

3. **API Keys are Public:** Firebase API keys are meant to be public (they're in your client-side code). Security comes from the database rules, not hiding the keys.

4. **Database Location:** Choose a location close to your users for better performance. `asia-southeast1` is recommended for Philippines.

5. **Security Rules:** The rules we configured (Option 1) are appropriate for a public queueing system. They allow public access but validate data structure.

---

## 🆘 Troubleshooting

### Issue: "Permission denied" errors in browser console

**Symptoms:** Red errors in console saying "Permission denied" or "PERMISSION_DENIED"

**Solution:**
1. Go to Firebase Console → Realtime Database → Rules
2. Verify the rules are exactly as shown in Step 5
3. Make sure you clicked "Publish" after pasting the rules
4. Check that there are no syntax errors (red indicators)

### Issue: Data not appearing in Firebase Console

**Symptoms:** You add a queue but don't see it in Firebase

**Solution:**
1. Refresh the Firebase Console page
2. Check that you're looking at the correct project (new one, not old)
3. Verify the `databaseURL` in your config matches the URL in Firebase Console
4. Check browser console for errors

### Issue: "Failed to fetch" or connection errors

**Symptoms:** Network errors or connection failures

**Solution:**
1. Verify your internet connection
2. Check that all 7 configuration values are correct
3. Make sure you copied the entire configuration (no missing fields)
4. Verify the `databaseURL` is correct (should match Firebase Console)

### Issue: Old data still showing

**Symptoms:** You see queues from the old Firebase project

**Solution:**
1. Clear your browser cache (Ctrl+Shift+Delete)
2. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
3. Verify you updated `scripts/firebase-config.js` correctly
4. Check that the `databaseURL` points to your new project

### Issue: Can't see Realtime Database option

**Symptoms:** "Realtime Database" is not in the sidebar

**Solution:**
1. Make sure you created the database in Step 3
2. Check that you're in the correct Firebase project
3. Try refreshing the page
4. Look under "Build" section in the sidebar

---

## 📞 Need More Help?

If you're still having issues:

1. **Check Browser Console:**
   - Press F12 → Console tab
   - Look for error messages
   - Take a screenshot of any errors

2. **Verify Configuration:**
   - Compare your `firebase-config.js` with the config from Firebase Console
   - Make sure all values match exactly

3. **Test with Simple Queue:**
   - Try adding just one queue number
   - Check if it appears in Firebase Console
   - If one works, the configuration is correct

4. **Double-Check Security Rules:**
   - Go to Firebase Console → Realtime Database → Rules
   - Copy your rules and verify they match Step 5 exactly

---

## 🎉 Success!

Once all steps are complete and tested, your system is successfully migrated to the new Firebase account. Your new database will start fresh, and all new queues will be stored in the new Firebase project.

**Remember:**
- ✅ Your old Firebase project still exists (accessible with old Gmail)
- ✅ Your new system is now using the new Firebase account
- ✅ All future queues will be in the new database
- ✅ You can delete the old project later if you want (optional)

---

**Last Updated:** 2025  
**Version:** 2.0  
**Migration Type:** Fresh Start (No Data Import)
