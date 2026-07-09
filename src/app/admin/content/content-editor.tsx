"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { getSitePageForEditor, saveSitePage } from "./actions";
import type { SitePageSlug } from "@/lib/admin/site-pages";

const TABS: { slug: SitePageSlug; label: string }[] = [
  { slug: "privacy", label: "Privacy" },
  { slug: "terms", label: "Terms" },
  { slug: "about", label: "About" },
];

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const buttons: { label: string; onClick: () => void; active: boolean }[] = [
    { label: "H1", onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
    { label: "H2", onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { label: "H3", onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
    { label: "Bold", onClick: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { label: "Italic", onClick: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { label: "Bullet list", onClick: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { label: "Numbered list", onClick: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
    {
      label: "Link",
      onClick: () => {
        const url = window.prompt("URL");
        if (!url) return;
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
      active: editor.isActive("link"),
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-cream-deeper bg-cream-deep p-2">
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          onClick={button.onClick}
          aria-pressed={button.active}
          className={
            button.active
              ? "rounded bg-teal px-2.5 py-1 text-xs font-medium text-white"
              : "rounded bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-deeper"
          }
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}

export function ContentEditor() {
  const [activeSlug, setActiveSlug] = useState<SitePageSlug>("privacy");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Restricted to exactly the formatting FR-003/sanitizeBodyHtml's
        // allowlist support — no blockquote/code/hr/strike/underline/
        // hardBreak output the sanitizer would otherwise silently strip.
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        hardBreak: false,
        link: { openOnClick: false },
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: { role: "textbox", "aria-label": "Body", "aria-multiline": "true" },
    },
  });

  useEffect(() => {
    let cancelled = false;
    getSitePageForEditor(activeSlug).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTitle(result.data.title);
        editor?.commands.setContent(result.data.bodyHtml);
      } else {
        setError("Could not load this page.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeSlug, editor]);

  function handleTabClick(slug: SitePageSlug) {
    setActiveSlug(slug);
    setLoading(true);
    setSaved(false);
    setError(null);
  }

  async function handleSave() {
    if (!editor) return;
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const result = await saveSitePage(activeSlug, { title, bodyHtml: editor.getHTML() });
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.fieldErrors?.title ?? result.fieldErrors?._root ?? "Could not save this page.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this page.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div role="tablist" className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.slug}
            type="button"
            role="tab"
            aria-selected={activeSlug === tab.slug}
            onClick={() => handleTabClick(tab.slug)}
            className={
              activeSlug === tab.slug
                ? "rounded bg-teal px-4 py-2 text-sm font-medium text-white"
                : "rounded bg-cream-deep px-4 py-2 text-sm font-medium text-ink hover:bg-cream-deeper"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
            disabled={loading}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink disabled:opacity-50"
          />
        </div>

        <div>
          <p className="mb-1 block text-sm font-medium text-ink">Body</p>
          <div className="rounded border border-cream-deeper bg-white">
            <Toolbar editor={editor} />
            {editor && (
              <EditorContent
                editor={editor}
                className="rich-content min-h-60 px-3 py-2 focus-within:outline-none [&_.tiptap]:min-h-55 [&_.tiptap]:outline-none"
                onInput={() => setSaved(false)}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || loading}
            className="rounded bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {saved && <p className="text-sm text-teal">Saved.</p>}
        </div>
      </div>
    </div>
  );
}
