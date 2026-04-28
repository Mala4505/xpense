import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useToastStore } from '../../stores/toastStore';

const AUTO_DISMISS_MS = 2500;

export function Toast() {
  const { visible, message, subMessage, hideToast } = useToastStore();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(hideToast, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, hideToast]);

  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          key="toast"
          from={{ opacity: 0, translateY: -56 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: -56 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          style={styles.container}
        >
          <View style={styles.checkCircle}>
            <Text style={styles.checkText}>✓</Text>
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.message}>{message}</Text>
            {!!subMessage && (
              <Text style={styles.subMessage} numberOfLines={1}>
                {subMessage}
              </Text>
            )}
          </View>
        </MotiView>
      )}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandNavy,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
    maxWidth: 320,
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 9999,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.income,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: colors.textInverse,
    fontSize: 11,
    fontFamily: fonts.sansBold,
  },
  textColumn: {
    flexShrink: 1,
  },
  message: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textInverse,
    letterSpacing: 0.1,
  },
  subMessage: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },
});
