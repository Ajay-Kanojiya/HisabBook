import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Alert, TouchableOpacity, useWindowDimensions, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';

const BillDetailsScreen = () => {
    const { id } = useLocalSearchParams();
    const [bill, setBill] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    const fetchBillDetails = async () => {
        setLoading(true);
        try {
            const billRef = doc(db, 'bills', id as string);
            const billSnap = await getDoc(billRef);

            if (billSnap.exists()) {
                const billData = billSnap.data();
                setBill({ ...billData, id: billSnap.id, date: billData.createdAt.toDate() });

                if (billData.customerId) {
                    const customerRef = doc(db, "customers", billData.customerId);
                    const customerSnap = await getDoc(customerRef);
                    if (customerSnap.exists()) {
                        setCustomer(customerSnap.data());
                    }
                }

                if (billData.orderIds && billData.orderIds.length > 0) {
                    const orderRef = doc(db, 'orders', billData.orderIds[0]);
                    const orderSnap = await getDoc(orderRef);
                    if (orderSnap.exists()) {
                        const orderData = orderSnap.data();
                        const itemsWithClothTypeNames = await Promise.all(orderData.items.map(async (item) => {
                            if (item.clothTypeId) {
                                const clothTypeRef = doc(db, "cloth-types", item.clothTypeId);
                                const clothTypeSnap = await getDoc(clothTypeRef);
                                if (clothTypeSnap.exists()) {
                                    return { ...item, clothTypeName: clothTypeSnap.data().name };
                                }
                            }
                            return item;
                        }));
                        setOrder({ ...orderData, items: itemsWithClothTypeNames });
                    }
                }
            } else {
                Alert.alert("Error", "Bill not found.");
                router.back();
            }
        } catch (error) {
            console.error("Error fetching bill details: ", error);
            Alert.alert("Error", "Could not fetch bill details.");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { if (id) fetchBillDetails(); }, [id]));

    const handleDownloadPdf = async () => {
        if (!bill || !customer || !order) return;

        const itemsHtml = order.items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.clothTypeName || 'N/A'}</td>
                <td>${item.quantity || 0}</td>
                <td>${(item.price || 0).toFixed(2)}</td>
                <td>${(item.totalPrice || 0).toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = `
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; }
        .header { display: flex; justify-content: space-between; }
        .company-details { text-align: left; }
        .company-name { font-size: 24px; font-weight: bold; color: #E74C3C; }
        .invoice-details { text-align: right; }
        .invoice-title { font-size: 24px; font-weight: bold; color: #E74C3C; }
        .customer-details { margin-top: 20px; margin-bottom: 20px; }
        .item-table { width: 100%; border-collapse: collapse; }
        .item-table th, .item-table td { border: 1px solid #ddd; padding: 8px; }
        .item-table th { background-color: #f2f2f2; }
        .total { text-align: right; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="company-details">
                <div class="company-name">Alundry</div>
                <div>Your Slogan</div>
                <div>Address Line 1, Address Line 2, Address Line 3</div>
                <div>Phone Number, Mobile Number</div>
                <div>yourname@email.com</div>
                <div>www.companyname.com</div>
            </div>
            <div class="invoice-details">
                <div class="invoice-title">INVOICE</div>
                <div>Invoice No. : #${bill.id.substring(0, 5)}</div>
                <div>Invoice Date : ${bill.date.toLocaleDateString()}</div>
            </div>
        </div>
        <div class="customer-details">
            <div>Name: ${customer.name}</div>
            <div>Address: ${customer.address || 'N/A'}</div>
            <div>Phone Number: ${customer.phone || 'N/A'}</div>
        </div>
        <table class="item-table">
            <thead>
                <tr>
                    <th>Sl.No.</th>
                    <th>Description</th>
                    <th>Qty.</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        <div class="total">
            <strong>Total:</strong> ${(bill.total || 0).toFixed(2)}
        </div>
        <div>
            <strong>Rupees in words:</strong>
        </div>
    </div>
</body>
</html>`;

        try {
            const { uri } = await printToFileAsync({ html: htmlContent });
            await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Could not generate or share the PDF.');
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#007bff" style={styles.centered} />;
    }

    if (!bill) {
        return <View style={styles.centered}><Text>Bill not found.</Text></View>;
    }

    return (
        <View style={{flex: 1}}>
            <ScrollView style={styles.container}>
                <View style={styles.invoiceBox}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.companyDetails}>
                            <Text style={styles.companyName}>Alundry</Text>
                            <Text style={styles.slogan}>Your Slogan</Text>
                            <Text style={styles.address}>Address Line 1, Address Line 2, Address Line 3</Text>
                            <Text style={styles.contact}>Phone Number, Mobile Number</Text>
                            <Text style={styles.contact}>yourname@email.com</Text>
                            <Text style={styles.contact}>www.companyname.com</Text>
                        </View>
                        <View style={styles.invoiceDetails}>
                            <Text style={styles.invoiceTitle}>INVOICE</Text>
                            <Text style={styles.invoiceInfo}>Invoice No. : #{bill.id.substring(0, 5)}</Text>
                            <Text style={styles.invoiceInfo}>Invoice Date : {bill.date.toLocaleDateString()}</Text>
                        </View>
                    </View>

                    {/* Customer Details */}
                    <View style={styles.customerDetails}>
                        <Text style={styles.detailText}>Name: {customer?.name}</Text>
                        <Text style={styles.detailText}>Address: {customer?.address}</Text>
                        <Text style={styles.detailText}>Phone Number: {customer?.phone}</Text>
                    </View>


                    {/* Items Table */}
                    <View style={styles.itemTable}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerText, {flex: 0.5}]}>Sl.No.</Text>
                            <Text style={[styles.headerText, {flex: 2}]}>Description</Text>
                            <Text style={[styles.headerText, {flex: 0.5}]}>Qty.</Text>
                            <Text style={[styles.headerText, {flex: 1}]}>Rate</Text>
                            <Text style={[styles.headerText, {flex: 1}]}>Amount</Text>
                        </View>
                        {order?.items.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.rowText, {flex: 0.5}]}>{index + 1}</Text>
                                <Text style={[styles.rowText, {flex: 2}]}>{item.clothTypeName || 'N/A'}</Text>
                                <Text style={[styles.rowText, {flex: 0.5}]}>{item.quantity || 0}</Text>
                                <Text style={[styles.rowText, {flex: 1}]}>{(item.price || 0).toFixed(2)}</Text>
                                <Text style={[styles.rowText, {flex: 1}]}>{(item.totalPrice || 0).toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Total */}
                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>Grand Total (₹)</Text>
                        <Text style={styles.totalAmount}>{(bill.total || 0).toFixed(2)}</Text>
                    </View>
                </View>
            </ScrollView>
            <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPdf}>
                <Text style={styles.downloadButtonText}>Download PDF</Text>
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (width) => {
    const scale = width / 414;
    return StyleSheet.create({
        centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        container: { flex: 1, backgroundColor: '#ffffff' },
        invoiceBox: { padding: 25 * scale, flex: 1 },
        header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 * scale },
        companyDetails: { flex: 1 },
        companyName: { fontSize: 24 * scale, fontWeight: 'bold', color: '#E74C3C' },
        slogan: { fontSize: 14 * scale, color: '#888', marginTop: 5 },
        address: { fontSize: 14 * scale, color: '#888', marginTop: 5 },
        contact: { fontSize: 14 * scale, color: '#888', marginTop: 5 },
        invoiceDetails: { flex: 1, alignItems: 'flex-end' },
        invoiceTitle: { fontSize: 24 * scale, fontWeight: 'bold', color: '#E74C3C' },
        invoiceInfo: { fontSize: 14 * scale, color: '#555', marginTop: 5 },
        customerDetails: { marginTop: 20 * scale, marginBottom: 20 * scale, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
        detailText: { fontSize: 15 * scale, color: '#333', marginBottom: 5 },
        itemTable: { marginTop: 20 },
        tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 10, marginBottom: 5 },
        headerText: { fontWeight: 'bold', color: '#495057' },
        tableRow: { flexDirection: 'row', paddingVertical: 10 * scale, borderBottomWidth: 1, borderBottomColor: '#eee' },
        rowText: { color: '#333', fontSize: 15 * scale, textAlign: 'right'},
        totalContainer: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 20 * scale, paddingTop: 10 * scale, borderTopWidth: 1, borderTopColor: '#eee' },
        totalLabel: { fontSize: 18 * scale, fontWeight: 'bold', marginRight: 15 },
        totalAmount: { fontSize: 22 * scale, fontWeight: 'bold', color: '#333' },
        downloadButton: { backgroundColor: '#3c9ee5', padding: 20, alignItems: 'center', justifyContent: 'center', margin: 20 * scale, borderRadius: 10 },
        downloadButtonText: { color: 'white', fontSize: 18 * scale, fontWeight: 'bold' },
    });
};

export default BillDetailsScreen;
