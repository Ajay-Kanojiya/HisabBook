
import { auth, db } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProfileScreen = () => {
    const [user, setUser] = useState<User | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
        });
        return unsubscribe;
    }, []);

    const fetchUserInfo = useCallback(async () => {
        if (!user || !user.email) {
            setUserInfo(null);
            return;
        }

        try {
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                setUserInfo(userData);
            } else {
                setUserInfo({ name: user.email.split('@')[0], email: user.email });
            }
        } catch (error) {
            console.error("Error fetching user info: ", error);
            Alert.alert("Error", "Could not fetch user information.");
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchUserInfo();
        }, [fetchUserInfo])
    );

    const handleLogout = async () => {
        await auth.signOut();
        router.replace('/(auth)/login');
    };

    const renderAvatar = () => {
        if (userInfo?.photoURL) {
            return <Image source={{ uri: userInfo.photoURL }} style={styles.avatar} />;
        }
        return (
            <View style={styles.avatar}>
                <MaterialCommunityIcons name="account" size={60} color="#007bff" />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
            </View>

            <View style={styles.profileContainer}>
                {renderAvatar()}
                <Text style={styles.profileName}>{userInfo?.ownerName || ''}</Text>
                <Text style={styles.profileEmail}>{user?.email || ''}</Text>
                <View style={styles.phoneContainer}>
                    <MaterialCommunityIcons name="phone-outline" size={16} color="#6c757d" />
                    <Text style={styles.profilePhone}>{userInfo?.mobile || 'Not set'}</Text>
                </View>
            </View>

            <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Shop Information</Text>
                <InfoRow icon="storefront-outline" label="Shop Name" value={userInfo?.shopName || 'Not set'} />
                <InfoRow icon="map-marker-outline" label="Address" value={userInfo?.address || 'Not set'} />
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={22} color="#dc3545" />
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
        <MaterialCommunityIcons name={icon} size={22} color="#6c757d" style={styles.infoIcon} />
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#ffffff',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    profileContainer: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#ffffff',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e7f3ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 5,
    },
    profileEmail: {
        fontSize: 16,
        color: '#6c757d',
    },
    phoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    profilePhone: {
        fontSize: 16,
        color: '#6c757d',
        marginLeft: 5,
    },
    infoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        padding: 20,
        margin: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    infoIcon: {
        marginRight: 15,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6c757d',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        margin: 20,
        backgroundColor: '#f8d7da',
        borderRadius: 10,
    },
    logoutButtonText: {
        color: '#dc3545',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});

export default ProfileScreen;
