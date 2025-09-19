
import { auth } from '@/config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [formError, setFormError] = useState('');
    const router = useRouter();

    const handleLogin = async () => {
        setFormError('');
        if (!email || !password) {
            setFormError("Please enter both email and password.");
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/(tabs)/orders');
        } catch (error: any) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                setFormError("Invalid email or password. Please check your credentials or sign up.");
            } else if (error.code === 'auth/invalid-email') {
                setFormError("Please enter a valid email address.");
            } else {
                setFormError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <View style={styles.logoContainer}>
                <Image source={require('@/assets/images/sign_in_1.png')} style={styles.logo} />
            </View>

            <View style={styles.formContainer}>
                <View style={[styles.inputContainer, formError ? styles.inputError : {}]}>
                    <MaterialCommunityIcons name="email-outline" size={22} color="#888" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#888"
                    />
                </View>

                <View style={[styles.inputContainer, formError ? styles.inputError : {}]}>
                    <MaterialCommunityIcons name="lock-outline" size={22} color="#888" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!passwordVisible}
                        placeholderTextColor="#888"
                    />
                    <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
                        <MaterialCommunityIcons name={passwordVisible ? "eye-off" : "eye"} size={22} color="#888" />
                    </TouchableOpacity>
                </View>
                
                {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotPasswordContainer}>
                    <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                        <Text style={styles.footerLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 30,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: -40, // Reduced from 30
    },
    logo: {
        width: 200,
        height: 200,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 15,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        marginTop: 5,
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    inputError: {
        borderColor: '#dc3545',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#333',
    },
    eyeIcon: {
        padding: 5,
    },
    errorText: {
        color: '#dc3545',
        textAlign: 'center',
        marginBottom: 10,
        fontSize: 14,
        fontWeight: '500'
    },
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginBottom: 20,
    },
    forgotPassword: {
        color: '#007bff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#007bff',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 2,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
    },
    footerText: {
        fontSize: 16,
        color: '#888',
    },
    footerLink: {
        fontSize: 16,
        color: '#007bff',
        fontWeight: 'bold',
    },
});

export default LoginScreen;
