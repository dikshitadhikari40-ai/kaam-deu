import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { theme } from '../theme';
import { FeedFilters } from '../types';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FeedFilters) => void;
  currentFilters: FeedFilters;
  userRole: 'worker' | 'business';
}

// Common skills for quick selection
const COMMON_SKILLS = [
  'Cooking',
  'Driving',
  'Cleaning',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Security',
  'Gardening',
  'Painting',
  'Delivery',
  'Welding',
  'Tailoring',
];

// Common locations in Nepal
const COMMON_LOCATIONS = [
  'Kathmandu',
  'Pokhara',
  'Lalitpur',
  'Bhaktapur',
  'Biratnagar',
  'Birgunj',
  'Dharan',
  'Butwal',
];

export default function FilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
  userRole,
}: FilterModalProps) {
  const [filters, setFilters] = useState<FeedFilters>(currentFilters);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(currentFilters.skills || []);
  const [customSkill, setCustomSkill] = useState('');

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills(prev => [...prev, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleApply = () => {
    onApply({
      ...filters,
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
    });
    onClose();
  };

  const handleReset = () => {
    setFilters({});
    setSelectedSkills([]);
    setCustomSkill('');
  };

  const isBusinessViewer = userRole === 'business';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Distance Slider */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Maximum Distance</Text>
                <Text style={styles.sectionValue}>
                  {filters.maxDistance || 50} km
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={filters.maxDistance || 50}
                onValueChange={(value) => setFilters(prev => ({ ...prev, maxDistance: value }))}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.accent}
              />
            </View>

            {/* Location Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.chipContainer}>
                {COMMON_LOCATIONS.map((location) => (
                  <TouchableOpacity
                    key={location}
                    style={[
                      styles.chip,
                      filters.location === location && styles.chipSelected,
                    ]}
                    onPress={() => setFilters(prev => ({
                      ...prev,
                      location: prev.location === location ? undefined : location,
                    }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.location === location && styles.chipTextSelected,
                      ]}
                    >
                      {location}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Skills Filter (only for businesses viewing workers) */}
            {isBusinessViewer && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills Required</Text>
                <View style={styles.chipContainer}>
                  {COMMON_SKILLS.map((skill) => (
                    <TouchableOpacity
                      key={skill}
                      style={[
                        styles.chip,
                        selectedSkills.includes(skill) && styles.chipSelected,
                      ]}
                      onPress={() => handleSkillToggle(skill)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedSkills.includes(skill) && styles.chipTextSelected,
                        ]}
                      >
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Custom skill input */}
                <View style={styles.customSkillRow}>
                  <TextInput
                    style={styles.customSkillInput}
                    placeholder="Add custom skill..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={customSkill}
                    onChangeText={setCustomSkill}
                    onSubmitEditing={handleAddCustomSkill}
                  />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddCustomSkill}
                  >
                    <Feather name="plus" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                {/* Selected custom skills */}
                {selectedSkills.filter(s => !COMMON_SKILLS.includes(s)).length > 0 && (
                  <View style={styles.chipContainer}>
                    {selectedSkills
                      .filter(s => !COMMON_SKILLS.includes(s))
                      .map((skill) => (
                        <TouchableOpacity
                          key={skill}
                          style={[styles.chip, styles.chipSelected]}
                          onPress={() => handleSkillToggle(skill)}
                        >
                          <Text style={[styles.chipText, styles.chipTextSelected]}>
                            {skill}
                          </Text>
                          <Feather name="x" size={14} color={theme.colors.primary} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      ))}
                  </View>
                )}
              </View>
            )}

            {/* Experience Filter (only for businesses viewing workers) */}
            {isBusinessViewer && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Experience</Text>
                  <Text style={styles.sectionValue}>
                    {filters.experienceMin || 0} - {filters.experienceMax || 20}+ years
                  </Text>
                </View>
                <View style={styles.rangeContainer}>
                  <View style={styles.rangeInput}>
                    <Text style={styles.rangeLabel}>Min</Text>
                    <Slider
                      style={styles.rangeSlider}
                      minimumValue={0}
                      maximumValue={20}
                      step={1}
                      value={filters.experienceMin || 0}
                      onValueChange={(value) => setFilters(prev => ({
                        ...prev,
                        experienceMin: value,
                      }))}
                      minimumTrackTintColor={theme.colors.accent}
                      maximumTrackTintColor={theme.colors.border}
                      thumbTintColor={theme.colors.accent}
                    />
                  </View>
                  <View style={styles.rangeInput}>
                    <Text style={styles.rangeLabel}>Max</Text>
                    <Slider
                      style={styles.rangeSlider}
                      minimumValue={0}
                      maximumValue={20}
                      step={1}
                      value={filters.experienceMax || 20}
                      onValueChange={(value) => setFilters(prev => ({
                        ...prev,
                        experienceMax: value,
                      }))}
                      minimumTrackTintColor={theme.colors.accent}
                      maximumTrackTintColor={theme.colors.border}
                      thumbTintColor={theme.colors.accent}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Salary Filter (only for businesses viewing workers) */}
            {isBusinessViewer && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Salary Range (NPR/month)</Text>
                <View style={styles.salaryInputs}>
                  <TextInput
                    style={styles.salaryInput}
                    placeholder="Min"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={filters.minSalary?.toString() || ''}
                    onChangeText={(text) => setFilters(prev => ({
                      ...prev,
                      minSalary: text ? parseInt(text) : undefined,
                    }))}
                  />
                  <Text style={styles.salaryDash}>-</Text>
                  <TextInput
                    style={styles.salaryInput}
                    placeholder="Max"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={filters.maxSalary?.toString() || ''}
                    onChangeText={(text) => setFilters(prev => ({
                      ...prev,
                      maxSalary: text ? parseInt(text) : undefined,
                    }))}
                  />
                </View>
              </View>
            )}

            {/* Verified Only Toggle */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.sectionTitle}>Verified Only</Text>
                  <Text style={styles.toggleDescription}>
                    Show only verified {isBusinessViewer ? 'workers' : 'businesses'}
                  </Text>
                </View>
                <Switch
                  value={filters.verifiedOnly || false}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    verifiedOnly: value,
                  }))}
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                  thumbColor={filters.verifiedOnly ? theme.colors.primary : '#f4f3f4'}
                />
              </View>
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
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
    maxHeight: '90%',
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
  resetText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  sectionValue: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  customSkillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  customSkillInput: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addButton: {
    backgroundColor: theme.colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rangeContainer: {
    gap: 16,
  },
  rangeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeLabel: {
    width: 40,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  rangeSlider: {
    flex: 1,
    height: 40,
  },
  salaryInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salaryInput: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlign: 'center',
  },
  salaryDash: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  applyButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
