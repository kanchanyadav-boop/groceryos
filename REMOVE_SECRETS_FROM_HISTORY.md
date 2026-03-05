# Remove Secrets from Git History

## ⚠️ Your API Key is in Git History

Even though we've moved to environment variables, the old commits still contain your API key.

## Option 1: Restrict the API Key (Recommended - Easier)

Instead of rewriting Git history, just restrict the API key:

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials?project=groceryos-61a05

2. **Find your API key:** `AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY`

3. **Click to edit and add restrictions:**
   - Application restrictions: HTTP referrers
   - Add: `https://groceryos-61a05.web.app/*`
   - Add: `https://groceryos-61a05.firebaseapp.com/*`
   - Add: `http://localhost:*/*`
   
4. **API restrictions:**
   - Select "Restrict key"
   - Enable only: Firebase APIs, Firestore, Auth, Storage

This makes the exposed key useless to attackers even if they find it.

## Option 2: Rotate the API Key (More Secure)

If you want to completely invalidate the exposed key:

1. **Create a new Firebase Web App:**
   - Go to Firebase Console → Project Settings
   - Scroll to "Your apps"
   - Click "Add app" → Web
   - Register new app
   - Copy the NEW API key

2. **Update GitHub Secrets:**
   - Go to: https://github.com/kanchanyadav-boop/groceryos/settings/secrets/actions
   - Update `FIREBASE_API_KEY` with the new key

3. **Delete the old API key:**
   - Go to Google Cloud Console → Credentials
   - Find the old key: `AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY`
   - Click "Delete"

4. **Redeploy:**
   ```bash
   git commit --allow-empty -m "Trigger redeploy with new API key"
   git push
   ```

## Option 3: Rewrite Git History (Advanced - Not Recommended)

⚠️ **Warning:** This will break the repository for anyone who has cloned it.

Only do this if absolutely necessary:

```bash
# Install BFG Repo-Cleaner
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Create a file with secrets to remove
echo "AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY" > secrets.txt
echo "rzp_test_RrTWQ4YTkNkbU5" >> secrets.txt
echo "L4con8FCTF4BOVNvdSiKk78u" >> secrets.txt

# Run BFG
java -jar bfg.jar --replace-text secrets.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ DESTRUCTIVE)
git push --force
```

## Recommended Approach

**For your situation, do Option 1 (Restrict API Key):**

1. ✅ Quick and easy
2. ✅ No disruption to team
3. ✅ API key becomes useless to attackers
4. ✅ No need to update mobile apps

Then add all values to GitHub Secrets as documented in `GITHUB_SECRETS_SETUP.md`.

## After Securing

- [ ] Restrict API key in Google Cloud Console
- [ ] Add all secrets to GitHub Secrets
- [ ] Verify deployment works
- [ ] Enable Firebase App Check
- [ ] Set up budget alerts
- [ ] Monitor API usage for 24-48 hours

## Prevention

Going forward:
- ✅ Never commit `.env` files
- ✅ Use GitHub Secrets for CI/CD
- ✅ Use environment variables locally
- ✅ Enable pre-commit hooks to scan for secrets
- ✅ Regular security audits
