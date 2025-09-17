import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase'; // Adjust this path
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';

const OrdersScreen = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        const ordersCollectionRef = collection(db, 'orders');
        const unsubscribe = onSnapshot(ordersCollectionRef, async (snapshot) => {
            const ordersData = await Promise.all(snapshot.docs.map(async (doc) => {
                const order = { ...doc.data(), id: doc.id };
                // Assuming customer is a reference, fetch customer data
                if (order.customer && order.customer.path) {
                    const customerSnap = await getDoc(order.customer);
                    if (customerSnap.exists()) {
                        order.customerName = customerSnap.data().name;
                    }
                }
                return order;
            }));
            setOrders(ordersData);
            setFilteredOrders(ordersData);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const filtered = orders.filter(order =>
            (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            order.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredOrders(filtered);
    }, [searchQuery, orders]);

    const renderItem = ({ item }) => (
        <Link href={`/order/${item.id}`} asChild>
             <TouchableOpacity style={styles.itemContainer}>
                <View style={styles.itemInfo}>
                    <Text style={styles.orderId}>Order #{item.id}</Text>
                    <Text style={styles.customerName}>{item.customerName || 'N/A'}</Text>
                    <Text style={styles.itemCount}>{item.items.length} items</Text>
                </View>
                <View style={styles.itemRight}>
                     <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
                    <Text style={styles.orderDate}>{new Date(item.createdAt?.toDate()).toLocaleDateString()}</Text>
                </View>
            </TouchableOpacity>
        </Link>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Orders</Text>
            </View>
            <View style={styles.searchContainer}>
                 <MaterialCommunityIcons name="magnify" size={20} color="#6c757d" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by customer or order #"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            {/* Add filter dropdowns here */}
            <FlatList
                data={filteredOrders}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/new-order')}>
                <MaterialCommunityIcons name="plus" size={24} color="white" />
                <Text style={styles.addButtonText}>New Order</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        backgroundColor: 'white',
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e9ecef',
        borderRadius: 20,
        margin: 10,
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 5,
    },
    searchInput: {
        flex: 1,
        height: 40,
    },
    list: {
        paddingHorizontal: 10,
    },
    itemContainer: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    itemInfo: {
        // Styles for left side of the order item
    },
    orderId: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    customerName: {
        fontSize: 16,
        color: '#495057'
    },
    itemCount: {
        fontSize: 14,
        color: '#6c757d',
    },
    itemRight: {
        alignItems: 'flex-end',
    },
    orderTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007bff'
    },
    orderDate: {
        fontSize: 14,
        color: '#6c757d',
    },
    addButton: {
        backgroundColor: '#007bff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        marginHorizontal: 20,
        borderRadius: 10,
        marginBottom: 10,
    },
    addButtonText: {
        color: 'white',
        fontSize: 18,
        marginLeft: 10,
    },
});

export default OrdersScreen;
