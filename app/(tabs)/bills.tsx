
import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
    TextInput, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { collection, getDocs, query, where, doc, orderBy, getDoc, updateDoc, limit, startAfter } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';

const BillsScreen = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastVisible, setLastVisible] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [allBillsLoaded, setAllBillsLoaded] = useState(false);
    
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const PAGINATION_SIZE = 10;

    const fetchCustomers = async () => {
        if (!user) return;
        try {
            const customersCollection = collection(db, 'customers');
            const q = query(customersCollection, where("userEmail", "==", user.email));
            const customersSnapshot = await getDocs(q);
            const customersList = customersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setCustomers(customersList);
        } catch (error) {
            console.error("Error fetching customers: ", error);
        }
    };

    const fetchBills = async (loadMore = false) => {
        if (!user || (loadingMore && allBillsLoaded)) return;

        setLoading(loadMore ? false : true);
        setLoadingMore(loadMore);

        try {
            let billsQuery = query(
                collection(db, 'bills'),
                where("userEmail", "==", user.email),
                orderBy("createdAt", "desc"),
                limit(PAGINATION_SIZE)
            );
            
            if (selectedCustomer !== 'All') {
                billsQuery = query(billsQuery, where("customerId", "==", selectedCustomer));
            }
            if (selectedStatus !== 'All') {
                billsQuery = query(billsQuery, where("status", "==", selectedStatus));
            }

            if (loadMore && lastVisible) {
                billsQuery = query(billsQuery, startAfter(lastVisible));
            }

            const billsSnapshot = await getDocs(billsQuery);

            if (!billsSnapshot.empty) {
                const newLastVisible = billsSnapshot.docs[billsSnapshot.docs.length - 1];
                setLastVisible(newLastVisible);

                const billsList = await Promise.all(billsSnapshot.docs.map(async (billDoc) => {
                    const billData = billDoc.data();
                    let customerName = 'N/A';
                    if (billData.customerId) {
                        const customerRef = doc(db, "customers", billData.customerId);
                        const customerSnap = await getDoc(customerRef);
                        if (customerSnap.exists()) {
                            customerName = customerSnap.data().name;
                        }
                    }
                    return {
                        ...billData,
                        id: billDoc.id,
                        customerName,
                        date: billData.createdAt.toDate(),
                    };
                }));

                setBills(loadMore ? [...bills, ...billsList] : billsList);
                setAllBillsLoaded(billsSnapshot.docs.length < PAGINATION_SIZE);
            } else {
                 if (!loadMore) setBills([]);
                setAllBillsLoaded(true);
            }

        } catch (error) {
            console.error("Error fetching bills: ", error);
            Alert.alert("Error", "Could not fetch bills. Please check your Firestore rules and indexes.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchCustomers();
                fetchBills();
            }
        }, [user, selectedCustomer, selectedStatus])
    );
    
    const handleGenerateAndDownloadPdf = async (bill) => {
        const htmlContent = `
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1 style="color: #007bff;">Bill</h1>
                    <p><strong>Bill ID:</strong> ${bill.id}</p>
                    <p><strong>Customer:</strong> ${bill.customerName}</p>
                    <p><strong>Date:</strong> ${bill.date.toLocaleDateString()}</p>
                    <p><strong>Status:</strong> ${bill.status}</p>
                    <h2 style="margin-top: 30px;">Total Amount: ₹${bill.total.toFixed(2)}</h2>
                </body>
            </html>
        `;

        try {
            const { uri } = await printToFileAsync({ html: htmlContent });
            await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Could not generate or share the PDF.');
        }
    };


    const handleStatusUpdate = (billId, currentStatus) => {
        const statuses = ['Pending', 'Paid', 'Unpaid'];
        const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];

        Alert.alert(
            "Update Status",
            `Do you want to change status from ${currentStatus} to ${nextStatus}?`,
            [
                { text: "Cancel" },
                {
                    text: "Update",
                    onPress: async () => {
                        try {
                            const billRef = doc(db, "bills", billId);
                            await updateDoc(billRef, { status: nextStatus });
                            fetchBills();
                        } catch (error) {
                            console.error("Error updating status: ", error);
                            Alert.alert("Error", "Failed to update status.");
                        }
                    }
                }
            ]
        );
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Paid': return { backgroundColor: '#28a745', color: 'white' };
            case 'Unpaid': return { backgroundColor: '#dc3545', color: 'white' };
            case 'Pending': return { backgroundColor: '#6c757d', color: 'white' };
            default: return { backgroundColor: '#007bff', color: 'white' };
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.customerName}</Text>
                <Text style={styles.itemTotal}>₹{item.total.toFixed(2)}</Text>
            </View>
            <View style={styles.itemFooter}>
                <Text style={styles.itemDate}>{item.date.toLocaleDateString()}</Text>
                <TouchableOpacity onPress={() => handleStatusUpdate(item.id, item.status)}>
                    <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </TouchableOpacity>
                 <TouchableOpacity onPress={() => handleGenerateAndDownloadPdf(item)}>
                    <MaterialCommunityIcons name="file-pdf-box" size={styles.iconSize} color="#007bff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Bills</Text>
            </View>

            <View style={styles.filtersContainer}>
                <Picker
                    selectedValue={selectedCustomer}
                    onValueChange={(itemValue) => setSelectedCustomer(itemValue)}
                    style={styles.picker}
                >
                    <Picker.Item label="All Customers" value="All" />
                    {customers.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                </Picker>
                 <Picker
                    selectedValue={selectedStatus}
                    onValueChange={(itemValue) => setSelectedStatus(itemValue)}
                    style={styles.picker}
                >
                    <Picker.Item label="All Statuses" value="All" />
                    <Picker.Item label="Paid" value="Paid" />
                    <Picker.Item label="Pending" value="Pending" />
                    <Picker.Item label="Unpaid" value="Unpaid" />
                </Picker>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }}/>
            ) : (
                <FlatList
                    data={bills}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    onEndReached={() => fetchBills(true)}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore && <ActivityIndicator size="small" color="#007bff" />}
                />
            )}
            
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/generate-bill')}>
                <MaterialCommunityIcons name="plus" size={styles.addButtonIconSize} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (width) => {
    const scale = width / 375;
    const responsiveSize = (size) => Math.round(size * scale);

    return StyleSheet.create({
        container: { flex: 1, backgroundColor: '#f0f4f8' },
        header: { paddingTop: responsiveSize(60), paddingBottom: responsiveSize(20), paddingHorizontal: responsiveSize(20), backgroundColor: '#ffffff', alignItems: 'center' },
        headerTitle: { fontSize: responsiveSize(24), fontWeight: 'bold', color: '#000' },
        filtersContainer: { flexDirection: 'row', justifyContent: 'space-around', padding: responsiveSize(10), backgroundColor: 'white' },
        picker: { flex: 1, height: responsiveSize(50) },
        listContainer: { paddingHorizontal: responsiveSize(20) },
        itemContainer: { backgroundColor: 'white', borderRadius: responsiveSize(10), padding: responsiveSize(15), marginVertical: responsiveSize(8), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
        itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        itemName: { fontSize: responsiveSize(18), fontWeight: '600', color: '#333' },
        itemTotal: { fontSize: responsiveSize(18), fontWeight: 'bold', color: '#007bff' },
        itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: responsiveSize(10) },
        itemDate: { fontSize: responsiveSize(14), color: '#6c757d' },
        statusBadge: { paddingHorizontal: responsiveSize(10), paddingVertical: responsiveSize(5), borderRadius: responsiveSize(12) },
        statusText: { fontSize: responsiveSize(12), fontWeight: 'bold' },
        iconSize: responsiveSize(28),
        addButton: { position: 'absolute', bottom: responsiveSize(30), right: responsiveSize(30), backgroundColor: '#007bff', width: responsiveSize(56), height: responsiveSize(56), borderRadius: responsiveSize(28), alignItems: 'center', justifyContent: 'center', elevation: 8 },
        addButtonIconSize: responsiveSize(28),
    });
};

export default BillsScreen;
