"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
    ClassicEditor,
    Essentials,
    Autoformat,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    BlockQuote,
    Heading,
    Link,
    List,
    Paragraph,
    Indent,
    IndentBlock,
    Alignment,
    Font,
    Image,
    ImageCaption,
    ImageStyle,
    ImageUpload,
    MediaEmbed,
    Table,
    TableToolbar,
    SourceEditing,
    CodeBlock,
    PasteFromOffice,
    GeneralHtmlSupport,
    SpecialCharacters,
    SpecialCharactersEssentials,
    SpecialCharactersMathematical,
    Subscript,
    Superscript
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

interface CKEditorWrapperProps {
    value: string;
    onChange: (data: string) => void;
    placeholder?: string;
    height?: string;
}

function EditorComponent({ value, onChange, placeholder = "Nhập nội dung...", height = "400px" }: CKEditorWrapperProps) {
    const [licenseKey, setLicenseKey] = useState<string>('GPL');

    useEffect(() => {
        const fetchKey = async () => {
            try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
                const res = await fetch(`${API_BASE_URL}/settings/public`);
                if (res.ok) {
                    const data = await res.json();
                    const keySetting = data.find((s: any) => s.key === "ckeditor_license_key");
                    if (keySetting && keySetting.value) {
                        setLicenseKey(keySetting.value);
                    }
                }
            } catch (err) {
                console.warn("Could not fetch CKEditor license key", err);
            }
        };
        fetchKey();
    }, []);

    return (
        <div className="ck-editor-container" style={{ '--ck-border-radius': '0.75rem', '--ck-color-base-border': '#e2e8f0', '--ck-color-focus-border': '#3b82f6' } as any}>
            <style dangerouslySetInnerHTML={{__html: `
                .ck-editor__editable_inline {
                    min-height: ${height};
                    padding: 1rem 1.5rem !important;
                }
            `}} />
            <CKEditor
                editor={ClassicEditor}
                data={value}
                onChange={(event, editor) => {
                    const data = editor.getData();
                    onChange(data);
                }}
                config={{
                    licenseKey: licenseKey,
                    placeholder: placeholder,
                    plugins: [
                        Essentials, Autoformat, Bold, Italic, Underline, Strikethrough, BlockQuote,
                        Heading, Link, List, Paragraph, Indent, IndentBlock, Alignment, Font,
                        Image, ImageCaption, ImageStyle, ImageUpload, MediaEmbed,
                        Table, TableToolbar, SourceEditing, CodeBlock,
                        PasteFromOffice, GeneralHtmlSupport, SpecialCharacters, SpecialCharactersEssentials, SpecialCharactersMathematical,
                        Subscript, Superscript
                    ],
                    htmlSupport: {
                        allow: [
                            {
                                name: /.*/,
                                attributes: true,
                                classes: true,
                                styles: true
                            }
                        ]
                    },
                    toolbar: {
                        items: [
                            'undo', 'redo', '|',
                            'heading', '|',
                            'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
                            'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', '|',
                            'alignment', '|',
                            'bulletedList', 'numberedList', 'outdent', 'indent', '|',
                            'link', 'mediaEmbed', 'insertTable', 'blockQuote', 'codeBlock', 'specialCharacters', '|',
                            'sourceEditing'
                        ],
                        shouldNotGroupWhenFull: false
                    },
                    heading: {
                        options: [
                            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
                        ]
                    },
                    table: {
                        contentToolbar: [
                            'tableColumn', 'tableRow', 'mergeTableCells'
                        ]
                    }
                }}
            />
        </div>
    );
}

export default dynamic(() => Promise.resolve(EditorComponent), { ssr: false });
