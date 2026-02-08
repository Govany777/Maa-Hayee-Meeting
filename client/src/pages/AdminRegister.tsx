import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Lock, Mail, User, Home } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminRegister() {
  // تم تقييد الداشبورد لحساب admin واحد فقط
  // لا يمكن إنشاء حسابات جديدة
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    email: "",
  });

  const registerMutation = trpc.admin.register.useMutation();

  const handleRegister = async () => {
    if (!formData.username || !formData.password || !formData.fullName) {
      toast.error("الرجاء ملء البيانات المطلوبة");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("كلمات المرور غير متطابقة");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    try {
      await registerMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      toast.success("تم إنشاء الحساب بنجاح! سيتم تحويلك إلى صفحة تسجيل الدخول");
      setTimeout(() => {
        setLocation("/admin-login");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "فشل إنشاء الحساب");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            Maa Hayee Meeting
          </h1>
          <p className="text-gray-600">إنشاء حساب مسؤول جديد</p>
        </div>

        {/* نموذج التسجيل */}
        <Card className="p-8 shadow-lg">
          <div className="space-y-4">
            {/* اسم المستخدم */}
            <div>
              <label className="block text-sm font-medium mb-2">اسم المستخدم *</label>
              <div className="relative">
                <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="أدخل اسم المستخدم"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  dir="rtl"
                  className="pr-10"
                />
              </div>
            </div>

            {/* الاسم الكامل */}
            <div>
              <label className="block text-sm font-medium mb-2">الاسم الكامل *</label>
              <Input
                placeholder="أدخل الاسم الكامل"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                dir="rtl"
              />
            </div>

            {/* البريد الإلكتروني */}
            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="أدخل البريد الإلكتروني"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  dir="rtl"
                  className="pr-10"
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور *</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  dir="rtl"
                  className="pr-10"
                />
              </div>
            </div>

            {/* تأكيد كلمة المرور */}
            <div>
              <label className="block text-sm font-medium mb-2">تأكيد كلمة المرور *</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="أعد إدخال كلمة المرور"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  dir="rtl"
                  className="pr-10"
                />
              </div>
            </div>

            {/* أزرار */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleRegister}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "جاري الإنشاء..." : "إنشاء حساب"}
              </Button>

              <Button
                onClick={() => setLocation("/admin-login")}
                variant="outline"
                className="w-full py-6"
              >
                لديك حساب بالفعل؟ تسجيل دخول
              </Button>

              <Button
                onClick={() => setLocation("/")}
                variant="ghost"
                className="w-full gap-2"
              >
                <Home className="w-4 h-4" />
                العودة للرئيسية
              </Button>
            </div>
          </div>
        </Card>

        {/* ملاحظة */}
        <p className="text-center text-sm text-gray-600 mt-6">
          جميع البيانات محمية وآمنة
        </p>
      </div>
    </div>
  );
}
