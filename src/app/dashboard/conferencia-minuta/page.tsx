
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClientes, type Cliente } from "@/services/apiClientLocal";
import { checkMinuteData, type CheckMinuteDataOutput } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SearchCheck, User, CheckCircle, AlertTriangle, XCircle, Info, Users, UploadCloud, File as FileIcon, X as XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";

const formSchema = z.object({
    file: z.any().refine(file => !!file, { message: "O envio do arquivo PDF é obrigatório." }),
    clientIds: z.array(z.string()).min(1, { message: "Selecione pelo menos um cliente." }),
});

type FormData = z.infer<typeof formSchema>;

const getStatusIcon = (status: 'OK' | 'Divergente' | 'Não Encontrado') => {
    switch (status) {
        case 'OK': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'Divergente': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        case 'Não Encontrado': return <XCircle className="h-4 w-4 text-red-500" />;
        default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
};

export default function ConferenciaMinutaPage() {
    const [allClients, setAllClients] = useState<Cliente[]>([]);
    const [selectedClients, setSelectedClients] = useState<Cliente[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkResult, setCheckResult] = useState<CheckMinuteDataOutput | null>(null);
    const [open, setOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { toast } = useToast();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientIds: [],
        },
    });
    
    const file = form.watch("file");

    useEffect(() => {
        async function loadClients() {
            const clients = await getClientes();
            setAllClients(clients);
        }
        loadClients();
    }, []);
    
    const handleSelectClient = (clientId: string) => {
        const currentClientIds = form.getValues("clientIds");
        const client = allClients.find(c => c.id === clientId);
        if (!client) return;

        if (currentClientIds.includes(clientId)) {
            form.setValue("clientIds", currentClientIds.filter(id => id !== clientId));
            setSelectedClients(prev => prev.filter(c => c.id !== clientId));
        } else {
            form.setValue("clientIds", [...currentClientIds, clientId]);
            setSelectedClients(prev => [...prev, client]);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            form.setValue("file", selectedFile);
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
        }
    };

    const clearFile = () => {
        form.setValue("file", null);
        setCheckResult(null);
    }

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setCheckResult(null);

        const clientsForFlow = allClients.filter(c => data.clientIds.includes(c.id));
        const clientProfiles = clientsForFlow.map(c => ({
            nome: c.nome,
            dadosAdicionais: c.dadosAdicionais || []
        }));

        // Simulação de extração de texto do PDF
        const mockDocumentText = `
            Minuta de Escritura Pública de Compra e Venda
            VENDEDOR: ${clientsForFlow.find(c => c.dadosAdicionais?.some(d => d.label === 'CPF'))?.nome || 'Não encontrado'}, CPF ${clientsForFlow.find(c => c.dadosAdicionais?.some(d => d.label === 'CPF'))?.cpfCnpj || 'Não encontrado'}.
            COMPRADOR: ${clientsForFlow.find(c => !c.dadosAdicionais?.some(d => d.label === 'CPF'))?.nome || 'Não encontrado'}.
            Objeto: Imóvel matrícula 12345, localizado na Rua das Flores, 123.
            Preço: R$ 500.000,00 (quinhentos mil reais).
            Data: ${new Date().toLocaleDateString('pt-BR')}
        `;

        try {
            const result = await checkMinuteData({
                minuteText: mockDocumentText,
                clientProfiles,
            });
            setCheckResult(result);
            toast({
                title: "Conferência Concluída",
                description: "A análise da IA foi concluída. Verifique os resultados.",
            });
        } catch (error) {
            console.error("Erro ao conferir minuta:", error);
            toast({ variant: 'destructive', title: "Erro de IA", description: "Não foi possível conferir a minuta." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Conferência de Minuta com IA</h1>
                <p className="text-muted-foreground">Envie o PDF da minuta, selecione os clientes envolvidos e deixe a IA verificar inconsistências.</p>
            </div>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <Card>
                         <CardHeader>
                            <CardTitle>1. Informações para Análise</CardTitle>
                            <CardDescription>Envie o arquivo PDF e selecione as partes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4"/> Clientes Envolvidos</label>
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-10">
                                            <div className="flex flex-wrap gap-1">
                                                {selectedClients.length > 0 ? selectedClients.map(client => (
                                                    <Badge key={client.id} variant="secondary" className="gap-1">
                                                        {client.nome}
                                                    </Badge>
                                                )) : "Selecione os clientes..."}
                                            </div>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar cliente..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                {allClients.map((client) => (
                                                    <CommandItem
                                                        key={client.id}
                                                        value={client.nome}
                                                        onSelect={() => handleSelectClient(client.id)}
                                                    >
                                                    <CheckCircle
                                                        className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedClients.some(c => c.id === client.id) ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {client.nome}
                                                    </CommandItem>
                                                ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {form.formState.errors.clientIds && <p className="text-sm text-destructive">{form.formState.errors.clientIds.message}</p>}
                            </div>
                            
                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCheck className="mr-2 h-4 w-4" />}
                                Conferir Minuta
                            </Button>
                        </CardContent>
                    </Card>
                
                    <Card>
                         <CardHeader>
                            <CardTitle>2. Resultado da Análise</CardTitle>
                            <CardDescription>A IA irá destacar as conformidades e divergências encontradas.</CardDescription>
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
                                        <p className="text-sm">Preencha os campos e inicie a análise.</p>
                                    </div>
                                )}
                                
                                {checkResult && (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
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
                                        {checkResult.clientChecks.map(clientCheck => (
                                            <div key={clientCheck.clientName} className="space-y-2 rounded-md border p-4">
                                                <h4 className='font-semibold flex items-center gap-2'><User className='h-4 w-4'/>{clientCheck.clientName}</h4>
                                                <Separator />
                                                <div className='space-y-3 pt-2'>
                                                    {clientCheck.verifications.map(v => (
                                                        <div key={v.label} className="text-sm">
                                                            <div className='flex items-center gap-2 font-medium'>
                                                                {getStatusIcon(v.status)}
                                                                <span>{v.label}</span>
                                                            </div>
                                                            <div className='pl-6 text-muted-foreground'>
                                                                {v.status === 'OK' && <p>Valor conferido: <span className='font-medium text-foreground/80'>{v.expectedValue}</span></p>}
                                                                {v.status === 'Divergente' && (
                                                                    <>
                                                                        <p>Esperado: <span className='font-medium text-foreground/80'>{v.expectedValue}</span></p>
                                                                        <p>Encontrado: <span className='font-medium text-yellow-600'>{v.foundValue || 'N/A'}</span></p>
                                                                        <p className='text-xs italic'>Motivo: {v.reasoning}</p>
                                                                    </>
                                                                )}
                                                                {v.status === 'Não Encontrado' && <p className='text-red-600'>Não foi encontrado no texto da minuta.</p>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    );
}
