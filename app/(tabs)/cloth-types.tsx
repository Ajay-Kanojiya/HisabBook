import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert, Modal, TextInput, Button, KeyboardAvoidingView, Platform } from 'react-native';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ClothTypesScreen = () => {
    const [clothTypes, setClothTypes] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClothType, setCurrentClothType] = useState(null);
    const [name, setName] = useState('');
    const [rate, setRate] = useState('');

    const clothTypesCollectionRef = collection(db, 'clothTypes');

    useEffect(() => {
        const unsubscribe = onSnapshot(clothTypesCollectionRef, (snapshot) => {
            const clothTypesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setClothTypes(clothTypesData);
        });
        return () => unsubscribe();
    }, []);

    const handleAddOrUpdate = async () => {
        if (name.trim() === '' || rate.trim() === '') {
            Alert.alert('Validation Error', 'Please enter both name and rate.');
            return;
        }

        const rateValue = parseFloat(rate);
        if (isNaN(rateValue) || rateValue <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid rate.');
            return;
        }

        try {
            if (isEditing) {
                const clothTypeDoc = doc(db, 'clothTypes', currentClothType.id);
                await updateDoc(clothTypeDoc, { name, rate: rateValue });
            } else {
                await addDoc(clothTypesCollectionRef, { name, rate: rateValue });
            }
            resetForm();
        } catch (error) {
            console.error('Error saving cloth type: ', error);
            Alert.alert('Error', 'There was an error saving the cloth type.');
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            "Delete Cloth Type",
            "Are you sure you want to delete this cloth type?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "OK", 
                    onPress: async () => {
                        try {
                            const clothTypeDoc = doc(db, 'clothTypes', id);
                            await deleteDoc(clothTypeDoc);
                        } catch (error) {
                            console.error('Error deleting cloth type: ', error);
                            Alert.alert('Error', 'There was an error deleting the cloth type.');
                        }
                    } 
                }
            ]
        );
    };

    const openEditModal = (clothType) => {
        setIsEditing(true);
        setCurrentClothType(clothType);
        setName(clothType.name);
        setRate(clothType.rate.toString());
        setModalVisible(true);
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrentClothType(null);
        setName('');
        setRate('');
        setModalVisible(false);
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemRate}>${item.rate.toFixed(2)}</Text>
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => openEditModal(item)}>
                    <MaterialCommunityIcons name="pencil" size={24} color="#007bff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 15 }}>
                    <MaterialCommunityIcons name="delete" size={24} color="#dc3545" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Cloth Types & Rates</Text>
            </View>
            <FlatList
                data={clothTypes}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
            <TouchableOpacity style={styles.addButton} onPress={() => { setIsEditing(false); setModalVisible(true); }}>
                <MaterialCommunityIcons name="plus" size={24} color="white" />
                <Text style={styles.addButtonText}>Add New Cloth Type</Text>
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={resetForm}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.centeredView}
                >
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>{isEditing ? 'Edit Cloth Type' : 'Add New Cloth Type'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Cloth Name (e.g., Shirt)"
                            value={name}
                            onChangeText={setName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Rate (e.g., 2.50)"
                            value={rate}
                            onChangeText={setRate}
                            keyboardType="numeric"
                        />
                        <View style={styles.modalButtons}>
                            <Button title="Cancel" onPress={resetForm} color="#6c757d" />
                            <Button title={isEditing ? 'Update' : 'Add'} onPress={handleAddOrUpdate} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        backgroundColor: 'white',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        padding: 10,
    },
    itemContainer: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '500',
    },
    itemRate: {
        fontSize: 16,
        color: '#6c757d',
    },
    itemActions: {
        flexDirection: 'row',
    },
    addButton: {
        backgroundColor: '#007bff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        margin: 20,
        borderRadius: 10,
    },
    addButtonText: {
        color: 'white',
        fontSize: 18,
        marginLeft: 10,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 15,
        fontWeight: 'bold'
    },
    input: {
        width: '100%',
        height: 50,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
});

export default ClothTypesScreen;
