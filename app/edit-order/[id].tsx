import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, useWindowDimensions, ScrollView } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const EditOrderScreen = () => {
    const { id } = useLocalSearchParams();
    const [customer, setCustomer] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [items, setItems] = useState([{ clothTypeId: null, quantity: '1', rate: 0 }]);
    const [clothTypes, setClothTypes] = useState([]);
    const [total, setTotal] = useState(0);
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const fetchOrderAndInitialData = async () => {
        if (!user) {
            console.log("EditOrderScreen: No user found.");
            return;
        }

        try {
            // Fetch customers and cloth types
            const customersQuery = query(collection(db, 'customers'), where("userEmail", "==", user.email));
            const customersSnapshot = await getDocs(customersQuery);
            const customersList = customersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setCustomers(customersList);

            const clothTypesQuery = query(collection(db, 'cloth-types'), where("userEmail", "==", user.email));
            const clothTypesSnapshot = await getDocs(clothTypesQuery);
            const clothTypesList = clothTypesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setClothTypes(clothTypesList);

            // Fetch the specific order to edit
            if (id) {
                const orderRef = doc(db, 'orders', id);
                const orderSnap = await getDoc(orderRef);
                if (orderSnap.exists()) {
                    const orderData = orderSnap.data();
                    setCustomer(orderData.customerId);
                    setItems(orderData.items.map(item => ({...item, quantity: item.quantity.toString()})) || []);
                } else {
                    Alert.alert("Error", "Order not found.");
                    router.back();
                }
            }
        } catch (error) {
            console.error("Error fetching data: ", error);
            Alert.alert("Data Fetch Error", `Could not fetch initial data. Please check your connection and Firestore indexes. Details: ${error.message}`);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchOrderAndInitialData();
        }, [user, id])
    );

    useEffect(() => {
        const calculateTotal = () => {
            const newTotal = items.reduce((sum, item) => {
                const quantity = parseInt(item.quantity, 10) || 0;
                return sum + (quantity * item.rate);
            }, 0);
            setTotal(newTotal);
        };
        calculateTotal();
    }, [items]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === 'clothTypeId') {
            const selectedClothType = clothTypes.find(ct => ct.id === value);
            newItems[index]['rate'] = selectedClothType ? selectedClothType.rate : 0;
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { clothTypeId: null, quantity: '1', rate: 0 }]);
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!customer || items.some(item => !item.clothTypeId || !item.quantity)) {
            Alert.alert('Error', 'Please select a customer and fill in all item details.');
            return;
        }
        if (!user) {
            Alert.alert('Error', 'You must be logged in to update an order.');
            return;
        }

        try {
            const orderRef = doc(db, 'orders', id);
            await updateDoc(orderRef, {
                customerId: customer,
                items: items.map(item => ({...item, quantity: parseInt(item.quantity, 10)})),
                total: total,
                lastModified: serverTimestamp(),
            });
            Alert.alert('Success', 'Order updated successfully.');
            router.replace('/(tabs)/orders');
        } catch (error) {
            console.error("Error updating document: ", error);
            Alert.alert('Error', `Could not update order. ${error.message}`);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={styles.headerIconSize} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Order</Text>
                <View style={{width: styles.headerIconSize}}/>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Customer</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={customer}
                        onValueChange={(itemValue) => setCustomer(itemValue)}
                        style={styles.picker}
                        enabled={false} // Disable customer editing for now
                    >
                        <Picker.Item label="Select a customer" value={null} />
                        {customers.map((c) => (
                            <Picker.Item key={c.id} label={c.name} value={c.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Items</Text>
                {items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                        <View style={styles.itemPickerContainer}>
                            <Picker
                                selectedValue={item.clothTypeId}
                                onValueChange={(value) => handleItemChange(index, 'clothTypeId', value)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Select Item" value={null} />
                                {clothTypes.map((ct) => (
                                    <Picker.Item key={ct.id} label={`${ct.name} (@ $${ct.rate})`} value={ct.id} />
                                ))}
                            </Picker>
                        </View>
                        <TextInput
                            style={styles.quantityInput}
                            value={item.quantity}
                            onChangeText={(value) => handleItemChange(index, 'quantity', value)}
                            keyboardType="numeric"
                            placeholder="Qty"
                        />
                        <TouchableOpacity onPress={() => removeItem(index)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={styles.iconSize} color="#dc3545" />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
                    <MaterialCommunityIcons name="plus" size={styles.plusIconSize} color="#007bff" />
                    <Text style={styles.addItemText}>Add Item</Text>
                </TouchableOpacity>

                <View style={styles.totalContainer}>
                    <Text style={styles.totalText}>Total:</Text>
                    <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Update Order</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
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
        pickerContainer: {
            backgroundColor: '#f0f0f0',
            borderRadius: responsiveSize(10),
            marginBottom: responsiveSize(20),
            borderWidth: 1,
            borderColor: '#ddd',
        },
        picker: {
            height: responsiveSize(50),
        },
        itemRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: responsiveSize(15),
        },
        itemPickerContainer: {
            flex: 1,
            backgroundColor: '#f0f0f0',
            borderRadius: responsiveSize(10),
            marginRight: responsiveSize(10),
            borderWidth: 1,
            borderColor: '#ddd',
        },
        quantityInput: {
            backgroundColor: '#f0f0f0',
            paddingHorizontal: responsiveSize(15),
            paddingVertical: responsiveSize(12),
            borderRadius: responsiveSize(10),
            width: responsiveSize(70),
            fontSize: responsiveSize(16),
            textAlign: 'center',
            marginRight: responsiveSize(10),
            borderWidth: 1,
            borderColor: '#ddd',
        },
        addItemButton: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: responsiveSize(10),
            backgroundColor: '#e7f5ff',
            borderRadius: responsiveSize(8),
            alignSelf: 'flex-start',
            marginVertical: responsiveSize(10),
        },
        addItemText: {
            color: '#007bff',
            fontSize: responsiveSize(16),
            fontWeight: 'bold',
            marginLeft: responsiveSize(5),
        },
        totalContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: responsiveSize(20),
            paddingTop: responsiveSize(20),
            borderTopWidth: 1,
            borderTopColor: '#f0f0f0',
        },
        totalText: {
            fontSize: responsiveSize(18),
            fontWeight: 'bold',
        },
        totalAmount: {
            fontSize: responsiveSize(22),
            fontWeight: 'bold',
            color: '#007bff',
        },
        saveButton: {
            backgroundColor: '#007bff',
            padding: responsiveSize(15),
            borderRadius: responsiveSize(10),
            alignItems: 'center',
            marginTop: responsiveSize(30),
        },
        saveButtonText: {
            color: 'white',
            fontSize: responsiveSize(16),
            fontWeight: 'bold',
        },
        headerIconSize: responsiveSize(24),
        iconSize: responsiveSize(24),
        plusIconSize: responsiveSize(22),
    });
}

export default EditOrderScreen;
