
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const GenerateBillScreen = () => {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const customersQuery = query(collection(db, 'customers'), where("userEmail", "==", user.email));
                const customersSnapshot = await getDocs(customersQuery);
                const customersList = customersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setCustomers(customersList);

                const ordersQuery = query(collection(db, 'orders'), where("userEmail", "==", user.email), orderBy("lastModified", "asc"));
                const ordersSnapshot = await getDocs(ordersQuery);

                if (!ordersSnapshot.empty) {
                    const firstOrder = ordersSnapshot.docs[0].data();
                    const lastOrder = ordersSnapshot.docs[ordersSnapshot.docs.length - 1].data();
                    if (firstOrder.lastModified) setStartDate(firstOrder.lastModified.toDate());
                    if (lastOrder.lastModified) setEndDate(lastOrder.lastModified.toDate());
                }
                
            } catch (error) {
                console.error("Error fetching initial data: ", error);
                if (error.code === 'failed-precondition') {
                    Alert.alert("Database Index Required", "A database index is required. Please check the terminal for a link to create it.");
               } else {
                   Alert.alert("Error", "Could not fetch initial data.");
               }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleGenerateBill = async () => {
        if (!selectedCustomer) {
            Alert.alert("Invalid Input", "Please select a customer.");
            return;
        }
        if (!user) {
            Alert.alert("Authentication Error", "You must be logged in.");
            return;
        }

        setLoading(true);

        const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1, 0, 0, 0);

        try {
            const ordersQuery = query(
                collection(db, 'orders'),
                where("userEmail", "==", user.email),
                where("customerId", "==", selectedCustomer),
                where("lastModified", ">=", start),
                where("lastModified", "<", end)
            );

            const ordersSnapshot = await getDocs(ordersQuery);

            if (ordersSnapshot.empty) {
                console.log("Query executed, but no documents were found.");
                Alert.alert("No Orders Found", "No orders were found for the selected customer and date range.");
                setLoading(false);
                return;
            }

            const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const totalAmount = orders.reduce((acc, order) => acc + order.total, 0);
            const orderIds = orders.map(order => order.id);

            await addDoc(collection(db, 'bills'), {
                userEmail: user.email,
                customerId: selectedCustomer,
                createdAt: serverTimestamp(),
                startDate: start,
                endDate: endDate,
                total: totalAmount,
                status: 'Pending',
                orderIds: orderIds,
            });

            Alert.alert("Success", "Bill generated successfully!");
            router.replace('/(tabs)/bills');

        } catch (error) {
            console.error("Error generating bill: ", error);
            if (error.code === 'failed-precondition') {
                 Alert.alert("Database Index Required", "A database index is missing. Check the terminal for a URL to create it.");
            } else {
                Alert.alert("Error", `Could not generate bill. ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };
    
    const onDateChange = (event, selectedDate, type) => {
        const pickerState = type === 'start' ? setShowStartDatePicker : setShowEndDatePicker;
        const dateState = type === 'start' ? setStartDate : setEndDate;
        pickerState(false);
        if (selectedDate) {
            dateState(selectedDate);
        }
    };

    if (loading && !customers.length) {
        return <ActivityIndicator size="large" color="#007bff" style={{flex: 1, justifyContent: 'center'}} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={styles.headerTitle.fontSize} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Generate Bill</Text>
                <View style={{width: styles.headerTitle.fontSize}}/>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Customer</Text>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={selectedCustomer}
                        onValueChange={(itemValue) => setSelectedCustomer(itemValue)}
                        style={styles.picker}
                    >
                        <Picker.Item label="Select a customer" value={null} />
                        {customers.map((c) => (
                            <Picker.Item key={c.id} label={c.name} value={c.id} />
                        ))}
                    </Picker>
                </View>

                <View style={styles.dateContainer}>
                    <View style={styles.dateInput}>
                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateDisplay}>
                            <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                            <MaterialCommunityIcons name="calendar" size={24} color="#007bff" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.dateInput}>
                        <Text style={styles.label}>End Date</Text>
                        <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateDisplay}>
                            <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                            <MaterialCommunityIcons name="calendar" size={24} color="#007bff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {showStartDatePicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => onDateChange(event, date, 'start')}
                    />
                )}

                {showEndDatePicker && (
                    <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => onDateChange(event, date, 'end')}
                    />
                )}

                <TouchableOpacity style={styles.generateButton} onPress={handleGenerateBill} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.generateButtonText}>Generate Bill</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const getStyles = (width) => {
    const scale = width / 375;
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: '#f8f9fa' },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
        headerTitle: { fontSize: 22 * scale, fontWeight: 'bold' },
        form: { padding: 20 },
        label: { fontSize: 16 * scale, color: '#495057', marginBottom: 10 },
        pickerWrapper: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', marginBottom: 20 },
        picker: { height: 50 * scale },
        dateContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
        dateInput: { flex: 1, marginRight: 10 },
        dateDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', padding: 15 },
        dateText: { fontSize: 16 * scale },
        generateButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20, minHeight: 50, justifyContent: 'center' },
        generateButtonText: { color: 'white', fontSize: 18 * scale, fontWeight: 'bold' },
    });
};

export default GenerateBillScreen;
