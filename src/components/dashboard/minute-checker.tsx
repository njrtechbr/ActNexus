
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getClientes, type Cliente } from "@/services/apiClientLocal";
import { checkMinuteData, type CheckMinuteDataOutput } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SearchCheck, User, CheckCircle, AlertTriangle, XCircle, Info, Users, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

const formSchema = z.object({
    minuteText: z.string().min(50, { message: "O texto da minuta deve ter pelo menos 50 caracteres." }),
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

export function MinuteChecker() {
    const [allClients, setAllClients] = useState<Cliente[]>([]);
    const [selectedClients, setSelectedClients] = useState<Cliente[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkResult, setCheckResult] = useState<CheckMinuteDataOutput | null>(null);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            minuteText: "",
            clientIds: [],
        },
    });

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


    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setCheckResult(null);

        const clientsForFlow = allClients.filter(c => data.clientIds.includes(c.id));
        const clientProfiles = clientsForFlow.map(c => ({
            nome: c.nome,
            dadosAdicionais: c.dadosAdicionais || []
        }));

        try {
            const result = await checkMinuteData({
                minuteText: data.minuteText,
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
        <Card>
            <CardHeader>
                <CardTitle>Conferência de Minuta com IA</CardTitle>
                <CardDescription>Cole o texto de uma minuta e selecione os clientes envolvidos para que a IA verifique inconsistências antes da lavratura.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                             <label className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4"/> Texto da Minuta</label>
                            <Controller
                                name="minuteText"
                                control={form.control}
                                render={({ field }) => <Textarea {...field} placeholder="Cole aqui o texto completo do rascunho do ato..." className="min-h-[200px]" />}
                            />
                            {form.formState.errors.minuteText && <p className="text-sm text-destructive">{form.formState.errors.minuteText.message}</p>}
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
                    </form>
                </Form>

                <div className="space-y-4">
                     <h3 className="text-sm font-medium text-muted-foreground">Resultados da Análise</h3>
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
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
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
    );
}

