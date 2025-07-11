"use client";

import { useState } from "react";
import { UploadCloud, File, X, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { automatedValidation } from "@/lib/actions";
import type { AutomatedValidationOutput } from "@/ai/flows/automated-validation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export function PdfUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<AutomatedValidationOutput | null>(null);
  const { toast } = useToast();

  const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, entering: boolean) => {
    e.preventDefault();
    setIsDragging(entering);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setValidationResult(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setValidationResult(null);
    }
    e.target.value = ''; // Reset input
  };

  const handleValidation = async () => {
    if (!file) return;
    setIsLoading(true);
    setValidationResult(null);

    // Em um aplicativo real, você extrairia o texto do PDF aqui.
    // Para esta demonstração, usamos o nome do arquivo para gerar um texto de exemplo dinâmico.
    const nameFromFile = file.name.replace('.pdf', '').replace(/_/g, ' ');
    const mockDocumentText = `
      Este é um documento legal referente a ${nameFromFile}.
      O documento envolve as seguintes partes: ${nameFromFile}.
      CPF da parte principal: 123.456.789-00.
      Este documento confirma o acordo entre as partes.
    `;

    try {
      const result = await automatedValidation({ documentText: mockDocumentText });
      setValidationResult(result);
    } catch (error) {
      console.error("A validação falhou:", error);
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "Ocorreu um erro inesperado durante a validação.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setValidationResult(null);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Validação Automatizada</CardTitle>
        <CardDescription>Envie um PDF para validar seu conteúdo.</CardDescription>
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
            <p className="mt-4 font-semibold">Arraste e solte um PDF aqui</p>
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
                <Button variant="ghost" size="icon" onClick={clearFile} aria-label="Remover arquivo">
                <X className="h-4 w-4" />
                </Button>
            </div>
             <Button onClick={handleValidation} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Validar Documento
            </Button>
          </>
        )}


        {validationResult && (
          <Alert variant={validationResult.isValid ? 'default' : 'destructive'} className={validationResult.isValid ? "border-green-300 bg-green-50 text-green-900" : ""}>
            {validationResult.isValid ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4" />}
            <AlertTitle>{validationResult.isValid ? 'Validação bem-sucedida' : 'Validação falhou'}</AlertTitle>
            <AlertDescription className={validationResult.isValid ? "text-green-800" : ""}>
              <p>{validationResult.validationDetails}</p>
              {validationResult.extractedName && <p className="mt-2"><strong>Nome:</strong> {validationResult.extractedName}</p>}
              {validationResult.extractedCPF && <p className="text-sm"><strong>CPF:</strong> {validationResult.extractedCPF}</p>}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
