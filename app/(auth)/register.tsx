
import React, { useState, useMemo, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, SafeAreaView } from 'react-native';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const getStyles = (width) => {
    const scale = width / 375;
    const responsiveSize = (size) => Math.round(size * scale);

    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: '#f8f9fa',
        },
        mainContainer: {
            flex: 1,
        },
        header: {
            alignItems: 'center',
            paddingHorizontal: responsiveSize(20),
            paddingTop: responsiveSize(40),
            paddingBottom: responsiveSize(20),
        },
        formScrollView: {
            flex: 1,
            paddingHorizontal: responsiveSize(20),
        },
        scrollContentContainer: {
            paddingBottom: responsiveSize(20),
        },
        bottomContainer: {
            backgroundColor: '#f8f9fa',
        },
        buttonContainer: {
            paddingHorizontal: responsiveSize(20),
            paddingTop: responsiveSize(10),
            paddingBottom: responsiveSize(10),
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'center',
            padding: responsiveSize(20),
            borderTopWidth: 1,
            borderTopColor: '#e9ecef',
        },
        title: {
            fontSize: responsiveSize(24),
            fontWeight: 'bold',
            color: '#333',
            marginBottom: responsiveSize(5),
        },
        subtitle: {
            fontSize: responsiveSize(16),
            color: '#888',
            textAlign: 'center',
        },
        label: {
            fontSize: responsiveSize(14),
            color: '#333',
            marginBottom: responsiveSize(5),
            fontWeight: '500',
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: responsiveSize(10),
            paddingHorizontal: responsiveSize(15),
            borderWidth: 1,
            borderColor: '#ddd',
        },
        inputError: {
            borderColor: '#dc3545',
        },
        inputIcon: {
            marginRight: responsiveSize(10),
        },
        input: {
            flex: 1,
            height: responsiveSize(50),
            fontSize: responsiveSize(16),
            color: '#333',
        },
        errorText: {
            color: '#dc3545',
            fontSize: responsiveSize(12),
            marginTop: responsiveSize(4),
            marginLeft: responsiveSize(5)
        },
        formErrorText: {
            color: '#dc3545',
            fontSize: responsiveSize(14),
            textAlign: 'center',
            marginBottom: responsiveSize(10),
        },
        button: {
            backgroundColor: '#007bff',
            paddingVertical: responsiveSize(15),
            borderRadius: responsiveSize(10),
            alignItems: 'center',
        },
        buttonText: {
            color: '#fff',
            fontSize: responsiveSize(18),
            fontWeight: 'bold',
        },
        footerText: {
            fontSize: responsiveSize(16),
            color: '#888',
        },
        footerLink: {
            fontSize: responsiveSize(16),
            color: '#007bff',
            fontWeight: 'bold',
        },
    });
};

const Input = memo(({ label, placeholder, value, onChangeText, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'sentences', error, aname, styles }) => (
    <View style={{ marginBottom: 15 }}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputContainer, error ? styles.inputError : {}]}>
            <MaterialCommunityIcons name={aname} size={20} color="#888" style={styles.inputIcon} />
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                placeholderTextColor="#888"
            />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
));

const RegisterScreen = () => {
    const [ownerName, setOwnerName] = useState('');
    const [shopName, setShopName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [formError, setFormError] = useState('');
    const router = useRouter();
    const { width } = useWindowDimensions();
    const styles = useMemo(() => getStyles(width), [width]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

        if (!ownerName) newErrors.ownerName = 'Owner name is required';
        if (!shopName) newErrors.shopName = 'Shop name is required';
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (!mobile) newErrors.mobile = 'Mobile number is required';
        if (!address) newErrors.address = 'Address is required';
        if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        setFormError('');
        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await addDoc(collection(db, 'users'), {
                uid: user.uid,
                ownerName,
                shopName,
                email,
                mobile,
                address,
                createdAt: new Date(),
            });

            await signOut(auth);

            router.replace('/signup-success');
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                setErrors({ email: 'This email address is already in use.' });
            } else {
                setFormError('An unexpected error occurred during registration.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.mainContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={{flex: 1}}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Create Your Account</Text>
                        <Text style={styles.subtitle}>Fill in the details below to get started</Text>
                    </View>

                    <ScrollView
                        style={styles.formScrollView}
                        contentContainerStyle={styles.scrollContentContainer}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Input aname="account-outline" error={errors.ownerName} label="Owner Name" placeholder="John Doe" value={ownerName} onChangeText={setOwnerName} styles={styles} />
                        <Input aname="storefront-outline" error={errors.shopName} label="Shop Name" placeholder="The Clean Hub" value={shopName} onChangeText={setShopName} styles={styles} />
                        <Input aname="email-outline" error={errors.email} label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" styles={styles} />
                        <Input aname="phone-outline" error={errors.mobile} label="Mobile Number" placeholder="123-456-7890" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" styles={styles} />
                        <Input aname="map-marker-outline" error={errors.address} label="Address" placeholder="123 Main St, Anytown" value={address} onChangeText={setAddress} styles={styles} />
                        <Input aname="lock-outline" error={errors.password} label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry styles={styles} />
                        <Input aname="lock-check-outline" error={errors.confirmPassword} label="Confirm Password" placeholder="Confirm your password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry styles={styles} />
                    </ScrollView>

                    <View style={styles.bottomContainer}>
                        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
                            </TouchableOpacity>
                        </View>
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                                <Text style={styles.footerLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default RegisterScreen;
