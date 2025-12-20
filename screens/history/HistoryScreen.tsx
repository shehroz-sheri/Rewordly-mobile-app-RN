import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ToastAndroid,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import { formatDate } from '../../utils/formatDate';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { StorageService, HistoryItem } from '../../utils/storage';

type FilterType = 'all' | 'humanizer' | 'remover' | 'paraphraser';
type HistoryNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'HistoryResult'
>;

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<HistoryNavProp>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Load history from storage when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, []),
  );

  const loadHistory = () => {
    let operations = StorageService.getAllOperations();
    
    // Auto-cleanup: Delete items older than 30 days if total count > 70
    if (operations.length > 70) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      console.log(`📊 Total history items: ${operations.length}`);
      console.log(`🗑️ Auto-cleanup triggered - removing items older than 30 days`);
      
      // Filter out items older than 30 days
      const itemsToKeep = operations.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= thirtyDaysAgo;
      });
      
      // Get items that will be deleted
      const itemsToDelete = operations.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate < thirtyDaysAgo;
      });
      
      // Delete old items from storage
      if (itemsToDelete.length > 0) {
        console.log(`🗑️ Deleting ${itemsToDelete.length} old items`);
        itemsToDelete.forEach(item => {
          StorageService.deleteOperation(item.id);
        });
        
        // Update operations list
        operations = itemsToKeep;
        console.log(`✅ Cleanup complete. Remaining items: ${operations.length}`);
      }
    } else {
      console.log(`📊 Total history items: ${operations.length} (< 70, no auto-cleanup)`);
    }
    
    setHistory(operations);
  };

  // --- Utility Functions ---

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete ALL history items? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            StorageService.clearAllOperations();
            setHistory([]);
            showToast('All history cleared.');
            setShowMoreOptions(false);
          },
        },
      ],
    );
  };

  // --- Handlers ---

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete History Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            StorageService.deleteOperation(id);
            setHistory(prev => prev.filter(item => item.id !== id));
            showToast('Item deleted.');
          },
        },
      ],
    );
  };

  const handleNavigateToResult = (item: HistoryItem) => {
    console.log(`Navigating to full result for item: ${item.id}`);
    // This function will navigate to the full detail screen in a real app
    navigation.navigate('HistoryResult', { item });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' || Platform.OS === 'ios') {
      const currentDate = selectedDate || filterDate;
      if (currentDate) {
        setFilterDate(currentDate);
      }
    }
  };

  const clearDateFilter = () => {
    setFilterDate(null);
  };

  // --- Filtering Logic ---

  const filteredHistory = history.filter(item => {
    const matchesSearch =
      item.originalText.toLowerCase().includes(searchText.toLowerCase()) ||
      item.resultText.toLowerCase().includes(searchText.toLowerCase());

    const matchesDate = filterDate
      ? item.date.toDateString() === filterDate.toDateString()
      : true;

    const matchesType = filterType === 'all' || item.type === filterType;

    return matchesSearch && matchesDate && matchesType;
  });

  // --- Render Functions ---

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    let typeLabel: string;
    let typeColor: string;

    switch (item.type) {
      case 'humanizer':
        typeLabel = 'Humanizer';
        typeColor = COLORS.primary; // Existing Color
        break;
      case 'remover':
        typeLabel = 'Remover';
        typeColor = '#D2EEFF'; // Existing Color
        break;
      case 'paraphraser':
        typeLabel = 'Paraphraser';
        typeColor = '#C3FFD6'; // New Color (light green for paraphraser)
        break;
      default:
        typeLabel = 'Unknown';
        typeColor = COLORS.light;
    }

    return (
      <TouchableOpacity
        style={styles.itemWrapperMinimal}
        onPress={() => handleNavigateToResult(item)}
        activeOpacity={0.9}
      >
        {/* Content Area */}
        <View style={styles.itemContentMinimal}>
          <View style={styles.topRowMinimal}>
            {/* Type Badge */}
            <View
              style={[styles.typeBadgeMinimal, { backgroundColor: typeColor }]}
            >
              <Text style={styles.typeTextMinimal}>{typeLabel}</Text>
            </View>
            {/* Date */}
            <Text style={styles.dateTextMinimal}>{formatDate(item.date)}</Text>
          </View>

          {/* Preview Text */}
          <Text style={styles.previewTextMinimal} numberOfLines={2}>
            {item.resultText}
          </Text>
        </View>

        {/* Delete Action (Minimal) */}
        <TouchableOpacity
          style={styles.deleteButtonMinimal}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.tertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderTypeSelector = () => {
    const TypeOption = ({
      type,
      label,
    }: {
      type: FilterType;
      label: string;
    }) => (
      <TouchableOpacity
        style={[
          styles.typeOption,
          filterType === type && styles.typeOptionSelected,
        ]}
        onPress={() => {
          setFilterType(type);
          setShowTypeSelector(false);
        }}
      >
        {/* Removed Ionicons icon */}
        <Text
          style={[
            styles.typeOptionText,
            filterType === type && styles.typeOptionTextSelected,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );

    const typeIcon: any =
      filterType === 'humanizer'
        ? 'sparkles'
        : filterType === 'remover'
        ? 'cut'
        : filterType === 'paraphraser'
        ? 'reader'
        : 'funnel-outline';

    return (
      <View style={{ zIndex: 10 }}>
        <TouchableOpacity
          style={styles.typeFilterButton}
          onPress={() => setShowTypeSelector(prev => !prev)}
        >
          <Ionicons name={typeIcon} size={22} color={COLORS.dark} />
        </TouchableOpacity>
        {showTypeSelector && (
          <View style={styles.typeOptionsContainerAbsolute}>
            <TypeOption type="all" label="All" />
            <TypeOption type="humanizer" label="Humanizer" />
            <TypeOption type="remover" label="Remover" />
            <TypeOption type="paraphraser" label="Paraphraser" />{' '}
            {/* Added Paraphraser */}
          </View>
        )}
      </View>
    );
  };

  const renderMoreOptions = () => {
    return (
      <View style={{ zIndex: 10 }}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowMoreOptions(prev => !prev)}
        >
          <MaterialDesignIcons
            name="dots-vertical"
            size={24}
            color={COLORS.dark}
          />
        </TouchableOpacity>
        {showMoreOptions && (
          <View style={styles.moreOptionsContainerAbsolute}>
            <TouchableOpacity style={styles.moreOption} onPress={clearHistory}>
              <Ionicons
                name="trash-bin-outline"
                size={18}
                color={COLORS.tertiary}
              />
              <Text style={styles.moreOptionText}>Clear All History</Text>
            </TouchableOpacity>
            {/* Add more options here if needed */}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Overlay to close selectors on tap outside */}
      {(showTypeSelector || showMoreOptions) && (
        <TouchableWithoutFeedback
          onPress={() => {
            setShowTypeSelector(false);
            setShowMoreOptions(false);
          }}
        >
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>History</Text>

        <View style={styles.controlsRow}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color={COLORS.secondary}
              style={{ marginRight: SPACING.xs }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search content..."
              placeholderTextColor={COLORS.secondary}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <View style={styles.filterGroup}>
            {renderTypeSelector()}
            {filterDate && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={clearDateFilter}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color={COLORS.tertiary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={24} color={COLORS.dark} />
            </TouchableOpacity>
            {renderMoreOptions()}
          </View>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={filterDate || new Date()}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      <FlatList
        data={filteredHistory}
        renderItem={renderHistoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No history found.</Text>
        }
        showsVerticalScrollIndicator={false}
      />
      <View style={{ height: 100 }} />
    </SafeAreaView>
  );
};

export default HistoryScreen;

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9,
  },
  headerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.light,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm_md,
    marginTop: SPACING.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.offWhite,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: Platform.OS === 'ios' ? SPACING.xs_sm : 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.dark,
    height: '100%',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
    zIndex: 10,
  },
  typeFilterButton: {
    backgroundColor: COLORS.offWhite,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm_md,
    paddingVertical: SPACING.sm,
  },
  typeOptionsContainerAbsolute: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: COLORS.light,
    borderRadius: SPACING.sm,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    width: 180,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm_md,
    paddingVertical: SPACING.sm,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.dark,
    borderRadius: SPACING.sm,
  },
  typeOptionText: {
    fontSize: 16,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.dark,
  },
  typeOptionTextSelected: {
    fontFamily: FONTS.dmSans.semiBold,
    color: COLORS.light,
  },
  // New Styles for More Options Dropdown
  moreOptionsContainerAbsolute: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: COLORS.light,
    borderRadius: SPACING.sm,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    width: 200,
    paddingVertical: SPACING.xs,
  },
  moreOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm_md,
  },
  moreOptionText: {
    marginLeft: SPACING.sm,
    fontSize: 16,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.tertiary, // Use a warning/danger color
  },
  // Existing Styles
  filterButton: {
    backgroundColor: COLORS.offWhite,
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
  },
  clearFilterButton: {
    backgroundColor: COLORS.offWhite,
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
  },
  listContentContainer: {
    padding: SPACING.lg,
  },
  emptyText: {
    marginTop: SPACING.lg,
    textAlign: 'center',
    color: COLORS.secondary,
    fontFamily: FONTS.dmSans.medium,
  },
  itemWrapperMinimal: {
    backgroundColor: '#FAFAFA',
    borderRadius: SPACING.sm,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemContentMinimal: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  topRowMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  typeBadgeMinimal: {
    alignSelf: 'flex-start',
    borderRadius: SPACING.xs,
    paddingHorizontal: SPACING.xs_sm,
    paddingVertical: 2,
  },
  typeTextMinimal: {
    fontSize: 12,
    fontFamily: FONTS.dmSans.bold,
    textTransform: 'uppercase',
    color: COLORS.dark,
  },
  dateTextMinimal: {
    fontSize: 12,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.secondary,
  },
  previewTextMinimal: {
    fontSize: 14,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.gray,
    lineHeight: 20,
    marginTop: 6,
  },
  deleteButtonMinimal: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});