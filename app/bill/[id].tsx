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

        const itemsHtml = order.items.map(item => `
            <tr class="item">
                <td>${item.clothTypeName || 'N/A'}</td>
                <td>${item.quantity || 0}</td>
                <td>₹${(item.price || 0).toFixed(2)}</td>
                <td>₹${(item.totalPrice || 0).toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; color: #495057; }
                    .invoice-box { max-width: 800px; margin: auto; padding: 30px; background-color: #fff; border: 1px solid #eee; font-size: 16px; line-height: 24px; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    .shop-info h1 { margin: 0; font-size: 24px; color: #333; font-weight: bold; }
                    .shop-info span { font-size: 14px; color: #888; }
                    .invoice-info h1 { margin: 0; font-size: 45px; color: #3c9ee5; text-align: right;}
                    .invoice-info span { font-size: 16px; color: #555; display: block; text-align: right; }
                    .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .bill-to, .details-info { flex: 1; }
                    .bill-to strong { font-size: 18px; color: #333; }
                    .details-info { text-align: right; }
                    .item-table { width: 100%; text-align: left; border-collapse: collapse; }
                    .item-table thead th { background: #f8f9fa; border-bottom: 2px solid #dee2e6; padding: 10px 5px; font-weight: bold; }
                    .item-table .item td { padding: 12px 5px; border-bottom: 1px solid #eee; }
                    .total { text-align: right; margin-top: 30px; padding-top: 15px; border-top: 2px solid #3c9ee5;}
                    .total strong { font-size: 18px; }
                    .total span { font-size: 28px; font-weight: bold; color: #3c9ee5; margin-left: 15px; }
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
                            ${customer.name}<br>
                            ${customer.phone || 'N/A'}<br>
                            ${customer.address || 'N/A'}
                        </div>
                        <div class="details-info">
                            <strong>Date of Issue:</strong><br>
                            ${bill.date.toLocaleDateString()}
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
                        <span>${(bill.total || 0).toFixed(2)}</span>
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
                    <View style={styles.header}>
                        <View style={styles.shopInfo}>
                            <Text style={styles.shopName}>Laundry Shop</Text>
                            <Text style={styles.shopAddress}>123 Clean St, Fresh City, 12345</Text>
                        </View>
                        <View style={styles.invoiceInfo}>
                            <Text style={styles.invoiceTitle}>INVOICE</Text>
                            <Text style={styles.invoiceNumber}>#{bill.id.substring(0, 5)}</Text>
                        </View>
                    </View>

                    <View style={styles.details}>
                        <View style={styles.billTo}>
                            <Text style={styles.sectionTitle}>Bill To</Text>
                            <Text>{customer?.name}</Text>
                            <Text>{customer?.phone}</Text>
                            <Text>{customer?.address}</Text>
                        </View>
                        <View style={styles.detailsInfo}>
                            <Text style={styles.sectionTitle}>Details</Text>
                            <Text><Text style={{fontWeight: 'bold'}}>Date of Issue:</Text> {bill.date.toLocaleDateString()}</Text>
                        </View>
                    </View>

                    <View style={styles.itemTable}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderText, {flex: 3}]}>Cloth Type</Text>
                            <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'center'}]}>Quantity</Text>
                            <Text style={[styles.tableHeaderText, {flex: 1.5, textAlign: 'right'}]}>Rate (₹)</Text>
                            <Text style={[styles.tableHeaderText, {flex: 1.5, textAlign: 'right'}]}>Total (₹)</Text>
                        </View>
                        {order?.items.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, {flex: 3}]}>{item.clothTypeName || 'N/A'}</Text>
                                <Text style={[styles.tableCell, {flex: 1, textAlign: 'center'}]}>{item.quantity || 0}</Text>
                                <Text style={[styles.tableCell, {flex: 1.5, textAlign: 'right'}]}>{(item.price || 0).toFixed(2)}</Text>
                                <Text style={[styles.tableCell, {flex: 1.5, textAlign: 'right'}]}>{(item.totalPrice || 0).toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>
                    
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
        header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 * scale },
        shopInfo: { flex: 1 },
        shopName: { fontSize: 26 * scale, fontWeight: 'bold', color: '#333' },
        shopAddress: { fontSize: 14 * scale, color: '#888', marginTop: 5 },
        invoiceInfo: { flex: 1, alignItems: 'flex-end' },
        invoiceTitle: { fontSize: 40 * scale, fontWeight: 'bold', color: '#3c9ee5' },
        invoiceNumber: { fontSize: 15 * scale, color: '#555', marginTop: 5 },
        details: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 * scale },
        billTo: { flex: 1.5 },
        detailsInfo: { flex: 1, alignItems: 'flex-end', paddingTop: 20 },
        sectionTitle: { fontSize: 18 * scale, fontWeight: 'bold', color: '#333', marginBottom: 10 },
        itemTable: { marginTop: 20 },
        tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#dee2e6', paddingBottom: 10, marginBottom: 5 },
        tableHeaderText: { fontWeight: 'bold', color: '#495057' },
        tableRow: { flexDirection: 'row', paddingVertical: 15 * scale, borderBottomWidth: 1, borderBottomColor: '#eee' },
        tableCell: { color: '#333', fontSize: 15 * scale },
        totalContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 30 * scale, paddingTop: 20 * scale, borderTopWidth: 2, borderTopColor: '#3c9ee5' },
        totalLabel: { fontSize: 18 * scale, fontWeight: 'bold', marginRight: 15 },
        totalAmount: { fontSize: 28 * scale, fontWeight: 'bold', color: '#3c9ee5' },
        downloadButton: { backgroundColor: '#3c9ee5', padding: 20, alignItems: 'center', justifyContent: 'center', margin: 20 * scale, borderRadius: 10 },
        downloadButtonText: { color: 'white', fontSize: 18 * scale, fontWeight: 'bold' },
    });
};

export default BillDetailsScreen; 
