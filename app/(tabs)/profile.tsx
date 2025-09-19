import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '@/config/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

const ProfileScreen = () => {
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);
    const [shop, setShop] = useState(null);

    useEffect(() => {
        if (user) {
            const fetchShopData = async () => {
                const shopsRef = collection(db, 'shops');
                const q = query(shopsRef, where("userEmail", "==", user.email));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) {
                    console.log("No shop details found, creating new one.");
                    const newShop = {
                        userEmail: user.email,
                        shopName: "The Laundry Hub",
                        address: "123 Main Street, Anytown",
                        operatingHours: "10:00 AM - 8:00 PM",
                    };
                    try {
                        const docRef = await addDoc(shopsRef, newShop);
                        setShop({ ...newShop, id: docRef.id });
                        console.log("New shop details created: ", { ...newShop, id: docRef.id });
                    } catch (error) {
                        console.error("Error creating shop details: ", error);
                        Alert.alert("Error", "Could not create shop details.");
                    }
                } else {
                    const shopData = querySnapshot.docs[0].data();
                    console.log("Shop details fetched: ", shopData);
                    setShop({ ...shopData, id: querySnapshot.docs[0].id });
                }
            };
            fetchShopData();
        }
    }, [user]);

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
                    <Text style={styles.infoValue}>{shop ? shop.shopName : 'Loading...'}</Text>
                </View>
                 <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Shop Address</Text>
                    <Text style={styles.infoValue}>{shop ? shop.address : 'Loading...'}</Text>
                </View>
                 <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Operating Hours</Text>
                    <Text style={styles.infoValue}>{shop ? shop.operatingHours : 'Loading...'}</Text>
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
