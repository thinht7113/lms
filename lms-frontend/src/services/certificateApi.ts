// ============================================================
// LuminaLMS Frontend — Certificates API
// ============================================================

import type { Certificate, CertificateVerification } from "./types";
import { API_BASE_URL, fetchWithAuth, fetchWithTimeout } from "./client";

export const certificateApiModule = {
  async getPublicCertificate(uuid: string): Promise<CertificateVerification> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/certificates/verify/${uuid}`);
    if (!res.ok) throw new Error("Không thể xác thực chứng chỉ này");
    const data = await res.json();
    if (!data.valid || !data.certificate) {
      throw new Error(data.message || "Chứng chỉ không hợp lệ");
    }
    return data.certificate;
  },

  async getMyCertificates(): Promise<Certificate[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/certificates/my-certificates`);
    if (!res.ok) throw new Error("Failed to fetch certificates");
    return await res.json();
  },

  async issueOrGetCertificate(courseId: number): Promise<Certificate> {
    const res = await fetchWithAuth(`${API_BASE_URL}/certificates/${courseId}/download`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Bạn chưa đủ điều kiện nhận chứng chỉ");
    }
    return await res.json();
  },
};

// Legacy-compatible standalone export
export const certificateApi = {
  verifyCertificate: async (uuid: string): Promise<CertificateVerification> => {
    const res = await fetch(`${API_BASE_URL}/certificates/verify/${uuid}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể xác minh chứng chỉ");
    }
    return await res.json();
  },
  getMyCertificates: async (): Promise<Certificate[]> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/certificates/my-certificates`);
    if (!res.ok) throw new Error("Failed to fetch certificates");
    return await res.json();
  },
  downloadCertificate: async (courseId: number): Promise<Certificate> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/certificates/${courseId}/download`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tải chứng chỉ");
    }
    return await res.json();
  }
};
