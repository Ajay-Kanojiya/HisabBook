import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Logs an activity to the 'activities' collection in Firestore.
 * @param type - The type of activity (e.g., 'customer_created', 'order_updated').
 * @param userEmail - The email of the user who performed the activity.
 * @param docId - The ID of the document that was affected.
 * @param details - An object containing additional details about the activity.
 */
export const logActivity = async (type: string, userEmail: string, docId: string, details: any) => {
    try {
        await addDoc(collection(db, 'activities'), {
            type,
            userEmail,
            docId,
            details,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error logging activity: ", error);
    }
};
