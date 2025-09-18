import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const HomeScreen = () => {
    const [stats, setStats] = useState({ totalCustomers: 0, totalPaid: 0, totalPending: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch Customers
            const customersQuery = query(collection(db, 'customers'), where("userEmail", "==", user.email));
            const customersSnapshot = await getDocs(customersQuery);
            const totalCustomers = customersSnapshot.size;

            // Fetch Bills
            const billsQuery = query(collection(db, 'bills'), where("userEmail", "==", user.email));
            const billsSnapshot = await getDocs(billsQuery);
            let totalPaid = 0;
            let totalPending = 0;
            billsSnapshot.forEach(doc => {
                const bill = doc.data();
                if (bill.status === 'Paid') {
                    totalPaid += bill.total;
                } else {
                    totalPending += bill.total;
                }
            });

            setStats({ totalCustomers, totalPaid, totalPending });

            // Fetch Recent Activity
            const recentCustomersQuery = query(collection(db, 'customers'), where("userEmail", "==", user.email), orderBy('createdAt', 'desc'), limit(3));
            const recentOrdersQuery = query(collection(db, 'orders'), where("userEmail", "==", user.email), orderBy('createdAt', 'desc'), limit(3));
            
            const [customersActivity, ordersActivity] = await Promise.all([
                getDocs(recentCustomersQuery),
                getDocs(recentOrdersQuery)
            ]);

            const combinedActivity = [];
            customersActivity.forEach(doc => combinedActivity.push({ type: 'customer', ...doc.data(), id: doc.id, date: doc.data().createdAt.toDate() }));
            ordersActivity.forEach(doc => combinedActivity.push({ type: 'order', ...doc.data(), id: doc.id, date: doc.data().createdAt.toDate() }));
            
            combinedActivity.sort((a, b) => b.date - a.date);
            setRecentActivity(combinedActivity.slice(0, 5));

        } catch (error) {
            console.error("Error fetching data for home screen: ", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user])
    );

    const renderActivityItem = (item) => {
        if (item.type === 'customer') {
            return (
                <View style={styles.activityItem} key={item.id}>
                    <MaterialCommunityIcons name="account-plus-outline" size={24} color="#007bff" />
                    <View style={styles.activityTextContainer}>
                        <Text style={styles.activityTitle}>New Customer Added</Text>
                        <Text style={styles.activitySubtitle}>{item.name}</Text>
                    </View>
                    <Text style={styles.activityTime}>{item.date.toLocaleDateString()}</Text>
                </View>
            );
        }
        if (item.type === 'order') {
            return (
                <View style={styles.activityItem} key={item.id}>
                    <MaterialCommunityIcons name="cart-plus" size={24} color="#28a745" />
                    <View style={styles.activityTextContainer}>
                        <Text style={styles.activityTitle}>New Order Created</Text>
                        <Text style={styles.activitySubtitle}>Order #{item.id.substring(0, 6)}</Text>
                    </View>
                    <Text style={styles.activityAmount}>₹{item.total.toFixed(2)}</Text>
                </View>
            );
        }
        return null;
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#007bff" style={{flex: 1, justifyContent: 'center'}} />;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Home</Text>
            </View>

            <View style={styles.statsContainer}>
                <StatCard icon="account-group-outline" title="Total Customers" value={stats.totalCustomers} color="#007bff" />
                <StatCard icon="cash-check" title="Total Amount Paid" value={`₹${stats.totalPaid.toFixed(2)}`} color="#28a745" />
                <StatCard icon="cash-clock" title="Total Pending Amount" value={`₹${stats.totalPending.toFixed(2)}`} color="#dc3545" />
            </View>

            <Text style={styles.recentActivityTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
                {recentActivity.map(renderActivityItem)}
            </View>
        </ScrollView>
    );
};

const StatCard = ({ icon, title, value, color }) => {
    const styles = getStyles(useWindowDimensions().width);
    return (
        <View style={[styles.statCard, { backgroundColor: `${color}20` }]}>
            <MaterialCommunityIcons name={icon} size={24} color={color} />
            <Text style={[styles.statTitle, {color}]}>{title}</Text>
            <Text style={[styles.statValue, {color}]}>{value}</Text>
        </View>
    );
}

const getStyles = (width) => {
    const scale = width / 375;
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: '#f0f4f8' },
        header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#f0f4f8' },
        headerTitle: { fontSize: 28, fontWeight: 'bold' },
        statsContainer: { paddingHorizontal: 20, marginTop: 10 },
        statCard: { borderRadius: 15, padding: 20, marginBottom: 15 },
        statTitle: { fontSize: 16, fontWeight: '500', marginTop: 5 },
        statValue: { fontSize: 28, fontWeight: 'bold', marginTop: 5 },
        recentActivityTitle: { fontSize: 22, fontWeight: 'bold', paddingHorizontal: 20, marginTop: 20 },
        activityList: { marginTop: 15, paddingHorizontal: 20 },
        activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2 },
        activityTextContainer: { flex: 1, marginLeft: 15 },
        activityTitle: { fontSize: 16, fontWeight: '600' },
        activitySubtitle: { color: 'gray' },
        activityTime: { color: 'gray' },
        activityAmount: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    });
}

export default HomeScreen;
