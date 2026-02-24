import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { reportService, blockService } from '../services/database';
import { ReportReason } from '../types';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onBlocked?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: 'inappropriate_content', label: 'Inappropriate Content', icon: 'alert-triangle' },
  { value: 'harassment', label: 'Harassment or Bullying', icon: 'user-x' },
  { value: 'spam', label: 'Spam or Scam', icon: 'mail' },
  { value: 'fake_profile', label: 'Fake Profile', icon: 'user-minus' },
  { value: 'scam', label: 'Job Scam', icon: 'alert-circle' },
  { value: 'other', label: 'Other', icon: 'more-horizontal' },
];

export default function ReportModal({
  visible,
  onClose,
  userId,
  userName,
  onBlocked,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'reason' | 'details' | 'block'>('reason');

  const handleSubmitReport = async () => {
    if (!selectedReason) return;

    setLoading(true);
    try {
      const result = await reportService.createReport(
        userId,
        selectedReason,
        description.trim() || undefined
      );

      if (result.success) {
        setStep('block');
      } else {
        Alert.alert('Error', result.error || 'Failed to submit report');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    setLoading(true);
    try {
      const result = await blockService.blockUser(userId);
      if (result.success) {
        Alert.alert('Blocked', `${userName} has been blocked and reported.`);
        onBlocked?.();
        handleClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to block user');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipBlock = () => {
    Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    handleClose();
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    setStep('reason');
    onClose();
  };

  const renderReasonStep = () => (
    <>
      <Text style={styles.subtitle}>Why are you reporting {userName}?</Text>
      <View style={styles.reasonsContainer}>
        {REPORT_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.value}
            style={[
              styles.reasonItem,
              selectedReason === reason.value && styles.reasonItemSelected,
            ]}
            onPress={() => setSelectedReason(reason.value)}
          >
            <Feather
              name={reason.icon as any}
              size={20}
              color={selectedReason === reason.value ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.reasonText,
                selectedReason === reason.value && styles.reasonTextSelected,
              ]}
            >
              {reason.label}
            </Text>
            {selectedReason === reason.value && (
              <Feather name="check" size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.submitButton, !selectedReason && styles.submitButtonDisabled]}
        onPress={() => setStep('details')}
        disabled={!selectedReason}
      >
        <Text style={styles.submitButtonText}>Continue</Text>
      </TouchableOpacity>
    </>
  );

  const renderDetailsStep = () => (
    <>
      <Text style={styles.subtitle}>Additional details (optional)</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Tell us more about what happened..."
        placeholderTextColor={theme.colors.textMuted}
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
        textAlignVertical="top"
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('reason')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderBlockStep = () => (
    <>
      <View style={styles.successIcon}>
        <Feather name="check-circle" size={48} color={theme.colors.success} />
      </View>
      <Text style={styles.successTitle}>Report Submitted</Text>
      <Text style={styles.successText}>
        Thank you for helping keep our community safe. Would you also like to block {userName}?
      </Text>
      <View style={styles.blockButtons}>
        <TouchableOpacity
          style={styles.blockButton}
          onPress={handleBlock}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="user-x" size={20} color="#fff" />
              <Text style={styles.blockButtonText}>Block {userName}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipBlock}
        >
          <Text style={styles.skipButtonText}>No, just report</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {step === 'block' ? 'Report Submitted' : 'Report User'}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <View style={styles.content}>
            {step === 'reason' && renderReasonStep()}
            {step === 'details' && renderDetailsStep()}
            {step === 'block' && renderBlockStep()}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  reasonsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  reasonItemSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}20`,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  reasonTextSelected: {
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    color: theme.colors.text,
    fontSize: 15,
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  submitButton: {
    flex: 2,
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  blockButtons: {
    gap: 12,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
