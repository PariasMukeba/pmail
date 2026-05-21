"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ComposeToolbar } from "@/components/compose/ComposeToolbar";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function SignaturesPage() {
  const [saved, setSaved] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write your email signature..." }),
    ],
    content: "",
  });

  const save = () => {
    const html = editor?.getHTML() ?? "";
    localStorage.setItem("pmail-signature", html);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Signatures</h1>
        <p className="text-sm text-muted-foreground mt-1">Add a signature to your outgoing emails.</p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ComposeToolbar editor={editor} />
        <div className="min-h-[200px] p-4">
          <EditorContent
            editor={editor}
            className="prose prose-invert prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[160px]"
          />
        </div>
      </div>

      <Button onClick={save} className="gap-2">
        {saved ? "Saved!" : "Save signature"}
      </Button>
    </div>
  );
}
