import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EditClothTypeScreen = () => {
    const { id } = useLocalSearchParams();
    const [name, setName] = useState('');
    const [rate, setRate] = useState('');
    const router = useRouter();
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    useEffect(() => {
        const fetchClothType = async () => {
            try {
                const docRef = doc(db, 'cloth-types', id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const clothTypeData = docSnap.data();
                    setName(clothTypeData.name);
                    setRate(clothTypeData.rate.toString());
                }
            } catch (error) {
                console.error("Error fetching cloth type: ", error);
            }
        };
        fetchClothType();
    }, [id]);

    const handleUpdate = async () => {
        if (!name || !rate) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }

        try {
            const docRef = doc(db, 'cloth-types', id as string);
            await updateDoc(docRef, {
                name: name,
                rate: parseFloat(rate),
                lastModified: serverTimestamp(),
            });
            Alert.alert('Success', 'Cloth type updated successfully.');
            router.replace('/(tabs)/cloth-types');
        } catch (error) {
            console.error("Error updating document: ", error);
            Alert.alert('Error', 'Could not update cloth type.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={styles.headerTitle.fontSize} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Cloth Type</Text>
                <View style={{width: styles.headerTitle.fontSize}}/>
            </View>
            <View style={styles.form}>
                <Text style={styles.label}>Cloth Type Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Shirt, Pant, Saree"
                    placeholderTextColor="#888"
                    value={name}
                    onChangeText={setName}
                />
                <Text style={styles.label}>Rate</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter rate per item"
                    placeholderTextColor="#888"
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="numeric"
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
                    <Text style={styles.saveButtonText}>Update Cloth Type</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const getStyles = (width) => {
    const baseWidth = 375;
    const scale = width / baseWidth;
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
        input: {
            backgroundColor: '#f0f0f0',
            paddingHorizontal: responsiveSize(15),
            paddingVertical: responsiveSize(12),
            borderRadius: responsiveSize(10),
            marginBottom: responsiveSize(20),
            fontSize: responsiveSize(16),
            color: '#000',
            borderWidth: 1,
            borderColor: '#ddd',
        },
        saveButton: {
            backgroundColor: '#007bff',
            padding: responsiveSize(15),
            borderRadius: responsiveSize(10),
            alignItems: 'center',
            marginTop: responsiveSize(10),
        },
        saveButtonText: {
            color: 'white',
            fontSize: responsiveSize(16),
            fontWeight: 'bold',
        },
    });
}

export default EditClothTypeScreen;
