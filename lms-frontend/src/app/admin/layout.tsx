import AdminLayout from "@/components/AdminLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Portal | Lumina LMS",
  description: "Lumina LMS Administration Dashboard",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
