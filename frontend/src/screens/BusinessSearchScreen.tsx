/**
 * Business Search Screen
 *
 * For business users to search and discover work identities.
 * Features:
 * - Filter by category, capability score, experience level, pay, availability
 * - Saved searches
 * - Quick contact request
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { workIdentityService } from '../services/workIdentityService';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import {
  JobCategory,
  SearchIdentitiesParams,
  SearchIdentitiesResult,
  BusinessSavedSearch,
  ExperienceLevel,
  AvailabilityType,
  getCapabilityDisplay,
  EXPERIENCE_LEVEL_LABELS,
  AVAILABILITY_LABELS,
} from '../types/workIdentity';

interface Props {
  navigation: any;
}

export default function BusinessSearchScreen({ navigation }: Props) {
  // Premium access (for compare mode)
  const { can_compare, max_compare_identities } = usePremiumAccess();

  // Search state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchIdentitiesResult[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [savedSearches, setSavedSearches] = useState<BusinessSavedSearch[]>([]);

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minCapability, setMinCapability] = useState<number | undefined>();
  const [selectedExperienceLevels, setSelectedExperienceLevels] = useState<ExperienceLevel[]>([]);
  const [maxPay, setMaxPay] = useState<string>('');
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilityType[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadSavedSearches();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await workIdentityService.getJobCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSavedSearches = async () => {
    try {
      const data = await workIdentityService.getMySavedSearches();
      setSavedSearches(data);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  const buildSearchParams = (): SearchIdentitiesParams => ({
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    min_capability: minCapability,
    experience_levels: selectedExperienceLevels.length > 0 ? selectedExperienceLevels : undefined,
    pay_max: maxPay ? parseInt(maxPay) : undefined,
    availability_types: selectedAvailability.length > 0 ? selectedAvailability : undefined,
    required_skills: requiredSkills.length > 0 ? requiredSkills : undefined,
  });

  const handleSearch = async () => {
    setLoading(true);
    setShowFilters(false);

    try {
      const params = buildSearchParams();
      const data = await workIdentityService.searchIdentities(params);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search workers');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setMinCapability(undefined);
    setSelectedExperienceLevels([]);
    setMaxPay('');
    setSelectedAvailability([]);
    setRequiredSkills([]);
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const toggleExperienceLevel = (level: ExperienceLevel) => {
    setSelectedExperienceLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const toggleAvailability = (type: AvailabilityType) => {
    setSelectedAvailability(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !requiredSkills.includes(newSkill.trim())) {
      setRequiredSkills([...requiredSkills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter(s => s !== skill));
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      Alert.alert('Error', 'Please enter a name for this search');
      return;
    }

    try {
      const params = buildSearchParams();
      await workIdentityService.saveSearch(searchName.trim(), params);
      loadSavedSearches();
      setShowSaveSearchModal(false);
      setSearchName('');
      Alert.alert('Success', 'Search saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save search');
    }
  };

  const handleLoadSavedSearch = (search: BusinessSavedSearch) => {
    setSelectedCategories(search.job_categories);
    setMinCapability(search.min_capability_score || undefined);
    setSelectedExperienceLevels(search.experience_levels as ExperienceLevel[]);
    setMaxPay(search.pay_range_max ? String(search.pay_range_max) : '');
    setSelectedAvailability(search.availability_types as AvailabilityType[]);
    setRequiredSkills(search.required_skills);
    setShowSavedSearches(false);
    handleSearch();
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    try {
      await workIdentityService.deleteSavedSearch(searchId);
      loadSavedSearches();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete search');
    }
  };

  // Compare mode functions
  const toggleCompareMode = () => {
    if (!can_compare) {
      navigation.navigate('Premium');
      return;
    }
    setCompareMode(!compareMode);
    setSelectedForCompare([]);
  };

  const toggleSelectForCompare = (identityId: string) => {
    if (selectedForCompare.includes(identityId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== identityId));
    } else {
      if (selectedForCompare.length >= max_compare_identities) {
        Alert.alert('Limit Reached', `You can compare up to ${max_compare_identities} workers at a time.`);
        return;
      }
      setSelectedForCompare([...selectedForCompare, identityId]);
    }
  };

  const handleCompare = () => {
    if (selectedForCompare.length < 2) {
      Alert.alert('Select More', 'Please select at least 2 workers to compare.');
      return;
    }
    navigation.navigate('CompareIdentities', {
      identityIds: selectedForCompare,
      budgetMax: maxPay ? parseInt(maxPay) : undefined,
      requiredSkills: requiredSkills.length > 0 ? requiredSkills : undefined,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (minCapability) count++;
    if (selectedExperienceLevels.length > 0) count++;
    if (maxPay) count++;
    if (selectedAvailability.length > 0) count++;
    if (requiredSkills.length > 0) count++;
    return count;
  };

  const renderResultCard = ({ item }: { item: SearchIdentitiesResult }) => {
    const capability = getCapabilityDisplay(item.capability_score);
    const isSelected = selectedForCompare.includes(item.identity_id);

    return (
      <TouchableOpacity
        style={[styles.resultCard, isSelected && styles.resultCardSelected]}
        onPress={() => {
          if (compareMode) {
            toggleSelectForCompare(item.identity_id);
          } else {
            navigation.navigate('WorkerIdentityDetail', { identityId: item.identity_id });
          }
        }}
      >
        {/* Compare mode checkbox */}
        {compareMode && (
          <TouchableOpacity
            style={[styles.compareCheckbox, isSelected && styles.compareCheckboxSelected]}
            onPress={() => toggleSelectForCompare(item.identity_id)}
          >
            {isSelected && <Feather name="check" size={14} color={theme.colors.text} />}
          </TouchableOpacity>
        )}

        <View style={styles.resultHeader}>
          <View style={styles.categoryBadge}>
            <MaterialCommunityIcons
              name="briefcase-variant"
              size={14}
              color={theme.colors.accent}
            />
            <Text style={styles.categoryText}>{item.job_category}</Text>
          </View>
          <View style={[styles.capabilityBadge, { backgroundColor: `${capability.color}20` }]}>
            <Text style={[styles.capabilityText, { color: capability.color }]}>
              {item.capability_score}
            </Text>
          </View>
        </View>

        {item.job_title && (
          <Text style={styles.jobTitle}>{item.job_title}</Text>
        )}

        <View style={styles.resultDetails}>
          <View style={styles.detailItem}>
            <Feather name="award" size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>
              {EXPERIENCE_LEVEL_LABELS[item.experience_level]}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Feather name="clock" size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>
              {AVAILABILITY_LABELS[item.availability]}
            </Text>
          </View>
        </View>

        {item.expected_pay_min && (
          <View style={styles.payRow}>
            <MaterialCommunityIcons name="cash" size={14} color={theme.colors.success} />
            <Text style={styles.payText}>
              Rs. {item.expected_pay_min.toLocaleString()}
              {item.expected_pay_max && ` - ${item.expected_pay_max.toLocaleString()}`}
            </Text>
          </View>
        )}

        {item.skill_match_count > 0 && (
          <View style={styles.matchBadge}>
            <Feather name="check-circle" size={14} color={theme.colors.success} />
            <Text style={styles.matchText}>
              {item.skill_match_count} skill{item.skill_match_count > 1 ? 's' : ''} match
            </Text>
          </View>
        )}

        <View style={styles.resultActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate('WorkerIdentityDetail', { identityId: item.identity_id })}
          >
            <Feather name="eye" size={16} color={theme.colors.accent} />
            <Text style={styles.viewButtonText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => navigation.navigate('SendContactRequest', {
              identityId: item.identity_id,
              jobCategory: item.job_category,
            })}
          >
            <Feather name="mail" size={16} color={theme.colors.text} />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Workers</Text>
        <View style={styles.headerActions}>
          {/* Compare Mode Toggle */}
          <TouchableOpacity
            style={[styles.headerButton, compareMode && styles.headerButtonActive]}
            onPress={toggleCompareMode}
          >
            <MaterialCommunityIcons
              name="compare"
              size={20}
              color={compareMode ? theme.colors.text : theme.colors.accent}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSavedSearches(true)}
          >
            <Feather name="bookmark" size={20} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Compare Mode Banner */}
      {compareMode && (
        <View style={styles.compareBanner}>
          <MaterialCommunityIcons name="compare" size={16} color={theme.colors.text} />
          <Text style={styles.compareBannerText}>
            Select workers to compare ({selectedForCompare.length}/{max_compare_identities})
          </Text>
          <TouchableOpacity onPress={toggleCompareMode}>
            <Feather name="x" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Feather name="sliders" size={20} color={theme.colors.text} />
          {getActiveFiltersCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Feather name="search" size={20} color={theme.colors.text} />
          <Text style={styles.searchButtonText}>Search Workers</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters Preview */}
      {getActiveFiltersCount() > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersScroll}
          contentContainerStyle={styles.activeFiltersContainer}
        >
          {selectedCategories.map(cat => (
            <View key={cat} style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>{cat}</Text>
              <TouchableOpacity onPress={() => toggleCategory(cat)}>
                <Feather name="x" size={14} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          ))}
          {minCapability && (
            <View style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>Min Score: {minCapability}</Text>
              <TouchableOpacity onPress={() => setMinCapability(undefined)}>
                <Feather name="x" size={14} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          )}
          {requiredSkills.map(skill => (
            <View key={skill} style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>{skill}</Text>
              <TouchableOpacity onPress={() => handleRemoveSkill(skill)}>
                <Feather name="x" size={14} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={handleClearFilters}
          >
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderResultCard}
          keyExtractor={(item) => item.identity_id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="search" size={48} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>
            {getActiveFiltersCount() > 0 ? 'No Results Found' : 'Search for Workers'}
          </Text>
          <Text style={styles.emptyText}>
            {getActiveFiltersCount() > 0
              ? 'Try adjusting your filters to find more workers'
              : 'Use filters to find the perfect workers for your needs'}
          </Text>
        </View>
      )}

      {/* Filters Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filtersModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersContent} showsVerticalScrollIndicator={false}>
              {/* Categories */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Job Categories</Text>
                <View style={styles.filterOptions}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.filterOption,
                        selectedCategories.includes(cat.name) && styles.filterOptionSelected
                      ]}
                      onPress={() => toggleCategory(cat.name)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedCategories.includes(cat.name) && styles.filterOptionTextSelected
                      ]}>
                        {cat.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Capability Score */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Minimum Capability Score</Text>
                <View style={styles.scoreOptions}>
                  {[40, 60, 80].map((score) => (
                    <TouchableOpacity
                      key={score}
                      style={[
                        styles.scoreOption,
                        minCapability === score && styles.scoreOptionSelected
                      ]}
                      onPress={() => setMinCapability(minCapability === score ? undefined : score)}
                    >
                      <Text style={[
                        styles.scoreOptionText,
                        minCapability === score && styles.scoreOptionTextSelected
                      ]}>
                        {score}+
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Experience Levels */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Experience Level</Text>
                <View style={styles.filterOptions}>
                  {(Object.keys(EXPERIENCE_LEVEL_LABELS) as ExperienceLevel[]).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.filterOption,
                        selectedExperienceLevels.includes(level) && styles.filterOptionSelected
                      ]}
                      onPress={() => toggleExperienceLevel(level)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedExperienceLevels.includes(level) && styles.filterOptionTextSelected
                      ]}>
                        {EXPERIENCE_LEVEL_LABELS[level]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Availability */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Availability</Text>
                <View style={styles.filterOptions}>
                  {(Object.keys(AVAILABILITY_LABELS) as AvailabilityType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        selectedAvailability.includes(type) && styles.filterOptionSelected
                      ]}
                      onPress={() => toggleAvailability(type)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedAvailability.includes(type) && styles.filterOptionTextSelected
                      ]}>
                        {AVAILABILITY_LABELS[type]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Max Pay */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Maximum Budget (Rs.)</Text>
                <TextInput
                  style={styles.payInput}
                  value={maxPay}
                  onChangeText={setMaxPay}
                  placeholder="e.g., 50000"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              {/* Required Skills */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Required Skills</Text>
                <View style={styles.skillInputRow}>
                  <TextInput
                    style={styles.skillInput}
                    value={newSkill}
                    onChangeText={setNewSkill}
                    placeholder="Add a skill"
                    placeholderTextColor={theme.colors.textMuted}
                    onSubmitEditing={handleAddSkill}
                  />
                  <TouchableOpacity
                    style={styles.addSkillButton}
                    onPress={handleAddSkill}
                  >
                    <Feather name="plus" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.skillTags}>
                  {requiredSkills.map((skill) => (
                    <View key={skill} style={styles.skillTag}>
                      <Text style={styles.skillTagText}>{skill}</Text>
                      <TouchableOpacity onPress={() => handleRemoveSkill(skill)}>
                        <Feather name="x" size={14} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Filter Actions */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.saveSearchLink}
                onPress={() => {
                  setShowFilters(false);
                  setShowSaveSearchModal(true);
                }}
              >
                <Feather name="bookmark" size={16} color={theme.colors.accent} />
                <Text style={styles.saveSearchLinkText}>Save Search</Text>
              </TouchableOpacity>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearFilters}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleSearch}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved Searches Modal */}
      <Modal visible={showSavedSearches} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.savedSearchesModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Searches</Text>
              <TouchableOpacity onPress={() => setShowSavedSearches(false)}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {savedSearches.length > 0 ? (
              <ScrollView style={styles.savedSearchesList}>
                {savedSearches.map((search) => (
                  <View key={search.id} style={styles.savedSearchItem}>
                    <TouchableOpacity
                      style={styles.savedSearchInfo}
                      onPress={() => handleLoadSavedSearch(search)}
                    >
                      <Text style={styles.savedSearchName}>{search.name}</Text>
                      <Text style={styles.savedSearchDetails}>
                        {search.job_categories.length > 0 && `${search.job_categories.join(', ')} • `}
                        {search.use_count} uses
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteSearchButton}
                      onPress={() => handleDeleteSavedSearch(search.id)}
                    >
                      <Feather name="trash-2" size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noSavedSearches}>
                <Feather name="bookmark" size={40} color={theme.colors.textMuted} />
                <Text style={styles.noSavedSearchesText}>No saved searches yet</Text>
                <Text style={styles.noSavedSearchesSubtext}>
                  Save your searches to quickly access them later
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Save Search Modal */}
      <Modal visible={showSaveSearchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.saveSearchModal}>
            <Text style={styles.modalTitle}>Save Search</Text>
            <TextInput
              style={styles.saveSearchInput}
              value={searchName}
              onChangeText={setSearchName}
              placeholder="Enter a name for this search"
              placeholderTextColor={theme.colors.textMuted}
            />
            <View style={styles.saveSearchButtons}>
              <TouchableOpacity
                style={styles.cancelSaveButton}
                onPress={() => {
                  setShowSaveSearchModal(false);
                  setSearchName('');
                }}
              >
                <Text style={styles.cancelSaveText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmSaveButton}
                onPress={handleSaveSearch}
              >
                <Text style={styles.confirmSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Compare Button - Fixed at bottom */}
      {compareMode && selectedForCompare.length >= 2 && (
        <TouchableOpacity
          style={styles.compareFloatingButton}
          onPress={handleCompare}
        >
          <MaterialCommunityIcons name="compare" size={20} color={theme.colors.text} />
          <Text style={styles.compareFloatingButtonText}>
            Compare {selectedForCompare.length} Workers
          </Text>
        </TouchableOpacity>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    gap: 10,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  activeFiltersScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  activeFiltersContainer: {
    paddingHorizontal: 24,
    gap: 8,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  resultsList: {
    padding: 24,
    paddingTop: 0,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.accent}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  capabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capabilityText: {
    fontSize: 14,
    fontWeight: '700',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  resultDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  payText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  matchText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.success,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    gap: 6,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  filtersModal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
  filtersContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterOptionSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterOptionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: theme.colors.text,
  },
  scoreOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  scoreOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}20`,
  },
  scoreOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  scoreOptionTextSelected: {
    color: theme.colors.accent,
  },
  payInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skillInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  skillInput: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addSkillButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  skillTagText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  filterActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveSearchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  saveSearchLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  savedSearchesModal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  savedSearchesList: {
    padding: 20,
  },
  savedSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  savedSearchInfo: {
    flex: 1,
  },
  savedSearchName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  savedSearchDetails: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  deleteSearchButton: {
    padding: 8,
  },
  noSavedSearches: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  noSavedSearchesText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  noSavedSearchesSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  saveSearchModal: {
    backgroundColor: theme.colors.surface,
    margin: 24,
    borderRadius: 20,
    padding: 24,
  },
  saveSearchInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 16,
    marginBottom: 24,
  },
  saveSearchButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  confirmSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  confirmSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  // Compare mode styles
  headerButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  compareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 10,
    gap: 8,
  },
  compareBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  resultCardSelected: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
    backgroundColor: `${theme.colors.accent}10`,
  },
  compareCheckbox: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  compareCheckboxSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  compareFloatingButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  compareFloatingButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
