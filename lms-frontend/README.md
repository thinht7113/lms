# LuminaLMS Frontend

LuminaLMS Frontend là giao diện người dùng của hệ thống đăng ký khóa học trực tuyến LuminaLMS. Ứng dụng được xây dựng bằng Next.js, React và TypeScript, đóng vai trò là tầng client trong mô hình Client-Server. Frontend chịu trách nhiệm hiển thị giao diện, điều hướng trang, nhận thao tác từ người dùng, gọi API backend và render dữ liệu trả về.

## 1. Vai trò của frontend

Frontend là nơi học viên, giảng viên và quản trị viên tương tác trực tiếp với hệ thống. Học viên có thể xem danh sách khóa học, tìm kiếm, xem chi tiết khóa học, thêm vào giỏ hàng, thanh toán, học bài, làm bài kiểm tra và xem chứng chỉ. Giảng viên có thể truy cập khu vực quản lý để tạo khóa học, thêm chương học, thêm bài học, upload tài liệu và theo dõi doanh thu. Quản trị viên có thể truy cập khu vực admin để quản lý người dùng, khóa học, danh mục, banner, đơn hàng, mã giảm giá, cấu hình và nhật ký hệ thống.

## 2. Công nghệ sử dụng

Ứng dụng sử dụng Next.js 16 với App Router để tổ chức route theo thư mục trong `src/app`. React 19 được dùng để xây dựng giao diện dạng component. TypeScript được dùng để kiểm tra kiểu dữ liệu trong quá trình phát triển. Tailwind CSS 4 được dùng để thiết kế giao diện. Lucide React được dùng cho hệ thống biểu tượng. CKEditor 5 được dùng cho các vùng soạn thảo nội dung phong phú. Recharts được dùng để hiển thị biểu đồ trong dashboard. Thư viện `@hello-pangea/dnd` hỗ trợ thao tác kéo thả khi cần sắp xếp dữ liệu.

## 3. Cấu trúc thư mục

```text
lms-frontend/
├── public
├── src
│   ├── app
│   ├── components
│   ├── contexts
│   ├── hooks
│   ├── services
│   └── utils
├── middleware.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
└── eslint.config.mjs
```

Thư mục `public` chứa tài nguyên tĩnh có thể được truy cập trực tiếp từ trình duyệt. Thư mục `src/app` chứa hệ thống route của Next.js, trong đó mỗi thư mục con tương ứng với một đường dẫn trên website. Thư mục `src/components` chứa các component giao diện có thể tái sử dụng như thanh điều hướng, logo hệ thống, modal đăng nhập, bảng quản trị và trình xem PDF. Thư mục `src/contexts` chứa các React Context dùng để chia sẻ trạng thái toàn cục. Thư mục `src/hooks` chứa các custom hook dùng lại nhiều nơi. Thư mục `src/services` chứa lớp giao tiếp API với backend, trong đó file quan trọng nhất là `api.ts`. Thư mục `src/utils` chứa các hàm tiện ích dùng chung.

## 4. Cấu trúc định tuyến

Next.js App Router sử dụng chính cấu trúc thư mục trong `src/app` để tạo đường dẫn. File `src/app/page.tsx` tương ứng với trang chủ `/`. Thư mục `src/app/courses` tương ứng với trang danh sách khóa học `/courses`. Thư mục `src/app/courses/[id]` tương ứng với trang chi tiết khóa học động theo mã khóa học. Thư mục `src/app/admin` chứa các trang quản trị. Thư mục `src/app/instructor` chứa các trang dành cho giảng viên. Thư mục `src/app/learn/[courseId]` chứa giao diện học bài theo khóa học.

## 5. Giao tiếp với backend

Frontend gọi API backend thông qua file `src/services/api.ts`. File này tập trung các hàm gửi request, xử lý token, cấu hình header, parse dữ liệu JSON và xử lý lỗi trả về từ server. Việc gom logic gọi API vào một file giúp các page và component không phải viết lặp lại `fetch` ở nhiều nơi.

Luồng xử lý cơ bản là người dùng thao tác trên giao diện, component hoặc page gọi hàm trong `apiService`, `api.ts` gửi HTTP request tới backend FastAPI, backend xử lý nghiệp vụ và trả JSON, sau đó frontend cập nhật state và render lại giao diện.

Ví dụ khi người dùng đăng nhập, `AuthModal` gọi hàm đăng nhập trong `apiService`. Hàm này gửi request tới endpoint đăng nhập của backend. Nếu đăng nhập thành công, frontend cập nhật thông tin người dùng, điều hướng giao diện và hiển thị trạng thái đã đăng nhập trên `Navbar`.

## 6. Biến môi trường

Frontend sử dụng biến môi trường để xác định địa chỉ API backend. File `.env` trong thư mục `lms-frontend` cần có nội dung dạng sau khi chạy local:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Nếu backend đã được triển khai trên máy chủ thật, giá trị này cần đổi sang URL API thật. Sau khi thay đổi `.env`, cần khởi động lại frontend để Next.js nạp lại biến môi trường.

## 7. Cài đặt và chạy ở môi trường phát triển

