import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const HomeScreen = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = getStyles(width);

  const menuItems = [
    { title: 'Dashboard', icon: 'view-dashboard-outline', route: '/dashboard' },
    { title: 'Customers', icon: 'account-group-outline', route: '/customer-list' },
    { title: 'New Order', icon: 'plus-circle-outline', route: '/new-order' },
    { title: 'Cloth Types', icon: 'tshirt-crew-outline', route: '/(tabs)/cloth-types' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome, Shop Owner!</Text>
      <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.card} onPress={() => router.push(item.route)}>
            <MaterialCommunityIcons name={item.icon} size={styles.icon.fontSize} color="#007bff" />
            <Text style={styles.cardText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const getStyles = (width) => {
    const baseWidth = 375;
    const scale = width / baseWidth;

    const responsiveSize = (size) => Math.round(size * scale);

    return StyleSheet.create({
        container: {
            flex: 1,
            padding: responsiveSize(20),
            backgroundColor: '#f8f9fa',
        },
        header: {
            fontSize: responsiveSize(24),
            fontWeight: 'bold',
            marginBottom: responsiveSize(20),
            color: '#000',
        },
        grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
        },
        card: {
            width: '48%',
            backgroundColor: 'white',
            padding: responsiveSize(20),
            borderRadius: responsiveSize(10),
            alignItems: 'center',
            marginBottom: responsiveSize(15),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        icon: {
            fontSize: responsiveSize(40),
        },
        cardText: {
            marginTop: responsiveSize(10),
            fontSize: responsiveSize(16),
            fontWeight: 'bold',
            color: '#000',
        },
    });
}

export default HomeScreen;
