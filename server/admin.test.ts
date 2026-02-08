import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  hashPassword,
  comparePasswords,
  createAdmin,
  getAdminByUsername,
  createMember,
  getMemberById,
  getMemberByPhone,
  getAllMembers,
  recordAttendance,
  getTodayAttendance,
  createMemberAccount,
  getMemberAccountByUsername,
} from "./db";

describe("Admin and Member Functions", () => {
  let testAdminId: number;
  let testMemberId: number;

  describe("Password Hashing", () => {
    it("should hash password correctly", async () => {
      const password = "testPassword123";
      const hashed = await hashPassword(password);
      expect(hashed).toBeTruthy();
      expect(hashed).not.toBe(password);
    });

    it("should verify correct password", async () => {
      const password = "testPassword123";
      const hashed = await hashPassword(password);
      const isValid = await comparePasswords(password, hashed);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword";
      const hashed = await hashPassword(password);
      const isValid = await comparePasswords(wrongPassword, hashed);
      expect(isValid).toBe(false);
    });
  });

  describe("Admin Functions", () => {
    it("should create admin with hashed password", async () => {
      const password = "admin123";
      const hashedPassword = await hashPassword(password);
      const admin = await createAdmin({
        username: `testadmin_${Date.now()}`,
        password: hashedPassword,
      });
      expect(admin).toBeTruthy();
      expect(admin?.username).toBeTruthy();
      testAdminId = admin?.id || 0;
    });

    it("should retrieve admin by username", async () => {
      const password = "admin456";
      const hashedPassword = await hashPassword(password);
      const username = `testadmin2_${Date.now()}`;
      await createAdmin({
        username,
        password: hashedPassword,
      });
      const admin = await getAdminByUsername(username);
      expect(admin).toBeTruthy();
      expect(admin?.username).toBe(username);
    });

    it("should return null for non-existent admin", async () => {
      const admin = await getAdminByUsername("nonexistent_admin_xyz");
      expect(admin).toBeNull();
    });
  });

  describe("Member Functions", () => {
    it("should create member", async () => {
      const member = await createMember({
        memberId: `TEST_${Date.now()}`,
        name: "Test Member",
        phone: `+201${Math.floor(Math.random() * 1000000000)}`,
      });
      expect(member).toBeTruthy();
      expect(member?.name).toBe("Test Member");
      testMemberId = member?.id || 0;
    });

    it("should retrieve member by ID", async () => {
      if (testMemberId) {
        const member = await getMemberById(testMemberId);
        expect(member).toBeTruthy();
        expect(member?.id).toBe(testMemberId);
      }
    });

    it("should retrieve member by phone", async () => {
      const phone = `+201${Math.floor(Math.random() * 1000000000)}`;
      const created = await createMember({
        memberId: `TEST2_${Date.now()}`,
        name: "Test Member 2",
        phone,
      });
      const member = await getMemberByPhone(phone);
      expect(member).toBeTruthy();
      expect(member?.phone).toBe(phone);
    });

    it("should get all members", async () => {
      const members = await getAllMembers();
      expect(Array.isArray(members)).toBe(true);
    });
  });

  describe("Attendance Functions", () => {
    it("should record attendance", async () => {
      if (testMemberId) {
        const record = await recordAttendance({
          memberId: testMemberId,
          memberIdStr: `TEST_${Date.now()}`,
          memberName: "Test Member",
          status: "present",
        });
        expect(record).toBeTruthy();
        expect(record?.status).toBe("present");
      }
    });

    it("should get today attendance", async () => {
      const records = await getTodayAttendance();
      expect(Array.isArray(records)).toBe(true);
    });
  });

  describe("Member Account Functions", () => {
    let testMemberIdForAccount: number;

    it("should create member for account testing", async () => {
      const member = await createMember({
        memberId: `TEST_ACCOUNT_${Date.now()}`,
        name: "Test Member for Account",
        phone: `+201${Math.floor(Math.random() * 1000000000)}`,
      });
      expect(member).toBeTruthy();
      testMemberIdForAccount = member?.id || 0;
    });

    it("should create member account", async () => {
      if (testMemberIdForAccount) {
        const password = await hashPassword("memberPass123");
        const account = await createMemberAccount({
          memberId: testMemberIdForAccount,
          username: `testmember_${Date.now()}`,
          password,
        });
        expect(account).toBeTruthy();
        expect(account?.memberId).toBe(testMemberIdForAccount);
      }
    });

    it("should retrieve member account by username", async () => {
      if (testMemberIdForAccount) {
        const username = `testmember2_${Date.now()}`;
        const password = await hashPassword("memberPass456");
        const member2 = await createMember({
          memberId: `TEST_ACCOUNT2_${Date.now()}`,
          name: "Test Member 2 for Account",
          phone: `+201${Math.floor(Math.random() * 1000000000)}`,
        });
        if (member2) {
          await createMemberAccount({
            memberId: member2.id,
            username,
            password,
          });
          const account = await getMemberAccountByUsername(username);
          expect(account).toBeTruthy();
          expect(account?.username).toBe(username);
        }
      }
    });
  });
});
