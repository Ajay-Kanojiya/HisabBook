import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../firebase';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handleResetPassword = () => {
    auth.sendPasswordResetEmail(email)
      .then(() => {
        Alert.alert('Password Reset', 'A password reset email has been sent.');
        router.push('login');
      })
      .catch(error => Alert.alert('Error', error.message));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button title="Reset Password" onPress={handleResetPassword} />
      <Text onPress={() => router.push('login')} style={styles.link}>Back to Login</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ForgotPasswordScreen;
