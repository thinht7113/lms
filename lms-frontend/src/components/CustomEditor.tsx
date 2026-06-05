"use client";

import { CKEditor, useCKEditorCloud } from '@ckeditor/ckeditor5-react';
import { useRef, useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function CustomEditor({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const initialDataRef = useRef(value);
    const isReadyRef = useRef(false);
    const [licenseKey, setLicenseKey] = useState<string>("GPL");
    const [loadingKey, setLoadingKey] = useState(true);

    useEffect(() => {
        const fetchLicenseKey = async () => {
            try {
                const res = await apiFetch("/settings/public");
                if (res.ok) {
                    const data = await res.json();
                    const keySetting = data.find((s: any) => s.key === "ckeditor_license_key");
                    if (keySetting && keySetting.value) {
                        setLicenseKey(keySetting.value);
                    }
                }
            } catch (error) {
                console.error("Failed to load CKEditor license key from settings", error);
            } finally {
                setLoadingKey(false);
            }
        };
        fetchLicenseKey();
    }, []);

    const cloud = useCKEditorCloud({
        version: '44.0.0',
    });

    if (cloud.status === 'error') {
        return (
            <div className="min-h-[300px] flex flex-col items-center justify-center border border-error/30 rounded-2xl bg-error/5 text-error p-6">
                <i className="ph-bold ph-warning-octagon text-3xl mb-2"></i>
                <p className="font-bold text-sm">Lỗi tải trình soạn thảo CKEditor.</p>
                <p className="text-xs opacity-80 mt-1">Vui lòng kiểm tra kết nối mạng và tải lại trang.</p>
            </div>
        );
    }

    if (cloud.status === 'loading' || loadingKey) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center border border-outline-variant rounded-xl bg-surface-container/50">
                <i className="ph ph-spinner-gap animate-spin text-3xl mb-2 text-primary"></i>
                <span className="text-sm font-bold text-on-surface-variant">Đang tải cấu hình CKEditor...</span>
            </div>
        );
    }

    const {
        ClassicEditor,
        Essentials,
        Autoformat,
        Bold,
        Italic,
        Underline,
        BlockQuote,
        Heading,
        Image,
        ImageCaption,
        ImageStyle,
        ImageToolbar,
        ImageUpload,
        Indent,
        Link,
        List,
        MediaEmbed,
        Paragraph,
        PasteFromOffice,
        Table,
        TableToolbar,
        TextTransformation
    } = cloud.CKEditor;

    return (
        <div className="ckeditor-container border border-outline-variant rounded-2xl overflow-hidden bg-surface shadow-sm">
            <CKEditor
                editor={ClassicEditor}
                config={{
                    licenseKey: licenseKey,
                    plugins: [
                        Essentials, Autoformat, Bold, Italic, Underline, BlockQuote,
                        Heading, Image, ImageCaption, ImageStyle, ImageToolbar,
                        ImageUpload, Indent, Link, List, MediaEmbed, Paragraph,
                        PasteFromOffice, Table, TableToolbar, TextTransformation
                    ],
                    toolbar: [
                        'heading', '|',
                        'bold', 'italic', 'underline', 'link', 'bulletedList', 'numberedList', '|',
                        'outdent', 'indent', '|',
                        'blockQuote', 'insertTable', 'mediaEmbed', '|',
                        'undo', 'redo'
                    ],
                    image: {
                        toolbar: ['imageStyle:inline', 'imageStyle:block', 'imageStyle:side', '|', 'toggleImageCaption', 'imageTextAlternative']
                    },
                    table: {
                        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
                    }
                }}
                data={initialDataRef.current}
                onReady={(editor) => {
                    isReadyRef.current = true;
                }}
                onChange={(event, editor) => {
                    if (isReadyRef.current) {
                        const data = editor.getData();
                        onChange(data);
                    }
                }}
            />
            <style jsx global>{`
              .ckeditor-container {
                  --ck-color-base-background: var(--color-surface);
                  --ck-color-base-border: var(--color-outline-variant);
                  --ck-color-toolbar-background: var(--color-surface-container-lowest);
                  --ck-color-toolbar-border: var(--color-outline-variant);
                  --ck-color-button-default-hover-background: var(--color-surface-container);
                  --ck-color-button-on-background: var(--color-primary-container);
                  --ck-color-button-on-color: var(--color-primary);
              }
              .ck-editor__editable_inline {
                  min-height: 400px;
                  background-color: var(--color-surface) !important;
                  color: var(--color-on-surface) !important;
                  border: none !important;
                  border-top: 1px solid var(--color-outline-variant) !important;
                  padding: 1.5rem !important;
                  font-size: 1rem;
                  line-height: 1.6;
              }
              .ck.ck-editor__main>.ck-editor__editable {
                  border-radius: 0 0 1rem 1rem !important;
              }
              .ck.ck-toolbar {
                  border: none !important;
                  background-color: var(--color-surface-container-lowest) !important;
                  border-radius: 1rem 1rem 0 0 !important;
                  padding: 0.5rem !important;
              }
              .ck.ck-button {
                  color: var(--color-on-surface-variant) !important;
                  cursor: pointer;
              }
              .ck.ck-button:hover {
                  background-color: var(--color-surface-container) !important;
              }
              .ck.ck-button.ck-on {
                  background-color: var(--color-primary-container) !important;
                  color: var(--color-primary) !important;
              }
              .ck-content pre {
                  background: var(--color-surface-container-lowest);
                  padding: 1rem;
                  border-radius: 0.5rem;
                  border: 1px solid var(--color-outline-variant);
              }
              .ck-content blockquote {
                  border-left: 4px solid var(--color-primary);
                  margin-left: 0;
                  padding-left: 1rem;
                  font-style: italic;
                  color: var(--color-on-surface-variant);
              }
            `}</style>
        </div>
    );
}
