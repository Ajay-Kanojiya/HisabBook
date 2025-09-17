import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { collection, onSnapshot, query, where, limit, startAfter, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase'; // Adjust this path
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const InvoicesScreen = () => {
    const [invoices, setInvoices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [lastVisible, setLastVisible] = useState(null);
    const [firstVisible, setFirstVisible] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10; 

    useEffect(() => {
        fetchInvoices();
    }, [statusFilter, page]);

    const fetchInvoices = async (direction = 'next') => {
        let q = query(collection(db, 'orders'), limit(pageSize));

        if (statusFilter !== 'All') {
            q = query(q, where('status', '==', statusFilter));
        }

        if (direction === 'next' && lastVisible) {
            q = query(q, startAfter(lastVisible));
        } else if (direction === 'prev' && firstVisible) {
            // This is more complex with Firestore, requires orderBy and endBefore
            // For simplicity, we'll reset to page 1 on 'prev' from page > 1
             if (page > 1) setPage(page - 1);
             else fetchInvoices('next'); // a simple reset 
             return;
        }
        
        const documentSnapshots = await getDocs(q);

        setFirstVisible(documentSnapshots.docs[0]);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);

        const invoicesData = await Promise.all(documentSnapshots.docs.map(async (d) => {
            const order = { ...d.data(), id: d.id };
            if (order.customer && order.customer.path) {
                 const customerSnap = await getDoc(order.customer);
                 if (customerSnap.exists()) {
                    order.customerName = customerSnap.data().name;
                }
            }
            return order;
        }));
        
        const filteredData = invoicesData.filter(invoice => 
            invoice.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setInvoices(filteredData);
    };
    
    const handleStatusChange = async (id, newStatus) => {
        const orderDocRef = doc(db, 'orders', id);
        await updateDoc(orderDocRef, { status: newStatus });
        // The onSnapshot listener will automatically update the UI.
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <View style={styles.itemHeader}>
                <Text style={styles.customerName}>{item.customerName || 'N/A'}</Text>
                <Text style={styles.invoiceTotal}>${item.total.toFixed(2)}</Text>
            </View>
            <Text style={styles.invoiceDate}>{new Date(item.createdAt?.toDate()).toLocaleDateString()}</Text>
            <Picker
                selectedValue={item.status}
                onValueChange={(value) => handleStatusChange(item.id, value)}
                style={[styles.statusPicker, styles[`status${item.status}`]]}
            >
                <Picker.Item label="Pending" value="Pending" />
                <Picker.Item label="Paid" value="Paid" />
                <Picker.Item label="Unpaid" value="Unpaid" />
            </Picker>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Invoices</Text>
            </View>
            <TextInput
                style={styles.searchInput}
                placeholder="Search by customer name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            <Picker
                selectedValue={statusFilter}
                onValueChange={(itemValue) => setStatusFilter(itemValue)}
                style={styles.filterPicker}
            >
                <Picker.Item label="All Statuses" value="All" />
                <Picker.Item label="Pending" value="Pending" />
                <Picker.Item label="Paid" value="Paid" />
                <Picker.Item label="Unpaid" value="Unpaid" />
            </Picker>
            <FlatList
                data={invoices}
                renderItem={renderItem}
                keyExtractor={item => item.id}
            />
            <View style={styles.paginationControls}>
                <TouchableOpacity onPress={() => fetchInvoices('prev')} disabled={page <= 1}>
                    <Text>Prev</Text>
                </TouchableOpacity>
                <Text>Page {page}</Text>
                <TouchableOpacity onPress={() => fetchInvoices('next')}>
                    <Text>Next</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { padding: 20, alignItems: 'center', backgroundColor: 'white' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    searchInput: { height: 40, borderColor: 'gray', borderWidth: 1, margin: 10, paddingLeft: 10, borderRadius: 5 },
    filterPicker: { height: 50, width: '100%' },
    itemContainer: { backgroundColor: 'white', padding: 15, marginVertical: 5, marginHorizontal: 10, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    customerName: { fontSize: 18, fontWeight: 'bold' },
    invoiceTotal: { fontSize: 18, fontWeight: 'bold', color: '#007bff' },
    invoiceDate: { color: 'gray', marginBottom: 10 },
    statusPicker: { width: '100%', borderRadius: 5, padding: 0, margin: 0 },
    statusPaid: { backgroundColor: '#d4edda' }, // Light green
    statusPending: { backgroundColor: '#fff3cd' }, // Light yellow
    statusUnpaid: { backgroundColor: '#f8d7da' }, // Light red
    paginationControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 10 }
});

export default InvoicesScreen;
