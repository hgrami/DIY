// apps/mobile/src/screens/ChecklistScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Text, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { useChecklists } from '../../hooks/useChecklists';
import { ChecklistItemCard } from './ChecklistItemCard';
import { ChecklistDensityPicker } from './ChecklistDensityPicker';
import { ChecklistDensity } from '../../types/checklist';
import { ChecklistFloatingButton } from './ChecklistFloatingButton';
import { ChecklistSearchBar, FilterType } from './ChecklistSearchBar';
import { ChecklistSortOptions, SortType } from './ChecklistSortOptions';
import { ChecklistActionModal } from './ChecklistActionModal';
import { Button } from '../Button';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
    checklistName: string;
    type?: 'local' | 'api';
    containerStyle?: StyleProp<ViewStyle>;
    cardStyle?: StyleProp<ViewStyle>;
    maxItems?: number; // For home screen preview
    showHeader?: boolean;
    onItemsChange?: (items: any[]) => void; // Callback for parent FlatList
    showDensityPicker?: boolean;
    density?: ChecklistDensity;
    onDensityChange?: (density: ChecklistDensity) => void;
    useFloatingButton?: boolean;
    // Advanced features
    enableSearch?: boolean;
    enableFiltering?: boolean;
    enableSorting?: boolean;
    enableBulkActions?: boolean;
    enableStats?: boolean;
    enableSwipeActions?: boolean;
}

