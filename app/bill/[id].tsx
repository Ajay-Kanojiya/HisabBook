import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Alert, TouchableOpacity, useWindowDimensions, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';

const BillDetailsScreen = () => {
    const { id } = useLocalSearchParams();
    const [bill, setBill] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [order, setOrder] = useState(null);
    const [shop, setShop] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

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

    const fetchBillDetails = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where("email", "==", user.email));
                const usersSnap = await getDocs(q);
                if (!usersSnap.empty) {
                    const userDoc = usersSnap.docs[0];
                    setShop(userDoc.data());
                } else {
                    Alert.alert("Error", "Shop details could not be found for the current user.");
                }
            }

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

                if (billData.items) {
                    setOrder({ items: billData.items });
                }

            } else {
                setBill(null);
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

    useFocusEffect(useCallback(() => {
        if (id) {
            fetchBillDetails();
        }
    }, [id]));

    const handleDownloadPdf = async () => {
        if (!bill || !customer || !order || !shop) {
            Alert.alert("Missing Details", "Cannot generate PDF. Some details are missing.");
            return;
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
        .header { display: flex; justify-content: space-between; align-items: flex-start; }
        .company-details { text-align: left; }
        .company-name { font-size: 28px; font-weight: bold; color: #E74C3C; margin-bottom: 5px; }
        .slogan { margin-bottom: 10px; }
        .invoice-details { text-align: right; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #E74C3C; margin-bottom: 10px;}
        .customer-info { margin-top: 30px; text-align: left; }
        .info-line { display: flex; margin-bottom: 10px; }
        .info-label { font-weight: bold; width: 120px; }
        .info-value { flex-grow: 1; }
        .item-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .item-table th, .item-table td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        .item-table th { background-color: #f2f2f2; }
        .footer { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;}
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="company-details">
                <div class="company-name">${shop.shopName ?? '-'}</div>
                <div class="slogan">Your Slogan</div>
                <div>${shop.address ?? '-'}</div>
                <div>${shop.mobile ?? '-'}</div>
                <div>${shop.email ?? '-'}</div>
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
                    <th>Rate (₹)</th>
                    <th>Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        <div class="footer">
            <div style="flex: 1; margin-right: 10px;"><strong>Rupees in words:</strong> ${numberToWords(bill.total)}</div>
            <div style="text-align: right;">
                <strong>Total:</strong> ₹${(bill.total || 0).toFixed(2)}
            </div>
        </div>
    </div>
</body>
</html>`;

        try {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const date = new Date(bill.date);
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();

            const fileName = `${customer.name.replace(/\s+/g, '_')}-${bill.id.substring(0, 5)}-${month}${year}.pdf`;
            const { uri } = await printToFileAsync({ 
                html: htmlContent,
                base64: false,
            });
            await shareAsync(uri, { 
                UTI: '.pdf', 
                mimeType: 'application/pdf', 
                dialogTitle: fileName,
                filename: fileName
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Could not generate or share the PDF.');
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#007bff" style={styles.centered} />;
    }

    if (!bill) {
        return (
            <View style={styles.centered}>
                <Text>Bill not found.</Text>
            </View>
        );
    }

    return (
        <View style={{flex: 1}}>
            <ScrollView style={styles.container}>
                <View style={styles.invoiceBox}>
                    <View style={styles.header}>
                        <View style={styles.companyDetails}>
                            <Text style={styles.companyName}>{shop?.shopName ?? '-'}</Text>
                            <Text style={styles.slogan}>Your Slogan</Text>
                            <Text>{shop?.address ?? '-'}</Text>
                            <Text>{shop?.mobile ?? '-'}</Text>
                            <Text>{shop?.email ?? '-'}</Text>
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
                            <Text style={[styles.headerText, {width: '15%', textAlign: 'center'}]}>Sl.No.</Text>
                            <Text style={[styles.headerText, {width: '35%', textAlign: 'left'}]}>Description</Text>
                            <Text style={[styles.headerText, {width: '10%', textAlign: 'center'}]}>Qty.</Text>
                            <Text style={[styles.headerText, {width: '20%', textAlign: 'center'}]}>Rate (₹)</Text>
                            <Text style={[styles.headerText, {width: '20%', textAlign: 'center'}]}>Amount (₹)</Text>
                        </View>
                        {order?.items.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={{width: '15%', textAlign: 'center'}}>{index + 1}</Text>
                                <Text style={{width: '35%', textAlign: 'left'}}>{item.clothTypeName || 'N/A'}</Text>
                                <Text style={{width: '10%', textAlign: 'center'}}>{item.quantity || 0}</Text>
                                <Text style={{width: '20%', textAlign: 'center'}}>₹{(item.price || 0).toFixed(2)}</Text>
                                <Text style={{width: '20%', textAlign: 'center'}}>₹{(item.totalPrice || 0).toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.footer}>
                        <View style={{flex: 1, marginRight: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
                            <Text style={{fontWeight: 'bold'}}>Rupees in words: </Text>
                            <Text>{numberToWords(bill.total)}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            <View style={{flexDirection: 'row'}}>
                                <Text style={{fontWeight: 'bold'}}>Total: </Text>
                                <Text>₹{(bill.total || 0).toFixed(2)}</Text>
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

const getStyles = (width) => {
    const baseWidth = 375;
    const scale = width / baseWidth;
    const responsiveSize = (size) => Math.round(size * scale);

    return StyleSheet.create({
        centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
        container: { flex: 1, backgroundColor: '#ffffff' },
        invoiceBox: { padding: responsiveSize(20), flex: 1 },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: responsiveSize(20) },
        companyDetails: { flex: 1 },
        companyName: { fontSize: responsiveSize(28), fontWeight: 'bold', color: '#E74C3C', marginBottom: responsiveSize(5) },
        slogan: { marginBottom: responsiveSize(10), fontStyle: 'italic' },
        invoiceDetails: { alignItems: 'flex-end' },
        invoiceTitle: { fontSize: responsiveSize(28), fontWeight: 'bold', color: '#E74C3C', marginBottom: responsiveSize(10) },
        customerInfo: { marginTop: responsiveSize(30), marginBottom: responsiveSize(20), alignItems: 'flex-start' },
        infoLine: { flexDirection: 'row', alignItems: 'center', marginBottom: responsiveSize(10) },
        infoLabel: { fontWeight: 'bold', marginRight: responsiveSize(5) },
        infoValue: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: responsiveSize(2), borderStyle: 'dotted' },
        itemTable: { borderTopWidth: 1, borderTopColor: '#000' },
        tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', paddingVertical: responsiveSize(5) },
        headerText: { fontWeight: 'bold' },
        tableRow: { flexDirection: 'row', paddingVertical: responsiveSize(5), borderBottomWidth: 1, borderBottomColor: '#eee'},
        footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: '#000', paddingTop: responsiveSize(10), marginTop: responsiveSize(10) },
        downloadButton: { backgroundColor: '#007bff', padding: responsiveSize(15), alignItems: 'center', justifyContent: 'center', margin: responsiveSize(20), borderRadius: responsiveSize(10) },
        downloadButtonText: { color: 'white', fontSize: responsiveSize(18), fontWeight: 'bold' },
    });
}

export default BillDetailsScreen;
