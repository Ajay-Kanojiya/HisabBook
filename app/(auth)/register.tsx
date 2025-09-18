import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RegisterScreen = () => {
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [emailError, setEmailError] = useState('');
  const router = useRouter();

  const { width } = useWindowDimensions();
  const styles = getStyles(width);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleRegister = () => {
    setEmailError('');

    if (!ownerName || !shopName || !email || !mobile || !password || !confirmPassword || !address) {
        Alert.alert('Error', 'Please fill in all fields.');
        return;
    }
    if (!validateEmail(email)) {
        setEmailError('Please enter a valid email address.');
        return;
    }
    if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match.');
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        await setDoc(doc(db, 'shop', user.uid), {
          ownerName: ownerName,
          shopName: shopName,
          email: user.email,
          mobile: mobile,
          address: address,
        });
        Alert.alert('Success', 'You have successfully registered.');
        router.replace('/(tabs)/home');
      })
      .catch((error) => {
        Alert.alert('Registration Error', error.message);
      });
  };

  const getPasswordStrength = () => {
      if (password.length === 0) return 0;
      if (password.length < 6) return 1; // Weak
      if (password.length < 10) return 2; // Medium
      return 3; // Strong
  };
  const strength = getPasswordStrength();

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
                <MaterialCommunityIcons name="arrow-left" size={styles.headerTitle.fontSize} color="black" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shop Owner Registration</Text>
        </View>

        <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="shopping-outline" size={styles.title.fontSize * 2} color="#007bff" />
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Please fill in the details to register.</Text>

        <Text style={styles.label}>Shop Name</Text>
        <View style={styles.inputWrapper}>
             <TextInput
                style={styles.input}
                placeholder="The Clean Hub"
                placeholderTextColor="#888"
                value={shopName}
                onChangeText={setShopName}
            />
            {shopName.length > 0 && <MaterialCommunityIcons name="check-circle" size={styles.input.fontSize} color="#28a745" style={styles.validationIcon} />}
        </View>

        <Text style={styles.label}>Owner Name</Text>
        <View style={styles.inputWrapper}>
            <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#888"
                value={ownerName}
                onChangeText={setOwnerName}
            />
        </View>

        <Text style={styles.label}>Email</Text>
        <View style={[styles.inputWrapper, emailError ? styles.inputError : {}]}>
            <TextInput
                style={styles.input}
                placeholder="john.doe@notanemail"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onBlur={() => !validateEmail(email) && email.length > 0 ? setEmailError('Please enter a valid email address.') : setEmailError('')}
            />
             {emailError && <MaterialCommunityIcons name="alert-circle" size={styles.input.fontSize} color="#dc3545" style={styles.validationIcon} />}
        </View>
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <Text style={styles.label}>Mobile Number</Text>
        <View style={styles.mobileInputContainer}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
                style={styles.mobileInput}
                placeholder="Enter your mobile number"
                placeholderTextColor="#888"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
            />
        </View>
        <Text style={styles.helperText}>Please include your country code (e.g., +91).</Text>

        <Text style={styles.label}>Address</Text>
        <View style={styles.inputWrapper}>
            <TextInput
                style={styles.input}
                placeholder="123 Main St, Anytown, USA"
                placeholderTextColor="#888"
                value={address}
                onChangeText={setAddress}
            />
        </View>

        <Text style={styles.label}>Password</Text>
         <View style={styles.inputWrapper}>
            <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
        </View>
        <View style={styles.strengthContainer}>
            <View style={[styles.strengthBar, { width: `${(strength / 3) * 100}%`, backgroundColor: strength === 1 ? '#dc3545' : strength === 2 ? '#ffc107' : '#28a745' }]} />
        </View>
        <Text style={styles.strengthText}>{['', 'Weak', 'Medium', 'Strong'][strength]}</Text>


        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrapper}>
            <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#888"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />
        </View>

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.signIn}>Sign In</Text>
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
            padding: responsiveSize(20),
            backgroundColor: 'white',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: responsiveSize(10),
        },
        headerTitle: {
            fontSize: responsiveSize(18),
            fontWeight: 'bold',
            marginLeft: responsiveSize(20),
            color: '#000',
        },
        iconContainer: {
            alignItems: 'center',
            marginVertical: responsiveSize(10),
        },
        title: {
            fontSize: responsiveSize(24),
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#000',
        },
        subtitle: {
            textAlign: 'center',
            color: '#6c757d',
            marginBottom: responsiveSize(20),
            fontSize: responsiveSize(14),
        },
        label: {
            fontSize: responsiveSize(14),
            color: '#495057',
            marginBottom: responsiveSize(5),
            fontWeight: '500',
        },
        inputWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            borderColor: '#ced4da',
            borderWidth: 1,
            borderRadius: responsiveSize(8),
            marginBottom: responsiveSize(5),
            backgroundColor: '#fff',
        },
        input: {
            flex: 1,
            height: responsiveSize(45),
            paddingHorizontal: responsiveSize(15),
            fontSize: responsiveSize(16),
            color: '#000',
        },
        inputError: {
            borderColor: '#dc3545',
        },
        validationIcon: {
            marginRight: responsiveSize(10),
        },
        errorText: {
            color: '#dc3545',
            fontSize: responsiveSize(12),
            marginBottom: responsiveSize(10),
        },
        mobileInputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            borderColor: '#ced4da',
            borderWidth: 1,
            borderRadius: responsiveSize(8),
            backgroundColor: '#fff',
        },
        countryCode: {
            paddingHorizontal: responsiveSize(15),
            fontSize: responsiveSize(16),
            color: '#495057',
        },
        mobileInput: {
            flex: 1,
            height: responsiveSize(45),
            paddingHorizontal: responsiveSize(10),
            fontSize: responsiveSize(16),
            color: '#000',
        },
        helperText: {
            fontSize: responsiveSize(12),
            color: '#6c757d',
            marginBottom: responsiveSize(10),
        },
        strengthContainer: {
            height: responsiveSize(4),
            backgroundColor: '#e9ecef',
            borderRadius: responsiveSize(2),
            marginBottom: responsiveSize(5),
        },
        strengthBar: {
            height: '100%',
            borderRadius: responsiveSize(2),
        },
        strengthText: {
            textAlign: 'right',
            color: '#6c757d',
            fontSize: responsiveSize(12),
            marginBottom: responsiveSize(10),
        },
        registerButton: {
            backgroundColor: '#007bff',
            paddingVertical: responsiveSize(15),
            borderRadius: responsiveSize(8),
            alignItems: 'center',
            marginTop: responsiveSize(10),
            marginBottom: responsiveSize(20),
        },
        registerButtonText: {
            color: 'white',
            fontSize: responsiveSize(16),
            fontWeight: 'bold',
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'center',
        },
        footerText: {
            color: '#000',
            fontSize: responsiveSize(14),
        },
        signIn: {
            color: '#007bff',
            fontWeight: 'bold',
            fontSize: responsiveSize(14),
        },
    });
}

export default RegisterScreen;
