// Mock react-native globally to prevent import errors in tests
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: jest.fn() },
  Platform: { OS: 'ios' },
  useWindowDimensions: () => ({ width: 300, height: 600 }),
}), { virtual: true });
