import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '@/config/firebase';

const ProfileScreen = () => {
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const handleLogout = () => {
        auth.signOut().then(() => {
            router.replace('/(auth)/login');
        }).catch((error) => {
            Alert.alert('Logout Error', error.message);
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity>
                    <MaterialCommunityIcons name="pencil" size={styles.headerTitle.fontSize} color="#007bff" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.profileSection}>
                <Image 
                    source={{ uri: 'https://via.placeholder.com/100' }} // Replace with actual user image
                    style={styles.profileImage}
                />
                <Text style={styles.profileName}>{user ? user.email.split('@')[0] : 'User'}</Text>
                <Text style={styles.profileEmail}>{user ? user.email : 'No email provided'}</Text>
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
                <MaterialCommunityIcons name="logout" size={styles.logoutButtonText.fontSize} color="white" />
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const getStyles = (width) => {
    const baseWidth = 375;
    const scale = width / baseWidth;

    const responsiveSize = (size) => Math.round(size * scale);

    return StyleSheet.create({
        container: { flex: 1, backgroundColor: '#f8f9fa' },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: responsiveSize(20), backgroundColor: 'white' },
        headerTitle: { fontSize: responsiveSize(20), fontWeight: 'bold' },
        profileSection: { alignItems: 'center', padding: responsiveSize(20), backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
        profileImage: { width: responsiveSize(100), height: responsiveSize(100), borderRadius: responsiveSize(50), marginBottom: responsiveSize(10) },
        profileName: { fontSize: responsiveSize(22), fontWeight: 'bold' },
        profileEmail: { fontSize: responsiveSize(16), color: 'gray' },
        infoSection: { padding: responsiveSize(20), marginTop: responsiveSize(10), backgroundColor: 'white' },
        sectionTitle: { fontSize: responsiveSize(18), fontWeight: 'bold', marginBottom: responsiveSize(15) },
        infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: responsiveSize(10) },
        infoLabel: { fontSize: responsiveSize(16), color: '#495057' },
        infoValue: { fontSize: responsiveSize(16), fontWeight: '500' },
        logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dc3545', paddingVertical: responsiveSize(15), marginHorizontal: responsiveSize(20), borderRadius: responsiveSize(10), marginTop: responsiveSize(30) },
        logoutButtonText: { color: 'white', fontSize: responsiveSize(18), marginLeft: responsiveSize(10) }
    });
}

export default ProfileScreen;
