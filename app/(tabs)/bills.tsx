
import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
    useWindowDimensions, ActivityIndicator
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
    const [selectedDate, setSelectedDate] = useState(null);
    
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

        setLoading(!loadMore);
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
            Alert.alert("Error", "Could not fetch bills.");
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
        }, [user, selectedCustomer, selectedDate])
    );
    
    const handleGenerateAndDownloadPdf = async (bill) => {
         try {
        let orderItems = [];
        let customerDetails = { name: bill.customerName, address: 'N/A' };

        if (bill.orderId) {
            const orderRef = doc(db, "orders", bill.orderId);
            const orderSnap = await getDoc(orderRef);
            if (orderSnap.exists()) {
                const orderData = orderSnap.data();
                orderItems = await Promise.all(orderData.items.map(async (item) => {
                    let clothTypeName = 'Unknown';
                    if (item.clothTypeId) {
                        const clothTypeRef = doc(db, "cloth-types", item.clothTypeId);
                        const clothTypeSnap = await getDoc(clothTypeRef);
                        if (clothTypeSnap.exists()) {
                            clothTypeName = clothTypeSnap.data().name;
                        }
                    }
                    return { ...item, clothTypeName };
                }));
            }
        }

        if (bill.customerId) {
            const customerRef = doc(db, "customers", bill.customerId);
            const customerSnap = await getDoc(customerRef);
            if (customerSnap.exists()) {
                customerDetails = customerSnap.data();
            }
        }

        const itemsHtml = orderItems.map((item) => `
            <tr class="item">
                <td>${item.clothTypeName}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>₹${item.totalPrice.toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; color: #495057; }
                        .invoice-box { max-width: 800px; margin: auto; padding: 30px; background-color: #fff; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                        .header .shop-info { text-align: left; }
                        .header .invoice-info { text-align: right; }
                        .invoice-info h1 { margin: 0; font-size: 45px; color: #3c9ee5; }
                        .invoice-info span { font-size: 16px; color: #555; }
                        .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
                        .details .bill-to, .details .details-info { flex: 1; }
                        .bill-to { text-align: left; }
                        .details-info { text-align: right; }
                        .item-table { width: 100%; text-align: left; border-collapse: collapse; }
                        .item-table thead th { background: #f8f9fa; border-bottom: 2px solid #dee2e6; padding: 10px 5px; font-weight: bold; }
                        .item-table .item td { padding: 10px 5px; border-bottom: 1px solid #eee; }
                        .total { text-align: right; margin-top: 30px; }
                        .total span { font-size: 22px; font-weight: bold; color: #3c9ee5; }
                    </style>
                </head>
                <body>
                    <div class="invoice-box">
                        <div class="header">
                            <div class="shop-info">
                                <h1>Laundry Shop</h1>
                                <span>123 Clean St, Fresh City, 12345</span>
                            </div>
                            <div class="invoice-info">
                                <h1>INVOICE</h1>
                                <span>#${bill.id.substring(0, 5)}</span>
                            </div>
                        </div>
                        <div class="details">
                            <div class="bill-to">
                                <strong>Bill To</strong><br>
                                ${customerDetails.name}<br>
                                ${customerDetails.phone || 'N/A'}<br>
                                ${customerDetails.address || 'N/A'}
                            </div>
                            <div class="details-info">
                                <strong>Date of Issue:</strong> ${bill.date.toLocaleDateString()}
                            </div>
                        </div>
                        <table class="item-table">
                            <thead>
                                <tr><th>Cloth Type</th><th>Quantity</th><th>Rate (₹)</th><th>Total (₹)</th></tr>
                            </thead>
                            <tbody>${itemsHtml}</tbody>
                        </table>
                        <div class="total">
                            <strong>Grand Total (₹)</strong>
                            <span>${bill.total.toFixed(2)}</span>
                        </div>
                    </div>
                </body>
            </html>`;

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
                { text: "Cancel", style: "cancel" },
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
                    },
                },
            ]
        );
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Paid': return { container: styles.statusPaid, text: styles.statusTextPaid };
            case 'Unpaid': return { container: styles.statusUnpaid, text: styles.statusTextUnpaid };
            case 'Pending': return { container: styles.statusPending, text: styles.statusTextPending };
            default: return {};
        }
    };

    const renderItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);
        return (
            <View style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                    <View>
                        <Text style={styles.itemName}>{item.customerName}</Text>
                        <Text style={styles.itemDate}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.itemTotal}>₹{item.total.toFixed(2)}</Text>
                </View>
                <View style={styles.itemFooter}>
                    <TouchableOpacity onPress={() => handleStatusUpdate(item.id, item.status)} style={[styles.statusBadge, statusStyle.container]}>
                        <Text style={[styles.statusText, statusStyle.text]}>{item.status}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity onPress={() => router.push(`/bill/${item.id}`)}>
                            <Text style={styles.viewDetails}>View Details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleGenerateAndDownloadPdf(item)} style={{marginLeft: 15}}>
                            <MaterialCommunityIcons name="file-pdf-box" size={styles.iconSize} color="#888" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invoices</Text>
                <View style={{width: 24}}/>
            </View>

            <View style={styles.filtersContainer}>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedCustomer}
                        onValueChange={(itemValue) => setSelectedCustomer(itemValue)}
                        style={styles.picker}
                    >
                        <Picker.Item label="All Customers" value="All" />
                        {customers.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                    </Picker>
                </View>
                <TouchableOpacity style={styles.datePicker} onPress={() => {}}>
                    <Text style={styles.datePickerText}>Select Date</Text>
                    <MaterialCommunityIcons name="calendar" size={20} color="#888" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }}/>
            ) : (
                <FlatList
                    data={bills}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    onEndReached={() => !allBillsLoaded && fetchBills(true)}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="large" color="#007bff" style={{marginVertical: 20}} /> : null}
                    ListEmptyComponent={<Text style={styles.emptyListText}>No invoices found.</Text>}
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
        container: { flex: 1, backgroundColor: '#f8f9fa' },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: responsiveSize(50), paddingBottom: responsiveSize(15), paddingHorizontal: responsiveSize(20), backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
        headerTitle: { fontSize: responsiveSize(20), fontWeight: 'bold', color: '#333' },
        filtersContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: responsiveSize(10), paddingHorizontal: responsiveSize(15), backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
        pickerContainer: { flex: 1, borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, marginRight: 10, justifyContent: 'center' },
        picker: { height: responsiveSize(45) },
        datePicker: { flex: 0.8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12 },
        datePickerText: { color: '#6c757d', fontSize: responsiveSize(14) },
        listContainer: { paddingHorizontal: responsiveSize(15), paddingTop: 10 },
        itemContainer: { backgroundColor: 'white', borderRadius: responsiveSize(8), padding: responsiveSize(15), marginVertical: responsiveSize(8), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
        itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
        itemName: { fontSize: responsiveSize(17), fontWeight: '600', color: '#343a40' },
        itemTotal: { fontSize: responsiveSize(17), fontWeight: 'bold', color: '#343a40' },
        itemDate: { fontSize: responsiveSize(13), color: '#6c757d', marginTop: 4 },
        itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: responsiveSize(15) },
        statusBadge: { paddingHorizontal: responsiveSize(10), paddingVertical: responsiveSize(4), borderRadius: 6 },
        statusText: { fontSize: responsiveSize(12), fontWeight: 'bold' },
        statusPending: { backgroundColor: '#e9f5ff' },
        statusTextPending: { color: '#007bff' },
        statusPaid: { backgroundColor: '#e6f9ee' },
        statusTextPaid: { color: '#28a745' },
        statusUnpaid: { backgroundColor: '#fdeeed' },
        statusTextUnpaid: { color: '#dc3545' },
        actionsContainer: { flexDirection: 'row', alignItems: 'center' },
        viewDetails: { color: '#007bff', fontSize: responsiveSize(14), fontWeight: '500' },
        iconSize: responsiveSize(28),
        addButton: { position: 'absolute', bottom: responsiveSize(30), right: responsiveSize(30), backgroundColor: '#007bff', width: responsiveSize(56), height: responsiveSize(56), borderRadius: responsiveSize(28), alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
        addButtonIconSize: responsiveSize(28),
        emptyListText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6c757d' },
    });
};

export default BillsScreen;
