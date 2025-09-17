import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase'; // Adjust this path
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const router = useRouter();

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleRegister = () => {
    setEmailError('');
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (getPasswordStrength(password) < 3) {
        Alert.alert('Weak Password', 'Password is too weak. Please choose a stronger password.');
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // You can add user profile update logic here (e.g., storing name and mobile)
        router.replace('/(tabs)/home');
      })
      .catch((error) => {
        Alert.alert('Registration Error', error.message);
      });
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Please fill in the details to register.</Text>
      </View>

      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput style={[styles.input, emailError ? styles.inputError : {}]} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      <View style={styles.mobileInputContainer}>
        <Text style={styles.countryCode}>+91</Text>
        <TextInput style={styles.mobileInput} placeholder="Enter your mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      </View>
      <Text style={styles.inputHelper}>Please include your country code.</Text>
      
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <View style={styles.strengthIndicatorContainer}>
            <View style={[styles.strengthBar, { flex: passwordStrength / 5, backgroundColor: passwordStrength > 2 ? '#28a745' : '#ffc107' }]} />
      </View>
      <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerButtonText}>Register</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.signIn}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  backButton: { position: 'absolute', top: 40, left: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#6c757d' },
  input: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 5, padding: 12, marginBottom: 10, fontSize: 16, color: '#333' },
  inputError: { borderColor: '#dc3545' },
  errorText: { color: '#dc3545', marginBottom: 10 },
  mobileInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ced4da', borderRadius: 5, marginBottom: 5 },
  countryCode: { padding: 12, color: '#495057', borderRightWidth: 1, borderRightColor: '#ced4da' },
  mobileInput: { flex: 1, padding: 12, fontSize: 16, color: '#333' },
  inputHelper: { color: '#6c757d', marginBottom: 10, fontSize: 12 },
  strengthIndicatorContainer: { height: 5, backgroundColor: '#e9ecef', borderRadius: 2.5, marginBottom: 10, flexDirection: 'row' },
  strengthBar: { height: 5, borderRadius: 2.5 },
  registerButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  registerButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signIn: { color: '#007bff', fontWeight: 'bold' }
});

export default RegisterScreen;
