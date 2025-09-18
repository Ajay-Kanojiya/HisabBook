
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
    useWindowDimensions, ActivityIndicator
} from 'react-native';
import { collection, getDocs, query, where, doc, orderBy, getDoc, updateDoc, limit, startAfter, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { useRouter } from 'expo-router';
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
        if (!user) return;
        if (loadingMore && allBillsLoaded) return;

        if (!loadMore) {
            setLoading(true);
            setBills([]);
            setLastVisible(null);
            setAllBillsLoaded(false);
        } else {
            setLoadingMore(true);
        }

        try {
            let billsQuery = query(
                collection(db, 'bills'),
                where("userEmail", "==", user.email),
                orderBy("createdAt", "desc")
            );
            
            if (selectedCustomer !== 'All') {
                billsQuery = query(billsQuery, where("customerId", "==", selectedCustomer));
            }

            if (selectedStatus !== 'All') {
                billsQuery = query(billsQuery, where("status", "==", selectedStatus));
            }

            if (loadMore && lastVisible) {
                billsQuery = query(billsQuery, startAfter(lastVisible), limit(PAGINATION_SIZE));
            } else {
                billsQuery = query(billsQuery, limit(PAGINATION_SIZE));
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
                        customerName = customerSnap.exists() ? customerSnap.data().name : 'N/A';
                    }
                    return {
                        ...billData,
                        id: billDoc.id,
                        customerName,
                        date: billData.createdAt.toDate(),
                    };
                }));
                
                setBills(prev => loadMore ? [...prev, ...billsList] : billsList);
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
    
    useEffect(() => {
        fetchCustomers();
    }, [user]);

    useEffect(() => {
        fetchBills();
    }, [user, selectedCustomer, selectedStatus]);


    const numberToWords = (num) => {
        const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        if ((num = num.toString()).length > 9) return 'overflow';
        const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return;
        let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only ' : '';
        return str;
    }
    
    const handleGenerateAndDownloadPdf = async (bill) => {
        try {
            let order = { items: [] };
            let customer = { name: bill.customerName, address: 'N/A', phone: 'N/A' };
            let shop = null;

            if(user){
                const shopsRef = collection(db, 'shops');
                const q = query(shopsRef, where("userEmail", "==", user.email));
                const shopsSnap = await getDocs(q);
                if (!shopsSnap.empty) {
                    shop = shopsSnap.docs[0].data();
                } else {
                    Alert.alert("Error", "Shop details could not be found.");
                    return;
                }
            }

            if (bill.orderIds && bill.orderIds.length > 0) {
                const orderRef = doc(db, "orders", bill.orderIds[0]);
                const orderSnap = await getDoc(orderRef);
                if (orderSnap.exists()) {
                    const orderData = orderSnap.data();
                    const itemsWithClothTypeNames = await Promise.all(orderData.items.map(async (item) => {
                        if (item.clothTypeId) {
                            const clothTypeRef = doc(db, "cloth-types", item.clothTypeId);
                            const clothTypeSnap = await getDoc(clothTypeRef);
                            return { ...item, clothTypeName: clothTypeSnap.exists() ? clothTypeSnap.data().name : 'N/A' };
                        }
                        return item;
                    }));
                    order = { ...orderData, items: itemsWithClothTypeNames };
                }
            }

            if (bill.customerId) {
                const customerRef = doc(db, "customers", bill.customerId);
                const customerSnap = await getDoc(customerRef);
                if (customerSnap.exists()) {
                    customer = customerSnap.data();
                }
            }
            
            const itemsHtml = order.items.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td style="text-align: left;">${item.clothTypeName || 'N/A'}</td>
                    <td>${item.quantity || 0}</td>
                    <td>₹${(item.price || 0).toFixed(2)}</td>
                    <td>₹${(item.totalPrice || 0).toFixed(2)}</td>
                </tr>
            `).join('');

            const htmlContent = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
                    .header, .footer { display: flex; justify-content: space-between; align-items: flex-start; }
                    .company-details { text-align: left; }
                    .company-name { font-size: 28px; font-weight: bold; color: #E74C3C; margin-bottom: 5px; }
                    .invoice-details { text-align: right; }
                    .invoice-title { font-size: 28px; font-weight: bold; color: #E74C3C; }
                    .customer-info { margin-top: 30px; text-align: center; }
                    .info-line { display: flex; margin-bottom: 10px; }
                    .info-label { font-weight: bold; }
                    .info-value { border-bottom: 1px dotted #aaa; flex-grow: 1; margin-left: 10px; }
                    .item-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .item-table th, .item-table td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    .item-table th { background-color: #f2f2f2; }
                    .footer { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;}
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="header">
                        <div class="company-details">
                            <div class="company-name">${shop.shopName ?? 'Your Company'}</div>
                            <div>${shop.address ?? 'Address'}</div>
                            <div>${shop.mobile ?? 'Mobile'}</div>
                            <div>${shop.email ?? 'Email'}</div>
                        </div>
                        <div class="invoice-details">
                            <div class="invoice-title">INVOICE</div>
                            <div><strong>Invoice No. :</strong> #${bill.id.substring(0, 5)}</div>
                            <div><strong>Invoice Date :</strong> ${bill.date.toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="customer-info">
                        <div class="info-line"><span class="info-label">Name:</span><span class="info-value">${customer.name}</span></div>
                        <div class="info-line"><span class="info-label">Address:</span><span class="info-value">${customer.address || 'N/A'}</span></div>
                        <div class="info-line"><span class="info-label">Phone:</span><span class="info-value">${customer.phone || 'N/A'}</span></div>
                    </div>
                    <table class="item-table">
                        <thead>
                            <tr><th>Sl.No.</th><th>Description</th><th>Qty.</th><th>Rate (₹)</th><th>Amount (₹)</th></tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    <div class="footer">
                        <div style="flex: 1; margin-right: 10px;"><strong>In words:</strong> ${numberToWords(bill.total)}</div>
                        <div style="text-align: right;"><strong>Total:</strong> ₹${(bill.total || 0).toFixed(2)}</div>
                    </div>
                </div>
            </body>
            </html>`;
    
            const { uri } = await printToFileAsync({ html: htmlContent });
            await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Could not generate PDF.');
        }
    };

    const handleStatusUpdate = async (billId, newStatus) => {
        try {
            const billRef = doc(db, "bills", billId);
            await updateDoc(billRef, { status: newStatus });
            setBills(prevBills => prevBills.map(b => b.id === billId ? { ...b, status: newStatus } : b));
        } catch (error) {
            console.error("Error updating status: ", error);
            Alert.alert("Error", "Failed to update status.");
        }
    };

    const confirmDelete = (billId) => {
        Alert.alert(
            "Delete Bill",
            "Are you sure you want to delete this bill? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => handleDelete(billId) }
            ]
        );
    };

    const handleDelete = async (billId) => {
        try {
            await deleteDoc(doc(db, "bills", billId));
            setBills(prev => prev.filter(b => b.id !== billId));
            Alert.alert("Success", "Bill deleted successfully.");
        } catch (error) {
            console.error("Error deleting bill: ", error);
            Alert.alert("Error", "Could not delete the bill.");
        }
    };
    
    const renderItem = ({ item }) => {
        return (
            <View style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                    <View style={styles.itemHeaderTextContainer}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.customerName}</Text>
                        <Text style={styles.itemDate}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.itemTotal}>₹{item.total.toFixed(2)}</Text>
                </View>
                <View style={styles.itemFooter}>
                    <View style={styles.statusPickerContainer}>
                        <Picker
                            selectedValue={item.status}
                            onValueChange={(itemValue) => handleStatusUpdate(item.id, itemValue)}
                            style={styles.statusPicker}
                            itemStyle={styles.pickerItem}
                        >
                            <Picker.Item label="Pending" value="Pending" />
                            <Picker.Item label="Paid" value="Paid" />
                            <Picker.Item label="Unpaid" value="Unpaid" />
                        </Picker>
                    </View>
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity onPress={() => router.push(`/bill/${item.id}`)}>
                            <Text style={styles.viewDetails}>View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleGenerateAndDownloadPdf(item)} style={{marginLeft: 10}}>
                            <MaterialCommunityIcons name="file-pdf-box" size={styles.iconSize} color="#DC3545" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDelete(item.id)} style={{marginLeft: 10}}>
                            <MaterialCommunityIcons name="delete-forever" size={styles.iconSize} color="#E74C3C" />
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
                <Text style={styles.headerTitle}>Bills</Text>
                <View style={{width: 24}}/>
            </View>

            <View style={styles.filtersContainer}>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedCustomer}
                        onValueChange={(itemValue) => setSelectedCustomer(itemValue)}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                    >
                        <Picker.Item label="All Customers" value="All" />
                        {customers.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                    </Picker>
                </View>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedStatus}
                        onValueChange={(itemValue) => setSelectedStatus(itemValue)}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                    >
                        <Picker.Item label="All Statuses" value="All" />
                        <Picker.Item label="Pending" value="Pending" />
                        <Picker.Item label="Paid" value="Paid" />
                        <Picker.Item label="Unpaid" value="Unpaid" />
                    </Picker>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={{ flex: 1, justifyContent: 'center' }}/>
            ) : (
                <FlatList
                    data={bills}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    onEndReached={() => fetchBills(true)}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="large" color="#007bff" /> : null}
                    ListEmptyComponent={<Text style={styles.emptyListText}>No bills found.</Text>}
                />
            )}
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/generate-bill')}>
                <MaterialCommunityIcons name="plus" size={styles.addButtonIconSize} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (width) => {
    const isSmallScreen = width < 400;
    const scale = width / 375;
    const responsiveSize = (size) => Math.round(size * scale);

    return StyleSheet.create({
        container: { flex: 1, backgroundColor: '#f8f9fa' },
        header: { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingTop: responsiveSize(50), 
            paddingBottom: responsiveSize(15), 
            paddingHorizontal: responsiveSize(20), 
            backgroundColor: '#ffffff', 
            borderBottomWidth: 1, 
            borderBottomColor: '#dee2e6' 
        },
        headerTitle: { fontSize: responsiveSize(20), fontWeight: 'bold', color: '#333' },
        filtersContainer: { 
            flexDirection: isSmallScreen ? 'column' : 'row', 
            padding: responsiveSize(10),
            backgroundColor: '#ffffff', 
            borderBottomWidth: 1, 
            borderBottomColor: '#dee2e6',
        },
        pickerContainer: { 
            flex: 1, 
            borderWidth: 1, 
            borderColor: '#ced4da', 
            borderRadius: 8, 
            margin: isSmallScreen ? 5 : 0,
            marginHorizontal: isSmallScreen ? 10 : 5,
            justifyContent: 'center',
        },
        picker: { 
            height: responsiveSize(45), 
            width: '100%',
        },
        pickerItem: {
             color: '#000000'
        },
        listContainer: { paddingBottom: 80, paddingHorizontal: responsiveSize(10) },
        itemContainer: { 
            backgroundColor: 'white', 
            borderRadius: responsiveSize(8), 
            padding: responsiveSize(12), 
            marginVertical: responsiveSize(6), 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 1 }, 
            shadowOpacity: 0.05, 
            shadowRadius: 2, 
            elevation: 2 
        },
        itemHeader: { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start' 
        },
        itemHeaderTextContainer: { flex: 1, marginRight: 10 },
        itemName: { fontSize: responsiveSize(16), fontWeight: '600', color: '#343a40' },
        itemTotal: { fontSize: responsiveSize(16), fontWeight: 'bold', color: '#343a40' },
        itemDate: { fontSize: responsiveSize(12), color: '#6c757d', marginTop: 4 },
        itemFooter: { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: responsiveSize(10) 
        },
        statusPickerContainer: {
            flex: isSmallScreen ? 0.6 : 0.5,
            borderWidth: 1,
            borderColor: '#ced4da',
            borderRadius: 8,
            justifyContent: 'center',
            height: responsiveSize(40),
        },
        statusPicker: { 
            width: '100%',
            height: responsiveSize(40),
        },
        actionsContainer: { 
            flex: isSmallScreen ? 0.4 : 0.5,
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'flex-end' 
        },
        viewDetails: { color: '#007bff', fontSize: responsiveSize(14), fontWeight: '500' },
        iconSize: responsiveSize(26),
        addButton: { 
            position: 'absolute', 
            bottom: responsiveSize(30), 
            right: responsiveSize(30), 
            backgroundColor: '#007bff', 
            width: responsiveSize(56), 
            height: responsiveSize(56), 
            borderRadius: responsiveSize(28), 
            alignItems: 'center', 
            justifyContent: 'center', 
            elevation: 8 
        },
        addButtonIconSize: responsiveSize(28),
        emptyListText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6c757d' },
    });
};

export default BillsScreen;
