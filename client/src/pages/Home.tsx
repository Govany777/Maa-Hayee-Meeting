import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { QrCode, Users, BarChart3, Lock, ArrowLeft } from "lucide-react";
import ScrollStack, { ScrollStackItem } from "@/components/ui/ScrollStack";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-transparent">
      {/* رأس الصفحة */}
      <div className="bg-white/70 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex justify-center mb-2">
            <img src="/logo.png" alt="Maa Hayee Meeting" className="w-20 h-20 md:w-28 md:h-28 object-contain" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 text-center">
            Maa Hayee Meeting (إجتماع شباب ماء حي)
          </h1>
          <p className="text-gray-600 mt-1 text-center text-sm md:text-base">نظام تسجيل الحضور والغياب الإلكتروني</p>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* القسم الترحيبي */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 drop-shadow-sm">
            مرحباً بك في نظام الحضور
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto backdrop-blur-sm bg-white/30 p-4 rounded-xl">
            نظام متطور لتسجيل الحضور والغياب باستخدام تقنية QR Code، مع إدارة متقدمة للأعضاء وسجلات الحضور
          </p>
        </div>

        {/* الأقسام الرئيسية */}
        <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* بطاقة مسح QR Code */}
          <Card className="p-8 hover:shadow-2xl transition-all duration-500 cursor-pointer border-0 bg-white/60 backdrop-blur-lg hover:bg-white/80 group"
            onClick={() => setLocation("/attendance")}>
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-blue-100/50 p-5 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                <QrCode className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold">مسح QR Code</h3>
              <p className="text-gray-600">
                قم بمسح كود QR الخاص بك لتسجيل الحضور فوراً وبكل سهولة
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg rounded-xl shadow-lg shadow-blue-200">
                ابدأ المسح
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </Card>

          {/* بطاقة لوحة التحكم */}
          <Card className="p-8 hover:shadow-2xl transition-all duration-500 cursor-pointer border-0 bg-white/60 backdrop-blur-lg hover:bg-white/80 group"
            onClick={() => setLocation("/admin-login")}>
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-indigo-100/50 p-5 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                <Lock className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold">لوحة التحكم</h3>
              <p className="text-gray-600">
                إدارة الأعضاء والبيانات والسجلات بسهولة واحترافية تامة
              </p>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg rounded-xl shadow-lg shadow-indigo-200">
                دخول الداشبورد
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </Card>

          {/* بطاقة الأعضاء */}
          <Card className="p-8 hover:shadow-2xl transition-all duration-500 cursor-pointer border-0 bg-white/60 backdrop-blur-lg hover:bg-white/80 group"
            onClick={() => setLocation("/members-registration")}>
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-purple-100/50 p-5 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                <Users className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold">صفحة الأعضاء</h3>
              <p className="text-gray-600">
                إنشاء حساب جديد أو تسجيل الدخول لمتابعة سجلاتك الشخصية
              </p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg rounded-xl shadow-lg shadow-purple-200">
                دخول الأعضاء
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Mobile View with ScrollStack */}
        <div className="lg:hidden mb-16 px-4">
          <ScrollStack>
            <ScrollStackItem>
              <div className="flex flex-col items-center text-center space-y-6 h-full justify-center" onClick={() => setLocation("/attendance")}>
                <div className="bg-blue-100/50 p-5 rounded-3xl">
                  <QrCode className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold">مسح QR Code</h3>
                <p className="text-gray-600 text-sm">
                  قم بمسح كود QR الخاص بك لتسجيل الحضور فوراً وبكل سهولة
                </p>
                <Button className="w-full bg-blue-600 text-white h-12 rounded-xl shadow-lg">
                  ابدأ المسح
                </Button>
              </div>
            </ScrollStackItem>

            <ScrollStackItem>
              <div className="flex flex-col items-center text-center space-y-6 h-full justify-center" onClick={() => setLocation("/admin-login")}>
                <div className="bg-indigo-100/50 p-5 rounded-3xl">
                  <Lock className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold">لوحة التحكم</h3>
                <p className="text-gray-600 text-sm">
                  إدارة الأعضاء والبيانات والسجلات بسهولة واحترافية تامة
                </p>
                <Button className="w-full bg-indigo-600 text-white h-12 rounded-xl shadow-lg">
                  دخول الداشبورد
                </Button>
              </div>
            </ScrollStackItem>

            <ScrollStackItem>
              <div className="flex flex-col items-center text-center space-y-6 h-full justify-center" onClick={() => setLocation("/members-registration")}>
                <div className="bg-purple-100/50 p-5 rounded-3xl">
                  <Users className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold">صفحة الأعضاء</h3>
                <p className="text-gray-600 text-sm">
                  إنشاء حساب جديد أو تسجيل الدخول لمتابعة سجلاتك الشخصية
                </p>
                <Button className="w-full bg-purple-600 text-white h-12 rounded-xl shadow-lg">
                  دخول الأعضاء
                </Button>
              </div>
            </ScrollStackItem>
          </ScrollStack>
        </div>

        {/* قسم المميزات */}
        <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-xl p-10 mb-16 border border-white/20">
          <h3 className="text-3xl font-bold mb-12 text-center">المميزات الرئيسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="flex gap-6 group">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-200 group-hover:rotate-12 transition-transform">
                  <QrCode className="h-7 w-7" />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">مسح QR Code</h4>
                <p className="text-gray-600">مسح سريع وآمن باستخدام كاميرا الهاتف أو الكمبيوتر</p>
              </div>
            </div>

            <div className="flex gap-6 group">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">
                  <Users className="h-7 w-7" />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">إدارة الأعضاء</h4>
                <p className="text-gray-600">نظام متكامل لإضافة وتعديل بيانات الشباب بسهولة</p>
              </div>
            </div>

            <div className="flex gap-6 group">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-green-500 text-white shadow-lg shadow-green-200 group-hover:rotate-12 transition-transform">
                  <BarChart3 className="h-7 w-7" />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">تقارير شاملة</h4>
                <p className="text-gray-600">إحصائيات دقيقة وسجلات حضور مفصلة لكل يوم</p>
              </div>
            </div>

            <div className="flex gap-6 group">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-purple-500 text-white shadow-lg shadow-purple-200 group-hover:rotate-12 transition-transform">
                  <Lock className="h-7 w-7" />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">أمان عالي</h4>
                <p className="text-gray-600">تشفير كامل للبيانات وحماية الخصوصية بكلمات مرور</p>
              </div>
            </div>
          </div>
        </div>

        {/* قسم البيانات المتقدمة */}
        <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 backdrop-blur-md rounded-3xl p-10 border border-white/30 shadow-inner">
          <h3 className="text-2xl font-bold mb-6">قاعدة بيانات ذكية</h3>
          <p className="text-gray-700 text-lg mb-8">
            نقوم بجمع وتصنيف البيانات لخدمة الشباب بشكل أفضل:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "الاسم الكامل والرقم التعريفي الفريد",
              "بيانات التواصل والبريد الإلكتروني",
              "المؤهلات الدراسية والسنة الأكاديمية",
              "أب الاعتراف والبيانات الروحية"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/40 p-3 rounded-xl">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* أزرار سريعة */}
        <div className="mt-16 flex flex-col sm:flex-row gap-6 justify-center">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-10 text-lg rounded-2xl shadow-xl shadow-blue-200"
            onClick={() => setLocation("/attendance")}
          >
            <QrCode className="w-6 h-6 ml-3" />
            مسح QR Code الآن
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-white/50 backdrop-blur-sm h-14 px-10 text-lg rounded-2xl border-2 hover:bg-white/80"
            onClick={() => setLocation("/admin-login")}
          >
            <Lock className="w-6 h-6 ml-3" />
            دخول لوحة التحكم
          </Button>
        </div>
      </div>

      {/* التذييل */}
      <footer className="bg-white/60 backdrop-blur-md border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 py-10 text-center text-gray-600">
          <p className="font-bold text-lg">© 2025 إجتماع شباب ماء حي</p>
          <p className="text-sm mt-2 opacity-70">نظام متطور مصمم خصيصاً لخدمة الشباب</p>
        </div>
      </footer>
    </div>

  );
}
