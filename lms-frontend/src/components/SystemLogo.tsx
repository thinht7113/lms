"use client";

import React, { useState, useEffect } from "react";
import { LayoutGrid } from "lucide-react";

interface SystemLogoProps {
    textLabel?: string;
    textColorClass?: string;
    iconColorClass?: string;
    iconBgClass?: string;
}

interface PublicSetting {
    key: string;
    value?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
let cachedLogoUrl: string | null | undefined;
let logoRequest: Promise<string | null> | null = null;

function loadLogoUrl(): Promise<string | null> {
    if (cachedLogoUrl !== undefined) {
        return Promise.resolve(cachedLogoUrl);
    }

    if (!logoRequest) {
        logoRequest = fetch(`${API_BASE_URL}/settings/public`)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) return null;
                const logo = (data as PublicSetting[]).find(setting => setting.key === "SYSTEM_LOGO");
                return logo?.value || null;
            })
            .catch(err => {
                console.warn("Failed to load system logo", err);
                return null;
            })
            .then(url => {
                cachedLogoUrl = url;
                return url;
            });
    }

    return logoRequest;
}

export default function SystemLogo({ 
    textLabel = "LMS", 
    textColorClass = "text-foreground",
    iconColorClass = "text-primary",
    iconBgClass = "bg-primary"
}: SystemLogoProps) {
    const [logoUrl, setLogoUrl] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        const cached = localStorage.getItem("system_logo");
        if (cached) cachedLogoUrl = cached;
        return cached;
    });

    useEffect(() => {
        let isMounted = true;

        loadLogoUrl().then(url => {
            if (url) {
                localStorage.setItem("system_logo", url);
            }
            if (isMounted) {
                setLogoUrl(url);
            }
        });

        return () => {
            isMounted = false;
        };
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
                LUMINA<span className={`${iconColorClass} italic`}>{textLabel}</span>
            </span>
        </div>
    );
}
