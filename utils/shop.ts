import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const getOrCreateShop = async (user) => {
    if (!user) return null;

    const shopsRef = collection(db, 'shops');
    const q = query(shopsRef, where("userEmail", "==", user.email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        const newShop = {
            userEmail: user.email,
            shopName: "The Laundry Hub",
            address: "123 Main Street, Anytown",
            mobile: "123-456-7890",
            email: user.email,
            operatingHours: "10:00 AM - 8:00 PM"
        };
        const docRef = await addDoc(shopsRef, newShop);
        return { ...newShop, id: docRef.id };
    } else {
        const shopData = querySnapshot.docs[0].data();
        return { ...shopData, id: querySnapshot.docs[0].id };
    }
};
