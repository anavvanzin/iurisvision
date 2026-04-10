import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

export async function awardXP(userId: string, amount: number) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Initialize user profile if it doesn't exist
    await setDoc(userRef, {
      xp: amount,
      level: 1,
      displayName: 'Pesquisador',
      createdAt: new Date().toISOString()
    });
    return;
  }

  const data = userSnap.data();
  const currentXP = (data.xp || 0) + amount;
  const currentLevel = data.level || 1;
  
  // Simple level up logic: level = floor(sqrt(xp / 100)) + 1
  // Or more simply: each level requires level * 100 XP
  // Level 1: 0-100
  // Level 2: 100-300
  // Level 3: 300-600
  // Let's use a simpler one: 100 XP per level for now
  const newLevel = Math.floor(currentXP / 100) + 1;

  await updateDoc(userRef, {
    xp: currentXP,
    level: newLevel
  });

  return { leveledUp: newLevel > currentLevel, newLevel };
}
