
import { db, FieldValue, Timestamp } from "./firebase";
import { User, InsertUser, Admin, InsertAdmin, Member, InsertMember, AttendanceRecord, InsertAttendanceRecord, MemberAccount, InsertMemberAccount, Role, AttendanceStatus } from "../shared/types";
import { ENV } from './_core/env';
import bcrypt from 'bcryptjs';

// Collection references as constants to avoid typos
const USERS_COLLECTION = "users";
const ADMINS_COLLECTION = "admins";
const MEMBERS_COLLECTION = "members";
const ATTENDANCE_COLLECTION = "attendance";
const MEMBER_ACCOUNTS_COLLECTION = "member_accounts";
const COUNTERS_COLLECTION = "counters";

// Helper to convert Firestore timestamp to Date
const toDate = (ts: any): Date => {
  if (ts && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  return new Date(); // Fallback
};

// ============ User Functions ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const userRef = db.collection(USERS_COLLECTION).doc(user.openId);
  const snapshot = await userRef.get();

  const now = new Date();
  const updateData: any = {
    updatedAt: now,
    lastSignedIn: user.lastSignedIn || now,
  };

  if (user.name !== undefined) updateData.name = user.name;
  if (user.email !== undefined) updateData.email = user.email;
  if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod;

  if (user.role !== undefined) {
    updateData.role = user.role;
  } else if (!snapshot.exists && user.openId === ENV.ownerOpenId) {
    updateData.role = 'admin';
  } else if (!snapshot.exists) {
    updateData.role = 'user';
  }

  if (!snapshot.exists) {
    // Create new user
    await userRef.set({
      openId: user.openId,
      createdAt: now,
      ...updateData
    });
  } else {
    // Update existing user
    await userRef.update(updateData);
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const doc = await db.collection(USERS_COLLECTION).doc(openId).get();
  if (!doc.exists) return undefined;
  const data = doc.data();
  return {
    id: doc.id,
    openId: data?.openId,
    name: data?.name || null,
    email: data?.email || null,
    loginMethod: data?.loginMethod || null,
    role: data?.role as Role,
    createdAt: toDate(data?.createdAt),
    updatedAt: toDate(data?.updatedAt),
    lastSignedIn: toDate(data?.lastSignedIn),
  } as User;
}

// ============ Admin Functions ============

export async function getAdminByUsername(username: string): Promise<Admin | null> {
  const snapshot = await db.collection(ADMINS_COLLECTION).where("username", "==", username).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt)
  } as Admin;
}

export async function createAdmin(data: InsertAdmin): Promise<Admin | null> {
  const newUserRef = db.collection(ADMINS_COLLECTION).doc();
  const now = new Date();
  const adminData = {
    ...data,
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await newUserRef.set(adminData);
  return { id: newUserRef.id, ...adminData } as Admin;
}

// ============ Member Functions ============

async function getNextMemberIdSequential(): Promise<number> {
  const counterRef = db.collection(COUNTERS_COLLECTION).doc("members");

  try {
    return await db.runTransaction(async (t) => {
      const doc = await t.get(counterRef);
      let nextId = 1;
      if (doc.exists) {
        nextId = (doc.data()?.lastSequentialId || 0) + 1;
      }
      t.set(counterRef, { lastSequentialId: nextId }, { merge: true });
      return nextId;
    });
  } catch (e) {
    console.error("Failed to generate sequential ID", e);
    // Fallback? Or just fail.
    throw e;
  }
}

export async function createMember(data: InsertMember): Promise<Member | null> {
  const sequentialId = await getNextMemberIdSequential();

  const newMemberRef = db.collection(MEMBERS_COLLECTION).doc();
  const now = new Date();

  const memberData = {
    ...data,
    memberId: data.memberId || sequentialId.toString(), // Use provided or sequential
    memberIdSequential: sequentialId,
    createdAt: now,
    updatedAt: now,
    status: data.status || 'active'
  };

  await newMemberRef.set(memberData);

  return {
    id: newMemberRef.id,
    ...memberData
  } as Member;
}

export async function getMemberById(id: string): Promise<Member | null> {
  // id is now string (Firestore doc ID)
  const doc = await db.collection(MEMBERS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data?.createdAt),
    updatedAt: toDate(data?.updatedAt),
    dateOfBirth: data?.dateOfBirth ? toDate(data.dateOfBirth) : null,
  } as Member;
}

export async function getMemberByMemberId(memberId: string): Promise<Member | null> {
  const snapshot = await db.collection(MEMBERS_COLLECTION).where("memberId", "==", memberId).limit(1).get();
  if (snapshot.empty) {
    // Also check if it matches the doc ID as fallback
    const doc = await db.collection(MEMBERS_COLLECTION).doc(memberId).get();
    if (doc.exists) {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: toDate(data?.createdAt),
        updatedAt: toDate(data?.updatedAt),
        dateOfBirth: data?.dateOfBirth ? toDate(data.dateOfBirth) : null,
      } as Member;
    }
    return null;
  }
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    dateOfBirth: data.dateOfBirth ? toDate(data.dateOfBirth) : null,
  } as Member;
}

export async function getMemberByPhone(phone: string): Promise<Member | null> {
  const snapshot = await db.collection(MEMBERS_COLLECTION).where("phone", "==", phone).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    dateOfBirth: data.dateOfBirth ? toDate(data.dateOfBirth) : null,
  } as Member;
}


export async function getAllMembers(): Promise<Member[]> {
  const snapshot = await db.collection(MEMBERS_COLLECTION).where("status", "==", "active").get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      dateOfBirth: data.dateOfBirth ? toDate(data.dateOfBirth) : null,
    } as Member;
  });
}

