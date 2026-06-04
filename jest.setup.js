// Mock react-native globally to prevent import errors in tests
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: jest.fn() },
  Platform: { OS: 'ios' },
  useWindowDimensions: () => ({ width: 300, height: 600 }),
}), { virtual: true });

// Mock PocketBase to prevent network calls in tests
jest.mock('./utils/pocketbase', () => ({
  pocketbase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(),
      signInAnonymously: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
  loadLandnamState: jest.fn(() => Promise.resolve(null)),
  saveLandnamState: jest.fn(() => Promise.resolve()),
  createMissionLog: jest.fn(() => Promise.resolve()),
}));
