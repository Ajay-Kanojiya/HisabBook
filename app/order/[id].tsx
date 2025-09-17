import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, Picker } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, deleteDoc, getDocFromCache } from 'firebase/firestore';
import { db } from '../../config/firebase'; // Adjust path
import { MaterialCommunityIcons } from '@expo/vector-icons';

const OrderDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [order, setOrder] = useState(null);
    const [customerName, setCustomerName] = useState('');

    useEffect(() => {
        if (!id) return;
        const fetchOrder = async () => {
            const orderDocRef = doc(db, 'orders', id as string);
            const orderDocSnap = await getDoc(orderDocRef);

            if (orderDocSnap.exists()) {
                const orderData = { ...orderDocSnap.data(), id: orderDocSnap.id };
                setOrder(orderData);

                if (orderData.customer && orderData.customer.path) {
                    const customerDocRef = orderData.customer;
                    const customerDocSnap = await getDoc(customerDocRef);
                    if (customerDocSnap.exists()) {
                        setCustomerName(customerDocSnap.data().name);
                    }
                }
            } else {
                Alert.alert('Error', 'Order not found.');
                router.back();
            }
        };

        fetchOrder();
    }, [id]);

    const handleStatusChange = async (newStatus) => {
        const orderDocRef = doc(db, 'orders', id as string);
        try {
            await updateDoc(orderDocRef, { status: newStatus });
            setOrder({ ...order, status: newStatus });
            Alert.alert('Success', `Order status updated to ${newStatus}`);
        } catch (error) {
            console.error('Error updating order status: ', error);
            Alert.alert('Error', 'Could not update order status.');
        }
    };
    
    const handleDelete = () => {
        Alert.alert(
            "Delete Order",
            "Are you sure you want to delete this order?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "OK", 
                    onPress: async () => {
                         try {
                            await deleteDoc(doc(db, 'orders', id as string));
                            router.back();
                        } catch (error) {
                            console.error('Error deleting order: ', error);
                            Alert.alert('Error', 'There was an error deleting the order.');
                        }
                    }
                }
            ]
        );
    };

    if (!order) {
        return <SafeAreaView style={styles.container}><Text>Loading...</Text></SafeAreaView>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#007bff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order Details</Text>
                 <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                    <MaterialCommunityIcons name="delete" size={24} color="#dc3545" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Customer</Text>
                    <Text style={styles.sectionContent}>{customerName}</Text>
                </View>

                <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Status</Text>
                    <Picker
                        selectedValue={order.status}
                        onValueChange={(itemValue) => handleStatusChange(itemValue)}
                        style={styles.statusPicker}
                    >
                        <Picker.Item label="Pending" value="Pending" />
                        <Picker.Item label="Paid" value="Paid" />
                        <Picker.Item label="Unpaid" value="Unpaid" />
                    </Picker>
                </View>

                <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    <FlatList
                        data={order.items}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.itemRow}>
                                <Text>{item.clothTypeId}</Text>{/* Replace with actual cloth type name */}
                                <Text>x {item.quantity}</Text>
                                <Text>${(item.rate * item.quantity).toFixed(2)}</Text>
                            </View>
                        )}
                    />
                </View>

                <View style={[styles.detailSection, styles.totalSection]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>${order.total.toFixed(2)}</Text>
                </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    backButton: {},
    deleteButton: {},
    content: {
        padding: 20,
    },
    detailSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#495057',
        marginBottom: 10,
    },
    sectionContent: {
        fontSize: 16,
    },
    statusPicker: {
        height: 50,
        width: '100%',
        backgroundColor: '#fff'
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#dee2e6',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalAmount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#28a745',
    },
});

export default OrderDetailScreen;
