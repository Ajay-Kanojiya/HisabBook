import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, useWindowDimensions } from 'react-native';
import { collection, getDocs, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ClothTypesScreen = () => {
    const [clothTypes, setClothTypes] = useState([]);
    const [search, setSearch] = useState('');
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const fetchClothTypes = async () => {
        if (!user) return;
        try {
            const clothTypesCollection = collection(db, 'cloth-types');
            const q = query(clothTypesCollection, where("userEmail", "==", user.email), orderBy("lastModified", "desc"));
            const clothTypesSnapshot = await getDocs(q);
            const clothTypesList = clothTypesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setClothTypes(clothTypesList);
        } catch (error) {
            console.error("Error fetching cloth types: ", error);
            Alert.alert("Error", "Could not fetch cloth types.");
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchClothTypes();
            }
        }, [user])
    );

    const handleDelete = (id) => {
        Alert.alert(
            "Delete Cloth Type",
            "Are you sure you want to delete this cloth type?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "cloth-types", id));
                            fetchClothTypes();
                        } catch (error) {
                            console.error("Error deleting document: ", error);
                            Alert.alert("Error", "Could not delete cloth type.");
                        }
                    },
                },
            ]
        );
    };

    const getIconName = (clothName) => {
        const name = clothName.toLowerCase();
        if (name.includes('shirt')) return 'tshirt-crew';
        if (name.includes('pant')) return 'human-male';
        if (name.includes('saree')) return 'human-female';
        if (name.includes('kurta')) return 'hanger';
        if (name.includes('blouse')) return 'human-female';
        return 'hanger';
    };

    const filteredClothTypes = clothTypes.filter(clothType =>
        clothType.name.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={getIconName(item.name)} size={styles.iconSize} color="#007bff" />
            </View>
            <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemRate}>${parseFloat(item.rate || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => router.push(`/edit-cloth-type/${item.id}`)}>
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
                <Text style={styles.headerTitle}>Cloth Types</Text>
            </View>
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={styles.searchIconSize} color="#888" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search cloth types"
                    placeholderTextColor="#888"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <FlatList
                data={filteredClothTypes}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
            />
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/new-cloth-type')}>
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
        iconContainer: {
            width: responsiveSize(40),
            height: responsiveSize(40),
            borderRadius: responsiveSize(20),
            backgroundColor: '#e7f5ff',
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
        itemRate: {
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

export default ClothTypesScreen;
