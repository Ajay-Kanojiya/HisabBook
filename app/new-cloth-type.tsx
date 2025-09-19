import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logActivity } from '@/utils/logActivity';

const NewClothTypeScreen = () => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const handleSave = async () => {
        const priceValue = parseFloat(price);
        if (!name || isNaN(priceValue) || priceValue <= 0) {
            Alert.alert('Error', 'Please fill in all fields with valid data.');
            return;
        }
        if (!user) {
            Alert.alert('Error', 'You must be logged in to add a cloth type.');
            return;
        }

        try {
            const docRef = await addDoc(collection(db, 'cloth-types'), {
                name: name,
                price: priceValue,
                userEmail: user.email,
                createdAt: serverTimestamp(),
            });
            await logActivity('cloth_type_created', docRef.id, { name, price: priceValue });
            Alert.alert('Success', 'Cloth type added successfully.');
            router.replace('/(tabs)/cloth-types');
        } catch (error) {
            console.error("Error adding document: ", error);
            Alert.alert('Error', 'Could not add cloth type.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={styles.headerTitle.fontSize} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Cloth Type</Text>
                <View style={{width: styles.headerTitle.fontSize}}/>
            </View>
            <View style={styles.form}>
                <Text style={styles.label}>Cloth Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Shirt, Pant, Saree"
                    placeholderTextColor="#888"
                    value={name}
                    onChangeText={setName}
                />
                <Text style={styles.label}>Price</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter price per item"
                    placeholderTextColor="#888"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Cloth Type</Text>
                </TouchableOpacity>
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
            backgroundColor: '#ffffff',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: responsiveSize(60),
            paddingBottom: responsiveSize(20),
            paddingHorizontal: responsiveSize(20),
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: '#f0f0f0',
        },
        headerTitle: {
            fontSize: responsiveSize(20),
            fontWeight: 'bold',
            color: '#000',
        },
        form: {
            padding: responsiveSize(20),
        },
        label: {
            fontSize: responsiveSize(16),
            marginBottom: responsiveSize(10),
            color: '#000',
            fontWeight: '500',
        },
        input: {
            backgroundColor: '#f0f0f0',
            paddingHorizontal: responsiveSize(15),
            paddingVertical: responsiveSize(12),
            borderRadius: responsiveSize(10),
            marginBottom: responsiveSize(20),
            fontSize: responsiveSize(16),
            color: '#000',
            borderWidth: 1,
            borderColor: '#ddd',
        },
        saveButton: {
            backgroundColor: '#007bff',
            padding: responsiveSize(15),
            borderRadius: responsiveSize(10),
            alignItems: 'center',
            marginTop: responsiveSize(10),
        },
        saveButtonText: {
            color: 'white',
            fontSize: responsiveSize(16),
            fontWeight: 'bold',
        },
    });
}

export default NewClothTypeScreen;
