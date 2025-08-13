import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuthContext } from '../context/AuthContext';
import { RootStackParamList, AuthenticatedStackParamList, UnauthenticatedStackParamList } from '../@types';
import { DrawerContent } from './DrawerContent';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { ProjectScreen } from '../screens/ProjectScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { LoadingScreen } from '../screens/LoadingScreen';

const RootStack = createStackNavigator<RootStackParamList>();
const AuthenticatedDrawer = createDrawerNavigator<AuthenticatedStackParamList>();
const UnauthenticatedStack = createStackNavigator<UnauthenticatedStackParamList>();

const AuthenticatedNavigator = () => {
    return (
        <AuthenticatedDrawer.Navigator
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerType: 'slide',
                drawerStyle: {
                    width: 280,
                },
                swipeEnabled: true,
                swipeEdgeWidth: 50,
            }}
        >
            <AuthenticatedDrawer.Screen
                name="Home"
                component={HomeScreen}
            />
            <AuthenticatedDrawer.Screen
                name="Projects"
                component={ProjectsScreen}
            />
            <AuthenticatedDrawer.Screen
                name="Project"
                component={ProjectScreen}
            />
            <AuthenticatedDrawer.Screen
                name="Settings"
                component={SettingsScreen}
            />
            <AuthenticatedDrawer.Screen
                name="Subscription"
                component={SubscriptionScreen}
            />
        </AuthenticatedDrawer.Navigator>
    );
};

const UnauthenticatedNavigator = () => {
    return (
        <UnauthenticatedStack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: 'transparent',
                },
                headerTintColor: '#FFFFFF',
                headerTransparent: true,
            }}
        >
            <UnauthenticatedStack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
            />
            <UnauthenticatedStack.Screen
                name="SignUp"
                component={SignUpScreen}
                options={{ headerShown: false }}
            />
        </UnauthenticatedStack.Navigator>
    );
};

export const Navigation = () => {
    const { isAuthenticated, loading } = useAuthContext();

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <RootStack.Screen name="Authenticated" component={AuthenticatedNavigator} />
                ) : (
                    <RootStack.Screen name="Unauthenticated" component={UnauthenticatedNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

