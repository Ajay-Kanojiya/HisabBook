import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, useWindowDimensions, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const OrderDetailsScreen = () => {
    const { id } = useLocalSearchParams();
    const [order, setOrder] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const fetchOrderDetails = async () => {
        setLoading(true);
        try {
            const orderRef = doc(db, 'orders', id as string);
            const orderSnap = await getDoc(orderRef);

            if (orderSnap.exists()) {
                const orderData = orderSnap.data();

                if (orderData.customerId) {
                    const customerRef = doc(db, "customers", orderData.customerId);
                    const customerSnap = await getDoc(customerRef);
                    if (customerSnap.exists()) {
                        setCustomer(customerSnap.data());
                    }
                }

                const itemsWithClothTypeNames = await Promise.all(orderData.items.map(async (item) => {
                    if (item.clothTypeId) {
                        const clothTypeRef = doc(db, "cloth-types", item.clothTypeId);
                        const clothTypeSnap = await getDoc(clothTypeRef);
                        if (clothTypeSnap.exists()) {
                            const clothTypeData = clothTypeSnap.data();
                            return { 
                                ...item, 
                                clothTypeName: clothTypeData.name,
                                rate: clothTypeData.price
                            };
                        }
                    }
                    return item;
                }));

                setOrder({ ...orderData, id: orderSnap.id, items: itemsWithClothTypeNames });

            } else {
                Alert.alert("Error", "Order not found.");
                router.back();
            }
        } catch (error) {
            console.error("Error fetching order details: ", error);
            Alert.alert("Error", "Could not fetch order details.");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (id) {
                fetchOrderDetails();
            }
        }, [id])
    );
    
    const handleDelete = () => {
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
                            await deleteDoc(doc(db, "orders", id as string));
                            Alert.alert("Success", "Order deleted successfully.");
                            router.replace('/(tabs)/orders');
                        } catch (error) {
                            console.error("Error deleting document: ", error);
                            Alert.alert("Error", "Could not delete order.");
                        }
                    },
                },
            ]
        );
    };
    
    if (loading) {
        return <ActivityIndicator size="large" color="#007bff" style={{ flex: 1, justifyContent: 'center' }} />;
    }

    if (!order) {
        return (
            <View style={styles.container}>
                <Text>Order not found.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={styles.headerIconSize} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order #{order.id.substring(0, 5)}</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => router.push(`/edit-order/${id}`)} style={{marginRight: 15}}>
                        <MaterialCommunityIcons name="pencil-outline" size={styles.headerIconSize} color="#007bff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete}>
                        <MaterialCommunityIcons name="trash-can-outline" size={styles.headerIconSize} color="#dc3545" />
                    </TouchableOpacity>
                </View>
            </View>
            
            <View style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Customer Details</Text>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Name:</Text> {customer?.name}</Text>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Address:</Text> {customer?.address}</Text>
                    <Text style={styles.detailText}><Text style={styles.detailLabel}>Phone:</Text> {customer?.phone}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    {order.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <Text style={styles.itemName}>{item.quantity || 0} x {item.clothTypeName || 'Unknown'} x ₹{(item.rate || 0).toFixed(2)} each</Text>
                            <Text style={styles.itemTotal}>₹{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalAmount}>₹{(order.total || 0).toFixed(2)}</Text>
                </View>
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
        headerActions: {
            flexDirection: 'row',
        },
        content: {
            padding: responsiveSize(20),
        },
        section: {
            marginBottom: responsiveSize(25),
        },
        sectionTitle: {
            fontSize: responsiveSize(18),
            fontWeight: 'bold',
            marginBottom: responsiveSize(15),
            color: '#333',
        },
        detailText: {
            fontSize: responsiveSize(16),
            marginBottom: responsiveSize(8),
            color: '#555',
        },
        detailLabel: {
            fontWeight: 'bold',
        },
        itemRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: responsiveSize(10),
            borderBottomWidth: 1,
            borderBottomColor: '#f0f0f0',
        },
        itemName: {
            fontSize: responsiveSize(16),
            color: '#333',
            flex: 1,
            marginRight: 10
        },
        itemTotal: {
            fontSize: responsiveSize(16),
            fontWeight: '500',
            color: '#333',
        },
        totalContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: responsiveSize(20),
            paddingTop: responsiveSize(20),
            borderTopWidth: 2,
            borderTopColor: '#000',
        },
        totalLabel: {
            fontSize: responsiveSize(18),
            fontWeight: 'bold',
            color: '#000',
        },
        totalAmount: {
            fontSize: responsiveSize(22),
            fontWeight: 'bold',
            color: '#007bff',
        },
        headerIconSize: responsiveSize(24),
    });
}

export default OrderDetailsScreen;
