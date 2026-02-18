
export type Role = "user" | "admin";
export type MemberStatus = "active" | "inactive";
export type AttendanceStatus = "present" | "absent";

export interface User {
    id: string;
    openId: string;
    name: string | null;
    email: string | null;
    loginMethod: string | null;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
    lastSignedIn: Date;
}

export interface InsertUser {
    openId: string;
    name?: string | null;
    email?: string | null;
    loginMethod?: string | null;
    role?: Role;
    lastSignedIn?: Date;
}

export interface Admin {
    id: string;
    username: string;
    password?: string; // Might be hidden in select
    fullName: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface InsertAdmin {
    username: string;
    password: string;
    fullName?: string | null;
    email?: string | null;
    isActive?: boolean;
}

export type AcademicStatus = "student" | "graduate";

export interface Member {
    id: string;
    memberId: string;
    memberIdSequential?: number | null; // Keep optional
    name: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: Date | null;
    address: string | null;
    fatherOfConfession: string | null;
    academicStatus: AcademicStatus | null;
    academicYear: string | null;
    imageUrl: string | null;
    qrCode: string | null;
    status: MemberStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface InsertMember {
    memberId?: string;
    memberIdSequential?: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: Date | null;
    address?: string | null;
    fatherOfConfession?: string | null;
    academicStatus?: AcademicStatus | null;
    academicYear?: string | null;
    imageUrl?: string | null;
    qrCode?: string | null;
    status?: MemberStatus;
}

export interface AttendanceRecord {
    id: string;
    memberId: string; // Changed from number to string to match Member.id
    memberIdStr: string;
    memberName: string;
    attendanceDate: Date;
    status: AttendanceStatus;
    notes: string | null;
    createdAt: Date;
}

export interface InsertAttendanceRecord {
    memberId: string;
    memberIdStr: string;
    memberName: string;
    attendanceDate?: Date;
    status?: AttendanceStatus;
    notes?: string | null;
}

export interface MemberAccount {
    id: string;
    memberId: string; // Changed from number to string
    username: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InsertMemberAccount {
    memberId: string;
    username: string;
    password: string;
}

export * from "./_core/errors";
