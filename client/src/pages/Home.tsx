import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { QrCode, Users, BarChart3, Lock, ArrowLeft } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* رأس الصفحة */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Maa Hayee Meeting" className="w-32 h-32 object-contain" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 text-center" style={{paddingTop: '0px', paddingLeft: '0px'}}>
            Maa Hayee Meeting  (إجتماع شباب ماء حي)
          </h1>
          <p className="text-gray-600 mt-1 text-center">نظام تسجيل الحضور والغياب الإلكتروني</p>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* القسم الترحيبي */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            مرحباً بك في نظام الحضور الخاص باجتماع الشباب
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            نظام متطور لتسجيل الحضور والغياب باستخدام تقنية QR Code، مع إدارة متقدمة للأعضاء وسجلات الحضور
          </p>
        </div>

        {/* الأقسام الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* بطاقة مسح QR Code */}
          <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-400"
            onClick={() => setLocation("/attendance")}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-full">
                <QrCode className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold">مسح QR Code</h3>
              <p className="text-gray-600 text-sm">
                قم بمسح كود QR الخاص بك لتسجيل الحضور فوراً
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                ابدأ المسح
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </Card>

          {/* بطاقة لوحة التحكم */}
          <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-indigo-400"
            onClick={() => setLocation("/admin-login")}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-gradient-to-br from-indigo-100 to-indigo-50 p-4 rounded-full">
                <Lock className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold">لوحة التحكم</h3>
              <p className="text-gray-600 text-sm">
                إدارة الأعضاء والبيانات والسجلات بسهولة
              </p>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4">
                دخول الداشبورد
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </Card>

          {/* بطاقة الأعضاء */}
          <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-400"
            onClick={() => setLocation("/members-registration")}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-4 rounded-full">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold">صفحة الأعضاء</h3>
              <p className="text-gray-600 text-sm">
                إنشاء حساب جديد أو تسجيل الدخول لمتابعة إحصائيات الحضور
              </p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 mt-4">
                دخول الأعضاء
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* قسم المميزات */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h3 className="text-2xl font-bold mb-8 text-center">المميزات الرئيسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <QrCode className="h-6 w-6" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold">مسح QR Code</h4>
                <p className="text-gray-600">مسح سريع وآمن للأكواز من الكاميرا</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold">إدارة الأعضاء</h4>
                <p className="text-gray-600">إضافة وتعديل وحذف بيانات الأعضاء</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold">تقارير شاملة</h4>
                <p className="text-gray-600">عرض سجلات الحضور والفلترة المتقدمة</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white">
                  <Lock className="h-6 w-6" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold">أمان عالي</h4>
                <p className="text-gray-600">حماية البيانات بكلمات مرور مشفرة</p>
              </div>
            </div>
          </div>
        </div>

        {/* قسم البيانات المتقدمة */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-200">
          <h3 className="text-2xl font-bold mb-4">حقول البيانات المتقدمة</h3>
          <p className="text-gray-700 mb-4">
            النظام يدعم تخزين بيانات متقدمة لكل عضو:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              <span>الاسم الكامل والرقم التعريفي</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              <span>رقم الهاتف والبريد الإلكتروني</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              <span>تاريخ الميلاد والعنوان</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              <span>أب الاعتراف والصورة الشخصية</span>
            </div>
          </div>
        </div>

        {/* أزرار سريعة */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setLocation("/attendance")}
          >
            <QrCode className="w-5 h-5 ml-2" />
            مسح QR Code الآن
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setLocation("/admin-login")}
          >
            <Lock className="w-5 h-5 ml-2" />
            دخول لوحة التحكم
          </Button>
        </div>
      </div>

      {/* التذييل */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-600">
          <p>© 2025 إجتماع شباب ماء حي - نظام تسجيل الحضور الإلكتروني</p>
          <p className="text-sm mt-2">جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
}