export async function updateMember(id: string, data: Partial<InsertMember>): Promise<Member | null> {
  const memberRef = db.collection(MEMBERS_COLLECTION).doc(id);

  // Remove undefined fields to avoid Firestore errors
  const updateData: any = { updatedAt: new Date() };
  Object.keys(data).forEach(key => {
    if ((data as any)[key] !== undefined) {
      updateData[key] = (data as any)[key];
    }
  });

  await memberRef.update(updateData);
  return getMemberById(id);
}

export async function deleteMember(id: string): Promise<boolean> {
  try {
    await db.collection(MEMBERS_COLLECTION).doc(id).update({ status: "inactive" });
    return true;
  } catch (error) {
    console.error("Failed to delete member:", error);
    return false;
  }
}

// ============ Attendance Functions ============

export async function recordAttendance(data: InsertAttendanceRecord): Promise<AttendanceRecord | null> {
  const newRecordRef = db.collection(ATTENDANCE_COLLECTION).doc();
  const now = new Date();

  const recordData = {
    ...data,
    attendanceDate: data.attendanceDate || now,
    createdAt: now,
    status: data.status || 'present'
  };

  await newRecordRef.set(recordData);

  return {
    id: newRecordRef.id,
    ...recordData
  } as AttendanceRecord;
}

export async function getAttendanceByMemberId(memberId: string): Promise<AttendanceRecord[]> {
  const snapshot = await db.collection(ATTENDANCE_COLLECTION).where("memberId", "==", memberId).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      attendanceDate: toDate(data.attendanceDate),
      createdAt: toDate(data.createdAt)
    } as AttendanceRecord;
  });
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  const snapshot = await db.collection(ATTENDANCE_COLLECTION).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      attendanceDate: toDate(data.attendanceDate),
      createdAt: toDate(data.createdAt)
    } as AttendanceRecord;
  });
}

export async function getTodayAttendance(): Promise<AttendanceRecord[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const snapshot = await db.collection(ATTENDANCE_COLLECTION)
    .where("attendanceDate", ">=", today)
    .where("attendanceDate", "<", tomorrow)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      attendanceDate: toDate(data.attendanceDate),
      createdAt: toDate(data.createdAt)
    } as AttendanceRecord;
  });
}

export async function checkTodayAttendance(memberId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const snapshot = await db.collection(ATTENDANCE_COLLECTION)
    .where("memberId", "==", memberId)
    .where("attendanceDate", ">=", today)
    .where("attendanceDate", "<", tomorrow)
    .limit(1)
    .get();

  return !snapshot.empty;
}

export async function getMemberAttendanceStats(memberId: string): Promise<{ totalAttendance: number; attendancePercentage: number }> {
  const records = await getAttendanceByMemberId(memberId);
  const totalAttendance = records.filter(r => r.status === 'present').length;
  // We assume 'total events' is just total records for now, or maybe based on something else?
  // Following old logic: percentage of records that are 'present'
  const attendancePercentage = records.length > 0 ? Math.round((totalAttendance / records.length) * 100) : 0;
  return { totalAttendance, attendancePercentage };
}

// ============ Member Account Functions ============

export async function createMemberAccount(account: InsertMemberAccount): Promise<MemberAccount> {
  const newAccountRef = db.collection(MEMBER_ACCOUNTS_COLLECTION).doc();
  const now = new Date();
  const accountData = {
    ...account,
    createdAt: now,
    updatedAt: now
  };
  await newAccountRef.set(accountData);
  return { id: newAccountRef.id, ...accountData } as MemberAccount;
}

export async function getMemberAccountByUsername(username: string): Promise<MemberAccount | undefined> {
  const snapshot = await db.collection(MEMBER_ACCOUNTS_COLLECTION).where("username", "==", username).limit(1).get();
  if (snapshot.empty) return undefined;
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt)
  } as MemberAccount;
}

export async function getMemberAccountByMemberId(memberId: string): Promise<MemberAccount | undefined> {
  const snapshot = await db.collection(MEMBER_ACCOUNTS_COLLECTION).where("memberId", "==", memberId).limit(1).get();
  if (snapshot.empty) return undefined;
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt)
  } as MemberAccount;
}

export async function getNextMemberId(): Promise<number> {
  // Rely on sequential ID logic
  // This function returns the sequential ID, not the doc ID
  // We just return current sequential ID + 1 without incrementing? Or increment?
  // Old logic: MAX(memberId) + 1. But memberId in old logic was a string that looked like a number?
  // Wait, original: `CAST(MAX(CAST(memberId AS UNSIGNED)) AS UNSIGNED)` from members table.
  // It seems memberId field is used as a visible ID.
  // I already have getNextMemberIdSequential.
  return await getNextMemberIdSequential();
}

export async function getMembersWithAccounts(): Promise<any[]> {
  const membersSnapshot = await db.collection(MEMBERS_COLLECTION).where("status", "==", "active").get();
  const accountsSnapshot = await db.collection(MEMBER_ACCOUNTS_COLLECTION).get();

  const accountsMap = new Map();
  accountsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    accountsMap.set(data.memberId, data);
  });

  return membersSnapshot.docs.map(doc => {
    const data = doc.data();
    const account = accountsMap.get(doc.id);
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      dateOfBirth: data.dateOfBirth ? toDate(data.dateOfBirth) : null,
      username: account ? account.username : null,
      hasAccount: !!account
    };
  });
}


// ============ Auth Helpers ============

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
