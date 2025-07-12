
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkMinuteData, type CheckMinuteDataOutput, type VerificationResult, type ClientVerification } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SearchCheck, User, CheckCircle, AlertTriangle, XCircle, Info, UploadCloud, File as FileIcon, X as XIcon, PlusCircle, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import { getClientesByNomes, updateCliente, type Cliente } from "@/services/apiClientLocal";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
    file: z.any().refine(file => !!file, { message: "O envio do arquivo PDF é obrigatório." }),
});

type FormData = z.infer<typeof formSchema>;

type FieldsToSave = Record<string, { label: string; value: string }[]>;

const getStatusInfo = (status: VerificationResult['status']) => {
    switch (status) {
        case 'OK': return { icon: CheckCircle, className: "text-green-500" };
        case 'Divergente': return { icon: AlertTriangle, className: "text-yellow-500" };
        case 'Não Encontrado': return { icon: XCircle, className: "text-red-500" };
        case 'Novo': return { icon: PlusCircle, className: "text-blue-500" };
        default: return { icon: Info, className: "text-muted-foreground" };
    }
};

export default function ConferenciaMinutaPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [checkResult, setCheckResult] = useState<CheckMinuteDataOutput | null>(null);
    const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
    const [fieldsToSave, setFieldsToSave] = useState<FieldsToSave>({});
    const [isDragging, setIsDragging] = useState(false);
    const { toast } = useToast();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
    });
    
    const file = form.watch("file");

    const clearState = () => {
        setCheckResult(null);
        setClientesEncontrados([]);
        setFieldsToSave({});
    }
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            form.setValue("file", selectedFile);
            clearState();
        }
    };
    
    const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, entering: boolean) => {
        e.preventDefault();
        setIsDragging(entering);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type === "application/pdf") {
             form.setValue("file", droppedFile);
             clearState();
        }
    };

    const clearFile = () => {
        form.setValue("file", null);
        clearState();
    }

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        clearState();

        const mockDocumentText = `
            Minuta de Escritura Pública de Compra e Venda
            
            VENDEDOR: João Santos, brasileiro, casado, profissão "Engenheiro Civil", portador do CPF 555.666.777-88.
            COMPRADORA: Maria Silva, brasileira, solteira, profissão advogada, portadora do CPF nº 111.222.333-44.
            
            O endereço da compradora é Rua das Flores, 123, Centro, São Paulo-SP, CEP 01000-000.
            O RG do vendedor não está mencionado na minuta.
            O estado civil da compradora na minuta está como solteira, mas seu cadastro (corretamente) diz 'casada' para teste de divergência.
            A compradora também se identifica com o RG 99.888.777-6 SSP/SP, que é uma informação nova.

            Preço: R$ 500.000,00 (quinhentos mil reais).
            Data: ${new Date().toLocaleDateString('pt-BR')}
        `;
        
        try {
            const identifiedNames = ["Maria Silva", "João Santos"];
            const clientProfilesFromDB = await getClientesByNomes(identifiedNames);

            if (clientProfilesFromDB.length === 0) {
                 toast({ variant: 'destructive', title: "Clientes Não Encontrados", description: "Os clientes mencionados na minuta não foram encontrados no sistema." });
                 setIsSubmitting(false);
                 return;
            }
            setClientesEncontrados(clientProfilesFromDB);

            const clientProfilesForVerification = clientProfilesFromDB.map(c => ({
                nome: c.nome,
                dadosAdicionais: c.dadosAdicionais || []
            }));

            const result = await checkMinuteData({
                minuteText: mockDocumentText,
                clientProfiles: clientProfilesForVerification,
            });

            setCheckResult(result);
            toast({
                title: "Conferência Concluída",
                description: "A análise da IA foi concluída. Verifique os resultados.",
            });
        } catch (error) {
            console.error("Erro ao conferir minuta:", error);
            const errorMessage = (error as Error).message;
            if (errorMessage.includes('503')) {
                toast({ variant: 'destructive', title: "Serviço de IA Indisponível", description: "O modelo de IA parece estar sobrecarregado. Tente novamente em alguns instantes." });
            } else {
                toast({ variant: 'destructive', title: "Erro de IA", description: errorMessage || "Não foi possível conferir a minuta." });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFieldSelection = (clientName: string, field: { label: string, value: string }, isChecked: boolean) => {
        setFieldsToSave(prev => {
            const newFields = { ...prev };
            const clientFields = newFields[clientName] || [];

            if (isChecked) {
                if (!clientFields.some(f => f.label === field.label)) {
                    newFields[clientName] = [...clientFields, field];
                }
            } else {
                newFields[clientName] = clientFields.filter(f => f.label !== field.label);
            }
            return newFields;
        });
    };
    
    const handleSaveChanges = async () => {
        if (!Object.keys(fieldsToSave).length || !clientesEncontrados.length) {
            toast({ title: "Nenhuma alteração para salvar.", description: "Selecione os campos que deseja sincronizar com o cadastro do cliente." });
            return;
        }
        
        setIsSaving(true);
        try {
            let updatedCount = 0;
            let fieldsSaved = 0;
            for (const clientName in fieldsToSave) {
                const cliente = clientesEncontrados.find(c => c.nome === clientName);
                if (cliente && fieldsToSave[clientName].length > 0) {
                    await updateCliente(cliente.id, { campos: fieldsToSave[clientName] }, "Sistema (Conferência de Minuta)");
                    updatedCount++;
                    fieldsSaved += fieldsToSave[clientName].length;
                }
            }
            toast({
                title: "Dados Atualizados!",
                description: `${fieldsSaved} campos foram sincronizados em ${updatedCount} perfis de cliente.`
            });
            clearState();
            form.setValue("file", null);
        } catch (error) {
             console.error("Erro ao salvar alterações:", error);
             toast({ variant: 'destructive', title: "Erro ao Salvar", description: "Não foi possível atualizar os perfis dos clientes."});
        } finally {
            setIsSaving(false);
        }
    }

    const hasChangesToSave = checkResult?.clientChecks.some(c => c.verifications.some(v => v.status === 'Novo' || v.status === 'Divergente'));
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Conferência de Minuta com IA</h1>
                <p className="text-muted-foreground">Envie o PDF da minuta, a IA identificará as partes, verificará inconsistências e encontrará novos dados.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <Card>
                     <CardHeader>
                        <CardTitle>1. Documento para Análise</CardTitle>
                        <CardDescription>Envie o arquivo PDF. A IA identificará os clientes e fará a conferência.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Arquivo da Minuta (PDF)</label>
                                    {!file ? (
                                        <div
                                            onDragEnter={(e) => handleDragEvent(e, true)}
                                            onDragOver={(e) => handleDragEvent(e, true)}
                                            onDragLeave={(e) => handleDragEvent(e, false)}
                                            onDrop={handleDrop}
                                            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                                            isDragging ? "border-primary bg-primary/10" : "border-border"
                                            }`}
                                        >
                                            <UploadCloud className="h-10 w-10 text-muted-foreground" />
                                            <p className="mt-2 text-sm font-semibold">Arraste ou clique para anexar o PDF</p>
                                            <input type="file" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" accept=".pdf" onChange={handleFileChange} />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <FileIcon className="h-8 w-8 flex-shrink-0 text-primary" />
                                                <div className="truncate">
                                                    <p className="truncate text-sm font-medium">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={clearFile} aria-label="Remover arquivo">
                                                <XIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    {form.formState.errors.file && <p className="text-sm text-destructive">{(form.formState.errors.file as any).message}</p>}
                                </div>
                                
                                <Button type="submit" disabled={isSubmitting || !file} className="w-full">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCheck className="mr-2 h-4 w-4" />}
                                    Conferir Minuta
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            
                <Card>
                     <CardHeader>
                        <CardTitle>2. Resultado da Análise</CardTitle>
                        <CardDescription>A IA irá destacar as conformidades, divergências e novos dados encontrados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-4">
                            {isSubmitting && (
                                <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            
                            {!isSubmitting && !checkResult && (
                                <div className="flex flex-col justify-center items-center h-48 border-2 border-dashed rounded-lg text-center text-muted-foreground p-4">
                                    <p className="font-semibold">Os resultados da conferência aparecerão aqui.</p>
                                    <p className="text-sm">Envie o arquivo para iniciar a análise.</p>
                                </div>
                            )}
                            
                            {checkResult && (
                                <div className="space-y-4">
                                    <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
                                        {checkResult.geral.length > 0 && (
                                            <Alert>
                                                <Info className="h-4 w-4" />
                                                <AlertTitle>Observações Gerais</AlertTitle>
                                                <AlertDescription>
                                                    <ul className='list-disc pl-5'>
                                                        {checkResult.geral.map((obs, i) => <li key={i}>{obs}</li>)}
                                                    </ul>
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        {checkResult.clientChecks.map(clientCheck => {
                                            const StatusIcon = ({ status }: { status: VerificationResult['status'] }) => {
                                                const { icon: Icon, className } = getStatusInfo(status);
                                                return <Icon className={`h-4 w-4 ${className}`} />;
                                            };
                                            return (
                                            <div key={clientCheck.clientName} className="space-y-2 rounded-md border p-4">
                                                <h4 className='font-semibold flex items-center gap-2'><User className='h-4 w-4'/>{clientCheck.clientName}</h4>
                                                <Separator />
                                                <div className='space-y-3 pt-2'>
                                                    {clientCheck.verifications.map(v => {
                                                        const isChange = (v.status === 'Novo' || v.status === 'Divergente') && !!v.foundValue;
                                                        const fieldId = `${clientCheck.clientName}-${v.label}`;

                                                        return (
                                                            <div key={v.label} className="text-sm flex items-start gap-3">
                                                                {isChange && (
                                                                     <Checkbox
                                                                        id={fieldId}
                                                                        className="mt-1"
                                                                        onCheckedChange={(checked) => handleFieldSelection(clientCheck.clientName, { label: v.label, value: v.foundValue! }, !!checked)}
                                                                    />
                                                                )}
                                                                <div className={`flex-1 ${!isChange ? 'ml-6' : ''}`}>
                                                                    <div className='flex items-center gap-2 font-medium'>
                                                                        <StatusIcon status={v.status} />
                                                                        <label htmlFor={fieldId} className={isChange ? "cursor-pointer" : ""}>{v.label}</label>
                                                                        <span className="text-xs font-normal text-muted-foreground">({v.status})</span>
                                                                    </div>
                                                                    <div className='pl-6 text-muted-foreground'>
                                                                        {v.status === 'OK' && <p>Valor conferido: <span className='font-medium text-foreground/80'>{v.expectedValue}</span></p>}
                                                                        {v.status === 'Divergente' && (
                                                                            <>
                                                                                <p>Esperado (Cadastro): <span className='font-medium text-foreground/80'>{v.expectedValue}</span></p>
                                                                                <p>Encontrado (Minuta): <span className='font-medium text-yellow-600'>{v.foundValue || 'N/A'}</span></p>
                                                                            </>
                                                                        )}
                                                                        {v.status === 'Novo' && (
                                                                            <p>Novo dado encontrado: <span className='font-medium text-blue-600'>{v.foundValue || 'N/A'}</span></p>
                                                                        )}
                                                                        {v.status === 'Não Encontrado' && <p className='text-red-600'>Não foi encontrado no texto da minuta.</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            )
                                        })}
                                    </div>
                                    {hasChangesToSave && (
                                        <Button onClick={handleSaveChanges} disabled={isSaving || isSubmitting}>
                                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Salvar Dados Selecionados
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
