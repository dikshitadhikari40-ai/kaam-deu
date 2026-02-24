import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { theme } from '../theme';
import { jobPostService } from '../services/database';
import { EmploymentType, JobPost } from '../types';

type RouteParams = {
  CreateJobPost: {
    editJob?: JobPost;
  };
};

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'daily_wage', label: 'Daily Wage' },
];

const COMMON_SKILLS = [
  'Cooking', 'Cleaning', 'Driving', 'Security', 'Plumbing',
  'Electrical', 'Carpentry', 'Painting', 'Gardening', 'Childcare',
  'Elderly Care', 'Teaching', 'Computer Skills', 'Customer Service',
];

export default function CreateJobPostScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'CreateJobPost'>>();
  const editJob = route.params?.editJob;
  const isEditMode = !!editJob;

  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryNegotiable, setSalaryNegotiable] = useState(false);
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);

  // Pre-populate form when editing
  useEffect(() => {
    if (editJob) {
      setTitle(editJob.title || '');
      setDescription(editJob.description || '');
      setRequirements(editJob.requirements?.join('\n') || '');
      setSelectedSkills(editJob.skills_required || []);
      setEmploymentType(editJob.employment_type || 'full_time');
      setSalaryMin(editJob.salary_min?.toString() || '');
      setSalaryMax(editJob.salary_max?.toString() || '');
      setSalaryNegotiable(editJob.salary_negotiable || false);
      setLocation(editJob.location || '');
      setIsRemote(editJob.is_remote || false);
    }
  }, [editJob]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a job title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a job description');
      return;
    }
    if (!location.trim() && !isRemote) {
      Alert.alert('Error', 'Please enter a location or mark as remote');
      return;
    }
    if (selectedSkills.length === 0) {
      Alert.alert('Error', 'Please select at least one skill');
      return;
    }

    setLoading(true);
    try {
      const requirementsArray = requirements
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const jobData = {
        title: title.trim(),
        description: description.trim(),
        requirements: requirementsArray,
        skills_required: selectedSkills,
        employment_type: employmentType,
        salary_min: salaryMin ? parseInt(salaryMin) : undefined,
        salary_max: salaryMax ? parseInt(salaryMax) : undefined,
        // salary_negotiable: salaryNegotiable, // Column missing in DB cache
        location: location.trim() || 'Remote',
        is_remote: isRemote,
      };

      let result: boolean | JobPost | null;

      if (isEditMode && editJob) {
        // Update existing job post
        result = await jobPostService.updateJobPost(editJob.id, jobData);
        if (result) {
          if (Platform.OS === 'web') {
            alert('Success: Job post updated successfully!');
            navigation.goBack();
          } else {
            Alert.alert('Success', 'Job post updated successfully!', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          }
        } else {
          if (Platform.OS === 'web') {
            alert('Error: Failed to update job post');
          } else {
            Alert.alert('Error', 'Failed to update job post');
          }
        }
      } else {
        // Create new job post
        result = await jobPostService.createJobPost(jobData);
        if (result) {
          if (Platform.OS === 'web') {
            alert('Success: Job post created successfully!');
            navigation.goBack();
          } else {
            Alert.alert('Success', 'Job post created successfully!', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          }
        } else {
          if (Platform.OS === 'web') {
            alert('Error: Failed to create job post');
          } else {
            Alert.alert('Error', 'Failed to create job post');
          }
        }
      }
    } catch (error) {
      console.error('Error saving job post:', error);
      if (Platform.OS === 'web') {
        alert('Error: An unexpected error occurred');
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Job Post' : 'Create Job Post'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Job Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., House Cleaner, Driver, Cook"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the job responsibilities, schedule, and any other important details..."
              placeholderTextColor={theme.colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Requirements */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Requirements (one per line)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Experience required&#10;Documents needed&#10;Physical requirements"
              placeholderTextColor={theme.colors.textMuted}
              value={requirements}
              onChangeText={setRequirements}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Skills Required */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Skills Required *</Text>
            <View style={styles.skillsContainer}>
              {COMMON_SKILLS.map(skill => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.skillChip,
                    selectedSkills.includes(skill) && styles.skillChipSelected,
                  ]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text
                    style={[
                      styles.skillChipText,
                      selectedSkills.includes(skill) && styles.skillChipTextSelected,
                    ]}
                  >
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Employment Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employment Type</Text>
            <View style={styles.employmentContainer}>
              {EMPLOYMENT_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.employmentChip,
                    employmentType === type.value && styles.employmentChipSelected,
                  ]}
                  onPress={() => setEmploymentType(type.value)}
                >
                  <Text
                    style={[
                      styles.employmentChipText,
                      employmentType === type.value && styles.employmentChipTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Salary Range */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Salary Range (NPR)</Text>
            <View style={styles.salaryRow}>
              <TextInput
                style={[styles.input, styles.salaryInput]}
                placeholder="Min"
                placeholderTextColor={theme.colors.textMuted}
                value={salaryMin}
                onChangeText={setSalaryMin}
                keyboardType="numeric"
              />
              <Text style={styles.salaryDash}>-</Text>
              <TextInput
                style={[styles.input, styles.salaryInput]}
                placeholder="Max"
                placeholderTextColor={theme.colors.textMuted}
                value={salaryMax}
                onChangeText={setSalaryMax}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSalaryNegotiable(!salaryNegotiable)}
            >
              <View style={[styles.checkbox, salaryNegotiable && styles.checkboxChecked]}>
                {salaryNegotiable && <Feather name="check" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Salary is negotiable</Text>
            </TouchableOpacity>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Kathmandu, Lalitpur"
              placeholderTextColor={theme.colors.textMuted}
              value={location}
              onChangeText={setLocation}
              editable={!isRemote}
            />
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsRemote(!isRemote)}
            >
              <View style={[styles.checkbox, isRemote && styles.checkboxChecked]}>
                {isRemote && <Feather name="check" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>This is a remote job</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.submitButtonText}>Processing...</Text>
              </>
            ) : (
              <>
                <Feather
                  name={isEditMode ? "check-circle" : "plus-circle"}
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.submitButtonText}>
                  {isEditMode ? 'Update Job' : 'Post Job'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
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
  textArea: {
    minHeight: 100,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skillChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  skillChipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  skillChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  employmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  employmentChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  employmentChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  employmentChipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  employmentChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salaryInput: {
    flex: 1,
  },
  salaryDash: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
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
  checkboxLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
