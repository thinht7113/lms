"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Inbox } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { tokenHelper } from "@/services/api";

const notifications: Array<{
  id: number;
  title: string;
  description: string;
}> = [];

export default function NotificationsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!tokenHelper.getToken()) {
      router.push("/login");
    }
  }, [router]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8F9FA] pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Thông báo</p>
          </div>

          <div className="rounded-[2rem] border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-4 border-b border-border/70 p-5">
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="rounded-[2rem] bg-secondary p-6">
                  <Inbox className="h-12 w-12 text-primary/50" />
                </div>
                <h3 className="mt-6 text-xl font-black text-slate-950">Không có thông báo</h3>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {notifications.map((item) => (
                  <div key={item.id} className="flex gap-4 p-5">
                    <div className="mt-1 rounded-xl bg-secondary p-3">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
