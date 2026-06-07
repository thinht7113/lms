"use client";

import React, { useState, useEffect } from "react";
import { LayoutGrid } from "lucide-react";

interface SystemLogoProps {
    textLabel?: string;
    textColorClass?: string;
    iconColorClass?: string;
    iconBgClass?: string;
}

export default function SystemLogo({ 
    textLabel = "LMS", 
    textColorClass = "text-foreground",
    iconColorClass = "text-primary",
    iconBgClass = "bg-primary"
}: SystemLogoProps) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        // Try caching to avoid flicker
        const cached = localStorage.getItem("system_logo");
        if (cached) setLogoUrl(cached);

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        fetch(`${API_BASE_URL}/settings/public`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const logo = data.find((s: any) => s.key === "SYSTEM_LOGO");
                    if (logo && logo.value) {
                        setLogoUrl(logo.value);
                        localStorage.setItem("system_logo", logo.value);
                    }
                }
            })
            .catch(err => console.warn("Failed to load system logo", err));
    }, []);

    return (
        <div className="flex items-center space-x-3 group">
            {logoUrl ? (
                <img 
                    src={logoUrl} 
                    alt="System Logo" 
                    className="h-10 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300" 
                />
            ) : (
                <div className={`${iconBgClass} p-2 rounded-xl text-white shadow-lg shadow-primary/25 group-hover:rotate-6 transition-transform duration-300`}>
                    <LayoutGrid className="h-5 w-5" />
                </div>
            )}
            <span className={`font-sans font-black text-xl tracking-tighter uppercase ${textColorClass}`}>
                NEMO<span className={`${iconColorClass} italic`}>{textLabel}</span>
            </span>
        </div>
    );
}
