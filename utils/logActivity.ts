
import { db, auth } from "@/config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const logActivity = async (type: string, docId: string, details: any = {}) => {
    try {
        if (!auth.currentUser) return;
        await addDoc(collection(db, "activities"), {
            type,
            docId,
            details,
            createdAt: serverTimestamp(),
            userEmail: auth.currentUser.email,
        });
    } catch (error) {
        console.error("Error logging activity: ", error);
    }
};
