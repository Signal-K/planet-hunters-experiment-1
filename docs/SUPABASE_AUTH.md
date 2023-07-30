# Supabase Authentication Setup

## Overview

This app now includes Supabase authentication with support for:
- Email/password sign-up and login
- Anonymous/guest authentication
- Persistent session management using AsyncStorage
- Protected routes (game screen only accessible after authentication)

## Architecture

### File Structure

```
contexts/
  └── AuthContext.tsx        - Auth state management and provider
screens/
  └── LoginScreen.tsx        - Login/signup UI component
utils/
  └── supabase.ts           - Supabase client configuration
```

### Components

#### 1. **AuthContext.tsx** (`contexts/AuthContext.tsx`)
- Provides `AuthProvider` to wrap the app
- Exposes `useAuth()` hook for accessing auth state and methods
- Manages session persistence with AsyncStorage
- Handles auth state changes

**Available Methods:**
- `signUp(email, password)` - Create new account
- `signIn(email, password)` - Login with email
- `signInAnonymously()` - Guest login
- `signOut()` - Logout

**Available State:**
- `user` - Current user object (null if not authenticated)
- `session` - Current session object
- `isLoading` - Auth initialization state

#### 2. **LoginScreen.tsx** (`screens/LoginScreen.tsx`)
- Handles user authentication UI
- Supports both signup and login modes
- Guest login option
- Real-time error handling and feedback

#### 3. **supabase.ts** (`utils/supabase.ts`)
- Initializes Supabase client with AsyncStorage for session persistence
- Automatically refreshes tokens
- Detects session from environment variables

### Environment Variables

The following environment variables are required (in `.env`):

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

These are loaded automatically by React Native/Expo.

## Navigation Flow

```
App
├── AuthProvider (wraps entire app)
└── AppNavigator
    ├── Auth Screen (if not logged in)
    │   └── LoginScreen (email/password/guest)
    └── Game Stack (if logged in)
        ├── Loading Screen
        └── Game Screen (Godot)
```

## Usage

### Setup

1. Install dependencies:
```bash
yarn add @supabase/supabase-js @react-native-async-storage/async-storage
```

2. Create `.env` file with Supabase credentials

3. The app will automatically:
   - Initialize auth on startup
   - Restore previous session from AsyncStorage
   - Listen for auth state changes

### In Your App

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, session, signOut, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  
  if (!user) return <LoginScreen />;

  return (
    <View>
      <Text>Welcome, {user.email}</Text>
      <Button title="Logout" onPress={() => signOut()} />
    </View>
  );
}
```

## Authentication Flow

### First Time User
1. User opens app
2. Auth context checks AsyncStorage for saved session
3. No session found → shows `Auth` screen
4. User chooses:
   - **Sign Up**: Creates account, auto-logs in, navigates to Game
   - **Log In**: Logs into existing account, navigates to Game
   - **Guest**: Anonymous login, navigates to Game

### Returning User
1. User opens app
2. Auth context restores session from AsyncStorage
3. User is automatically logged in
4. Shows `Loading` screen → `Game` screen

### Session Persistence

When a user logs in:
1. Supabase creates a session token
2. AsyncStorage automatically saves the session (handled by supabase-js)
3. On next app launch, session is automatically restored
4. If token expires, auto-refresh is handled automatically

## Security Notes

- Tokens are stored locally in AsyncStorage
- AsyncStorage is protected by device encryption (iOS Keychain/Android Keystore)
- Auth state changes trigger navigation updates
- Only authenticated users can access game
- Invalid/expired sessions automatically redirect to login

## Testing

### Local Development (Supabase Local)

Make sure your local Supabase instance is running:
```bash
supabase start
```

Then test authentication flows:
1. Create new account
2. Login with new account
3. Logout
4. Test guest login
5. Close and reopen app (should auto-restore session)

### Remote/Production

Update `.env` with production Supabase credentials when deploying.

## Troubleshooting

### "Session not persisting"
- Check AsyncStorage is available: `@react-native-async-storage/async-storage` installed
- Check `.env` variables are loaded: Log `EXPO_PUBLIC_SUPABASE_URL`
- Clear AsyncStorage in dev: `supabase.auth.signOut()`

### "Headers not found" in build
- Already fixed! The podspec file includes Godot headers
- If rebuild needed: `cd ios && pod install --clean-install`

### Network errors
- Ensure Supabase local/remote server is accessible
- Check firewall/proxy settings
- Verify env URLs are correct

## Future Enhancements

Potential additions:
- Social auth (Google, GitHub, etc.)
- Magic link authentication
- Two-factor authentication
- User profile management
- Offline mode detection
