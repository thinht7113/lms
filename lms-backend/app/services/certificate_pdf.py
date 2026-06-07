from typing import Iterable


def _escape_pdf_text(value: str) -> str:
    ascii_value = value.encode("ascii", errors="replace").decode("ascii")
    return ascii_value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _text_line(text: str, font_size: int, x: int, y: int) -> str:
    return f"BT /F1 {font_size} Tf {x} {y} Td ({_escape_pdf_text(text)}) Tj ET"


def _build_pdf(objects: Iterable[bytes]) -> bytes:
    object_list = list(objects)
    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]

    for index, obj in enumerate(object_list, start=1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode("ascii"))
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_offset = len(output)
    output.extend(f"xref\n0 {len(object_list) + 1}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    output.extend(
        (
            f"trailer\n<< /Size {len(object_list) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode("ascii")
    )
    return bytes(output)


def build_certificate_pdf(
    student_name: str,
    course_title: str,
    certificate_uuid: str,
    issued_date: str,
) -> bytes:
    content = "\n".join(
        [
            _text_line("LUMINA LMS", 26, 220, 720),
            _text_line("Certificate of Completion", 22, 170, 660),
            _text_line("This certificate is awarded to", 13, 205, 610),
            _text_line(student_name, 20, 190, 565),
            _text_line("for successfully completing", 13, 215, 520),
            _text_line(course_title, 18, 160, 475),
            _text_line(f"Issued: {issued_date}", 11, 72, 100),
            _text_line(f"Certificate ID: {certificate_uuid}", 10, 72, 78),
        ]
    ).encode("ascii")

    return _build_pdf(
        [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            (
                b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
            ),
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            b"<< /Length "
            + str(len(content)).encode("ascii")
            + b" >>\nstream\n"
            + content
            + b"\nendstream",
        ]
    )
