import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, useWindowDimensions, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { logActivity } from '../utils/logActivity';

const EditOrderScreen = () => {
    const { id } = useLocalSearchParams();
    const [customer, setCustomer] = useState('');
    const [customers, setCustomers] = useState([]);
    const [items, setItems] = useState([{ clothTypeId: '', quantity: '', price: 0, totalPrice: 0 }]);
    const [clothTypes, setClothTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [originalOrder, setOriginalOrder] = useState(null);
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const fetchOrderAndDependencies = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Fetch order
            const orderDocRef = doc(db, 'orders', id as string);
            const orderDocSnap = await getDoc(orderDocRef);

            if (!orderDocSnap.exists()) {
                Alert.alert('Error', 'Order not found.');
                router.back();
                return;
            }
            const orderData = orderDocSnap.data();
            setOriginalOrder(orderData);
            setCustomer(orderData.customerId);
            setItems(orderData.items.map(item => ({ ...item, quantity: item.quantity.toString() })));

            // Fetch customers
            const customersQuery = query(collection(db, 'customers'));
            const customersSnapshot = await getDocs(customersQuery);
            const customersList = customersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setCustomers(customersList);

            // Fetch cloth types
            const clothTypesQuery = query(collection(db, 'cloth-types'));
            const clothTypesSnapshot = await getDocs(clothTypesQuery);
            const clothTypesList = clothTypesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setClothTypes(clothTypesList);

        } catch (error) {
            console.error("Error fetching order and dependencies: ", error);
            Alert.alert('Error', 'Could not fetch order data.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(fetchOrderAndDependencies);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        const currentItem = { ...newItems[index] };
        currentItem[field] = value;

        if (field === 'clothTypeId') {
            const selectedClothType = clothTypes.find(ct => ct.id === value);
            currentItem.price = selectedClothType ? selectedClothType.price : 0;
        }

        const quantity = parseFloat(currentItem.quantity);
        currentItem.totalPrice = isNaN(quantity) || quantity <= 0 ? 0 : quantity * currentItem.price;
        
        newItems[index] = currentItem;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { clothTypeId: '', quantity: '', price: 0, totalPrice: 0 }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        } else {
            Alert.alert("Cannot Remove", "You must have at least one item in the order.");
        }
    };

    const handleUpdate = async () => {
        if (!customer || items.some(item => !item.clothTypeId || !item.quantity || parseFloat(item.quantity) <= 0)) {
            Alert.alert('Invalid Input', 'Please select a customer and ensure all items have a cloth type and a valid quantity.');
            return;
        }
        if (!user) {
            Alert.alert('Authentication Error', 'You must be logged in to update an order.');
            return;
        }

        const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

        try {
            const orderDocRef = doc(db, 'orders', id as string);
            await updateDoc(orderDocRef, {
                customerId: customer,
                items: items.map(item => ({
                    clothTypeId: item.clothTypeId,
                    quantity: parseFloat(item.quantity) || 0,
                    price: item.price,
                    totalPrice: item.totalPrice
                })),
                total,
            });

            await logActivity('order_updated', user.email, id as string, { total });
            Alert.alert('Success', 'Order updated successfully.');
            router.replace('/(tabs)/orders');
        } catch (error) {
            console.error("Error updating document: ", error);
            Alert.alert('Update Error', `Could not update the order. ${error.message}`);
        }
    };

    const handleDelete = async () => {
        if (!user) {
            Alert.alert('Authentication Error', 'You must be logged in to delete an order.');
            return;
        }

        Alert.alert(
            "Delete Order",
            "Are you sure you want to delete this order? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const orderDocRef = doc(db, 'orders', id as string);
                            await deleteDoc(orderDocRef);
                            await logActivity('order_deleted', user.email, id as string, { total: originalOrder.total });
                            Alert.alert('Success', 'Order deleted successfully.');
                            router.replace('/(tabs)/orders');
                        } catch (error) {
                            console.error("Error deleting document: ", error);
                            Alert.alert('Delete Error', `Could not delete the order. ${error.message}`);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#007bff" style={{flex: 1, justifyContent: 'center'}} />;
    }

    return (
        <View style={styles.container}>
             <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={styles.headerIconSize} color="#343a40" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Order</Text>
                    <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                        <MaterialCommunityIcons name="delete-outline" size={styles.headerIconSize} color="#dc3545" />
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Customer</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={customer}
                            onValueChange={(itemValue) => setCustomer(itemValue)}
                            style={styles.picker}
                            enabled={false} // Disable customer editing
                        >
                            <Picker.Item label="Select a customer" value="" />
                            {customers.map((c) => (
                                <Picker.Item key={c.id} label={c.name} value={c.id} />
                            ))}
                        </Picker>
                    </View>

                    <Text style={styles.itemsHeader}>Items</Text>

                    {items.map((item, index) => (
                        <View key={index} style={styles.itemCard}>
                            <View style={styles.itemRow}>
                                <View style={styles.itemPickerWrapper}>
                                    <Picker
                                        selectedValue={item.clothTypeId}
                                        onValueChange={(value) => handleItemChange(index, 'clothTypeId', value)}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Select Cloth" value="" />
                                        {clothTypes.map((ct) => (
                                            <Picker.Item key={ct.id} label={ct.name} value={ct.id} />
                                        ))}
                                    </Picker>
                                </View>
                                <TextInput
                                    style={styles.quantityInput}
                                    value={item.quantity}
                                    onChangeText={(value) => handleItemChange(index, 'quantity', value)}
                                    keyboardType="numeric"
                                    placeholder="Quantity"
                                    placeholderTextColor="#adb5bd"
                                />
                            </View>
                            <View style={styles.itemFooter}>
                                <Text style={styles.priceText}>Price/Item: <Text style={styles.priceValue}>₹{item.totalPrice.toFixed(2)}</Text></Text>
                                <TouchableOpacity onPress={() => removeItem(index)}>
                                    <MaterialCommunityIcons name="delete" size={styles.iconSize} color="#dc3545" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
                        <Text style={styles.addItemText}>+ Add Item</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
                    <Text style={styles.saveButtonText}>Update Order</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const getStyles = (width) => {
    const baseWidth = 390;
    const scale = width / baseWidth;
    const responsiveSize = (size) => Math.max(Math.round(size * scale), size * 0.5);

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#F4F7FC',
        },
        scrollContainer: {
            flexGrow: 1,
            paddingBottom: responsiveSize(100),
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: responsiveSize(50),
            paddingBottom: responsiveSize(15),
            paddingHorizontal: responsiveSize(15),
            backgroundColor: '#FFFFFF',
        },
        backButton: {
             padding: responsiveSize(5),
        },
        deleteButton: {
            padding: responsiveSize(5),
        },
        headerTitle: {
            fontSize: responsiveSize(20),
            fontWeight: 'bold',
            color: '#343a40',
        },
        headerIconSize: responsiveSize(24),
        form: {
            padding: responsiveSize(20),
        },
        label: {
            fontSize: responsiveSize(14),
            color: '#6c757d',
            marginBottom: responsiveSize(8),
            fontWeight: '500',
        },
        pickerWrapper: {
            backgroundColor: '#FFFFFF',
            borderRadius: responsiveSize(8),
            borderWidth: 1,
            borderColor: '#dee2e6',
            justifyContent: 'center',
            marginBottom: responsiveSize(25),
            height: responsiveSize(50),
        },
        picker: {
            width: '100%',
            color: '#343a40',
        },
        itemsHeader: {
            fontSize: responsiveSize(18),
            fontWeight: 'bold',
            color: '#343a40',
            marginBottom: responsiveSize(10),
        },
        itemCard: {
            backgroundColor: '#FFFFFF',
            borderRadius: responsiveSize(10),
            borderWidth: 1,
            borderColor: '#E9ECEF',
            padding: responsiveSize(15),
            marginBottom: responsiveSize(15),
        },
        itemRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: responsiveSize(10),
        },
        itemPickerWrapper: {
            flex: 2,
            backgroundColor: '#FFFFFF',
            borderRadius: responsiveSize(8),
            borderWidth: 1,
            borderColor: '#dee2e6',
            marginRight: responsiveSize(10),
            justifyContent: 'center',
            height: responsiveSize(50),
        },
        quantityInput: {
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: responsiveSize(8),
            borderWidth: 1,
            borderColor: '#dee2e6',
            paddingHorizontal: responsiveSize(10),
            height: responsiveSize(50),
            fontSize: responsiveSize(16),
            fontWeight: '500',
            textAlign: 'center',
            color: '#343a40',
        },
        itemFooter: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: responsiveSize(5),
            marginTop: responsiveSize(10),
        },
        priceText: {
            fontSize: responsiveSize(14),
            color: '#6c757d',
            fontWeight: '500',
        },
        priceValue: {
            fontWeight: 'bold',
            color: '#495057',
        },
        iconSize: responsiveSize(22),
        addItemButton: {
            borderWidth: 1.5,
            borderColor: '#4285F4',
            borderStyle: 'dashed',
            borderRadius: responsiveSize(10),
            padding: responsiveSize(15),
            alignItems: 'center',
            marginTop: responsiveSize(10),
        },
        addItemText: {
            color: '#4285F4',
            fontSize: responsiveSize(16),
            fontWeight: 'bold',
        },
        footer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: responsiveSize(20),
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E9ECEF',
        },
        saveButton: {
            backgroundColor: '#4285F4',
            padding: responsiveSize(16),
            borderRadius: responsiveSize(10),
            alignItems: 'center',
        },
        saveButtonText: {
            color: 'white',
            fontSize: responsiveSize(18),
            fontWeight: 'bold',
        },
    });
}

export default EditOrderScreen;
