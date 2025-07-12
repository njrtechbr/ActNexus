
"use client";

import { useState, useEffect, useCallback, FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
    getTiposDeLivro, addTipoDeLivro, removeTipoDeLivro,
    getTiposDeAto, addTipoDeAto, removeTipoDeAto,
    getNomesDeDocumento, addNomeDeDocumento, removeNomeDeDocumento,
    getTiposDeContato, addTipoDeContato, removeTipoDeContato
} from '@/services/apiClientLocal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { X, PlusCircle, Loader2, BookType, FileSignature, FileText, Contact } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Loading from '../loading';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  novoItem: z.string().min(3, { message: 'O item deve ter pelo menos 3 caracteres.' }),
});

type FormData = z.infer<typeof formSchema>;

interface ConfigListManagerProps {
    title: string;
    description: string;
    icon: React.ElementType;
    fetcher: () => Promise<string[]>;
    adder: (item: string) => Promise<void>;
    remover: (item: string) => Promise<void>;
}

const ConfigListManager: FC<ConfigListManagerProps> = ({ title, description, icon: Icon, fetcher, adder, remover }) => {
    const [items, setItems] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { novoItem: '' },
    });

    const loadItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetcher();
            setItems(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Carregar', description: `Não foi possível buscar os dados para "${title}".` });
        } finally {
            setIsLoading(false);
        }
    }, [fetcher, toast, title]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const onSubmit = async (data: FormData) => {
        try {
            await adder(data.novoItem);
            toast({ title: 'Sucesso!', description: `"${data.novoItem}" adicionado a ${title}.` });
            form.reset();
            loadItems();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
        }
    };

    const handleRemove = async (item: string) => {
        try {
            await remover(item);
            toast({ title: 'Sucesso!', description: `"${item}" removido de ${title}.` });
            loadItems();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: `Não foi possível remover o item.` });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" />{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="mb-4 text-sm font-medium text-muted-foreground">Itens Atuais</h3>
                    {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : 
                    items.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {items.map(item => (
                                <Badge key={item} variant="secondary" className="gap-2 text-base py-1 pl-3 pr-2">
                                    {item}
                                    <button onClick={() => handleRemove(item)} className="rounded-full p-0.5 hover:bg-muted-foreground/20" aria-label={`Remover ${item}`}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
                    )}
                </div>
                <Separator />
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                         <h3 className="text-sm font-medium text-muted-foreground">Adicionar Novo Item</h3>
                        <FormField
                            control={form.control}
                            name="novoItem"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex gap-2">
                                        <FormControl>
                                            <Input placeholder="Digite o novo nome..." {...field} />
                                        </FormControl>
                                        <Button type="submit" disabled={form.formState.isSubmitting} size="sm">
                                            {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                            Adicionar
                                        </Button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

export default function ConfiguracoesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
                <p className="text-muted-foreground">
                    Gerencie os parâmetros e as opções disponíveis no ActNexus.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ConfigListManager
                    title="Tipos de Livro"
                    description="Adicione ou remova os tipos de livro que podem ser cadastrados."
                    icon={BookType}
                    fetcher={getTiposDeLivro}
                    adder={addTipoDeLivro}
                    remover={removeTipoDeLivro}
                />
                <ConfigListManager
                    title="Tipos de Ato"
                    description="Gerencie os tipos de atos notariais que podem ser registrados."
                    icon={FileSignature}
                    fetcher={getTiposDeAto}
                    adder={addTipoDeAto}
                    remover={removeTipoDeAto}
                />
                <ConfigListManager
                    title="Nomes de Documento"
                    description="Defina nomes padrão para os documentos dos clientes."
                    icon={FileText}
                    fetcher={getNomesDeDocumento}
                    adder={addNomeDeDocumento}
                    remover={removeNomeDeDocumento}
                />
                 <ConfigListManager
                    title="Tipos de Contato"
                    description="Gerencie os tipos de contato disponíveis para os clientes."
                    icon={Contact}
                    fetcher={getTiposDeContato}
                    adder={addTipoDeContato}
                    remover={removeTipoDeContato}
                />
            </div>
        </div>
    );
}
