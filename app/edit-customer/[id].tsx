import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logActivity } from '@/utils/logActivity';

const EditCustomerScreen = () => {
    const { id } = useLocalSearchParams();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const fetchCustomer = useCallback(async () => {
        if (!id) return;
        try {
            const docRef = doc(db, 'customers', id as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const customerData = docSnap.data();
                setName(customerData.name);
                setAddress(customerData.address);
                setPhone(customerData.phone);
            } else {
                Alert.alert('Error', 'Customer not found.');
            }
        } catch (error) {
            console.error("Error fetching document: ", error);
            Alert.alert('Error', 'Could not fetch customer data.');
        }
    }, [id]);

    useFocusEffect(fetchCustomer);

    const handleUpdate = async () => {
        if (!name) {
            Alert.alert('Error', 'Please fill in the customer name.');
            return;
        }
        if (!user) {
            Alert.alert('Error', 'You must be logged in to update a customer.');
            return;
        }

        try {
            const docRef = doc(db, 'customers', id as string);
            await updateDoc(docRef, {
                name: name,
                address: address,
                phone: phone,
            });
            await logActivity('customer_updated', { documentId: id, name });
            Alert.alert('Success', 'Customer updated successfully.');
            router.replace('/(tabs)/customers');
        } catch (error) {
            console.error("Error updating document: ", error);
            Alert.alert('Error', 'Could not update customer.');
        }
    };

    const handleDelete = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to delete a customer.');
            return;
        }

        Alert.alert(
            "Delete Customer",
            "Are you sure you want to delete this customer? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const docRef = doc(db, 'customers', id as string);
                            await deleteDoc(docRef);
                            await logActivity('customer_deleted', { documentId: id, name });
                            Alert.alert('Success', 'Customer deleted successfully.');
                            router.replace('/(tabs)/customers');
                        } catch (error) {
                            console.error("Error deleting document: ", error);
                            Alert.alert('Error', 'Could not delete customer.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={styles.headerTitle.fontSize} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Customer</Text>
                <TouchableOpacity onPress={handleDelete}>
                    <MaterialCommunityIcons name="delete-outline" size={styles.headerTitle.fontSize} color="red" />
                </TouchableOpacity>
            </View>
            <View style={styles.form}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter customer\'s full name"
                    placeholderTextColor="#888"
                    value={name}
                    onChangeText={setName}
                />
                <Text style={styles.label}>Address (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter customer\'s address"
                    placeholderTextColor="#888"
                    value={address}
                    onChangeText={setAddress}
                />
                <Text style={styles.label}>Phone (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter customer\'s phone number"
                    placeholderTextColor="#888"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
                    <Text style={styles.saveButtonText}>Update Customer</Text>
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

export default EditCustomerScreen;
