from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class PayoutRequest(Base):
    __tablename__ = 'yeu_cau_rut_tien'

    id = Column(Integer, primary_key=True, index=True)
    ma_giang_vien = Column(Integer, ForeignKey('nguoi_dung.id', ondelete='CASCADE'), nullable=False)
    so_tien = Column(Float, nullable=False)
    ngan_hang = Column(String, nullable=False)
    so_tai_khoan = Column(String, nullable=False)
    ten_chu_tai_khoan = Column(String, nullable=False)
    trang_thai = Column(String, default='pending') # pending, success, rejected
    ly_do_tu_choi = Column(Text, nullable=True)
    ngay_yeu_cau = Column(DateTime, default=datetime.utcnow)
    ngay_xu_ly = Column(DateTime, nullable=True)

    giang_vien = relationship('User')
