import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, FlatList, Alert } from 'react-native';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

const InvoicesScreen = () => {
    const [invoices, setInvoices] = useState([]);
    const user = auth.currentUser;

    useEffect(() => {
        if (user) {
            fetchInvoices();
        }
    }, [user]);

    const fetchInvoices = async () => {
        if (!user) return;
        const invoicesCollection = collection(db, 'invoices');
        const q = query(invoicesCollection, where("userEmail", "==", user.email));
        const invoicesSnapshot = await getDocs(q);
        const invoicesList = invoicesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setInvoices(invoicesList);
    };

    const handleCreateInvoice = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to create an invoice.');
            return;
        }

        try {
            await addDoc(collection(db, 'invoices'), {
                createdAt: serverTimestamp(),
                userEmail: user.email,
                // Add more invoice details here
            });
            fetchInvoices();
            Alert.alert('Success', 'Invoice created successfully');
        } catch (error) {
            console.error('Error creating invoice: ', error);
            Alert.alert('Error', 'There was an error creating the invoice.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Manage Invoices</Text>
            <Button title="Create New Invoice" onPress={handleCreateInvoice} />

            <Text style={styles.subtitle}>Existing Invoices</Text>
            <FlatList
                data={invoices}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.listItem}>
                        <Text style={styles.listItemText}>Invoice #{item.id}</Text>
                        <Text>Created on: {new Date(item.createdAt.seconds * 1000).toLocaleDateString()}</Text>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 30,
        marginBottom: 10,
    },
    listItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    listItemText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default InvoicesScreen;
