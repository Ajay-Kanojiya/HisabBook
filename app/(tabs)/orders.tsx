import { auth, db } from '@/config/firebase';
import { logActivity } from '@/utils/logActivity';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

const OrdersScreen = () => {
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const fetchOrders = async () => {
                if (!user) {
                    if (isActive) setLoading(false);
                    return;
                }
                setLoading(true);
                try {
                    const ordersCollection = collection(db, 'orders');
                    const q = query(ordersCollection, where("userEmail", "==", user.email), orderBy("lastModified", "desc"));
                    const ordersSnapshot = await getDocs(q);

                    const ordersList = await Promise.all(ordersSnapshot.docs.map(async (orderDoc) => {
                        const orderData = orderDoc.data();
                        let customerName = 'N/A';
                        if (orderData.customerId) {
                            const customerRef = doc(db, "customers", orderData.customerId);
                            const customerSnap = await getDoc(customerRef);
                            if (customerSnap.exists()) {
                                customerName = customerSnap.data().name;
                            }
                        }
                        return {
                            ...orderData,
                            id: orderDoc.id,
                            customerName,
                        };
                    }));

                    if (isActive) {
                        setOrders(ordersList);
                    }
                } catch (error) {
                    console.error("Error fetching orders: ", error);
                    if (isActive) {
                        Alert.alert("Error", "Could not fetch orders. Make sure you have created the necessary Firestore indexes.");
                    }
                } finally {
                    if (isActive) {
                        setLoading(false);
                    }
                }
            };

            fetchOrders();

            return () => {
                isActive = false;
            };
        }, [user])
    );

    const handleDelete = (orderToDelete) => {
        Alert.alert(
            "Delete Order",
            "Are you sure you want to delete this order?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "orders", orderToDelete.id));
                            await logActivity('order_deleted', { documentId: orderToDelete.id, customerName: orderToDelete.customerName });
                            setOrders(prevOrders => prevOrders.filter(order => order.id !== orderToDelete.id));
                        } catch (error) {
                            console.error("Error deleting document: ", error);
                            Alert.alert("Error", "Could not delete order.");
                        }
                    },
                },
            ]
        );
    };
    
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };


    const filteredOrders = useMemo(() => {
        return orders.filter(order =>
            (order.customerName?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (order.id?.toLowerCase() || '').includes(search.toLowerCase())
        );
    }, [orders, search]);

    const renderItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <TouchableOpacity style={{flex: 1}} onPress={() => router.push(`/order/${item.id}`)}>
                <View style={styles.itemContent}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="receipt" size={styles.iconSize} color="#007bff" />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.customerName}</Text>
                        <Text style={styles.itemSubtitle}>Order #{item.id ? item.id.substring(0, 6) : ''} · {item.items ? item.items.length : 0} items</Text>
                    </View>
                    <View style={styles.itemRight}>
                        <Text style={styles.itemTotal}>₹{item.total ? item.total.toFixed(2) : '0.00'}</Text>
                        <Text style={styles.itemDate}>{formatDate(item.lastModified)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
            <View style={styles.actionsContainer}>
                <TouchableOpacity onPress={() => router.push(`/edit-order/${item.id}`)} style={styles.actionButton}>
                    <MaterialCommunityIcons name="pencil" size={styles.iconSize} color="#007bff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
                    <MaterialCommunityIcons name="delete" size={styles.iconSize} color="#dc3545" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
            </View>

            <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={styles.searchIconSize} color="#888" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by customer or #"
                    placeholderTextColor="#888"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }}/>
            ) : (
                <FlatList
                    data={filteredOrders}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                />
            )}
            
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/new-order')}>
                <MaterialCommunityIcons name="plus" size={styles.addButtonIconSize} color="white" />
            </TouchableOpacity>
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
            paddingTop: responsiveSize(50), 
            paddingBottom: responsiveSize(15), 
            paddingHorizontal: responsiveSize(20), 
            backgroundColor: '#ffffff', 
        },
        headerTitle: {
            fontSize: responsiveSize(24),
            fontWeight: 'bold',
            color: '#000',
        },
        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f0f0f0',
            borderRadius: responsiveSize(10),
            marginHorizontal: responsiveSize(20),
            paddingHorizontal: responsiveSize(15),
            marginBottom: responsiveSize(10),
        },
        searchIcon: {
            marginRight: responsiveSize(10),
        },
        searchInput: {
            flex: 1,
            height: responsiveSize(45),
            fontSize: responsiveSize(16),
            color: '#000',
        },
        listContainer: {
            paddingHorizontal: responsiveSize(20),
        },
        itemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: responsiveSize(15),
            borderBottomWidth: 1,
            borderBottomColor: '#f0f0f0',
            justifyContent: 'space-between',
        },
        itemContent: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        iconContainer: {
            width: responsiveSize(40),
            height: responsiveSize(40),
            borderRadius: responsiveSize(20),
            backgroundColor: '#e7f5ff',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: responsiveSize(15),
        },
        itemInfo: {
            flex: 1,
        },
        itemName: {
            fontSize: responsiveSize(16),
            fontWeight: '600',
            color: '#000',
        },
        itemSubtitle: {
            fontSize: responsiveSize(14),
            color: '#6c757d',
            marginTop: responsiveSize(2),
        },
        itemRight: {
            alignItems: 'flex-end',
            marginRight: responsiveSize(10),
        },
        itemTotal: {
            fontSize: responsiveSize(16),
            fontWeight: 'bold',
            color: '#000',
        },
        itemDate: {
            fontSize: responsiveSize(12),
            color: '#6c757d',
            marginTop: responsiveSize(2),
        },
        actionsContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        actionButton: {
            padding: responsiveSize(5),
            marginLeft: responsiveSize(10),
        },
        addButton: {
            position: 'absolute',
            bottom: responsiveSize(30),
            right: responsiveSize(30),
            backgroundColor: '#007bff',
            width: responsiveSize(60),
            height: responsiveSize(60),
            borderRadius: responsiveSize(30),
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
        },
        iconSize: responsiveSize(22),
        searchIconSize: responsiveSize(20),
        addButtonIconSize: responsiveSize(30),
    });
};

export default OrdersScreen;
