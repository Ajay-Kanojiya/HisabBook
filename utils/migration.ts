import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const migrateActivities = async () => {
  console.log('Starting activity migration...');
  const activitiesRef = collection(db, 'activities');
  const snapshot = await getDocs(activitiesRef);
  const batch = writeBatch(db);
  let updates = 0;

snapshot.forEach(doc => {
    const data = doc.data();
    if (data.docId && typeof data.docId === 'object' && typeof data.docId.documentId === 'string') {
        batch.update(doc.ref, { docId: data.docId.documentId });
        updates++;
    }
});

  if (updates > 0) {
    await batch.commit();
    console.log(`Migration successful! Updated ${updates} records.`);
  } else {
    console.log('No records needed to be updated.');
  }
};
