import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../firebase'; // Adjust this path

const HomeScreen = () => {
  const router = useRouter();

  const handleLogout = () => {
    auth.signOut().then(() => {
      router.replace('/(auth)/login');
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Home</Text>
      <Text>You are logged in.</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default HomeScreen;
