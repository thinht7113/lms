import os
import sys

# Add lms-backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.certificate_pdf import build_certificate_pdf

def test():
    pdf_bytes = build_certificate_pdf(
        student_name="Hoàng Đức Thịnh",
        course_title="Xây dựng REST API với FastAPI",
        certificate_uuid="12345678-abcd-ef01-2345-6789abcdef01",
        issued_date="2026-06-10"
    )
    
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "test_cert.pdf")
    with open(out_path, "wb") as f:
        f.write(pdf_bytes)
    print(f"Generated test PDF at {out_path}")

if __name__ == "__main__":
    test()
