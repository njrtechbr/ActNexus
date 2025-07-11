
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Ato } from '@/services/apiClientLocal';
import { Card, CardContent } from '../ui/card';

// Componente para renderizar o Markdown
const MarkdownRenderer = ({ content }: { content: string }) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');

  return (
    <Card className="bg-muted/50">
      <CardContent className="p-6 font-mono text-sm space-y-2">
        {lines.map((line, index) => {
          if (line.startsWith('### ')) {
            return <h3 key={index} className="text-lg font-semibold font-sans tracking-tight pb-2 border-b mb-4">{line.replace('### ', '')}</h3>;
          }
          if (line.trim().startsWith('- **')) {
            const parts = line.trim().substring(2).split(':');
            const key = parts[0].replace(/\*\*/g, '').trim();
            const value = parts.slice(1).join(':').trim();
            return (
                <div key={index} className="flex font-sans">
                    <span className="w-24 font-semibold text-muted-foreground">{key}:</span>
                    <span>{value}</span>
                </div>
            );
          }
           if (line.trim().startsWith('- ')) {
             return <li key={index} className="ml-8 list-disc font-sans">{line.replace('- ', '')}</li>;
           }
          return <p key={index} className="font-sans">{line}</p>;
        })}
      </CardContent>
    </Card>
  );
};


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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Conteúdo do Ato</DialogTitle>
          <DialogDescription>
            Este é o conteúdo estruturado que a IA extraiu para a Folha{' '}
            {ato.numeroAto.toString().padStart(3, '0')} do Livro {ato.livroId.replace('livro-', '')}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-4">
          <MarkdownRenderer content={markdownContent} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
