import { db, auth } from "@/config/firebase";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { collection, getDocs, limit, orderBy, query, where, Timestamp } from "firebase/firestore";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

const StatCard = ({ title, value, backgroundColor, textColor, valueColor }) => (
    <View style={[styles.statCard, { backgroundColor }]}>
        <Text style={[styles.statTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
    </View>
);

const ActivityItem = ({ icon, title, subtitle, time, amount, iconContainerColor, iconColor, amountColor }) => (
    <View style={styles.activityItem}>
        <View style={[styles.activityIconContainer, { backgroundColor: iconContainerColor }]}>
            <MaterialIcons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.activityTextContainer}>
            <Text style={styles.activityTitle}>{title}</Text>
            <Text style={styles.activitySubtitle}>{subtitle}</Text>
        </View>
        {time && <Text style={styles.activityTime}>{time}</Text>}
        {amount && <Text style={[styles.activityAmount, { color: amountColor }]}>{amount}</Text>}
    </View>
);

const parseSafeDate = (date) => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatValue = (value) => {
    if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${value.toFixed(0)}`;
};

// Robustly get a shortened docId
const getShortId = (docId) => {
    if (typeof docId === 'string') {
        return docId.substring(0, 6);
    } else if (docId && typeof docId === 'object' && typeof docId.documentId === 'string') {
        return docId.documentId.substring(0, 6);
    }
    return '...';
};

const HomeScreen = () => {
    const [stats, setStats] = useState({ totalCustomers: 0, totalPaid: 0, totalPending: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const user = auth.currentUser;

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const customersQuery = query(collection(db, 'customers'), where("userEmail", "==", user.email));
            const customersSnapshot = await getDocs(customersQuery);
            const totalCustomers = customersSnapshot.size;

            const billsQuery = query(collection(db, "bills"), where("userEmail", "==", user.email));
            const billsSnapshot = await getDocs(billsQuery);
            const allBills = billsSnapshot.docs.map(doc => doc.data());

            let totalPaid = 0;
            let totalPending = 0;

            allBills.forEach(bill => {
                const billTotal = bill.total || 0;
                if (bill.status === 'Paid') {
                    totalPaid += billTotal;
                } else if (bill.status === 'Pending' || bill.status === 'Unpaid') {
                    totalPending += billTotal;
                }
            });

            setStats({ totalCustomers, totalPaid, totalPending });

            const activityQuery = query(collection(db, "activities"), where("userEmail", "==", user.email), orderBy("createdAt", "desc"), limit(10));
            const activitySnapshot = await getDocs(activityQuery);
            setRecentActivity(activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error("Error fetching data: ", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, [user]));
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData().finally(() => setRefreshing(false)); }, [user]);

    const renderActivity = (item) => {
        let icon, title, subtitle, amount, time, iconContainerColor, iconColor, amountColor;
        
        const date = parseSafeDate(item.createdAt);

        if (date) {
            const diff = new Date() - date;
            if (diff < 3600000) time = `${Math.floor(diff / 60000)} mins ago`;
            else if (diff < 86400000) time = `${Math.floor(diff / 3600000)} hours ago`;
            else time = `${Math.floor(diff / 86400000)} days ago`;
        } else {
            time = '...';
        }

        const shortId = getShortId(item.docId);

        switch (item.type) {
            case 'customer_created':
                icon = 'person-add'; title = "New Customer Added"; subtitle = item.details?.name;
                iconContainerColor = '#f0f7ff'; iconColor = '#1193d4';
                break;
            case 'customer_updated':
                icon = 'edit'; title = "Customer Updated"; subtitle = item.details?.name;
                iconContainerColor = '#fff8e1'; iconColor = '#f57c00';
                break;
            case 'customer_deleted':
                icon = 'person-remove'; title = "Customer Deleted"; subtitle = item.details?.name;
                iconContainerColor = '#ffebee'; iconColor = '#dc3545';
                break;
            case 'cloth_type_created':
                icon = 'checkroom'; title = "New Cloth Type Added"; subtitle = item.details?.name;
                iconContainerColor = '#f0f7ff'; iconColor = '#1193d4';
                break;
            case 'cloth_type_updated':
                icon = 'edit'; title = "Cloth Type Updated"; subtitle = item.details?.name;
                iconContainerColor = '#fff8e1'; iconColor = '#f57c00';
                break;
            case 'cloth_type_deleted':
                icon = 'delete'; title = "Cloth Type Deleted"; subtitle = item.details?.name;
                iconContainerColor = '#ffebee'; iconColor = '#dc3545';
                break;
            case 'order_created':
                icon = 'add-shopping-cart'; title = "New Order Created"; subtitle = `Order #${shortId}`;
                iconContainerColor = '#f0f7ff'; iconColor = '#1193d4';
                break;
            case 'order_updated':
                icon = 'edit'; title = "Order Updated"; subtitle = `Order #${shortId}`;
                iconContainerColor = '#fff8e1'; iconColor = '#f57c00';
                break;
            case 'order_deleted':
                icon = 'delete'; title = "Order Deleted"; subtitle = `Order #${shortId}`;
                iconContainerColor = '#ffebee'; iconColor = '#dc3545';
                break;
            case 'bill_created':
                icon = 'receipt'; title = "New Bill Created"; subtitle = `Bill #${shortId}`; amount = `₹${item.details.total.toFixed(2)}`;
                iconContainerColor = '#f0f7ff'; iconColor = '#1193d4'; amountColor = '#18181b';
                break;
            case 'bill_paid':
                icon = 'receipt-long'; title = "Bill Paid"; subtitle = `Bill #${shortId}`;
                amount = `+₹${item.details.total.toFixed(2)}`;
                iconContainerColor = '#e8f5e9'; iconColor = '#28a745'; amountColor = '#28a745';
                break;
            case 'bill_updated':
                icon = 'edit'; title = "Bill Updated"; subtitle = `Bill #${shortId}`;
                iconContainerColor = '#fff8e1'; iconColor = '#f57c00';
                break;
            case 'bill_deleted':
                icon = 'delete-sweep'; title = "Bill Deleted"; subtitle = `Bill #${shortId}`;
                iconContainerColor = '#ffebee'; iconColor = '#dc3545';
                break;
            default:
                icon = 'info'; title = item.type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); subtitle = item.details?.name || `ID: ${shortId}`;
                iconContainerColor = '#f3f4f6'; iconColor = '#71717a';
        }
        return <ActivityItem key={item.id} {...{ icon, title, subtitle, time, amount, iconContainerColor, iconColor, amountColor }} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.header}>
                </View>
                <View style={styles.statsSection}>
                    <StatCard title="Total Customers" value={stats.totalCustomers} backgroundColor="#e3f2fd" textColor="#0d47a1" valueColor="#1976d2" />
                    <StatCard title="Total Amount Paid" value={formatValue(stats.totalPaid)} backgroundColor="#e8f5e9" textColor="#1b5e20" valueColor="#388e3c" />
                    <StatCard title="Total Pending Amount" value={formatValue(stats.totalPending)} backgroundColor="#ffebee" textColor="#b71c1c" valueColor="#d32f2f" />
                </View>

                <View style={styles.activitySection}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <ScrollView 
                        style={styles.activityList}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    >
                        {loading ? <ActivityIndicator /> : recentActivity.map(renderActivity)}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8, alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#18181b' },
    mainContent: { paddingHorizontal: 16, flex: 1 },
    statsSection: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 24, marginTop: 16 },
    statCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
    statTitle: { fontSize: 12, fontWeight: '500' },
    statValue: { fontSize: 20, fontWeight: 'bold' },
    activitySection: { flex: 1, paddingBottom: 20, marginTop: 16 },
    activityList: { gap: 12 },
    activityItem: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8 },
    activityIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    activityTextContainer: { flex: 1 },
    activityTitle: { fontSize: 16, fontWeight: '600', color: '#18181b' },
    activitySubtitle: { fontSize: 14, color: '#71717a' },
    activityTime: { fontSize: 14, color: '#71717a' },
    activityAmount: { fontSize: 16, fontWeight: '600' },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#18181b', marginBottom: 16 },
});

export default HomeScreen;
