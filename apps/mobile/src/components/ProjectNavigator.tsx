import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Project } from '../@types';
import { useAuthContext } from '../context/AuthContext';
import { useProjectContext } from '../context/ProjectContext';

interface ProjectNavigatorProps {
  onNavigate: (shortId: string) => void;
  onCreateProject: () => void;
}

export const ProjectNavigator: React.FC<ProjectNavigatorProps> = ({
  onNavigate,
  onCreateProject,
}) => {
  const { user } = useAuthContext();
  const { 
    projects, 
    loading, 
    pagination, 
    searchQuery,
    loadProjects,
    searchProjects
  } = useProjectContext();
  
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const handleSearch = (query: string) => {
    setLocalSearchQuery(query);
    searchProjects(query);
  };

  const handleLoadMore = () => {
    if (pagination.hasMore && !loading) {
      loadProjects(pagination.page + 1, true);
    }
  };

  const handleProjectPress = async (project: Project) => {
    await Haptics.selectionAsync();
    onNavigate(project.shortId);
  };

  const handleCreatePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Check subscription limits for free users
    const isFreeUser = !user?.subscriptionStatus || user?.subscriptionStatus === 'FREE';
    if (isFreeUser && projects.length >= 3) {
      Alert.alert(
        'Project Limit Reached',
        'Free users can create up to 3 projects. Upgrade to Premium for unlimited projects.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: onCreateProject }, // Will handle upgrade flow
        ]
      );
      return;
    }
    
    onCreateProject();
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    const completedTasks = item.checklistItems.filter(task => task.completed).length;
    const totalTasks = item.checklistItems.length;
    const hasDeadline = item.deadline && new Date(item.deadline) > new Date();

    return (
      <TouchableOpacity
        style={styles.projectItem}
        onPress={() => handleProjectPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.projectHeader}>
          <Text style={styles.projectTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {hasDeadline && (
            <View style={styles.activeIndicator} />
          )}
        </View>
        
        {item.goal && (
          <Text style={styles.projectGoal} numberOfLines={1}>
            {item.goal}
          </Text>
        )}
        
        <View style={styles.projectStats}>
          <View style={styles.statGroup}>
            <Feather name="heart" size={12} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.statText}>{item.inspirationLinks.length}</Text>
          </View>
          <View style={styles.statGroup}>
            <Feather name="package" size={12} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.statText}>{item.materials.length}</Text>
          </View>
          {totalTasks > 0 && (
            <View style={styles.statGroup}>
              <Feather name="check-square" size={12} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.statText}>{completedTasks}/{totalTasks}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No projects yet</Text>
    </View>
  );

  const renderLoadMore = () => {
    if (!pagination.hasMore) return null;
    
    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="rgba(255, 255, 255, 0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={localSearchQuery}
            onChangeText={handleSearch}
          />
          {localSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Feather name="x" size={16} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Create Project Button */}
      <TouchableOpacity style={styles.createButton} onPress={handleCreatePress}>
        <View style={styles.createButtonContent}>
          <Feather name="plus" size={20} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.createButtonText}>New Project</Text>
        </View>
      </TouchableOpacity>

      {/* Projects List */}
      <FlatList
        data={projects}
        renderItem={renderProjectItem}
        keyExtractor={(item) => item.id}
        style={styles.projectsList}
        contentContainerStyle={styles.projectsContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        ListFooterComponent={renderLoadMore}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
  projectsList: {
    flex: 1,
  },
  projectsContent: {
    paddingHorizontal: 20,
  },
  projectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  projectTitle: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  projectGoal: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 6,
  },
  projectStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  loadMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
});