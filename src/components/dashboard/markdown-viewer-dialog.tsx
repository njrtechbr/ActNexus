
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { Livro } from '@/services/apiClientLocal';

interface MarkdownViewerDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  markdownContent: string;
  livro: Livro | null;
}

export function MarkdownViewerDialog({
  isOpen,
  setIsOpen,
  markdownContent,
  livro,
}: MarkdownViewerDialogProps) {
  if (!livro) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Conteúdo Processado (Markdown)</DialogTitle>
          <DialogDescription>
            Este é o conteúdo estruturado que a IA extraiu do arquivo PDF do Livro{' '}
            {livro.numero}/{livro.ano}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Textarea
            readOnly
            value={markdownContent}
            className="h-[60vh] min-h-[400px] resize-none font-mono text-xs"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
