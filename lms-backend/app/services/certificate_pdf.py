import io
import os

from reportlab.lib.colors import Color, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "assets", "fonts"))
REGULAR_FONT_PATH = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
BOLD_FONT_PATH = os.path.join(FONT_DIR, "Roboto-Bold.ttf")

fonts_loaded = False
try:
    if os.path.exists(REGULAR_FONT_PATH) and os.path.exists(BOLD_FONT_PATH):
        pdfmetrics.registerFont(TTFont("Roboto", REGULAR_FONT_PATH))
        pdfmetrics.registerFont(TTFont("Roboto-Bold", BOLD_FONT_PATH))
        fonts_loaded = True
    else:
        print(f"Warning: Roboto fonts not found at {FONT_DIR}. Falling back to Helvetica.")
except Exception as e:
    print(f"Error registering fonts: {e}. Falling back to Helvetica.")

FONT_REGULAR = "Roboto" if fonts_loaded else "Helvetica"
FONT_BOLD = "Roboto-Bold" if fonts_loaded else "Helvetica-Bold"


def draw_centered_string(
    c: canvas.Canvas,
    text: str,
    y: float,
    font_name: str,
    font_size: float,
    color: Color,
) -> None:
    c.setFont(font_name, font_size)
    c.setFillColor(color)
    c.drawCentredString(396, y, text)


def draw_gold_seal(c: canvas.Canvas, x: float, y: float) -> None:
    c.setFillColor(HexColor("#D97706"))

    left_ribbon = c.beginPath()
    left_ribbon.moveTo(x - 8, y - 12)
    left_ribbon.lineTo(x - 18, y - 38)
    left_ribbon.lineTo(x - 8, y - 32)
    left_ribbon.lineTo(x, y - 38)
    left_ribbon.lineTo(x - 2, y - 12)
    c.drawPath(left_ribbon, fill=True, stroke=False)

    right_ribbon = c.beginPath()
    right_ribbon.moveTo(x + 2, y - 12)
    right_ribbon.lineTo(x, y - 38)
    right_ribbon.lineTo(x + 8, y - 32)
    right_ribbon.lineTo(x + 18, y - 38)
    right_ribbon.lineTo(x + 8, y - 12)
    c.drawPath(right_ribbon, fill=True, stroke=False)

    c.setFillColor(HexColor("#F59E0B"))
    c.setStrokeColor(HexColor("#D97706"))
    c.setLineWidth(1)
    c.circle(x, y, 22, fill=True, stroke=True)

    c.setFillColor(HexColor("#D97706"))
    c.circle(x, y, 18, fill=True, stroke=False)

    c.setFillColor(HexColor("#F59E0B"))
    c.circle(x, y, 15, fill=True, stroke=False)

    c.setFont(FONT_BOLD, 5)
    c.setFillColor(HexColor("#FFFFFF"))
    c.drawCentredString(x, y - 2, "VERIFIED")


def draw_centered_title(
    c: canvas.Canvas,
    text: str,
    y: float,
    font_name: str,
    max_font_size: float = 22,
    max_width: float = 660.0,
    color: Color = HexColor("#2563EB"),
) -> None:
    font_size = max_font_size
    text_width = pdfmetrics.stringWidth(text, font_name, font_size)

    # 1. Nếu vừa 1 dòng ở font max_font_size
    if text_width <= max_width:
        c.setFont(font_name, font_size)
        c.setFillColor(color)
        c.drawCentredString(396, y, text)
        return

    # 2. Thử giảm font_size dần xuống tối thiểu 14px để giữ 1 dòng
    while font_size > 14 and pdfmetrics.stringWidth(text, font_name, font_size) > max_width:
        font_size -= 1

    text_width = pdfmetrics.stringWidth(text, font_name, font_size)
    if text_width <= max_width:
        c.setFont(font_name, font_size)
        c.setFillColor(color)
        c.drawCentredString(396, y, text)
        return

    # 3. Nếu vẫn dài hơn max_width ở font 14px, tự động xuống dòng (multi-line wrap)
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        test_line = " ".join(current_line + [word])
        if pdfmetrics.stringWidth(test_line, font_name, font_size) <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
    if current_line:
        lines.append(" ".join(current_line))

    leading = font_size * 1.25
    total_height = (len(lines) - 1) * leading
    start_y = y + (total_height / 2)

    c.setFont(font_name, font_size)
    c.setFillColor(color)
    for idx, line in enumerate(lines):
        line_y = start_y - (idx * leading)
        c.drawCentredString(396, line_y, line)


