
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
import React from 'react';
import { Separator } from '../ui/separator';
import { format, parseISO } from 'date-fns';

// Componente para renderizar o Markdown
const MarkdownRenderer = ({ content }: { content: string }) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const elements: React.ReactNode[] = [];
  let isList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      isList = false;
      elements.push(<h3 key={`h3-${i}`} className="text-lg font-semibold font-sans tracking-tight pb-2 border-b mb-4">{line.replace('### ', '')}</h3>);
    } else if (line.trim().startsWith('- **')) {
      const parts = line.trim().substring(2).split(':');
      const key = parts[0].replace(/\*\*/g, '').trim();
      const value = parts.slice(1).join(':').replace(/\*\*/g, '').trim(); 

      if (value) {
        isList = false;
        elements.push(
          <div key={`div-${i}`} className="flex font-sans">
            <span className="w-24 font-semibold text-muted-foreground">{key}:</span>
            <span>{value}</span>
          </div>
        );
      } else {
        isList = true;
        elements.push(
            <div key={`div-${i}`} className="flex font-sans">
              <span className="w-24 font-semibold text-muted-foreground">{key}:</span>
            </div>
        );
        elements.push(
          <ul key={`ul-${i}`} className="ml-28 -mt-5 list-disc font-sans text-left">
            {/* O conteúdo da lista será adicionado no próximo bloco */}
          </ul>
        );
      }
    } else if (line.trim().startsWith('  - ')) {
      if (isList && elements.length > 0) {
        const lastElement = elements[elements.length - 1] as React.ReactElement;
        if (lastElement.type === 'ul') {
          const newListItem = <li key={`li-${i}`}>{line.replace('  - ', '').trim()}</li>;
          const newChildren = [...(lastElement.props.children || []), newListItem];
          elements[elements.length - 1] = React.cloneElement(lastElement, {}, newChildren);
        }
      } else {
        elements.push(<li key={`li-${i}`} className="ml-8 list-disc font-sans">{line.replace('- ', '')}</li>);
      }
    } else {
      isList = false;
      elements.push(<p key={`p-${i}`} className="font-sans">{line}</p>);
    }
  }


  return (
    <Card className="bg-muted/50">
      <CardContent className="p-6 font-mono text-sm space-y-2">
        {elements}
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
        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-4 space-y-6">
          <MarkdownRenderer content={markdownContent} />
          
          {ato.averbacoes && ato.averbacoes.length > 0 && (
             <div className="space-y-4">
                <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Averbações Registradas</h4>
                    <Separator />
                </div>
                <div className="space-y-4">
                    {ato.averbacoes.map((av, index) => (
                        <div key={index} className="text-sm p-3 rounded-md border bg-background">
                           <p className='text-foreground'>{av.texto}</p>
                           <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
                             <span>Data do Fato: {av.dataAverbacao ? format(parseISO(av.dataAverbacao), 'dd/MM/yyyy') : 'N/A'}</span>
                             <span>Registro: {av.dataRegistro ? format(parseISO(av.dataRegistro), "dd/MM/yyyy 'às' HH:mm") : 'N/A'}</span>
                           </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
