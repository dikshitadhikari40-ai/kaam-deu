/**
 * Edit Work Identity Screen
 *
 * Create or edit a work identity with all its details:
 * - Job category and title
 * - Experience level
 * - Pay expectations
 * - Availability
 * - Skills management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { workIdentityService } from '../services/workIdentityService';
import {
  WorkIdentity,
  JobCategory,
  IdentitySkill,
  ExperienceLevel,
  AvailabilityType,
  PayType,
  SkillLevel,
  EXPERIENCE_LEVEL_LABELS,
  AVAILABILITY_LABELS,
  PAY_TYPE_LABELS,
  SKILL_LEVEL_LABELS,
} from '../types/workIdentity';

interface Props {
  navigation: any;
  route: {
    params?: {
      identityId?: string;
    };
  };
}

export default function EditWorkIdentityScreen({ navigation, route }: Props) {
  const identityId = route.params?.identityId;
  const isEditing = !!identityId;

  // Form state
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [defaultSkills, setDefaultSkills] = useState<string[]>([]);

  // Identity data
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [jobTitle, setJobTitle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('junior');
  const [experienceYears, setExperienceYears] = useState('0');
  const [payMin, setPayMin] = useState('');
  const [payMax, setPayMax] = useState('');
  const [payType, setPayType] = useState<PayType>('monthly');
  const [availability, setAvailability] = useState<AvailabilityType>('flexible');
  const [availableFrom, setAvailableFrom] = useState('');
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [isRemoteOk, setIsRemoteOk] = useState(false);

  // Skills
  const [skills, setSkills] = useState<IdentitySkill[]>([]);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<IdentitySkill | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>('basic');
  const [newSkillYears, setNewSkillYears] = useState('0');

  // UI state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [newLocation, setNewLocation] = useState('');

  // Load data
  useEffect(() => {
    loadCategories();
    if (isEditing) {
      loadIdentity();
    }
  }, [identityId]);

  const loadCategories = async () => {
    try {
      const data = await workIdentityService.getJobCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadIdentity = async () => {
    if (!identityId) return;

    try {
      const identity = await workIdentityService.getIdentityById(identityId);
      if (identity) {
        setSelectedCategory(identity.job_category);
        setJobTitle(identity.job_title || '');
        setExperienceLevel(identity.experience_level);
        setExperienceYears(String(identity.experience_years));
        setPayMin(identity.expected_pay_min ? String(identity.expected_pay_min) : '');
        setPayMax(identity.expected_pay_max ? String(identity.expected_pay_max) : '');
        setPayType(identity.pay_type);
        setAvailability(identity.availability);
        setAvailableFrom(identity.available_from || '');
        setPreferredLocations(identity.preferred_locations || []);
        setIsRemoteOk(identity.is_remote_ok);
        setSkills(identity.skills || []);
      }
    } catch (error) {
      console.error('Error loading identity:', error);
      Alert.alert('Error', 'Failed to load work identity');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultSkills = async (categoryName: string) => {
    try {
      const skills = await workIdentityService.getCategoryDefaultSkills(categoryName);
      setDefaultSkills(skills);
    } catch (error) {
      console.error('Error loading default skills:', error);
    }
  };

  const handleCategorySelect = (category: JobCategory) => {
    setSelectedCategory(category.name);
    setShowCategoryPicker(false);
    loadDefaultSkills(category.name);
  };

  const handleAddLocation = () => {
    if (newLocation.trim()) {
      setPreferredLocations([...preferredLocations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (index: number) => {
    setPreferredLocations(preferredLocations.filter((_, i) => i !== index));
  };

  const handleSaveSkill = async () => {
    if (!newSkillName.trim()) {
      Alert.alert('Error', 'Please enter a skill name');
      return;
    }

    try {
      if (isEditing && identityId) {
        if (editingSkill) {
          // Update existing skill
          const updated = await workIdentityService.updateSkill(editingSkill.id, {
            skill: newSkillName.trim(),
            skill_level: newSkillLevel,
            years_experience: parseInt(newSkillYears) || 0,
          });
          setSkills(skills.map(s => s.id === editingSkill.id ? updated : s));
        } else {
          // Add new skill
          const newSkill = await workIdentityService.addSkill(identityId, {
            skill: newSkillName.trim(),
            skill_level: newSkillLevel,
            years_experience: parseInt(newSkillYears) || 0,
          });
          setSkills([...skills, newSkill]);
        }
      } else {
        // For new identity, add to local state
        const tempSkill: IdentitySkill = {
          id: `temp-${Date.now()}`,
          identity_id: '',
          skill: newSkillName.trim(),
          skill_level: newSkillLevel,
          years_experience: parseInt(newSkillYears) || 0,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setSkills([...skills, tempSkill]);
      }

      resetSkillModal();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save skill');
    }
  };

  const handleRemoveSkill = async (skill: IdentitySkill) => {
    try {
      if (isEditing && !skill.id.startsWith('temp-')) {
        await workIdentityService.removeSkill(skill.id);
      }
      setSkills(skills.filter(s => s.id !== skill.id));
    } catch (error) {
      Alert.alert('Error', 'Failed to remove skill');
    }
  };

  const handleAddDefaultSkill = (skillName: string) => {
    if (skills.some(s => s.skill.toLowerCase() === skillName.toLowerCase())) {
      return; // Already exists
    }

    const tempSkill: IdentitySkill = {
      id: `temp-${Date.now()}`,
      identity_id: '',
      skill: skillName,
      skill_level: 'basic',
      years_experience: 0,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSkills([...skills, tempSkill]);
  };

  const resetSkillModal = () => {
    setShowSkillModal(false);
    setEditingSkill(null);
    setNewSkillName('');
    setNewSkillLevel('basic');
    setNewSkillYears('0');
  };

  const openEditSkillModal = (skill: IdentitySkill) => {
    setEditingSkill(skill);
    setNewSkillName(skill.skill);
    setNewSkillLevel(skill.skill_level);
    setNewSkillYears(String(skill.years_experience));
    setShowSkillModal(true);
  };

  const handleSave = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a job category');
      return;
    }

    setSaving(true);

    try {
      const data = {
        job_category: selectedCategory,
        job_title: jobTitle || undefined,
        experience_level: experienceLevel,
        experience_years: parseInt(experienceYears) || 0,
        expected_pay_min: payMin ? parseInt(payMin) : undefined,
        expected_pay_max: payMax ? parseInt(payMax) : undefined,
        pay_type: payType,
        availability: availability,
        available_from: availableFrom || undefined,
        preferred_locations: preferredLocations,
        is_remote_ok: isRemoteOk,
      };

      if (isEditing && identityId) {
        await workIdentityService.updateIdentity(identityId, data);
      } else {
        const newIdentity = await workIdentityService.createIdentity(data);

        // Add skills if any
        for (const skill of skills) {
          if (skill.id.startsWith('temp-')) {
            await workIdentityService.addSkill(newIdentity.id, {
              skill: skill.skill,
              skill_level: skill.skill_level,
              years_experience: skill.years_experience,
            });
          }
        }
      }

      Alert.alert(
        'Success',
        isEditing ? 'Work identity updated!' : 'Work identity created!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save work identity');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Job Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Category *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(true)}
              disabled={isEditing}
            >
              <MaterialCommunityIcons
                name="briefcase-variant"
                size={20}
                color={selectedCategory ? theme.colors.accent : theme.colors.textMuted}
              />
              <Text style={[
                styles.pickerText,
                !selectedCategory && styles.placeholderText
              ]}>
                {selectedCategory || 'Select a category'}
              </Text>
              {!isEditing && <Feather name="chevron-down" size={20} color={theme.colors.textMuted} />}
            </TouchableOpacity>
            {isEditing && (
              <Text style={styles.helperText}>Category cannot be changed after creation</Text>
            )}
          </View>

          {/* Job Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Title (Optional)</Text>
            <TextInput
              style={styles.input}
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="e.g., Senior Driver, Head Cook"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          {/* Experience */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience Level</Text>
            <View style={styles.optionsGrid}>
              {(Object.keys(EXPERIENCE_LEVEL_LABELS) as ExperienceLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.optionButton,
                    experienceLevel === level && styles.optionButtonSelected
                  ]}
                  onPress={() => setExperienceLevel(level)}
                >
                  <Text style={[
                    styles.optionText,
                    experienceLevel === level && styles.optionTextSelected
                  ]}>
                    {EXPERIENCE_LEVEL_LABELS[level]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pay Expectations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pay Expectations</Text>
            <View style={styles.payRow}>
              <View style={styles.payInputContainer}>
                <Text style={styles.payLabel}>Min (Rs.)</Text>
                <TextInput
                  style={styles.payInput}
                  value={payMin}
                  onChangeText={setPayMin}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <Text style={styles.payDash}>-</Text>
              <View style={styles.payInputContainer}>
                <Text style={styles.payLabel}>Max (Rs.)</Text>
                <TextInput
                  style={styles.payInput}
                  value={payMax}
                  onChangeText={setPayMax}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.payTypeRow}>
              {(Object.keys(PAY_TYPE_LABELS) as PayType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.payTypeButton,
                    payType === type && styles.payTypeButtonSelected
                  ]}
                  onPress={() => setPayType(type)}
                >
                  <Text style={[
                    styles.payTypeText,
                    payType === type && styles.payTypeTextSelected
                  ]}>
                    {PAY_TYPE_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <View style={styles.optionsGrid}>
              {(Object.keys(AVAILABILITY_LABELS) as AvailabilityType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    availability === type && styles.optionButtonSelected
                  ]}
                  onPress={() => setAvailability(type)}
                >
                  <Text style={[
                    styles.optionText,
                    availability === type && styles.optionTextSelected
                  ]}>
                    {AVAILABILITY_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Locations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Locations</Text>
            <View style={styles.locationInputRow}>
              <TextInput
                style={styles.locationInput}
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder="Add a location"
                placeholderTextColor={theme.colors.textMuted}
                onSubmitEditing={handleAddLocation}
              />
              <TouchableOpacity style={styles.addLocationButton} onPress={handleAddLocation}>
                <Feather name="plus" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.locationsContainer}>
              {preferredLocations.map((location, index) => (
                <View key={index} style={styles.locationTag}>
                  <Feather name="map-pin" size={12} color={theme.colors.accent} />
                  <Text style={styles.locationText}>{location}</Text>
                  <TouchableOpacity onPress={() => handleRemoveLocation(index)}>
                    <Feather name="x" size={14} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.remoteToggle}
              onPress={() => setIsRemoteOk(!isRemoteOk)}
            >
              <View style={[styles.checkbox, isRemoteOk && styles.checkboxChecked]}>
                {isRemoteOk && <Feather name="check" size={14} color={theme.colors.text} />}
              </View>
              <Text style={styles.remoteText}>Open to remote work</Text>
            </TouchableOpacity>
          </View>

          {/* Skills */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Skills</Text>
              <TouchableOpacity
                style={styles.addSkillButton}
                onPress={() => setShowSkillModal(true)}
              >
                <Feather name="plus" size={18} color={theme.colors.accent} />
                <Text style={styles.addSkillText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Default Skills Suggestions */}
            {defaultSkills.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsLabel}>Suggested:</Text>
                <View style={styles.suggestionsRow}>
                  {defaultSkills.map((skill) => {
                    const alreadyAdded = skills.some(s =>
                      s.skill.toLowerCase() === skill.toLowerCase()
                    );
                    return (
                      <TouchableOpacity
                        key={skill}
                        style={[
                          styles.suggestionTag,
                          alreadyAdded && styles.suggestionTagAdded
                        ]}
                        onPress={() => !alreadyAdded && handleAddDefaultSkill(skill)}
                        disabled={alreadyAdded}
                      >
                        <Text style={[
                          styles.suggestionText,
                          alreadyAdded && styles.suggestionTextAdded
                        ]}>
                          {skill}
                        </Text>
                        {!alreadyAdded && (
                          <Feather name="plus" size={12} color={theme.colors.accent} />
                        )}
                        {alreadyAdded && (
                          <Feather name="check" size={12} color={theme.colors.success} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Added Skills */}
            <View style={styles.skillsContainer}>
              {skills.map((skill) => (
                <View key={skill.id} style={styles.skillCard}>
                  <View style={styles.skillInfo}>
                    <Text style={styles.skillName}>{skill.skill}</Text>
                    <Text style={styles.skillDetails}>
                      {SKILL_LEVEL_LABELS[skill.skill_level]} • {skill.years_experience} yrs
                    </Text>
                  </View>
                  <View style={styles.skillActions}>
                    <TouchableOpacity
                      style={styles.skillAction}
                      onPress={() => openEditSkillModal(skill)}
                    >
                      <Feather name="edit-2" size={14} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.skillAction}
                      onPress={() => handleRemoveSkill(skill)}
                    >
                      <Feather name="x" size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {skills.length === 0 && (
                <Text style={styles.noSkillsText}>No skills added yet</Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Save Changes' : 'Create Identity'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryItem}
                  onPress={() => handleCategorySelect(category)}
                >
                  <View style={styles.categoryIcon}>
                    <MaterialCommunityIcons
                      name="briefcase-variant"
                      size={24}
                      color={theme.colors.accent}
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.display_name}</Text>
                    {category.description && (
                      <Text style={styles.categoryDescription}>{category.description}</Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Skill Modal */}
      <Modal visible={showSkillModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.skillModalContent}>
            <Text style={styles.modalTitle}>
              {editingSkill ? 'Edit Skill' : 'Add Skill'}
            </Text>

            <Text style={styles.inputLabel}>Skill Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newSkillName}
              onChangeText={setNewSkillName}
              placeholder="e.g., Heavy Vehicle License"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.inputLabel}>Skill Level</Text>
            <View style={styles.skillLevelRow}>
              {(Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.skillLevelButton,
                    newSkillLevel === level && styles.skillLevelButtonSelected
                  ]}
                  onPress={() => setNewSkillLevel(level)}
                >
                  <Text style={[
                    styles.skillLevelText,
                    newSkillLevel === level && styles.skillLevelTextSelected
                  ]}>
                    {SKILL_LEVEL_LABELS[level]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Years of Experience</Text>
            <TextInput
              style={styles.modalInput}
              value={newSkillYears}
              onChangeText={setNewSkillYears}
              placeholder="0"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={resetSkillModal}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveSkill}
              >
                <Text style={styles.modalSaveText}>
                  {editingSkill ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
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
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.textMuted,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  optionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: theme.colors.text,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  payInputContainer: {
    flex: 1,
  },
  payLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  payInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  payDash: {
    fontSize: 20,
    color: theme.colors.textMuted,
    marginTop: 18,
  },
  payTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payTypeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  payTypeButtonSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  payTypeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  payTypeTextSelected: {
    color: theme.colors.text,
  },
  locationInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  locationInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addLocationButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  remoteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  remoteText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  addSkillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSkillText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  suggestionsContainer: {
    marginBottom: 16,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.accent}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  suggestionTagAdded: {
    backgroundColor: `${theme.colors.success}20`,
  },
  suggestionText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  suggestionTextAdded: {
    color: theme.colors.success,
  },
  skillsContainer: {
    gap: 10,
  },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  skillDetails: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  skillActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skillAction: {
    padding: 6,
  },
  noSkillsText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  categoryList: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 10,
    gap: 14,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  categoryDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  skillModalContent: {
    backgroundColor: theme.colors.surface,
    margin: 24,
    borderRadius: 20,
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skillLevelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skillLevelButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skillLevelButtonSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  skillLevelText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  skillLevelTextSelected: {
    color: theme.colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  modalSaveText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
});
