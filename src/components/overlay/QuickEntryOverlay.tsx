import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { colors } from '../../theme/colors';
import { useOverlayStore } from '../../stores/overlayStore';
import { StepAmount } from './StepAmount';
import { StepCategory } from './StepCategory';
import { StepNote } from './StepNote';

export function QuickEntryOverlay() {
  const { isOpen, step, closeOverlay, resetOverlay } = useOverlayStore();

  function handleClose() {
    closeOverlay();
    setTimeout(resetOverlay, 350);
  }

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleClose}>
          {/* Card — inner Pressable stops tap from closing overlay */}
          <Pressable style={styles.cardWrapper} onPress={() => {}}>
            <MotiView
              from={{ opacity: 0, translateY: -18, scale: 0.97 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              style={styles.card}
            >
              {/* Step content with slide transitions */}
              <AnimatePresence exitBeforeEnter>
                {step === 'amount' && (
                  <MotiView
                    key="step-amount"
                    from={{ opacity: 0, translateX: 16 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    exit={{ opacity: 0, translateX: -16 }}
                    transition={{ type: 'timing', duration: 180 }}
                  >
                    <StepAmount onClose={handleClose} />
                  </MotiView>
                )}

                {step === 'category' && (
                  <MotiView
                    key="step-category"
                    from={{ opacity: 0, translateX: 16 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    exit={{ opacity: 0, translateX: -16 }}
                    transition={{ type: 'timing', duration: 180 }}
                  >
                    <StepCategory onClose={handleClose} />
                  </MotiView>
                )}

                {step === 'note' && (
                  <MotiView
                    key="step-note"
                    from={{ opacity: 0, translateX: 16 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    exit={{ opacity: 0, translateX: -16 }}
                    transition={{ type: 'timing', duration: 180 }}
                  >
                    <StepNote onClose={handleClose} />
                  </MotiView>
                )}
              </AnimatePresence>
            </MotiView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 16, 64, 0.35)',
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 16,
  },
  cardWrapper: {
    // lets inner Pressable capture touch so backdrop press doesn't fire
  },
  card: {
    backgroundColor: 'rgba(245, 244, 252, 0.97)',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
});
