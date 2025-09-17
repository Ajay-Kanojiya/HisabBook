import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, Button, Alert, Platform } from 'react-native';
import { collection, getDocs, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../config/firebase'; // Adjust path
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const NewOrderScreen = () => {
    const [customers, setCustomers] = useState([]);
    const [clothTypes, setClothTypes] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [total, setTotal] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const fetchInitialData = async () => {
            const customersSnapshot = await getDocs(collection(db, 'customers'));
            setCustomers(customersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            
            const clothTypesSnapshot = await getDocs(collection(db, 'clothTypes'));
            setClothTypes(clothTypesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        const calculateTotal = () => {
            const newTotal = orderItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
            setTotal(newTotal);
        };
        calculateTotal();
    }, [orderItems]);

    const addOrderItem = () => {
        setOrderItems([...orderItems, { clothTypeId: '', quantity: 1, rate: 0 }]);
    };

    const updateOrderItem = (index, key, value) => {
        const newItems = [...orderItems];
        if (key === 'clothTypeId') {
            const selectedClothType = clothTypes.find(ct => ct.id === value);
            newItems[index].rate = selectedClothType ? selectedClothType.rate : 0;
        }
        newItems[index][key] = value;
        setOrderItems(newItems);
    };

    const removeOrderItem = (index) => {
        const newItems = [...orderItems];
        newItems.splice(index, 1);
        setOrderItems(newItems);
    };

    const handleSaveOrder = async () => {
        if (!selectedCustomer || orderItems.length === 0) {
            Alert.alert('Validation Error', 'Please select a customer and add at least one item.');
            return;
        }

        try {
            await addDoc(collection(db, 'orders'), {
                customer: doc(db, 'customers', selectedCustomer),
                items: orderItems,
                total,
                status: 'Pending', // or some default status
                createdAt: serverTimestamp(),
            });
            router.back();
        } catch (error) {
            console.error('Error saving order: ', error);
            Alert.alert('Error', 'Could not save the order.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#007bff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Order</Text>
            </View>
            <View style={styles.form}>
                <Text style={styles.label}>Customer</Text>
                <Picker
                    selectedValue={selectedCustomer}
                    onValueChange={(itemValue) => setSelectedCustomer(itemValue)}
                    style={styles.picker}
                >
                     <Picker.Item label="Select a customer" value={null} />
                    {customers.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                </Picker>

                <Text style={styles.label}>Order Items</Text>
                <FlatList
                    data={orderItems}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item, index }) => (
                        <View style={styles.itemRow}>
                            <Picker
                                selectedValue={item.clothTypeId}
                                onValueChange={(val) => updateOrderItem(index, 'clothTypeId', val)}
                                style={styles.itemPicker}
                            >
                                <Picker.Item label="Select Cloth Type" value="" />
                                {clothTypes.map(ct => <Picker.Item key={ct.id} label={ct.name} value={ct.id} />)}
                            </Picker>
                             <TextInput
                                style={styles.quantityInput}
                                value={String(item.quantity)}
                                onChangeText={(val) => updateOrderItem(index, 'quantity', parseInt(val) || 1)}
                                keyboardType="numeric"
                            />
                            <Text style={styles.rateText}>${(item.rate * item.quantity).toFixed(2)}</Text>
                            <TouchableOpacity onPress={() => removeOrderItem(index)}>
                                <MaterialCommunityIcons name="delete" size={24} color="#dc3545" />
                            </TouchableOpacity>
                        </View>
                    )}
                />
                <TouchableOpacity onPress={addOrderItem} style={styles.addItemButton}>
                     <MaterialCommunityIcons name="plus" size={20} color="#007bff" />
                    <Text style={styles.addItemButtonText}>Add Item</Text>
                </TouchableOpacity>
                
                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
                </View>

                <Button title="Save Order" onPress={handleSaveOrder} />
            </View>
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
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 20,
    },
    backButton: {
      // styles for back button
    },
    form: {
        padding: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 10,
        color: '#495057'
    },
    picker: {
        height: 50,
        width: '100%',
        marginBottom: 20,
        backgroundColor: '#fff'
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        justifyContent: 'space-between',
    },
    itemPicker: {
        height: 50,
        flex: 0.5,
    },
    quantityInput: {
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 5,
        padding: 10,
        width: 60,
        textAlign: 'center',
    },
    rateText: {
        fontSize: 16,
        fontWeight: '500'
    },
    addItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#e7f5ff',
        borderRadius: 5,
        alignSelf: 'flex-start',
        marginVertical: 10,
    },
    addItemButtonText: {
        marginLeft: 5,
        color: '#007bff',
        fontWeight: 'bold',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#dee2e6',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#28a745',
        marginLeft: 10,
    },
});

export default NewOrderScreen;
