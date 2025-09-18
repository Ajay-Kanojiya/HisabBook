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
        body { font-family: Arial, sans-serif; color: #333; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; }
        .company-details { text-align: left; }
        .company-name { font-size: 28px; font-weight: bold; color: #E74C3C; margin-bottom: 5px; }
        .slogan { margin-bottom: 10px; }
        .invoice-details { text-align: right; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #E74C3C; margin-bottom: 10px;}
        .customer-info { margin-top: 30px; }
        .info-line { display: flex; margin-bottom: 10px; }
        .info-label { font-weight: bold; }
        .info-value { border-bottom: 1px dotted #aaa; flex-grow: 1; margin-left: 10px; }
        .item-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .item-table th, .item-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .item-table th { background-color: #f2f2f2; }
        .item-table td { text-align: right; }
        .item-table td:nth-child(2) { text-align: left; }
        .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;}
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="company-details">
                <div class="company-name">Company Name</div>
                <div class="slogan">Your Slogan</div>
                <div>Address Line 1, Address Line 2, Address Line 3</div>
                <div>Phone Number, Mobile Number</div>
                <div>yourname@email.com</div>
                <div>www.companyname.com</div>
            </div>
            <div class="invoice-details">
                <div class="invoice-title">INVOICE</div>
                <div><strong>Invoice No. :</strong> #${bill.id.substring(0, 5)}</div>
                <div><strong>Invoice Date :</strong> ${bill.date.toLocaleDateString()}</div>
            </div>
        </div>
        <div class="customer-info">
            <div class="info-line">
                <span class="info-label">Name:</span>
                <span class="info-value">${customer.name}</span>
            </div>
            <div class="info-line">
                <span class="info-label">Address:</span>
                <span class="info-value">${customer.address || 'N/A'}</span>
            </div>
            <div class="info-line">
                <span class="info-label">Phone Number:</span>
                <span class="info-value">${customer.phone || 'N/A'}</span>
            </div>
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
        <div class="footer">
            <div><strong>Rupees in words:</strong></div>
            <div style="text-align: right;">
                <strong>Total:</strong> ${(bill.total || 0).toFixed(2)}
            </div>
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
                        <View style={styles.companyDetails}>
                            <Text style={styles.companyName}>Company Name</Text>
                            <Text style={styles.slogan}>Your Slogan</Text>
                            <Text>Address Line 1, Address Line 2, Address Line 3</Text>
                            <Text>Phone Number, Mobile Number</Text>
                            <Text>yourname@email.com</Text>
                            <Text>www.companyname.com</Text>
                        </View>
                        <View style={styles.invoiceDetails}>
                            <Text style={styles.invoiceTitle}>INVOICE</Text>
                            <Text>Invoice No. : #{bill.id.substring(0, 5)}</Text>
                            <Text>Invoice Date : {bill.date.toLocaleDateString()}</Text>
                        </View>
                    </View>

                    <View style={styles.customerInfo}>
                        <View style={styles.infoLine}>
                            <Text style={styles.infoLabel}>Name:</Text>
                            <View style={styles.infoValue}><Text>{customer?.name}</Text></View>
                        </View>
                        <View style={styles.infoLine}>
                            <Text style={styles.infoLabel}>Address:</Text>
                            <View style={styles.infoValue}><Text>{customer?.address}</Text></View>
                        </View>
                        <View style={styles.infoLine}>
                            <Text style={styles.infoLabel}>Phone Number:</Text>
                            <View style={styles.infoValue}><Text>{customer?.phone}</Text></View>
                        </View>
                    </View>

                    <View style={styles.itemTable}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerText, {width: 50}]}>Sl.No.</Text>
                            <Text style={[styles.headerText, {flex: 1}]}>Description</Text>
                            <Text style={[styles.headerText, {width: 40}]}>Qty.</Text>
                            <Text style={[styles.headerText, {width: 60}]}>Rate</Text>
                            <Text style={[styles.headerText, {width: 80, textAlign: 'right'}]}>Amount</Text>
                        </View>
                        {order?.items.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={{width: 50}}>{index + 1}</Text>
                                <Text style={{flex: 1}}>{item.clothTypeName || 'N/A'}</Text>
                                <Text style={{width: 40}}>{item.quantity || 0}</Text>
                                <Text style={{width: 60}}>{(item.price || 0).toFixed(2)}</Text>
                                <Text style={{width: 80, textAlign: 'right'}}>{(item.totalPrice || 0).toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.footer}>
                        <Text style={{fontWeight: 'bold'}}>Rupees in words:</Text>
                        <View style={{alignItems: 'flex-end'}}>
                            <View style={{flexDirection: 'row'}}>
                                <Text style={{fontWeight: 'bold'}}>Total: </Text>
                                <Text>{(bill.total || 0).toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
            <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPdf}>
                <Text style={styles.downloadButtonText}>Download PDF</Text>
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (width) => StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#ffffff' },
    invoiceBox: { padding: 20, flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    companyDetails: { flex: 1 },
    companyName: { fontSize: 28, fontWeight: 'bold', color: '#E74C3C', marginBottom: 5 },
    slogan: { marginBottom: 10, fontStyle: 'italic' },
    invoiceDetails: { alignItems: 'flex-end' },
    invoiceTitle: { fontSize: 28, fontWeight: 'bold', color: '#E74C3C', marginBottom: 10 },
    customerInfo: { marginTop: 30, marginBottom: 20 },
    infoLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    infoLabel: { fontWeight: 'bold', marginRight: 5 },
    infoValue: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 2, borderStyle: 'dotted' },
    itemTable: { borderTopWidth: 1, borderTopColor: '#000' },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', paddingVertical: 5 },
    headerText: { fontWeight: 'bold' },
    tableRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#eee'},
    footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 10, marginTop: 10 },
    downloadButton: { backgroundColor: '#3c9ee5', padding: 15, alignItems: 'center', justifyContent: 'center', margin: 20, borderRadius: 10 },
    downloadButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});

export default BillDetailsScreen;
