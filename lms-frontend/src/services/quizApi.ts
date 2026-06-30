// ============================================================
// LuminaLMS Frontend — Quizzes & Grading API
// ============================================================

import type { Quiz, QuizDetail, QuizAttempt, QuizAttemptReview, QuizSubmitResponse, Question, QuizPayload, QuestionPayload } from "./types";
import { API_BASE_URL, fetchWithAuth } from "./client";

export const quizApi = {
  async getCourseQuizzes(courseId: number): Promise<Quiz[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/quizzes`);
    if (!res.ok) throw new Error("Failed to fetch quizzes");
    return await res.json();
  },

  async createQuiz(courseId: number, payload: QuizPayload): Promise<Quiz> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/quizzes`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tạo bài kiểm tra");
    }
    return await res.json();
  },

  async deleteQuiz(courseId: number, quizId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/quizzes/${quizId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể xóa bài kiểm tra");
    }
  },

  async createQuestion(quizId: number, payload: QuestionPayload): Promise<Question> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tạo câu hỏi");
    }
    return await res.json();
  },

  async deleteQuestion(questionId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/questions/${questionId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể xóa câu hỏi");
    }
  },

  async getQuizDetail(quizId: number): Promise<QuizDetail> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/${quizId}`);
    if (!res.ok) throw new Error("Failed to fetch quiz detail");
    return await res.json();
  },

  async startQuiz(quizId: number): Promise<QuizAttempt> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/${quizId}/start`, {
      method: "POST"
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể bắt đầu thi");
    }
    return await res.json();
  },

  async submitQuiz(quizId: number, attemptId: number, answers: { question_id: number; chosen_option_id: number }[]): Promise<QuizSubmitResponse> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ attempt_id: attemptId, answers })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể nộp bài thi");
    }
    return await res.json();
  },

  async getQuizAttempt(attemptId: number): Promise<QuizAttempt> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/attempts/${attemptId}`);
    if (!res.ok) throw new Error("Failed to fetch quiz attempt detail");
    return await res.json();
  },

  async getQuizAttemptReview(attemptId: number): Promise<QuizAttemptReview> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/attempts/${attemptId}/review`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to fetch quiz review");
    }
    return await res.json();
  },
};
