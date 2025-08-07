import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useAuthContext } from '../context/AuthContext';
import { Button } from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UnauthenticatedStackParamList } from '../@types';

type SignUpScreenNavigationProp = NativeStackNavigationProp<UnauthenticatedStackParamList, 'SignUp'>;

export const SignUpScreen: React.FC = () => {
  const { signUp, setActive } = useSignUp();
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!signUp || !setActive) {
      Alert.alert('Error', 'Authentication service not available');
      return;
    }

    try {
      setLoading(true);
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // AuthContext will handle the authentication automatically
      } else {
        Alert.alert('Error', 'Sign up failed');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!setActive) {
      Alert.alert('Error', 'Authentication service not available');
      return;
    }

    try {
      setLoading(true);
      const { createdSessionId, setActive: oAuthSetActive } = await startGoogleOAuth();
      
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        // No need to manually authenticate - AuthContext handles this automatically
      }
    } catch (error) {
      console.error('Google sign up error:', error);
      Alert.alert('Error', 'Google sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (!setActive) {
      Alert.alert('Error', 'Authentication service not available');
      return;
    }

    try {
      setLoading(true);
      const { createdSessionId, setActive: oAuthSetActive } = await startAppleOAuth();
      
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        // No need to manually authenticate - AuthContext handles this automatically
      }
    } catch (error) {
      console.error('Apple sign up error:', error);
      Alert.alert('Error', 'Apple sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title="Sign Up"
            onPress={handleSignUp}
            loading={loading}
            style={styles.button}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Continue with Google"
            onPress={handleGoogleSignUp}
            variant="outline"
            loading={loading}
            style={styles.oauthButton}
          />

          <Button
            title="Continue with Apple"
            onPress={handleAppleSignUp}
            variant="outline"
            loading={loading}
            style={styles.oauthButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  button: {
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  oauthButton: {
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});