def build_certificate_pdf(
    student_name: str,
    course_title: str,
    certificate_uuid: str,
    issued_date: str,
) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(792, 612))

    c.setFillColor(HexColor("#FCFCF9"))
    c.rect(0, 0, 792, 612, fill=True, stroke=False)

    c.setStrokeColor(HexColor("#0F172A"))
    c.setLineWidth(4)
    c.rect(20, 20, 752, 572, fill=False, stroke=True)

    c.setStrokeColor(HexColor("#D97706"))
    c.setLineWidth(1.5)
    c.rect(28, 28, 736, 556, fill=False, stroke=True)

    c.setFillColor(HexColor("#0F172A"))
    c.rect(28, 564, 20, 20, fill=True, stroke=False)
    c.rect(28, 28, 20, 20, fill=True, stroke=False)
    c.rect(744, 564, 20, 20, fill=True, stroke=False)
    c.rect(744, 28, 20, 20, fill=True, stroke=False)

    draw_centered_string(c, "L U M I N A   L M S", 500, FONT_BOLD, 22, HexColor("#1E3A8A"))

    c.setStrokeColor(HexColor("#D97706"))
    c.setLineWidth(1.5)
    c.line(346, 488, 446, 488)

    draw_centered_string(c, "CHỨNG NHẬN HOÀN THÀNH KHÓA HỌC", 445, FONT_BOLD, 13, HexColor("#475569"))
    draw_centered_string(c, "Chứng chỉ này được trân trọng trao tặng cho", 395, FONT_REGULAR, 11, HexColor("#64748B"))
    draw_centered_string(c, student_name, 335, FONT_BOLD, 30, HexColor("#0F172A"))

    c.setStrokeColor(HexColor("#E2E8F0"))
    c.setLineWidth(1)
    c.line(246, 315, 546, 315)

    draw_centered_string(
        c,
        "Vì đã hoàn thành xuất sắc chương trình đào tạo và đánh giá năng lực của khóa học:",
        285,
        FONT_REGULAR,
        11,
        HexColor("#64748B"),
    )
    draw_centered_title(c, course_title.upper(), 235, FONT_BOLD, 22, 660.0, HexColor("#2563EB"))

    draw_gold_seal(c, 396, 175)

    c.setFont(FONT_BOLD, 8)
    c.setFillColor(HexColor("#94A3B8"))
    c.drawString(60, 130, "NGÀY CẤP")
    c.setFont(FONT_BOLD, 10)
    c.setFillColor(HexColor("#334155"))
    c.drawString(60, 112, issued_date)

    draw_centered_string(c, "Lumina Board", 125, FONT_BOLD, 14, HexColor("#1E3A8A"))
    c.setStrokeColor(HexColor("#94A3B8"))
    c.setLineWidth(0.5)
    c.line(326, 115, 466, 115)
    draw_centered_string(c, "HỘI ĐỒNG GIẢNG VIÊN", 100, FONT_BOLD, 8, HexColor("#94A3B8"))

    c.setFont(FONT_BOLD, 8)
    c.setFillColor(HexColor("#94A3B8"))
    c.drawRightString(732, 130, "MÃ ĐỊNH DANH CHỨNG CHỈ")
    c.setFont(FONT_REGULAR, 8)
    c.setFillColor(HexColor("#334155"))
    c.drawRightString(732, 112, certificate_uuid)

    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
