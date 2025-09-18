import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase'; // Adjust this path
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handleResetPassword = () => {
    if (email.trim() === '') {
      Alert.alert('Input Needed', 'Please enter your email address.');
      return;
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert(
          'Check Your Email',
          'A link to reset your password has been sent to your email address.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      })
      .catch((error) => {
        Alert.alert('Error', error.message);
      });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>
      
      <View style={styles.content}>
        <MaterialCommunityIcons name="lock-reset" size={60} color="#007bff" style={styles.icon} />
        <Text style={styles.title}>Forgot your password?</Text>
        <Text style={styles.subtitle}>
          No problem. Enter the email address you used to register. We'll send you a link to reset your password.
        </Text>

        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#6c757d" />
            <TextInput
                style={styles.input}
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleResetPassword}>
          <Text style={styles.resetButtonText}>Reset Password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
      alignSelf: 'flex-start',
      marginLeft: '5%',
      marginBottom: 5,
      fontSize: 14,
      color: '#6c757d'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    width: '90%'
  },
  input: {
    flex: 1,
    height: 45,
    marginLeft: 10,
    color: '#333',
  },
  resetButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '90%',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
