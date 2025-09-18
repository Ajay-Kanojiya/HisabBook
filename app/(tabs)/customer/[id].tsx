import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Modal, TextInput, Button, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CustomerDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [customer, setCustomer] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (id) {
            const fetchCustomer = async () => {
                const docRef = doc(db, 'customers', id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const customerData = { ...docSnap.data(), id: docSnap.id };
                    setCustomer(customerData);
                    setName(customerData.name);
                    setAddress(customerData.address);
                    setPhone(customerData.phone);
                } else {
                    Alert.alert('Error', 'Customer not found.');
                    router.back();
                }
            };
            fetchCustomer();
        }
    }, [id]);

    const handleUpdate = async () => {
        if (name.trim() === '' || address.trim() === '' || phone.trim() === '') {
            Alert.alert('Validation Error', 'Please fill in all fields.');
            return;
        }

        try {
            const customerDoc = doc(db, 'customers', id as string);
            await updateDoc(customerDoc, { name, address, phone });
            setCustomer({ ...customer, name, address, phone });
            setModalVisible(false);
            Alert.alert('Success', 'Customer updated successfully');
        } catch (error) {
            console.error('Error updating customer: ', error);
            Alert.alert('Error', 'There was an error updating the customer.');
        }
    };
    
    const handleDelete = () => {
        Alert.alert(
            "Delete Customer",
            "Are you sure you want to delete this customer? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "OK", 
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'customers', id as string));
                            router.back();
                        } catch (error) {
                            console.error('Error deleting customer: ', error);
                            Alert.alert('Error', 'There was an error deleting the customer.');
                        }
                    } 
                }
            ]
        );
    };

    if (!customer) {
        return <SafeAreaView style={styles.container}><Text>Loading...</Text></SafeAreaView>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                 <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#007bff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Customer Details</Text>
                 <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                    <MaterialCommunityIcons name="delete" size={24} color="#dc3545" />
                </TouchableOpacity>
            </View>
            <View style={styles.content}>
                <View style={styles.detailItem}>
                    <Text style={styles.label}>Name</Text>
                    <Text style={styles.value}>{customer.name}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Text style={styles.label}>Address</Text>
                    <Text style={styles.value}>{customer.address}</Text>
                </View>
                 <View style={styles.detailItem}>
                    <Text style={styles.label}>Phone</Text>
                    <Text style={styles.value}>{customer.phone}</Text>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={() => setModalVisible(true)}>
                    <MaterialCommunityIcons name="pencil" size={20} color="white" />
                    <Text style={styles.editButtonText}>Edit Customer</Text>
                </TouchableOpacity>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                 <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.centeredView}
                >
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Edit Customer</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={name}
                            onChangeText={setName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Address"
                            value={address}
                            onChangeText={setAddress}
                        />
                         <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                        <View style={styles.modalButtons}>
                            <Button title="Cancel" onPress={() => setModalVisible(false)} color="#6c757d" />
                            <Button title="Update" onPress={handleUpdate} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    backButton: {
        // Styles for back button
    },
     deleteButton: {
        // Styles for delete button
    },
    content: {
        padding: 20,
    },
    detailItem: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: '#6c757d',
    },
    value: {
        fontSize: 18,
        fontWeight: '500',
    },
    editButton: {
        backgroundColor: '#007bff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    editButtonText: {
        color: 'white',
        fontSize: 18,
        marginLeft: 10,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 15,
        fontWeight: 'bold'
    },
    input: {
        width: '100%',
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
});

export default CustomerDetailScreen;
