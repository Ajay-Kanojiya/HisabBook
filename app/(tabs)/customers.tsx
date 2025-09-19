import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, useWindowDimensions } from 'react-native';
import { collection, getDocs, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { onAuthStateChanged, User } from 'firebase/auth';
import { logActivity } from '@/utils/logActivity';

const CustomersScreen = () => {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
        });
        return unsubscribe; // Unsubscribe on component unmount
    }, []);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const fetchCustomers = async () => {
                if (!user || !user.email) {
                    if (isActive) setCustomers([]);
                    return;
                }
                try {
                    const customersCollection = collection(db, 'customers');
                    const q = query(customersCollection, where("userEmail", "==", user.email), orderBy("createdAt", "desc"));
                    const customersSnapshot = await getDocs(q);
                    if (isActive) {
                        const customersList = customersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                        setCustomers(customersList);
                    }
                } catch (error) {
                    console.error("Error fetching customers: ", error);
                    if (isActive) Alert.alert("Error", "Could not fetch customers.");
                }
            };

            fetchCustomers();

            return () => {
                isActive = false;
            };
        }, [user])
    );

    const handleDelete = (customerToDelete) => {
        Alert.alert(
            "Delete Customer",
            `Are you sure you want to delete ${customerToDelete.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "customers", customerToDelete.id));
                            await logActivity('customer_deleted', { documentId: customerToDelete.id, name: customerToDelete.name });
                            setCustomers(prevCustomers => prevCustomers.filter(customer => customer.id !== customerToDelete.id));
                        } catch (error) {
                            console.error("Error deleting document: ", error);
                            Alert.alert("Error", "Could not delete customer.");
                        }
                    },
                },
            ]
        );
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity onPress={() => router.push(`/customer/${item.id}`)} style={styles.itemContainer}>
            <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="account" size={styles.avatarIconSize} color="#007bff" />
            </View>
            <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{item.address}</Text>
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); router.push(`/edit-customer/${item.id}`)}}>
                    <MaterialCommunityIcons name="pencil-outline" size={styles.iconSize} color="#6c757d" />
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(item)}} style={{ marginLeft: 15 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={styles.iconSize} color="#dc3545" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
            </View>
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={styles.searchIconSize} color="#888" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search customers"
                    placeholderTextColor="#888"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <FlatList
                data={filteredCustomers}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
            />
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/new-customer')}>
                <MaterialCommunityIcons name="plus" size={styles.addButtonIconSize} color="white" />
            </TouchableOpacity>
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
            backgroundColor: '#ffffff',
        },
        header: {
            paddingTop: responsiveSize(60),
            paddingBottom: responsiveSize(20),
            paddingHorizontal: responsiveSize(20),
            backgroundColor: '#ffffff',
            alignItems: 'center',
        },
        headerTitle: {
            fontSize: responsiveSize(24),
            fontWeight: 'bold',
            color: '#000',
        },
        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f0f0f0',
            borderRadius: responsiveSize(10),
            marginHorizontal: responsiveSize(20),
            paddingHorizontal: responsiveSize(15),
            marginBottom: responsiveSize(10),
        },
        searchIcon: {
            marginRight: responsiveSize(10),
        },
        searchInput: {
            flex: 1,
            height: responsiveSize(45),
            fontSize: responsiveSize(16),
            color: '#000',
        },
        listContainer: {
            paddingHorizontal: responsiveSize(20),
        },
        itemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: responsiveSize(15),
            borderBottomWidth: 1,
            borderBottomColor: '#f0f0f0',
        },
        avatarContainer: {
            width: responsiveSize(40),
            height: responsiveSize(40),
            borderRadius: responsiveSize(20),
            backgroundColor: '#e7f0ff',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: responsiveSize(15),
        },
        itemInfo: {
            flex: 1,
        },
        itemName: {
            fontSize: responsiveSize(16),
            fontWeight: '600',
            color: '#000',
        },
        itemSubtitle: {
            fontSize: responsiveSize(14),
            color: '#6c757d',
            marginTop: responsiveSize(2),
        },
        itemActions: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        addButton: {
            position: 'absolute',
            bottom: responsiveSize(30),
            right: responsiveSize(30),
            backgroundColor: '#007bff',
            width: responsiveSize(56),
            height: responsiveSize(56),
            borderRadius: responsiveSize(28),
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
        },
        iconSize: responsiveSize(22),
        avatarIconSize: responsiveSize(24),
        searchIconSize: responsiveSize(20),
        addButtonIconSize: responsiveSize(28),
    });
};

export default CustomersScreen;
