import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase'; // Adjust this path if needed
import { MaterialCommunityIcons } from '@expo/vector-icons';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleLogin = () => {
    setEmailError('');
    setPasswordError('');

    if (!validateEmail(email)) {
      setEmailError('Invalid email format.');
      return;
    }

    if (password.length === 0) {
      setPasswordError('Password cannot be empty.');
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        router.replace('/(tabs)/home');
      })
      .catch((error) => {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          setPasswordError('Incorrect password. Please try again.');
        } else {
          Alert.alert('Login Error', error.message);
        }
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.title}>Laundry Shop</Text>
        <Text style={styles.subtitle}>Welcome back! Please sign in.</Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.inputContainer, emailError ? styles.inputError : {}]}>
          <MaterialCommunityIcons name="email-outline" size={20} color="#000" />
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <View style={[styles.inputContainer, passwordError ? styles.inputError : {}]}>
          <MaterialCommunityIcons name="lock-outline" size={20} color="#000" />
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        
        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.signUp}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#000',
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  input: {
    flex: 1,
    height: 45,
    marginLeft: 10,
    color: '#000',
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 10,
    marginLeft: 5,
  },
  forgotPassword: {
    textAlign: 'right',
    color: '#000',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#000',
  },
  signUp: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
