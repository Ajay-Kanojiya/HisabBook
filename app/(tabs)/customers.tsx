import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, useWindowDimensions, Image } from 'react-native';
import { collection, getDocs, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CustomersScreen = () => {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const fetchCustomers = async () => {
        if (!user) return;
        try {
            const customersCollection = collection(db, 'customers');
            const q = query(customersCollection, where("userEmail", "==", user.email), orderBy("lastModified", "desc"));
            const customersSnapshot = await getDocs(q);
            const customersList = customersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setCustomers(customersList);
        } catch (error) {
            console.error("Error fetching customers: ", error);
            Alert.alert("Error", "Could not fetch customers.");
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchCustomers();
            }
        }, [user])
    );

    const handleDelete = (id) => {
        Alert.alert(
            "Delete Customer",
            "Are you sure you want to delete this customer?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "customers", id));
                            fetchCustomers();
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
        <View style={styles.itemContainer}>
            <Image source={{ uri: 'https://i.pravatar.cc/150?u=' + item.id }} style={styles.avatar} />
            <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{item.address}</Text>
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => router.push(`/edit-customer/${item.id}`)}>
                    <MaterialCommunityIcons name="pencil-outline" size={styles.iconSize} color="#6c757d" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 15 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={styles.iconSize} color="#dc3545" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Customers</Text>
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
        avatar: {
            width: responsiveSize(40),
            height: responsiveSize(40),
            borderRadius: responsiveSize(20),
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
        searchIconSize: responsiveSize(20),
        addButtonIconSize: responsiveSize(28),
    });
};

export default CustomersScreen;
