import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase'; // Adjust path
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const HomeScreen = () => {
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [totalPending, setTotalPending] = useState(0);
    const [recentActivity, setRecentActivity] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const customersRef = collection(db, 'customers');
        const ordersRef = collection(db, 'orders');

        const unsubscribeCustomers = onSnapshot(customersRef, snapshot => {
            setTotalCustomers(snapshot.size);
        });

        const unsubscribeOrders = onSnapshot(query(ordersRef, orderBy('createdAt', 'desc')), snapshot => {
            let paid = 0;
            let pending = 0;
            const activities = [];

            snapshot.docs.forEach(doc => {
                const order = { ...doc.data(), id: doc.id };
                if (order.status === 'Paid') {
                    paid += order.total;
                } else {
                    pending += order.total;
                }
                if(activities.length < 5) { // Limit to 5 recent activities
                    activities.push({ 
                        type: 'New Order', 
                        description: `Order #${order.id.substring(0,5)}...`, 
                        amount: order.total,
                        timestamp: order.createdAt?.toDate()
                    });
                }
            });

            setTotalPaid(paid);
            setTotalPending(pending);
            setRecentActivity(activities);
        });

        return () => {
            unsubscribeCustomers();
            unsubscribeOrders();
        };
    }, []);

    const renderActivity = ({ item }) => (
        <View style={styles.activityItem}>
            <MaterialCommunityIcons name="cart" size={24} color="#007bff" />
            <View style={styles.activityInfo}>
                <Text style={styles.activityType}>{item.type}</Text>
                <Text style={styles.activityDesc}>{item.description}</Text>
            </View>
            <Text style={styles.activityAmount}>${item.amount.toFixed(2)}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Home</Text>
                <TouchableOpacity onPress={() => router.push('/new-order')} style={styles.addButton}>
                    <MaterialCommunityIcons name="plus" size={30} color="white" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <MaterialCommunityIcons name="account-group" size={30} color="#17a2b8" />
                    <Text style={styles.summaryLabel}>Total Customers</Text>
                    <Text style={styles.summaryValue}>{totalCustomers}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#d4edda' }]}>
                    <MaterialCommunityIcons name="cash-multiple" size={30} color="#28a745" />
                    <Text style={styles.summaryLabel}>Total Amount Paid</Text>
                    <Text style={styles.summaryValue}>${totalPaid.toFixed(2)}</Text>
                </View>
                 <View style={[styles.summaryCard, { backgroundColor: '#f8d7da' }]}>
                    <MaterialCommunityIcons name="cash-remove" size={30} color="#dc3545" />
                    <Text style={styles.summaryLabel}>Total Pending Amount</Text>
                    <Text style={styles.summaryValue}>${totalPending.toFixed(2)}</Text>
                </View>
            </View>

            <Text style={styles.recentActivityTitle}>Recent Activity</Text>
            <FlatList
                data={recentActivity}
                renderItem={renderActivity}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.activityList}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white' },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    addButton: { backgroundColor: '#007bff', borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    summaryContainer: { padding: 10 },
    summaryCard: { backgroundColor: '#e7f5ff', padding: 20, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
    summaryLabel: { fontSize: 16, color: '#495057', marginTop: 5 },
    summaryValue: { fontSize: 24, fontWeight: 'bold', marginTop: 5 },
    recentActivityTitle: { fontSize: 20, fontWeight: 'bold', paddingHorizontal: 20, marginTop: 10, marginBottom: 10 },
    activityList: { paddingHorizontal: 20 },
    activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10 },
    activityInfo: { flex: 1, marginLeft: 10 },
    activityType: { fontSize: 16, fontWeight: 'bold' },
    activityDesc: { color: 'gray' },
    activityAmount: { fontSize: 16, fontWeight: 'bold' }
});

export default HomeScreen;
