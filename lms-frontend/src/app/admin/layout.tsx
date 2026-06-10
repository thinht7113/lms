import React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import AdminShell from "./AdminShell";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const AUTH_COOKIE_NAME = "lms_session";

async function assertAdminAccess() {
    const cookieStore = await cookies();
    const session = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!session) {
        notFound();
    }

    const cookieHeader = cookieStore
        .getAll()
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

    try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                Cookie: cookieHeader,
            },
            cache: "no-store",
        });

        if (!res.ok) {
            notFound();
        }

        const user = await res.json();
        if (user?.vai_tro !== "admin") {
            notFound();
        }
    } catch {
        notFound();
    }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    await assertAdminAccess();

    return <AdminShell>{children}</AdminShell>;
}
