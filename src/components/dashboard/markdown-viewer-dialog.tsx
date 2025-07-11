
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { Ato } from '@/services/apiClientLocal';

interface MarkdownViewerDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  markdownContent: string;
  ato: Ato | null;
}

export function MarkdownViewerDialog({
  isOpen,
  setIsOpen,
  markdownContent,
  ato,
}: MarkdownViewerDialogProps) {
  if (!ato) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Conteúdo do Ato (Markdown)</DialogTitle>
          <DialogDescription>
            Este é o conteúdo estruturado que a IA extraiu para a Folha{' '}
            {ato.numeroAto.toString().padStart(3, '0')} do Livro {ato.livroId.replace('livro-', '')}.
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
