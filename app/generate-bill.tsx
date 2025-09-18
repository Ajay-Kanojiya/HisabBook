import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert,
    useWindowDimensions, Button
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
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
    
    const router = useRouter();
    const user = auth.currentUser;
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    useEffect(() => {
        if (user) {
            fetchCustomers();
        }
    }, [user]);

    const fetchCustomers = async () => {
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

    const handleGenerateBill = async () => {
        if (!selectedCustomer) {
            Alert.alert("Error", "Please select a customer.");
            return;
        }

        try {
            // Fetch orders within the date range for the selected customer
            const ordersQuery = query(
                collection(db, 'orders'),
                where("userEmail", "==", user.email),
                where("customerId", "==", selectedCustomer),
                where("createdAt", ">=", startDate),
                where("createdAt", "<=", endDate)
            );

            const ordersSnapshot = await getDocs(ordersQuery);
            if (ordersSnapshot.empty) {
                Alert.alert("No Orders", "No orders found for the selected customer in this date range.");
                return;
            }

            const totalAmount = ordersSnapshot.docs.reduce((acc, doc) => acc + doc.data().total, 0);

            // Create a new bill
            await addDoc(collection(db, 'bills'), {
                userEmail: user.email,
                customerId: selectedCustomer,
                createdAt: serverTimestamp(),
                startDate,
                endDate,
                total: totalAmount,
                status: 'Pending', // Default status
            });

            Alert.alert("Success", "Bill generated successfully.");
            router.back();

        } catch (error) {
            console.error("Error generating bill: ", error);
            Alert.alert("Error", "Could not generate bill. Please check your Firestore indexes.");
        }
    };
    
    const onDateChange = (event, selectedDate, type) => {
        if (type === 'start') {
            const currentDate = selectedDate || startDate;
            setShowStartDatePicker(false);
            setStartDate(currentDate);
        } else {
            const currentDate = selectedDate || endDate;
            setShowEndDatePicker(false);
            setEndDate(currentDate);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={styles.headerIconSize} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Generate Bill</Text>
                <View style={{width: styles.headerIconSize}}/>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Select Customer</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedCustomer}
                        onValueChange={(itemValue) => setSelectedCustomer(itemValue)}
                        style={styles.picker}
                    >
                        <Picker.Item label="Choose a customer" value={null} />
                        {customers.map(c => (
                            <Picker.Item key={c.id} label={c.name} value={c.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Select Date Range</Text>
                <View style={styles.dateRangeContainer}>
                    <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateInput}>
                        <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                        <MaterialCommunityIcons name="calendar" size={styles.iconSize} color="#007bff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateInput}>
                        <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                        <MaterialCommunityIcons name="calendar" size={styles.iconSize} color="#007bff" />
                    </TouchableOpacity>
                </View>

                {showStartDatePicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={(e,d)=>onDateChange(e,d,'start')}
                    />
                )}
                {showEndDatePicker && (
                    <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                       onChange={(e,d)=>onDateChange(e,d,'end')}
                    />
                )}
            </View>

            <TouchableOpacity style={styles.generateButton} onPress={handleGenerateBill}>
                <MaterialCommunityIcons name="receipt" size={styles.generateButtonIconSize} color="white" />
                <Text style={styles.generateButtonText}>Generate Bill</Text>
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (width) => {
    const scale = width / 375;
    const responsiveSize = (size) => Math.round(size * scale);

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#ffffff',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: responsiveSize(60),
            paddingBottom: responsiveSize(20),
            paddingHorizontal: responsiveSize(20),
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: '#f0f0f0',
        },
        headerTitle: {
            fontSize: responsiveSize(20),
            fontWeight: 'bold',
            color: '#000',
        },
        form: {
            padding: responsiveSize(20),
        },
        label: {
            fontSize: responsiveSize(16),
            marginBottom: responsiveSize(10),
            color: '#000',
            fontWeight: '500',
        },
        pickerContainer: {
            backgroundColor: '#f0f0f0',
            borderRadius: responsiveSize(10),
            marginBottom: responsiveSize(20),
            borderWidth: 1,
            borderColor: '#ddd',
        },
        picker: {
            height: responsiveSize(50),
        },
        dateRangeContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: responsiveSize(20),
        },
        dateInput: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f0f0f0',
            borderRadius: responsiveSize(10),
            paddingHorizontal: responsiveSize(15),
            paddingVertical: responsiveSize(12),
            borderWidth: 1,
            borderColor: '#ddd',
            width: '48%',
        },
        dateText: {
            fontSize: responsiveSize(16),
            color: '#000',
            marginRight: 'auto',
        },
        generateButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#007bff',
            padding: responsiveSize(15),
            borderRadius: responsiveSize(10),
            margin: responsiveSize(20),
        },
        generateButtonText: {
            color: 'white',
            fontSize: responsiveSize(16),
            fontWeight: 'bold',
            marginLeft: responsiveSize(10),
        },
        headerIconSize: responsiveSize(24),
        iconSize: responsiveSize(24),
        generateButtonIconSize: responsiveSize(22),
    });
}

export default GenerateBillScreen;
