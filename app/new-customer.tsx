
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logActivity } from '@/utils/logActivity';

const NewCustomerScreen = () => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const handleSave = async () => {
        if (!name) {
            Alert.alert('Error', 'Please fill in the customer\'s name.');
            return;
        }
        if (!user) {
            Alert.alert('Error', 'You must be logged in to add a customer.');
            return;
        }

        try {
            const docRef = await addDoc(collection(db, 'customers'), {
                name: name,
                address: address,
                phone: phone,
                userEmail: user.email,
                createdAt: serverTimestamp(),
            });
            await logActivity('customer_created', docRef.id, { name });
            Alert.alert('Success', 'Customer added successfully.');
            router.replace('/(tabs)/customers');
        } catch (error) {
            console.error("Error adding document: ", error);
            Alert.alert('Error', 'Could not add customer.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={styles.headerTitle.fontSize} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Customer</Text>
                <View style={{width: styles.headerTitle.fontSize}}/>
            </View>
            <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="account-plus-outline" size={styles.avatarIcon.fontSize} color={styles.avatarIcon.color} />
            </View>
            <View style={styles.form}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter customer's full name"
                    placeholderTextColor="#888"
                    value={name}
                    onChangeText={setName}
                />
                <Text style={styles.label}>Address (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter customer's address"
                    placeholderTextColor="#888"
                    value={address}
                    onChangeText={setAddress}
                />
                <Text style={styles.label}>Phone (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter customer's phone number"
                    placeholderTextColor="#888"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Customer</Text>
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
        avatarContainer: {
            width: responsiveSize(100),
            height: responsiveSize(100),
            borderRadius: responsiveSize(50),
            backgroundColor: '#007bff',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'center',
            marginVertical: responsiveSize(20),
        },
        avatarIcon: {
            fontSize: responsiveSize(60),
            color: 'white',
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

export default NewCustomerScreen;
