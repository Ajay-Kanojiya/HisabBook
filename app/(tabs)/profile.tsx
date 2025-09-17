import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ProfileScreen = () => {
    const router = useRouter();

    const handleLogout = () => {
        // Here you would typically clear user session, etc.
        // For now, we'll just navigate to the login screen.
        router.replace('/(auth)/login');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity>
                    <MaterialCommunityIcons name="pencil" size={24} color="#007bff" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.profileSection}>
                <Image 
                    source={{ uri: 'https://via.placeholder.com/100' }} // Replace with actual user image
                    style={styles.profileImage}
                />
                <Text style={styles.profileName}>Ethan Carter</Text>
                <Text style={styles.profileEmail}>ethan.carter@email.com</Text>
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Shop Information</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Shop Name</Text>
                    <Text style={styles.infoValue}>The Laundry Hub</Text>
                </View>
                 <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Shop Address</Text>
                    <Text style={styles.infoValue}>123 Main Street, Anytown</Text>
                </View>
                 <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Operating Hours</Text>
                    <Text style={styles.infoValue}>10:00 AM - 8:00 PM</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={22} color="white" />
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    profileSection: { alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
    profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
    profileName: { fontSize: 22, fontWeight: 'bold' },
    profileEmail: { fontSize: 16, color: 'gray' },
    infoSection: { padding: 20, marginTop: 10, backgroundColor: 'white' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    infoLabel: { fontSize: 16, color: '#495057' },
    infoValue: { fontSize: 16, fontWeight: '500' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dc3545', paddingVertical: 15, marginHorizontal: 20, borderRadius: 10, marginTop: 30 },
    logoutButtonText: { color: 'white', fontSize: 18, marginLeft: 10 }
});

export default ProfileScreen;
