import { createAdmin, getAdminByUsername, hashPassword } from "./server/db";
import "dotenv/config";

async function createDefaultAdmin() {
    try {
        const username = "admin";

        const existingAdmin = await getAdminByUsername(username);
        if (existingAdmin) {
            console.log("⚠️ حساب المسؤول 'admin' موجود بالفعل.");
            process.exit(0);
        }

        const hashedPassword = await hashPassword("admin123");

        await createAdmin({
            username: username,
            password: hashedPassword,
            fullName: "المسؤول الرئيسي",
            email: "admin@example.com",
            isActive: true,
        });

        console.log("✅ تم إنشاء حساب المسؤول بنجاح");
        console.log("اسم المستخدم: admin");
        console.log("كلمة المرور: admin123");
    } catch (error: any) {
        console.error("❌ خطأ:", error.message || error);
        process.exit(1);
    }
    process.exit(0);
}

createDefaultAdmin();
