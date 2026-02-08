import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Filter, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AttendanceRecords() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [searchText, setSearchText] = useState("");

  const recordsQuery = trpc.attendance.getAllAttendance.useQuery();
  const membersQuery = trpc.admin.getAllMembers.useQuery();

  // تصفية السجلات
  const filteredRecords = useMemo(() => {
    if (!recordsQuery.data) return [];

    return recordsQuery.data.filter((record: any) => {
      // تصفية حسب التاريخ
      if (selectedDate) {
        const recordDate = format(new Date(record.attendanceDate), "yyyy-MM-dd");
        if (recordDate !== selectedDate) return false;
      }

      // تصفية حسب العضو
      if (selectedMember) {
        if (record.memberId !== parseInt(selectedMember)) return false;
      }

      // تصفية حسب نص البحث
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        if (
          !record.memberName.toLowerCase().includes(searchLower) &&
          !record.memberIdStr.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [recordsQuery.data, selectedDate, selectedMember, searchText]);

  // إحصائيات
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r: any) => r.status === "present").length;
    const absent = filteredRecords.filter((r: any) => r.status === "absent").length;

    return { total, present, absent };
  }, [filteredRecords]);

  // تحميل البيانات كـ CSV
  const handleExport = () => {
    if (!filteredRecords.length) {
      alert("لا توجد بيانات للتحميل");
      return;
    }

    const headers = ["الاسم", "الرقم التعريفي", "التاريخ والوقت", "الحالة", "الملاحظات"];
    const rows = filteredRecords.map((record: any) => [
      record.memberName,
      record.memberIdStr,
      format(new Date(record.attendanceDate), "yyyy-MM-dd HH:mm:ss"),
      record.status === "present" ? "حاضر" : "غائب",
      record.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="text-center">
            <p className="text-sm text-blue-600 font-medium">إجمالي السجلات</p>
            <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="text-center">
            <p className="text-sm text-green-600 font-medium">الحاضرون</p>
            <p className="text-3xl font-bold text-green-900">{stats.present}</p>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="text-center">
            <p className="text-sm text-red-600 font-medium">الغائبون</p>
            <p className="text-3xl font-bold text-red-900">{stats.absent}</p>
          </div>
        </Card>
      </div>

      {/* أدوات الفلترة */}
      <Card className="p-4 bg-white border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold">الفلترة والبحث</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">البحث</label>
            <Input
              placeholder="ابحث بالاسم أو الرقم..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">التاريخ</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">العضو</label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="اختر عضواً" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الأعضاء</SelectItem>
                {membersQuery.data?.map((member: any) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={() => {
                setSelectedDate("");
                setSelectedMember("");
                setSearchText("");
              }}
              variant="outline"
              className="flex-1"
            >
              إعادة تعيين
            </Button>
            <Button
              onClick={handleExport}
              className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تحميل</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* جدول السجلات */}
      {recordsQuery.isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">جاري تحميل السجلات...</p>
        </Card>
      ) : filteredRecords.length > 0 ? (
        <Card className="overflow-hidden border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الاسم</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الرقم التعريفي</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">التاريخ والوقت</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-4 py-3 text-sm">{record.memberName}</td>
                    <td className="px-4 py-3 text-sm font-mono">{record.memberIdStr}</td>
                    <td className="px-4 py-3 text-sm">
                      {format(new Date(record.attendanceDate), "dd MMM yyyy HH:mm", { locale: ar })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.status === "present"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {record.status === "present" ? "حاضر" : "غائب"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-gray-500">لا توجد سجلات حضور</p>
        </Card>
      )}
    </div>
  );
}
