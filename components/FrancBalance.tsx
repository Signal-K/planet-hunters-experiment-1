import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSyncState } from '../utils/syncState';

export const FrancBalance = () => {
  const syncState = useSyncState();
  const balance = useMemo(() => {
    const val = syncState.francBalance;
    if (Math.abs(val) >= 1000000000) return Math.round(val / 1000000000) + 'B';
    if (Math.abs(val) >= 1000000) return Math.round(val / 1000000) + 'M';
    if (Math.abs(val) >= 1000) return Math.round(val / 1000) + 'K';
    return String(val);
  }, [syncState.francBalance]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable style={styles.box} onPress={() => { /* debug: no-op in RN */ }}>
        <Text style={styles.icon}>F+</Text>
        <Text style={styles.text}>{balance} F</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 9999,
  },
  box: {
    backgroundColor: '#0a121d',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.55)',
    gap: 6,
  },
  icon: {
    color: '#f5a623',
    fontWeight: '700',
    fontSize: 13,
  },
  text: {
    color: '#f5a623',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

export default FrancBalance;
