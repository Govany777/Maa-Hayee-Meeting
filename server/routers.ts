import { z } from "zod";
import { db } from "./firebase";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createMember,
  getMemberById,
  getMemberByPhone,
  getMembers,
  updateMember,
  deleteMember,
  recordAttendance,
  getAttendanceByMemberId,
  getAllAttendanceRecords,
  getTodayAttendance,
  getAdminByUsername,
  createAdmin,
  getMemberAccountByUsername,
  getMemberAccountByMemberId,
  createMemberAccount,
  hashPassword,
  comparePasswords,
  getMemberAttendanceStats,
  getMembersWithAccounts,
  upsertUser,
  getMemberByMemberId,
} from "./db";
import { systemRouter } from "./_core/systemRouter";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { storagePut } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  admin: router({
    login: publicProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const admin = await getAdminByUsername(input.username);
        if (!admin || !admin.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "بيانات تسجيل الدخول غير صحيحة",
          });
        }

        const isPasswordValid = await comparePasswords(input.password, admin.password);
        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "كلمة المرور غير صحيحة",
          });
        }

        // Upsert into users collection to enable protected procedures
        await upsertUser({
          openId: admin.id,
          name: admin.fullName || admin.username,
          role: 'admin',
          lastSignedIn: new Date(),
        });

        // Create session token and set cookie
        const sessionToken = await sdk.createSessionToken(admin.id, {
          name: admin.fullName || admin.username
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true, admin, sessionToken };
      }),

    getAllMembers: protectedProcedure.query(async () => {
      return await getMembersWithAccounts();
    }),

    createMember: protectedProcedure
      .input(
        z.object({
          memberId: z.string().optional(),
          name: z.string().min(1),
          phone: z.string().optional(),
          dateOfBirth: z.date().optional(),
          address: z.string().optional(),
          fatherOfConfession: z.string().optional(),
          imageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const member = await createMember(input);
        return member;
      }),

    updateMember: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          memberId: z.string().optional(),
          name: z.string().optional(),
          phone: z.string().optional(),
          dateOfBirth: z.date().optional(),
          address: z.string().optional(),
          fatherOfConfession: z.string().optional(),
          imageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateMember(id, data);
      }),

    deleteMember: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return await deleteMember(input.id);
      }),

    searchMembers: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        const allMembers = await getMembersWithAccounts();
        const q = input.query.toLowerCase();
        return allMembers.filter(
          (m) =>
            m.name?.toLowerCase().includes(q) ||
            m.memberId?.toLowerCase().includes(q) ||
            (m.phone && m.phone.includes(input.query)) ||
            (m.username && m.username.toLowerCase().includes(q))
        );
      }),
  }),

  attendance: router({
    recordAttendance: publicProcedure
      .input(
        z.object({
          memberId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Find by visible memberId field first
        let member = await getMemberByMemberId(input.memberId);

        // If not found, try by internal ID
        if (!member) {
          member = await getMemberById(input.memberId);
        }

        if (!member) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "العضو غير موجود",
          });
        }

        const record = await recordAttendance({
          memberId: member.id,
          memberIdStr: member.memberId,
          memberName: member.name,
          status: "present",
        });
        return record;
      }),

    getTodayAttendance: publicProcedure.query(async () => {
      return await getTodayAttendance();
    }),

    getAttendanceByMember: publicProcedure
      .input(z.object({ memberId: z.string() }))
      .query(async ({ input }) => {
        return await getAttendanceByMemberId(input.memberId);
      }),

    getAllAttendance: protectedProcedure.query(async () => {
      return await getAllAttendanceRecords();
    }),
  }),

  members: router({
    login: publicProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const account = await getMemberAccountByUsername(input.username);
        if (!account || !account.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "اسم المستخدم أو كلمة المرور غير صحيحة",
          });
        }

        const isPasswordValid = await comparePasswords(
          input.password,
          account.password
        );
        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "كلمة المرور غير صحيحة",
          });
        }

        const member = await getMemberById(account.memberId);
        if (!member) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "بيانات العضو غير موجودة",
          });
        }

        // Upsert into users collection
        await upsertUser({
          openId: account.id,
          name: member.name,
          role: 'user',
          lastSignedIn: new Date(),
        });

        // Create session token and set cookie
        const sessionToken = await sdk.createSessionToken(account.id, {
          name: member.name
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          memberId: member.id,
          sequentialId: member.memberId,
          username: account.username,
          name: member.name,
          phone: member.phone || "",
          dateOfBirth: member.dateOfBirth,
          address: member.address,
          fatherOfConfession: member.fatherOfConfession,
          imageUrl: member.imageUrl,
          sessionToken,
        };
      }),

    register: publicProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(6),
          confirmPassword: z.string().min(6),
          phone: z.string().length(11, "رقم الهاتف يجب أن يكون 11 رقم"),
          fullName: z.string().optional(),
          dateOfBirth: z.string().optional(),
          address: z.string().optional(),
          fatherOfConfession: z.string().optional(),
          imageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.password !== input.confirmPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "كلمات المرور غير متطابقة",
          });
        }

        const existingAccount = await getMemberAccountByUsername(input.username);
        if (existingAccount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "اسم المستخدم موجود بالفعل",
          });
        }

        let member = await getMemberByPhone(input.phone);
        if (!member) {
          const newMember = await createMember({
            memberId: "", // Will be assigned automatically as sequential number
            name: input.fullName || input.username,
            phone: input.phone,
            status: "active",
            dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
            address: input.address || null,
            fatherOfConfession: input.fatherOfConfession || null,
            imageUrl: input.imageUrl || null,
          });
          if (!newMember) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "فشل إنشاء حساب العضو",
            });
          }
          member = newMember;
        } else {
          await updateMember(member.id, {
            name: input.fullName || member.name,
            dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : member.dateOfBirth,
            address: input.address || member.address,
            fatherOfConfession: input.fatherOfConfession || member.fatherOfConfession,
            imageUrl: input.imageUrl || member.imageUrl,
          });
          const updatedMember = await getMemberById(member.id);
          if (updatedMember) {
            member = updatedMember;
          }
        }

        const existingMemberAccount = await getMemberAccountByMemberId(member.id);
        if (existingMemberAccount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "هذا العضو لديه حساب بالفعل",
          });
        }

        const hashedPassword = await hashPassword(input.password);
        const account = await createMemberAccount({
          memberId: member.id,
          username: input.username,
          password: hashedPassword,
        });

        // Login as well
        await upsertUser({
          openId: account.id,
          name: member.name,
          role: 'user',
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(account.id, {
          name: member.name
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          memberId: member.id, // Document ID for session identifier
          sequentialId: member.memberId, // The readable ID
          username: account.username,
          name: member.name,
          phone: member.phone || "",
          dateOfBirth: member.dateOfBirth || null,
          address: member.address || null,
          fatherOfConfession: member.fatherOfConfession || null,
          imageUrl: member.imageUrl || null,
          sessionToken,
        };
      }),

    getProfile: publicProcedure
      .input(z.object({ memberId: z.string() }))
      .query(async ({ input }) => {
        // Find by visible memberId first
        let member = await getMemberByMemberId(input.memberId);

        // If not found, try by internal doc ID
        if (!member) {
          member = await getMemberById(input.memberId);
        }

        if (!member) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "العضو غير موجود",
          });
        }

        const attendance = await getAttendanceByMemberId(member.id);
        const totalAttendance = attendance.length;

        // Simple percentage calculation: (total member attendance / total system meetings) * 100
        // If we don't have total system meetings, let's assume 10 for now or calculate from all attendance
        const allAttendance = await getAllAttendanceRecords();
        const uniqueDates = new Set(allAttendance.map(a => new Date(a.attendanceDate).toDateString())).size;
        const totalMeetings = Math.max(uniqueDates, 1);
        const attendancePercentage = Math.round((totalAttendance / totalMeetings) * 100);

        return {
          ...member,
          totalAttendance,
          attendancePercentage,
        };
      }),

    updateProfile: publicProcedure
      .input(
        z.object({
          memberId: z.string(),
          name: z.string().optional(),
          phone: z.string().optional(),
          dateOfBirth: z.string().optional(),
          address: z.string().optional(),
          fatherOfConfession: z.string().optional(),
          imageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        let targetId = input.memberId;
        const memberBySeq = await getMemberByMemberId(input.memberId);
        if (memberBySeq) {
          targetId = memberBySeq.id;
        }

        const member = await updateMember(targetId, {
          name: input.name,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          address: input.address,
          fatherOfConfession: input.fatherOfConfession,
          imageUrl: input.imageUrl,
        });
        return member;
      }),

    changePassword: publicProcedure
      .input(
        z.object({
          memberId: z.string(),
          newPassword: z.string().min(6),
        })
      )
      .mutation(async ({ input }) => {
        let targetId = input.memberId;
        const memberBySeq = await getMemberByMemberId(input.memberId);
        if (memberBySeq) {
          targetId = memberBySeq.id;
        }

        const account = await getMemberAccountByMemberId(targetId);
        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "حساب العضو غير موجود",
          });
        }

        const hashedPassword = await hashPassword(input.newPassword);
        const accountRef = db.collection("member_accounts").doc(account.id);
        await accountRef.update({
          password: hashedPassword,
          updatedAt: new Date(),
        });

        return { success: true };
      }),

    uploadImage: publicProcedure
      .input(z.object({
        base64: z.string(),
        fileName: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        try {
          // Remove data:image/xxx;base64, prefix if present
          const base64Data = input.base64.split(',').pop() || '';
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = input.fileName || `profile-${Date.now()}.jpg`;
          const path = `profiles/${fileName}`;

          const result = await storagePut(path, buffer, 'image/jpeg');
          return { url: result.url };
        } catch (error) {
          console.error("Image upload error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل تحميل الصورة",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
