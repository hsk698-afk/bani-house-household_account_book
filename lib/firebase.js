import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBLN8Vg5oPNa-1VpqzemAGQOPlyEOr1JU8",
  authDomain: "expense-tracker-2024-9a562.firebaseapp.com",
  projectId: "expense-tracker-2024-9a562",
  storageBucket: "expense-tracker-2024-9a562.firebasestorage.app",
  messagingSenderId: "811729551695",
  appId: "1:811729551695:web:64860512a3b406a460053a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);