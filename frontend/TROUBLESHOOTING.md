# Kaam Deu - Troubleshooting Guide

## Current Issue: White/Blank Screen on Web

The app bundles successfully but shows a blank screen in the browser.

---

## What Has Been Fixed So Far

### 1. TypeScript Errors (FIXED)
**Files Modified:**
- `src/screens/FeedScreen.tsx` - Added missing `userId` and `role` properties
- `src/context/AuthContext.tsx` - Added `name` and `profile_pic` to User interface
- `src/components/SwipeCard.tsx` - Made `bio`, `jobTitle`, `skills` optional

### 2. App.tsx Updates (FIXED)
- Added `GestureHandlerRootView` wrapper
- Added explicit dark background color `#05050a`
- Changed StatusBar style to "light"

### 3. AuthContext Loading Fix (FIXED)
- Fixed Promise.race issue with AsyncStorage timeout
- Reduced timeout from 3000ms to 2000ms

---

## Commands to Run

### Step 1: Kill All Running Processes
```bash
pkill -f "expo" 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null
```

### Step 2: Clear Cache and Start Fresh
```bash
cd /Users/dikshitadhikari/Downloads/matching-app-expo-ts
rm -rf node_modules/.cache
npx expo start --web --clear
```

### Step 3: Open Browser
```bash
open http://localhost:8081
```

---

## If Still Not Working - Try These Steps

### Option A: Check Browser Console for Errors
1. Open http://localhost:8081 in Chrome
2. Press `Cmd + Option + I` (Mac) or `F12` (Windows) to open DevTools
3. Go to "Console" tab
4. Look for any red error messages
5. Share these errors for debugging

### Option B: Test on Mobile Device Instead
Web has known issues with React Native. Mobile is more reliable:

1. Install "Expo Go" app on your phone (iOS App Store or Google Play)
2. Run: `npx expo start`
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android)

### Option C: Reinstall Dependencies
```bash
cd /Users/dikshitadhikari/Downloads/matching-app-expo-ts
rm -rf node_modules
rm package-lock.json
npm install
npx expo start --web --clear
```

### Option D: Check if Port 8081 is Actually Free
```bash
lsof -i:8081
```
If something is running, kill it:
```bash
lsof -ti:8081 | xargs kill -9
```

---

## Adding Codecs / Dependencies

If you need to add new packages, here's how:

### Using Expo Install (Recommended)
```bash
npx expo install <package-name>
```
This ensures compatibility with your Expo SDK version.

### Examples:
```bash
# Add video support
npx expo install expo-av

# Add camera
npx expo install expo-camera

# Add image picker
npx expo install expo-image-picker

# Add maps
npx expo install react-native-maps
```

### Using npm (for non-Expo packages)
```bash
npm install <package-name>
```

---

## Project Structure Reference

```
matching-app-expo-ts/
├── App.tsx                 # Main entry point
├── index.js                # Registers the app
├── package.json            # Dependencies
├── src/
│   ├── context/
│   │   └── AuthContext.tsx # Authentication state
│   ├── navigation/
│   │   └── RootNavigator.tsx # Navigation setup
│   ├── screens/
│   │   ├── RoleSelectScreen.tsx    # First screen
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── FeedScreen.tsx          # Swipe cards
│   │   ├── ChatScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   └── SwipeCard.tsx
│   ├── services/
│   │   └── api.ts          # API calls
│   ├── lib/
│   │   └── supabase.ts     # Supabase config
│   └── theme.ts            # Colors & styles
```

---

## Known Issues

1. **White Screen on Web**: React Native web support is experimental. Some components don't render properly.

2. **AsyncStorage on Web**: Can be slow or fail silently. We added a 2-second timeout.

3. **Gesture Handler on Web**: Limited support. Works better on mobile.

4. **iOS Simulator**: Requires Xcode to be fully installed.

---

## Quick Debug: Add Console Logs

Add this to `src/navigation/RootNavigator.tsx` to debug:

```typescript
export default function RootNavigator() {
  const { isAuthenticated, isLoading, isProfileComplete, selectedRole } = useAuth();

  // Debug logging
  console.log('=== RootNavigator Debug ===');
  console.log('isLoading:', isLoading);
  console.log('isAuthenticated:', isAuthenticated);
  console.log('isProfileComplete:', isProfileComplete);
  console.log('selectedRole:', selectedRole);

  if (isLoading) {
    return <LoadingScreen />;
  }
  // ... rest of code
}
```

Then check browser console (F12 > Console) for these logs.

---

## Contact / Resources

- Expo Documentation: https://docs.expo.dev
- React Navigation: https://reactnavigation.org
- Project Handoff: See HANDOFF.md in this folder

---

*Last Updated: December 15, 2025*
