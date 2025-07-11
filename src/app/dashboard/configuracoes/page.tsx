
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getTiposDeLivro, addTipoDeLivro, removeTipoDeLivro } from '@/services/apiClientLocal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { X, PlusCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Loading from '../loading';

const formSchema = z.object({
  novoTipo: z.string().min(3, { message: 'O tipo de livro deve ter pelo menos 3 caracteres.' }),
});

type FormData = z.infer<typeof formSchema>;

export default function ConfiguracoesPage() {
  const [tipos, setTipos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      novoTipo: '',
    },
  });

  const loadTipos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTiposDeLivro();
      setTipos(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os tipos de livro.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTipos();
  }, [loadTipos]);

  const onSubmit = async (data: FormData) => {
    try {
      await addTipoDeLivro(data.novoTipo);
      toast({
        title: 'Sucesso!',
        description: `Tipo "${data.novoTipo}" adicionado.`,
      });
      form.reset();
      loadTipos();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: (error as Error).message,
      });
    }
  };

  const handleRemove = async (tipo: string) => {
    try {
      await removeTipoDeLivro(tipo);
      toast({
        title: 'Sucesso!',
        description: `Tipo "${tipo}" removido.`,
      });
      loadTipos();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover o tipo de livro.',
      });
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações e parâmetros do ActNexus.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Gerenciar Tipos de Livro</CardTitle>
          <CardDescription>
            Adicione ou remova os tipos de livro que podem ser cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Tipos Atuais</h3>
            {tipos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tipos.map(tipo => (
                  <Badge key={tipo} variant="secondary" className="gap-2 text-base py-1 pl-3 pr-2">
                    {tipo}
                    <button
                      onClick={() => handleRemove(tipo)}
                      className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                      aria-label={`Remover ${tipo}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum tipo de livro cadastrado.</p>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="novoTipo"
                render={({ field }) => (
                  <FormItem>
                     <h3 className="text-sm font-medium text-muted-foreground">Adicionar Novo Tipo</h3>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Ex: Registro Civil" {...field} />
                      </FormControl>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PlusCircle className="mr-2 h-4 w-4" />
                        )}
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
    </div>
  );
}
