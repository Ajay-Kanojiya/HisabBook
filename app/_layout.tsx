import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase'; // Adjust this path

const InitialLayout = () => {
  const [user, setUser] = useState(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      const inTabsGroup = segments[0] === '(tabs)';
      if (user && !inTabsGroup) {
        router.replace('/(tabs)');
      } else if (!user) {
        router.replace('/(auth)/login');
      }
    });
    return () => unsubscribe();
  }, [user]);

  return <Slot />;
};

export default InitialLayout;
