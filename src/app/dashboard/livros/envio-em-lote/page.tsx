
"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UploadCloud, File, X, Loader2, CheckCircle, XCircle, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { processLivroPdf } from '@/lib/actions';
import { createLivroComAtos } from '@/services/apiClientLocal';
import { Progress } from '@/components/ui/progress';

type FileStatus = 'pending' | 'processing' | 'success' | 'error';

interface FileWithStatus {
  file: File;
  status: FileStatus;
  message: string;
}

export default function EnvioEmLotePage() {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleFilesChange = (selectedFiles: FileList | null) => {
    if (selectedFiles) {
      const newFiles: FileWithStatus[] = Array.from(selectedFiles)
        .filter(file => file.type === 'application/pdf')
        .map(file => ({
          file,
          status: 'pending',
          message: 'Aguardando processamento',
        }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, entering: boolean) => {
    e.preventDefault();
    setIsDragging(entering);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesChange(e.dataTransfer.files);
  };

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.file.name !== fileName));
  };
  
  const processSingleFile = async (fileWithStatus: FileWithStatus): Promise<boolean> => {
     // Em um aplicativo real, você extrairia o texto do PDF aqui.
    const mockDocumentText = `
      Termo de Abertura: Este livro foi aberto em 02 de Janeiro de 2025.
      Cabeçalho do Livro Oficial de Notas
      LIVRO NÚMERO: ${Math.floor(Math.random() * 100) + 1}, ANO: 2025

      Ato 1:
      Tipo: Procuração Pública
      Data da Assinatura: 15 de janeiro de 2025
      Partes: Maria da Silva, João dos Santos

      Ato 2:
      Tipo: Escritura de Compra e Venda
      Data do Documento: 20/01/2025
      Partes Envolvidas: Pedro Costa, Ana Pereira

      Termo de Encerramento: O presente livro foi encerrado em 28 de Fevereiro de 2025.
    `;
    
    try {
        const result = await processLivroPdf({ pdfText: mockDocumentText });
        const { markdownContent } = result;

        const lines = markdownContent.split('\n');
        const metadata: any = {};
        const atos: any[] = [];
        let currentAto: any = null;

        lines.forEach(line => {
            if (line.startsWith('numero:')) metadata.numero = parseInt(line.split(':')[1].trim());
            if (line.startsWith('ano:')) metadata.ano = parseInt(line.split(':')[1].trim());
            if (line.startsWith('tipo:')) metadata.tipo = line.split(':')[1].trim();
            if (line.startsWith('status:')) metadata.status = line.split(':')[1].trim();
            if (line.startsWith('dataAbertura:')) metadata.dataAbertura = line.split(/:(.*)/s)[1].trim();
            if (line.startsWith('dataFechamento:')) metadata.dataFechamento = line.split(/:(.*)/s)[1].trim();

            if (line.startsWith('### Ato')) {
                if (currentAto) atos.push(currentAto);
                currentAto = { numeroAto: parseInt(line.replace('### Ato', '').trim()), partes: [] };
            }
            if (currentAto) {
                if (line.startsWith('- **Tipo:**')) currentAto.tipoAto = line.replace('- **Tipo:**', '').trim();
                else if (line.startsWith('- **Data:**')) currentAto.dataAto = line.replace('- **Data:**', '').trim();
                else if (line.startsWith('  - ')) currentAto.partes.push(line.replace('  - ', '').trim());
            }
        });
        if (currentAto) atos.push(currentAto);

        const livroData = {
            ...metadata,
            totalAtos: atos.length,
            urlPdfOriginal: fileWithStatus.file.name,
        };

        await createLivroComAtos(livroData, atos);
        return true;
    } catch(err) {
        console.error(`Erro ao processar ${fileWithStatus.file.name}:`, err);
        return false;
    }
  };


  const handleProcessBatch = async () => {
    setIsProcessing(true);
    let successCount = 0;

    for (const fileWithStatus of files) {
      if(fileWithStatus.status !== 'pending') continue;

      setFiles(prev => prev.map(f => f.file.name === fileWithStatus.file.name ? { ...f, status: 'processing', message: 'Processando com IA...' } : f));
      
      const success = await processSingleFile(fileWithStatus);

       setFiles(prev => prev.map(f => f.file.name === fileWithStatus.file.name ? { 
           ...f, 
           status: success ? 'success' : 'error',
           message: success ? 'Livro e atos salvos com sucesso!' : 'Falha no processamento.'
        } : f));
        
        if (success) {
            successCount++;
        }
    }
    
    setIsProcessing(false);
    toast({
        title: "Processamento em Lote Concluído",
        description: `${successCount} de ${files.length} livros foram processados com sucesso.`,
    })
  };

  const totalProcessed = files.filter(f => f.status === 'success' || f.status === 'error').length;
  const progress = files.length > 0 ? (totalProcessed / files.length) * 100 : 0;

  const StatusIcon = ({ status }: { status: FileStatus }) => {
    switch(status) {
        case 'processing': return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
        case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'error': return <XCircle className="h-5 w-5 text-destructive" />;
        default: return <File className="h-5 w-5 text-muted-foreground" />;
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Voltar</span>
        </Button>
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Envio de Livros em Lote</h1>
          <p className="text-muted-foreground">
            Anexe múltiplos arquivos PDF para serem processados e cadastrados no sistema.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>1. Selecionar Arquivos</CardTitle>
            <CardDescription>Arraste ou selecione os PDFs dos livros.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragEnter={(e) => handleDragEvent(e, true)}
              onDragOver={(e) => handleDragEvent(e, true)}
              onDragLeave={(e) => handleDragEvent(e, false)}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <UploadCloud className="h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">Arraste ou clique para anexar os PDFs</p>
              <input
                type="file"
                multiple
                accept=".pdf"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={(e) => handleFilesChange(e.target.files)}
                disabled={isProcessing}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Fila de Processamento</CardTitle>
            <CardDescription>
              {files.length} arquivos na fila. {totalProcessed} processados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isProcessing && (
                <div className="space-y-2">
                    <Progress value={progress} />
                    <p className='text-sm text-muted-foreground text-center'>Processando... {totalProcessed}/{files.length}</p>
                </div>
            )}
            
            <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                {files.length > 0 ? files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <div className='flex items-center gap-3 overflow-hidden'>
                            <StatusIcon status={f.status} />
                            <div className='flex-1 truncate'>
                                <p className="truncate text-sm font-medium">{f.file.name}</p>
                                <p className="text-xs text-muted-foreground">{f.message}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFile(f.file.name)} disabled={isProcessing}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )) : (
                    <p className='text-sm text-center text-muted-foreground py-10'>Nenhum arquivo selecionado.</p>
                )}
            </div>

            <Button
              className="w-full"
              disabled={isProcessing || files.filter(f => f.status === 'pending').length === 0}
              onClick={handleProcessBatch}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Processar Lote
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
