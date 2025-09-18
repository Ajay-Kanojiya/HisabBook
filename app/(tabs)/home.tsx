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

            // Fetch Recent Activity from 'activities' collection
            const activitiesQuery = query(collection(db, 'activities'), where("userEmail", "==", user.email), orderBy('createdAt', 'desc'), limit(10));
            const activitiesSnapshot = await getDocs(activitiesQuery);
            const activities = activitiesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    date: data.createdAt?.toDate() // handle case where createdAt is null
                };
            }).filter(activity => activity.date); // filter out activities without a date
            
            setRecentActivity(activities);

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
        if (!item || !item.type) {
            return null;
        }
        
        // Default values
        let icon = "alert-circle-outline";
        let iconColor = "#868e96";
        let title = "Unknown Activity";
        let subtitle = `Activity ID: ${item.id.substring(0,6)}`;
        let time = item.date ? item.date.toLocaleDateString() : "";
        let amount = "";

        switch (item.type) {
            case 'customer_created':
                icon = "account-plus-outline";
                iconColor = "#007bff";
                title = "New Customer Added";
                subtitle = item.details?.name || "N/A";
                break;
            case 'customer_updated':
                icon = "account-edit-outline";
                iconColor = "#fd7e14";
                title = "Customer Updated";
                subtitle = item.details?.name || "N/A";
                break;
            case 'customer_deleted':
                icon = "account-remove-outline";
                iconColor = "#dc3545";
                title = "Customer Removed";
                subtitle = item.details?.name || "N/A";
                break;
            case 'order_created':
                icon = "cart-plus";
                iconColor = "#28a745";
                title = "New Order Created";
                subtitle = `Order #${item.docId.substring(0, 6)}`;
                amount = item.details?.total ? `₹${item.details.total.toFixed(2)}` : "";
                break;
            case 'order_updated':
                icon = "cart-outline";
                iconColor = "#17a2b8";
                title = "Order Updated";
                subtitle = `Order #${item.docId.substring(0, 6)}`;
                amount = item.details?.total ? `₹${item.details.total.toFixed(2)}` : "";
                break;
            case 'order_deleted':
                icon = "cart-remove";
                iconColor = "#dc3545";
                title = "Order Deleted";
                subtitle = `Order #${item.docId.substring(0, 6)}`;
                break;
            case 'cloth_type_created':
                icon = "tag-plus-outline";
                iconColor = "#6610f2";
                title = "New Cloth Type Added";
                subtitle = item.details?.name || "N/A";
                break;
            case 'cloth_type_updated':
                icon = "tag-outline";
                iconColor = "#ffc107";
                title = "Cloth Type Updated";
                subtitle = item.details?.name || "N/A";
                break;
            case 'cloth_type_deleted':
                icon = "tag-remove-outline";
                iconColor = "#dc3545";
                title = "Cloth Type Removed";
                subtitle = item.details?.name || "N/A";
                break;
        }

        return (
            <View style={styles.activityItem} key={item.id}>
                <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
                <View style={styles.activityTextContainer}>
                    <Text style={styles.activityTitle}>{title}</Text>
                    <Text style={styles.activitySubtitle}>{subtitle}</Text>
                </View>
                {amount ? <Text style={styles.activityAmount}>{amount}</Text> : <Text style={styles.activityTime}>{time}</Text>}
            </View>
        );
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
