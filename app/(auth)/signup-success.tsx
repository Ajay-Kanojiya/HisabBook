
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SignupSuccessScreen = () => {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const styles = getStyles(width);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <MaterialCommunityIcons name="check-circle" size={styles.icon.fontSize} color={styles.icon.color} />
                <Text style={styles.title}>Account Created Successfully!</Text>
                <Text style={styles.subtitle}>Your account has been created successfully. You can now sign in to manage your laundry shop.</Text>
                <TouchableOpacity style={styles.signInButton} onPress={() => router.replace('/(auth)/login')}>
                    <Text style={styles.signInButtonText}>Sign In</Text>
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
            justifyContent: 'center',
            alignItems: 'center',
            padding: responsiveSize(20),
        },
        content: {
            alignItems: 'center',
            maxWidth: 400,
        },
        icon: {
            fontSize: responsiveSize(80),
            color: '#28a745',
            marginBottom: responsiveSize(20),
        },
        title: {
            fontSize: responsiveSize(22),
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: responsiveSize(10),
            color: '#343a40',
        },
        subtitle: {
            fontSize: responsiveSize(16),
            textAlign: 'center',
            marginBottom: responsiveSize(30),
            color: '#6c757d',
            lineHeight: responsiveSize(24),
        },
        signInButton: {
            backgroundColor: '#007bff',
            paddingVertical: responsiveSize(15),
            paddingHorizontal: responsiveSize(120),
            borderRadius: responsiveSize(10),
        },
        signInButtonText: {
            color: 'white',
            fontSize: responsiveSize(18),
            fontWeight: 'bold',
        },
    });
};

export default SignupSuccessScreen;
