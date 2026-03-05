// admin/src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { StaffMember, UserRole } from "../../shared/types";
import { COLLECTIONS } from "../../shared/config";

interface AuthContextType {
  user: User | null;
  staffProfile: StaffMember | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: string) => boolean;
}

// Role → allowed modules map
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin:             ["sku", "inventory", "orders", "dispatch", "refunds", "billing", "staff", "reports"],
  inventory_manager: ["sku", "inventory", "orders"],
  dispatcher:        ["orders", "dispatch"],
  billing:           ["orders", "refunds", "billing", "reports"],
  support:           ["orders"],
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffMember | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Load staff profile + role from Firestore
        const staffDoc = await getDoc(doc(db, COLLECTIONS.STAFF, firebaseUser.uid));
        if (staffDoc.exists()) {
          const profile = staffDoc.data() as StaffMember;
          setStaffProfile(profile);
          setRole(profile.role);
        } else {
          // Not a staff member — sign out
          await signOut(auth);
          setUser(null);
        }
      } else {
        setStaffProfile(null);
        setRole(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const hasPermission = (module: string): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(module) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, staffProfile, role, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
