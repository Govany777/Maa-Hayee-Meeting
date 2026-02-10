# إصلاح مشاكل الداش بورد على Railway

## المشاكل التي تم حلها

### 1. مشكلة تسجيل الخروج التلقائي من الداش بورد

**السبب:**
- كانت إعدادات الـ cookies غير متسقة بين ملفات المشروع
- كان `sameSite` مضبوط على `"lax"` في `routers.ts` بينما كان `"none"` في `cookies.ts`
- عند الرفع على Railway (HTTPS)، يجب استخدام `sameSite: "none"` مع `secure: true`

**الحل:**
1. تم توحيد إعدادات الـ cookies في جميع نقاط تسجيل الدخول (Admin Login, Member Login, Member Registration)
2. تم استخدام دالة `getSessionCookieOptions()` من `cookies.ts` في جميع الأماكن
3. تم تحديث `cookies.ts` لاستخدام `sameSite: "none"` في بيئة الإنتاج (HTTPS) و `sameSite: "lax"` في التطوير المحلي

**الملفات المعدلة:**
- `server/routers.ts` - تم تحديث 3 أماكن (admin.login, members.login, members.register)
- `server/_core/cookies.ts` - تم تحسين منطق اختيار `sameSite`

### 2. عرض بيانات الأعضاء الجدد في الداش بورد

**الوضع الحالي:**
- الداش بورد يعرض جميع البيانات بشكل صحيح بالفعل
- يتم عرض: الاسم، رقم الهاتف، تاريخ الميلاد، العنوان، أب الاعتراف، اسم المستخدم (إذا كان لديه حساب)
- يتم تحديث البيانات تلقائيًا كل ثانيتين (`refetchInterval: 2000`)

**البيانات المعروضة في كل بطاقة عضو:**
- ✅ الصورة الشخصية
- ✅ QR Code صغير في الزاوية
- ✅ الاسم الكامل
- ✅ حالة الحساب (حساب مفعل/غير مفعل)
- ✅ رقم العضوية (ID)
- ✅ اسم المستخدم (إذا وجد)
- ✅ رقم الهاتف
- ✅ تاريخ الميلاد
- ✅ العنوان
- ✅ أب الاعتراف

## التغييرات التقنية

### في `server/routers.ts`:

```typescript
// قبل التعديل:
ctx.res.cookie(COOKIE_NAME, sessionToken, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: ONE_YEAR_MS,
});

// بعد التعديل:
const cookieOptions = require('./_core/cookies').getSessionCookieOptions(ctx.req);
ctx.res.cookie(COOKIE_NAME, sessionToken, {
  ...cookieOptions,
  maxAge: ONE_YEAR_MS,
});
```

### في `server/_core/cookies.ts`:

```typescript
export function getSessionCookieOptions(req: Request) {
  const isSecure = isSecureRequest(req);
  
  // For production (Railway), use 'none' with secure
  // For local development, use 'lax'
  const sameSite = isSecure ? "none" : "lax";

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure: isSecure,
  };
}
```

## كيفية اختبار الإصلاحات

### 1. اختبار محلي:
```bash
npm run dev
```
- سجل دخول كأدمن
- تأكد من بقائك مسجل دخول عند تحديث الصفحة
- أضف عضو جديد وتأكد من ظهور جميع بياناته

### 2. اختبار على Railway:
1. ارفع التغييرات على Git:
```bash
git add .
git commit -m "Fix session persistence and dashboard display"
git push
```

2. انتظر حتى يكتمل الـ deployment على Railway

3. اختبر تسجيل الدخول:
   - سجل دخول كأدمن
   - حدث الصفحة عدة مرات
   - تأكد من بقائك مسجل دخول
   - اترك التبويب مفتوحًا لمدة 5-10 دقائق ثم حدث
   - يجب أن تبقى مسجل دخول

4. اختبر إضافة عضو جديد:
   - أضف عضو جديد من الداش بورد
   - تأكد من ظهور جميع البيانات المدخلة
   - سجل دخول العضو من صفحة تسجيل دخول الأعضاء
   - تأكد من ظهور بياناته في الداش بورد

## ملاحظات مهمة

1. **مدة الجلسة:** تم ضبط مدة الجلسة على سنة واحدة (`ONE_YEAR_MS`)
2. **الأمان:** جميع الـ cookies محمية بـ `httpOnly: true` لمنع الوصول من JavaScript
3. **HTTPS:** في بيئة الإنتاج، يتم استخدام `secure: true` و `sameSite: "none"`
4. **التحديث التلقائي:** الداش بورد يحدث البيانات تلقائيًا كل ثانيتين

## إذا استمرت المشكلة

إذا استمرت مشكلة تسجيل الخروج التلقائي بعد هذه التعديلات، تحقق من:

1. **متصفح الويب:** امسح الـ cookies والـ cache
2. **Railway Logs:** تحقق من سجلات Railway للبحث عن أخطاء
3. **Environment Variables:** تأكد من أن `JWT_SECRET` موجود في Railway
4. **Firebase:** تأكد من أن `service-account.json` موجود ومضبوط بشكل صحيح

## الدعم

إذا واجهت أي مشاكل أخرى، يمكنك:
1. فحص سجلات Railway للبحث عن أخطاء
2. فحص Console في المتصفح للبحث عن أخطاء JavaScript
3. التأكد من أن جميع المتغيرات البيئية مضبوطة بشكل صحيح
