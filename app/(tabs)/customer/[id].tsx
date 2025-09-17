import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import customersData from '../../data/customers.json';

const CustomerDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const customer = customersData.find((c) => c.id === id);

  if (!customer) {
    return <Text>Customer not found</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{customer.name}</Text>
      <Text style={styles.email}>{customer.email}</Text>
      <Text style={styles.phone}>{customer.phone}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  email: {
    fontSize: 18,
    marginBottom: 5,
  },
  phone: {
    fontSize: 18,
  },
});

export default CustomerDetailScreen;
