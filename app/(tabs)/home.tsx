
import { db, auth } from "@/config/firebase";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { collection, getDocs, limit, orderBy, query, where, Timestamp } from "firebase/firestore";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";

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

// Helper to safely parse dates from Firestore (Timestamp) or string
const parseSafeDate = (date) => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

// Helper to format large numbers for chart and stats
const formatValue = (value) => {
    if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${value.toFixed(0)}`;
};

const HomeScreen = () => {
    const [stats, setStats] = useState({ totalCustomers: 0, totalPaid: 0, totalPending: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    const [chartData, setChartData] = useState({ labels: [], datasets: [{ data: [0] }] });
    const [timeRange, setTimeRange] = useState('Month');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { width } = useWindowDimensions();
    const user = auth.currentUser;

    const processBillsForChart = (bills, range) => {
        const now = new Date();
        const validBills = bills.filter(bill => parseSafeDate(bill.date));

        if (range === 'Week') {
            const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weekData = Array(7).fill(0);
            validBills.forEach(bill => {
                const billDate = parseSafeDate(bill.date);
                if (now - billDate < 7 * 24 * 60 * 60 * 1000) {
                    weekData[billDate.getDay()] += bill.total;
                }
            });
            return { labels, datasets: [{ data: weekData }] };
        } else if (range === 'Month') {
            const currentMonth = now.getMonth();
            const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(0, currentMonth + 1);
            const monthData = Array(currentMonth + 1).fill(0);
            validBills.forEach(bill => {
                const billDate = parseSafeDate(bill.date);
                if (billDate.getFullYear() === now.getFullYear()) {
                    monthData[billDate.getMonth()] += bill.total;
                }
            });
            return { labels, datasets: [{ data: monthData }] };
        } else { // Year
            const currentYear = now.getFullYear();
            const labels = [String(currentYear - 2), String(currentYear - 1), String(currentYear)];
            const yearData = { [labels[0]]: 0, [labels[1]]: 0, [labels[2]]: 0 };
            validBills.forEach(bill => {
                const billDate = parseSafeDate(bill.date);
                const year = billDate.getFullYear();
                if (yearData[year] !== undefined) {
                    yearData[year] += bill.total;
                }
            });
            return { labels, datasets: [{ data: labels.map(year => yearData[year]) }] };
        }
    };

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
            const paidBills = [];

            allBills.forEach(bill => {
                const billTotal = bill.total || 0;
                if (bill.status === 'Paid') {
                    totalPaid += billTotal;
                    paidBills.push(bill);
                } else if (bill.status === 'Pending' || bill.status === 'Unpaid') {
                    totalPending += billTotal;
                }
            });

            setStats({ totalCustomers, totalPaid, totalPending });

            const sortedPaidBills = paidBills.sort((a, b) => parseSafeDate(b.date) - parseSafeDate(a.date));
            setChartData(processBillsForChart(sortedPaidBills, timeRange));

            const activityQuery = query(collection(db, "activities"), where("userEmail", "==", user.email), orderBy("createdAt", "desc"), limit(5));
            const activitySnapshot = await getDocs(activityQuery);
            setRecentActivity(activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error("Error fetching data: ", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, [timeRange, user]));
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData().finally(() => setRefreshing(false)); }, [timeRange, user]);

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

        switch (item.type) {
            case 'customer_created':
                icon = 'person-add'; title = "New Customer Added"; subtitle = item.details?.name;
                iconContainerColor = '#f0f7ff'; iconColor = '#1193d4';
                break;
            case 'bill_created':
                icon = 'add-shopping-cart'; title = "New Bill Created"; subtitle = `Bill #${item.docId.substring(0, 6)}`; amount = `₹${item.details.total.toFixed(2)}`;
                iconContainerColor = '#f0f7ff'; iconColor = '#1193d4'; amountColor = '#18181b';
                break;
            case 'bill_updated':
                if (item.details.status === 'Paid') {
                    icon = 'receipt-long'; title = "Bill Paid"; subtitle = `Bill #${item.docId.substring(0, 6)}`; amount = `+₹${item.details.total.toFixed(2)}`;
                    iconContainerColor = '#e8f5e9'; iconColor = '#28a745'; amountColor = '#28a745';
                } else {
                    icon = 'pending-actions'; title = "Payment Pending"; subtitle = `Bill #${item.docId.substring(0, 6)}`; amount = `₹${item.details.total.toFixed(2)}`;
                    iconContainerColor = '#ffebee'; iconColor = '#dc3545'; amountColor = '#dc3545';
                }
                break;
            default:
                icon = 'info'; title = "System Update"; subtitle = item.type;
                iconContainerColor = '#f3f4f6'; iconColor = '#71717a';
        }
        return <ActivityItem key={item.id} {...{ icon, title, subtitle, time, amount, iconContainerColor, iconColor, amountColor }} />;
    }

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Home</Text>
            </View>
            <View style={styles.mainContent}>
                <View style={styles.statsSection}>
                    <StatCard title="Total Customers" value={stats.totalCustomers} backgroundColor="#e3f2fd" textColor="#0d47a1" valueColor="#1976d2" />
                    <StatCard title="Total Amount Paid" value={formatValue(stats.totalPaid)} backgroundColor="#e8f5e9" textColor="#1b5e20" valueColor="#388e3c" />
                    <StatCard title="Total Pending Amount" value={formatValue(stats.totalPending)} backgroundColor="#ffebee" textColor="#b71c1c" valueColor="#d32f2f" />
                </View>

                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Daily Revenue Trends</Text>
                    <View style={styles.timeRangeContainer}>
                        {['Week', 'Month', 'Year'].map(range => (
                            <TouchableOpacity key={range} style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]} onPress={() => setTimeRange(range)}>
                                <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>{range}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {loading ? <ActivityIndicator size="large" color="#1193d4" /> : 
                        <BarChart
                            data={chartData}
                            width={width - 40}
                            height={220}
                            yAxisLabel="₹"
                            chartConfig={chartConfig}
                            showBarTops={false}
                            fromZero={true}
                            style={styles.chart}
                            yLabelsOffset={5}
                            formatYLabel={(y) => formatValue(parseFloat(y))}
                        />
                    }
                </View>

                <View style={styles.activitySection}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.activityList}>
                        {loading ? <ActivityIndicator /> : recentActivity.map(renderActivity)}
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(17, 147, 212, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(113, 113, 122, ${opacity})`,
    barPercentage: 0.5,
    propsForBackgroundLines: {
        stroke: '#e5e7eb',
        strokeDasharray: '',
    },
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#18181b' },
    mainContent: { paddingHorizontal: 16 },
    statsSection: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 24 },
    statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
    statTitle: { fontSize: 12, fontWeight: '500' },
    statValue: { fontSize: 20, fontWeight: 'bold' },
    chartSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#18181b', marginBottom: 16 },
    timeRangeContainer: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 999, padding: 4, marginBottom: 16 },
    timeRangeButton: { flex: 1, paddingVertical: 6, borderRadius: 999 },
    timeRangeButtonActive: { backgroundColor: '#1193d4' },
    timeRangeText: { fontSize: 14, fontWeight: '600', color: '#71717a', textAlign: 'center' },
    timeRangeTextActive: { color: '#ffffff' },
    chart: { borderRadius: 12, paddingRight: 35 },
    activitySection: { paddingBottom: 20 },
    activityList: { gap: 12 },
    activityItem: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderRadius: 8 },
    activityIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    activityTextContainer: { flex: 1 },
    activityTitle: { fontSize: 16, fontWeight: '600', color: '#18181b' },
    activitySubtitle: { fontSize: 14, color: '#71717a' },
    activityTime: { fontSize: 14, color: '#71717a' },
    activityAmount: { fontSize: 16, fontWeight: '600' },
});

export default HomeScreen;
