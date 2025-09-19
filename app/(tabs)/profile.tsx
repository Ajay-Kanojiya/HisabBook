import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '@/config/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { getOrCreateShop } from '@/utils/shop';

const ProfileScreen = () => {
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);
    const [shop, setShop] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchShopData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const shopData = await getOrCreateShop(user);
            setShop(shopData);
        } catch (error) {
            console.error("Error fetching shop data: ", error);
            Alert.alert("Error", "Could not fetch shop information.");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => {
        fetchShopData();
    }, [user]));

    const handleLogout = () => {
        auth.signOut().then(() => {
            router.replace('/(auth)/login');
        }).catch((error) => {
            Alert.alert('Logout Error', error.message);
        });
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#007bff" style={{ flex: 1, justifyContent: 'center'}}/>
    }

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
                    <Text style={styles.infoValue}>{shop?.shopName}</Text>
                </View>
                 <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Shop Address</Text>
                    <Text style={styles.infoValue}>{shop?.address}</Text>
                </View>
                 <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Operating Hours</Text>
                    <Text style={styles.infoValue}>{shop?.operatingHours}</Text>
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
