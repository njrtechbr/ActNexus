
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { automatedValidation } from "@/lib/actions";
import type { Ato } from "@/services/apiClientLocal";
import type { AutomatedValidationOutput } from "@/ai/flows/automated-validation";

interface ValidationDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    ato: Ato | null;
}

export function ValidationDialog({ isOpen, setIsOpen, ato }: ValidationDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [validationResult, setValidationResult] = useState<AutomatedValidationOutput | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen && ato) {
            handleValidation();
        } else {
            // Reset state when dialog is closed
            setValidationResult(null);
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, ato]);

    const handleValidation = async () => {
        if (!ato) return;

        setIsLoading(true);
        setValidationResult(null);

        // Simula a extração de texto de um PDF usando os dados do ato.
        const mockDocumentText = `
            Documento de ${ato.tipoAto}.
            Partes envolvidas: ${ato.partes.join(', ')}.
            ${ato.dadosExtraidos ? `Dados extraídos: Outorgante: ${ato.dadosExtraidos.outorgante.nome}, CPF: ${ato.dadosExtraidos.outorgante.cpf}. Outorgado: ${ato.dadosExtraidos.outorgado.nome}, CPF: ${ato.dadosExtraidos.outorgado.cpf}`: "Nenhum dado extraído encontrado."}
            Assinado em ${new Date(ato.dataAto).toLocaleDateString()}.
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
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Validação da Folha Nº {ato?.numeroAto.toString().padStart(3, '0')}</DialogTitle>
                    <DialogDescription>
                        Analisando o conteúdo da folha (ato) de "{ato?.tipoAto}" para validação.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p>Validando com IA...</p>
                        </div>
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