Trước khi chạy frontend, cần đảm bảo đã cài Node.js và npm. Sau đó mở terminal tại thư mục `lms-frontend` và chạy lệnh cài đặt thư viện.

```powershell
cd lms-frontend
npm install
```

Sau khi cài đặt xong, chạy ứng dụng ở chế độ phát triển.

```powershell
npm run dev
```

Theo cấu hình hiện tại trong `package.json`, lệnh phát triển sử dụng Next.js với Webpack.

```json
"dev": "next dev --webpack"
```

Khi chạy thành công, truy cập website tại địa chỉ sau.

```text
http://localhost:3000
```

## 8. Build và chạy production

Để kiểm tra frontend có thể build thành công hay không, sử dụng lệnh sau.

```powershell
npm run build
```

Sau khi build thành công, có thể chạy bản production bằng lệnh sau.

```powershell
npm run start
```

Lệnh `build` dùng để tạo bản tối ưu hóa cho production. Lệnh `start` dùng để chạy bản đã build. Trong môi trường production, cần đảm bảo biến `NEXT_PUBLIC_API_URL` trỏ đúng tới backend thật.

## 9. Kiểm tra chất lượng mã nguồn

Dự án có cấu hình ESLint. Có thể chạy kiểm tra bằng lệnh sau.

```powershell
npm run lint
```

Lệnh này giúp phát hiện các vấn đề về cú pháp, quy tắc code và một số lỗi tiềm ẩn trong quá trình phát triển.

## 10. Middleware và kiểm tra quyền truy cập

File `middleware.ts` nằm ở thư mục gốc của frontend. Middleware được dùng để xử lý một số request trước khi trang được render. Trong dự án này, middleware hỗ trợ kiểm tra quyền truy cập với các khu vực nhạy cảm như trang quản trị và trang giảng viên. Mục tiêu là hạn chế việc hiển thị giao diện không phù hợp trước khi xác định quyền người dùng.

## 11. Thành phần giao diện quan trọng

Component `Navbar.tsx` là thanh điều hướng chính của hệ thống, hiển thị logo, menu, tìm kiếm, giỏ hàng và menu người dùng. Component `SystemLogo.tsx` hiển thị logo hệ thống, đồng thời có khả năng lấy logo từ cấu hình công khai của backend. Component `AuthModal.tsx` xử lý giao diện đăng nhập và đăng ký. Component `PdfViewer.tsx` hỗ trợ xem tài liệu PDF trong bài học. Các component trong `src/components/admin` hỗ trợ giao diện quản trị như bảng dữ liệu động và layout admin.

## 12. Luồng sử dụng chính

Khi học viên mở trang chủ, Next.js render `src/app/page.tsx`. Trang này sử dụng các component giao diện và gọi API để lấy dữ liệu banner, danh mục và khóa học. Khi học viên mở trang khóa học, frontend gọi API lấy danh sách khóa học và hiển thị bằng các thẻ khóa học. Khi học viên thêm vào giỏ hàng, frontend gửi request tới backend, backend lưu dữ liệu giỏ hàng và frontend cập nhật số lượng trong navbar.

Khi giảng viên vào khu vực quản lý, frontend điều hướng tới nhóm route trong `src/app/instructor`. Các trang này gọi API backend để tạo khóa học, tạo chương, tạo bài học và upload nội dung. Khi quản trị viên vào khu vực admin, frontend dùng các trang trong `src/app/admin` và gọi các API quản trị như `/admin` hoặc `/dynamic-admin`.

## 13. Lưu ý khi bàn giao frontend

Khi bàn giao dự án, không nên gửi thư mục `node_modules` vì thư mục này có thể được tạo lại bằng `npm install`. Không nên gửi thư mục `.next` vì đây là kết quả build tạm thời của Next.js. Không nên gửi file `.env` thật nếu trong đó chứa domain API nội bộ hoặc thông tin môi trường riêng. Nên gửi `package.json`, `package-lock.json`, `src`, `public`, `next.config.ts`, `tsconfig.json`, `middleware.ts` và hướng dẫn cấu hình biến môi trường.

## 14. Lỗi thường gặp

Nếu frontend gọi API không đúng địa chỉ, cần kiểm tra lại `NEXT_PUBLIC_API_URL` trong file `.env`. Nếu vừa thay đổi `.env` nhưng website vẫn gọi API cũ, cần tắt và chạy lại `npm run dev`. Nếu ảnh từ MinIO không hiển thị, cần kiểm tra cấu hình domain ảnh trong `next.config.ts` và kiểm tra backend có trả đúng URL ảnh hay không. Nếu gặp lỗi hydration, cần kiểm tra các component client có sử dụng `localStorage`, `Date.now`, `Math.random` hoặc dữ liệu chỉ tồn tại phía client trong lần render đầu tiên hay không.

## 15. Tóm tắt lệnh thường dùng

Lệnh cài đặt thư viện là:

```powershell
npm install
```

Lệnh chạy môi trường phát triển là:

```powershell
npm run dev
```

Lệnh build production là:

```powershell
npm run build
```

Lệnh chạy production sau khi build là:

```powershell
npm run start
```

Lệnh kiểm tra ESLint là:

```powershell
npm run lint
```