export const Checklist: React.FC<Props> = ({ 
    checklistName, 
    type = 'local', 
    containerStyle, 
    cardStyle, 
    maxItems,
    showHeader = true,
    onItemsChange,
    showDensityPicker = false,
    density = 'normal',
    onDensityChange,
    useFloatingButton = false,
    // Advanced features defaults
    enableSearch = false,
    enableFiltering = false,
    enableSorting = false,
    enableBulkActions = false,
    enableStats = false,
    enableSwipeActions = false
}) => {
    const { checklist, loading, error, addItem, toggleItem, deleteItem, updateItem, duplicateItem } = useChecklists(checklistName, type);
    const [newItem, setNewItem] = useState('');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    
    // Advanced features state
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterType[]>(['all']);
    const [currentSort, setCurrentSort] = useState<SortType>('date-desc');
    const [showSortPanel, setShowSortPanel] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [bulkActionMode, setBulkActionMode] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    const toggleExpanded = (itemId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // Filter and sort items
    const getFilteredAndSortedItems = () => {
        if (!checklist?.items) return [];
        
        let items = [...checklist.items];
        
        // Apply search filter
        if (enableSearch && searchQuery.trim()) {
            items = items.filter(item =>
                item.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        // Apply status filters
        if (enableFiltering) {
            if (!activeFilters.includes('all')) {
                if (activeFilters.includes('completed')) {
                    items = items.filter(item => item.completed);
                } else if (activeFilters.includes('pending')) {
                    items = items.filter(item => !item.completed);
                }
                // Add recent filter logic if needed
                if (activeFilters.includes('recent')) {
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    items = items.filter(item => 
                        new Date(item.createdAt || '') > oneDayAgo
                    );
                }
            }
        }
        
        // Apply sorting
        if (enableSorting) {
            switch (currentSort) {
                case 'alphabetical':
                    items.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'completion':
                    items.sort((a, b) => Number(a.completed) - Number(b.completed));
                    break;
                case 'date-asc':
                    items.sort((a, b) => 
                        new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
                    );
                    break;
                case 'date-desc':
                default:
                    items.sort((a, b) => 
                        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
                    );
                    break;
            }
        }
        
        return items;
    };
    
    const filteredItems = getFilteredAndSortedItems();
    const completedCount = checklist?.items.filter(item => item.completed).length || 0;
    const totalCount = checklist?.items.length || 0;
    const displayItems = maxItems ? filteredItems.slice(0, maxItems) : filteredItems;

    // Notify parent of items change for FlatList integration
    useEffect(() => {
        if (onItemsChange && checklist?.items) {
            onItemsChange(checklist.items);
        }
    }, [checklist?.items, onItemsChange]);

    if (loading) {
        return (
            <View style={[styles.container, containerStyle]}>
                <Text style={styles.loadingText}>Loading checklist...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, containerStyle]}>
                <Text style={styles.errorText}>Error: {error}</Text>
            </View>
        );
    }

    if (!checklist) {
        return (
            <View style={[styles.container, containerStyle]}>
                <Text style={styles.errorText}>Checklist not found</Text>
            </View>
        );
    }

    const handleAdd = async () => {
        if (!newItem.trim()) return;
        
        const result = await addItem(newItem.trim());
        if (result?.success) {
            setNewItem('');
        }
        // Error handling is already done in the hook via handleServiceResult
    };

    const handleAddItem = async (title: string) => {
        const result = await addItem(title);
        return result;
    };

    // Advanced features handlers
    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleFilterToggle = (filter: FilterType) => {
        setActiveFilters(prev => {
            if (filter === 'all') {
                return ['all'];
            }
            
            const newFilters = prev.filter(f => f !== 'all');
            
            if (newFilters.includes(filter)) {
                const filtered = newFilters.filter(f => f !== filter);
                return filtered.length === 0 ? ['all'] : filtered;
            } else {
                return [...newFilters, filter];
            }
        });
    };

    const handleSortChange = (sort: SortType) => {
        setCurrentSort(sort);
        setShowSortPanel(false);
    };

    const handleItemSelect = (itemId: string) => {
        if (!enableBulkActions) return;
        
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const handleBulkDelete = async () => {
        for (const itemId of selectedItems) {
            await deleteItem(itemId);
        }
        setSelectedItems(new Set());
        setBulkActionMode(false);
    };

    const handleBulkComplete = async () => {
        for (const itemId of selectedItems) {
            const item = checklist?.items.find(i => i.id === itemId);
            if (item && !item.completed) {
                await toggleItem(itemId);
            }
        }
        setSelectedItems(new Set());
        setBulkActionMode(false);
    };

    const handleAddPress = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowAddModal(true);
    };

    const handleAddModalSubmit = async (title: string) => {
        const result = await addItem(title);
        setShowAddModal(false);
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {showHeader && (
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={styles.titleSection}>
                            <Text style={styles.title}>{checklist.name}</Text>
                            {totalCount > 0 && (
                                <Text style={styles.progress}>
                                    {completedCount}/{totalCount} completed
                                </Text>
                            )}
                        </View>
                        
                        {!maxItems && (
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={handleAddPress}
                                activeOpacity={0.7}
                            >
                                <Feather name="plus" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    {/* Advanced features */}
                    {enableSearch && (
                        <ChecklistSearchBar
                            onSearch={handleSearch}
                            onFilterToggle={enableFiltering ? handleFilterToggle : undefined}
                            activeFilters={activeFilters}
                            showFilters={enableFiltering}
                        />
                    )}
                    
                    {enableSorting && (
                        <ChecklistSortOptions
                            currentSort={currentSort}
                            onSortChange={handleSortChange}
                            showSortPanel={showSortPanel}
                            onTogglePanel={() => setShowSortPanel(!showSortPanel)}
                        />
                    )}
                    
                    {showDensityPicker && onDensityChange && (
                        <ChecklistDensityPicker
                            density={density}
                            onDensityChange={onDensityChange}
                        />
                    )}
                    
                    {/* Stats display */}
                    {enableStats && totalCount > 0 && (
                        <View style={styles.statsContainer}>
                            <Text style={styles.statsText}>
                                📊 {filteredItems.length} of {totalCount} items shown
                            </Text>
                            {searchQuery && (
                                <Text style={styles.statsText}>
                                    🔍 Search: "{searchQuery}"
                                </Text>
                            )}
                        </View>
                    )}
                    
                    {/* Bulk actions bar */}
                    {enableBulkActions && selectedItems.size > 0 && (
                        <View style={styles.bulkActionsBar}>
                            <Text style={styles.bulkActionsText}>
                                {selectedItems.size} selected
                            </Text>
                            <View style={styles.bulkActionsButtons}>
                                <TouchableOpacity 
                                    style={styles.bulkActionButton}
                                    onPress={handleBulkComplete}
                                >
                                    <Text style={styles.bulkActionText}>Complete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.bulkActionButton, styles.bulkActionDanger]}
                                    onPress={handleBulkDelete}
                                >
                                    <Text style={styles.bulkActionText}>Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.bulkActionButton}
                                    onPress={() => {
                                        setSelectedItems(new Set());
                                        setBulkActionMode(false);
                                    }}
                                >
                                    <Text style={styles.bulkActionText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Render items directly instead of using FlatList */}
            <View style={styles.itemsContainer}>
                {displayItems && displayItems.length > 0 ? (
                    displayItems.map((item) => (
                        <ChecklistItemCard
                            key={item.id}
                            item={item}
                            onToggle={() => toggleItem(item.id)}
                            onDelete={() => deleteItem(item.id)}
                            onEdit={(itemId, newTitle) => updateItem ? updateItem(itemId, newTitle) : undefined}
                            onDuplicate={(item) => duplicateItem ? duplicateItem(item.id) : undefined}
                            cardStyle={cardStyle}
                            density={density}
                            isExpanded={expandedItems.has(item.id)}
                            onExpand={() => toggleExpanded(item.id)}
                            onSelect={enableBulkActions ? () => handleItemSelect(item.id) : undefined}
                            isSelected={enableBulkActions ? selectedItems.has(item.id) : false}
                            enableSwipeActions={enableSwipeActions}
                        />
                    ))
                ) : (
                    <Text style={styles.emptyText}>
                        ✨ Your checklist is empty{"\n"}
                        Add your first task below to get started!
                    </Text>
                )}
            </View>

            {!maxItems && !useFloatingButton && ( // Traditional input if not in preview mode and not using FAB
                <View style={styles.inputContainer}>
                    <View style={styles.inputRow}>
                        <TextInput
                            value={newItem}
                            onChangeText={setNewItem}
                            placeholder="Add new task..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            style={styles.input}
                            returnKeyType="done"
                            onSubmitEditing={handleAdd}
                        />
                        <Button 
                            title="Add" 
                            variant="primary" 
                            size="small" 
                            onPress={handleAdd}
                            disabled={!newItem.trim()}
                        />
                    </View>
                </View>
            )}
            
            {/* Add Item Modal */}
            <ChecklistActionModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                mode="add"
                title="Add New Task"
                placeholder="Enter task title..."
                submitButtonText="Add Task"
                onSubmit={handleAddModalSubmit}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginBottom: 8,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    titleSection: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    progress: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 2,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    itemsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    input: {
        flex: 1,
        height: 48,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
        borderRadius: 12,
        paddingHorizontal: 16,
        color: '#fff',
        backgroundColor: 'rgba(255,255,255,0.08)',
        fontSize: 16,
        fontWeight: '500',
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        textAlign: 'center',
        padding: 20,
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 16,
        textAlign: 'center',
        padding: 20,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
        textAlign: 'center',
        padding: 32,
        fontStyle: 'italic',
        lineHeight: 24,
    },
    // Advanced features styles
    statsContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statsText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
    },
    bulkActionsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(33, 150, 243, 0.15)',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(33, 150, 243, 0.3)',
    },
    bulkActionsText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    bulkActionsButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    bulkActionButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    bulkActionDanger: {
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
        borderColor: 'rgba(244, 67, 54, 0.4)',
    },
    bulkActionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
});
