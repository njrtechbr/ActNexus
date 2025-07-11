
"use client";

import { useState } from "react";
import { UploadCloud, File, X, Loader2, Wand2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { processLivroPdf } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { createLivroComAtos } from "@/services/apiClientLocal";
import { Textarea } from "../ui/textarea";

enum UploadState {
  Idle,
  Uploading,
  Processing,
  Preview,
  Saving,
  Done
}

export function LivroUpload({ onLivroProcessed }: { onLivroProcessed: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>(UploadState.Idle);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const { toast } = useToast();

  const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, entering: boolean) => {
    e.preventDefault();
    if (uploadState !== UploadState.Idle) return;
    setIsDragging(entering);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState !== UploadState.Idle) return;
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    }
    e.target.value = ''; // Reset input
  };

  const handleProcessamento = async () => {
    if (!file) return;
    setUploadState(UploadState.Processing);

    // Em um aplicativo real, você extrairia o texto do PDF aqui.
    // Para esta demonstração, usamos o nome do arquivo para gerar um texto de exemplo dinâmico.
    const mockDocumentText = `
      Cabeçalho do Livro Oficial de Notas
      LIVRO NÚMERO: 15, ANO: 2025

      Ato 1:
      Tipo: Procuração Pública
      Data da Assinatura: 15 de janeiro de 2025
      Partes: Maria da Silva, João dos Santos

      Ato 2:
      Tipo: Escritura de Compra e Venda
      Data do Documento: 20/01/2025
      Partes Envolvidas: Pedro Costa, Ana Pereira

      Ato 3:
      Tipo: Testamento Particular
      Data de Registro: 2025-02-10
      Envolvidos: Carlos Nobrega
    `;

    try {
      const result = await processLivroPdf({ pdfText: mockDocumentText });
      setMarkdownContent(result.markdownContent);
      setUploadState(UploadState.Preview);
    } catch (error) {
      console.error("O processamento do livro falhou:", error);
      toast({
        variant: "destructive",
        title: "Erro de Processamento",
        description: "A IA não conseguiu processar o documento. Verifique o formato.",
      });
      setUploadState(UploadState.Idle);
    }
  };

  const handleSaveChanges = async () => {
    if (!markdownContent) return;
    setUploadState(UploadState.Saving);
    
    try {
        // Parse the markdown to create livro and atos
        const lines = markdownContent.split('\n');
        const metadata: any = {};
        const atos: any[] = [];
        let currentAto: any = null;

        lines.forEach(line => {
            if (line.startsWith('numero:')) metadata.numero = parseInt(line.split(':')[1].trim());
            if (line.startsWith('ano:')) metadata.ano = parseInt(line.split(':')[1].trim());
            if (line.startsWith('tipo:')) metadata.tipo = line.split(':')[1].trim();
            if (line.startsWith('status:')) metadata.status = line.split(':')[1].trim();

            if (line.startsWith('### Ato')) {
                if (currentAto) atos.push(currentAto);
                currentAto = { numeroAto: parseInt(line.replace('### Ato', '').trim()), partes: [] };
            } else if (currentAto) {
                if (line.startsWith('- **Tipo:**')) currentAto.tipoAto = line.replace('- **Tipo:**', '').trim();
                if (line.startsWith('- **Data:**')) currentAto.dataAto = line.replace('- **Data:**', '').trim();
                if (line.startsWith('  - ')) currentAto.partes.push(line.replace('  - ', '').trim());
            }
        });
        if (currentAto) atos.push(currentAto);
        
        const livroData = {
            numero: metadata.numero,
            ano: metadata.ano,
            tipo: metadata.tipo || "Não especificado",
            status: metadata.status,
            totalAtos: atos.length,
            conteudoMarkdown: markdownContent,
        };
        
        await createLivroComAtos(livroData, atos);
        onLivroProcessed();
        clearFile();

    } catch (error) {
        console.error("Falha ao salvar livro e atos:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: "Não foi possível salvar os dados no sistema.",
        });
        setUploadState(UploadState.Preview);
    }
  };


  const clearFile = () => {
    setFile(null);
    setMarkdownContent("");
    setUploadState(UploadState.Idle);
  };

  const getButton = () => {
    switch (uploadState) {
        case UploadState.Idle:
        case UploadState.Uploading:
             return (
                <Button onClick={handleProcessamento} disabled={!file || uploadState !== UploadState.Idle} className="w-full">
                    {uploadState === UploadState.Uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Wand2 className="mr-2 h-4 w-4" />
                    Processar com IA
                </Button>
            );
        case UploadState.Processing:
            return (
                <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                </Button>
            );
        case UploadState.Preview:
             return (
                <Button onClick={handleSaveChanges} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Livro e Atos
                </Button>
            );
        case UploadState.Saving:
             return (
                <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando no sistema...
                </Button>
            );
        default:
            return null;
    }
  }


  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Adicionar Livro via PDF</CardTitle>
        <CardDescription>Envie o PDF de um livro para que a IA o cadastre automaticamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex flex-col flex-1">
        {!file ? (
          <div
            onDragEnter={(e) => handleDragEvent(e, true)}
            onDragOver={(e) => handleDragEvent(e, true)}
            onDragLeave={(e) => handleDragEvent(e, false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors flex-1 ${
              isDragging ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <UploadCloud className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-semibold">Arraste e solte o PDF do livro aqui</p>
            <p className="text-sm text-muted-foreground">ou</p>
            <Button asChild variant="outline" size="sm" className="mt-2 z-10">
              <label>
                Procurar arquivo
                <input type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} />
              </label>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                <File className="h-8 w-8 flex-shrink-0 text-primary" />
                <div className="truncate">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile} aria-label="Remover arquivo" disabled={uploadState === UploadState.Processing || uploadState === UploadState.Saving}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="flex-1">
                {getButton()}
            </div>

            {markdownContent && (
                <div className="space-y-2">
                    <label className="text-sm font-medium">Resultado do Processamento (Editável)</label>
                    <Textarea 
                        value={markdownContent} 
                        onChange={(e) => setMarkdownContent(e.target.value)}
                        className="min-h-[250px] font-mono text-xs"
                        disabled={uploadState === UploadState.Saving}
                    />
                </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
