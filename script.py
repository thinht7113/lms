import sys

file_path = r'D:\BT\LMS\lms-backend\app\api\v1\endpoints\admin.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'log_admin_action(db, current_admin.id, "UPDATE_USER_ROLE", f"User {user_id} -> {request.vai_tro}")': 'log_admin_action(db, current_admin.id, "Cập nhật vai trò", f"Người dùng: {user.ho_ten or user.email} -> {request.vai_tro}")',
    'log_admin_action(db, current_admin.id, "DELETE_USER", f"Đã xóa User ID {user_id}")': 'log_admin_action(db, current_admin.id, "Xóa người dùng", f"Người dùng: {user.ho_ten or user.email}")',
    'log_admin_action(db, current_admin.id, "RESET_PASSWORD", f"Đã reset mật khẩu ngẫu nhiên cho User ID {user_id}")': 'log_admin_action(db, current_admin.id, "Khôi phục mật khẩu", f"Người dùng: {user.ho_ten or user.email}")',
    'log_admin_action(db, current_admin.id, "APPROVE_COURSE", f"Đã duyệt Course ID {course_id}")': 'log_admin_action(db, current_admin.id, "Duyệt khóa học", f"Khóa học: {course.tieu_de}")',
    'log_admin_action(db, current_admin.id, "REJECT_COURSE", f"Đã từ chối Course ID {course_id}")': 'log_admin_action(db, current_admin.id, "Từ chối khóa học", f"Khóa học: {course.tieu_de}")',
    'log_admin_action(db, current_admin.id, "APPROVE_LESSON", f"Đã duyệt Lesson ID {lesson_id}")': 'log_admin_action(db, current_admin.id, "Duyệt bài học", f"Bài học: {db_lesson.tieu_de}")',
    'log_admin_action(db, current_admin.id, "REJECT_LESSON", f"Đã từ chối Lesson ID {lesson_id}")': 'log_admin_action(db, current_admin.id, "Từ chối bài học", f"Bài học: {db_lesson.tieu_de}")',
    'log_admin_action(db, current_admin.id, "DELETE_COURSE", f"Xóa Course {course_id}")': 'log_admin_action(db, current_admin.id, "Xóa khóa học", f"Khóa học: {course.tieu_de}")',
    'log_admin_action(db, current_admin.id, "CREATE_ENROLLMENT", f"Cấp quyền User {request.ma_nguoi_dung} vào Course {request.ma_khoa_hoc}")': 'log_admin_action(db, current_admin.id, "Cấp quyền ghi danh", f"Cấp quyền cho User ID {request.ma_nguoi_dung} vào khóa học ID {request.ma_khoa_hoc}")',
    'log_admin_action(db, current_admin.id, "DELETE_ENROLLMENT", f"Thu hồi quyền Enrollment {enrollment_id}")': 'log_admin_action(db, current_admin.id, "Thu hồi ghi danh", f"Thu hồi quyền ghi danh ID {enrollment_id}")',
    'log_admin_action(db, current_admin.id, "DELETE_CERTIFICATE", f"Thu hồi Certificate {certificate_id}")': 'log_admin_action(db, current_admin.id, "Thu hồi chứng chỉ", f"Chứng chỉ ID {certificate_id}")',
    'log_admin_action(db, current_admin.id, "APPROVE_REFUND", f"Đã duyệt hoàn tiền Đơn hàng ID {order_id}")': 'log_admin_action(db, current_admin.id, "Duyệt hoàn tiền", f"Đơn hàng: #{order_id}")',
    'log_admin_action(db, current_admin.id, "REJECT_REFUND", f"Đã từ chối hoàn tiền Đơn hàng ID {order_id}")': 'log_admin_action(db, current_admin.id, "Từ chối hoàn tiền", f"Đơn hàng: #{order_id}")',
    'log_admin_action(db, current_admin.id, "UPDATE_SETTINGS", f"Đã cập nhật {updates} mục cấu hình")': 'log_admin_action(db, current_admin.id, "Cập nhật cài đặt", f"Cập nhật {updates} mục hệ thống")',
}

for old, new in replacements.items():
    if old in content:
        content = content.replace(old, new)
    else:
        print(f'Warning: could not find {old}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
