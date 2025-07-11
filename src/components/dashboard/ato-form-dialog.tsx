
"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { Loader2, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { createAto, type Livro, type Cliente } from '@/services/apiClientLocal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';


const formSchema = z.object({
  numeroAto: z.coerce.number().min(1, 'O número do ato é obrigatório.'),
  tipoAto: z.string().min(3, 'O tipo do ato é obrigatório.'),
  dataAto: z.date({ required_error: 'A data do ato é obrigatória.' }),
  partes: z.array(z.string()).min(1, 'Selecione pelo menos uma parte.'),
});

type FormData = z.infer<typeof formSchema>;

interface AtoFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAtoCreated: () => void;
  livro: Livro;
  clientes: Cliente[];
}

export function AtoFormDialog({
  isOpen,
  setIsOpen,
  onAtoCreated,
  livro,
  clientes,
}: AtoFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openPartes, setOpenPartes] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroAto: livro.totalAtos + 1,
      tipoAto: '',
      partes: [],
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const atoData = { 
        ...data, 
        livroId: livro.id,
        dataAto: format(data.dataAto, 'yyyy-MM-dd')
      }; 
      await createAto(atoData);
      onAtoCreated();
      form.reset({
        numeroAto: livro.totalAtos + 2, // Incrementa para o proximo
        tipoAto: '',
        partes: []
      });
    } catch (error) {
        console.error("Falha ao criar ato:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: "Não foi possível criar o ato. Tente novamente.",
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  const partes = form.watch('partes') || [];

  const handleSelectParte = (clienteNome: string) => {
    const currentPartes = form.getValues('partes') || [];
    if (!currentPartes.includes(clienteNome)) {
      form.setValue('partes', [...currentPartes, clienteNome], { shouldValidate: true });
    }
    setOpenPartes(false);
  }

  const handleRemoveParte = (parte: string) => {
    const currentPartes = form.getValues('partes') || [];
    form.setValue('partes', currentPartes.filter(p => p !== parte), { shouldValidate: true });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            form.reset({
                numeroAto: livro.totalAtos + 1,
                tipoAto: '',
                partes: []
            });
        }
        setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Ato para o Livro {livro.numero}/{livro.ano}</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para registrar um novo ato notarial.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="numeroAto"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Número do Ato</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="dataAto"
                    render={({ field }) => (
                        <FormItem className='flex flex-col pt-2'>
                        <FormLabel>Data do Ato</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Escolha uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
              control={form.control}
              name="tipoAto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo do Ato</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Procuração, Escritura, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
                control={form.control}
                name="partes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Partes Envolvidas</FormLabel>
                    <Popover open={openPartes} onOpenChange={setOpenPartes}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openPartes}
                                className="w-full justify-start font-normal text-muted-foreground"
                            >
                                Selecionar clientes...
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[450px] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar cliente..." />
                                <CommandList>
                                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                <CommandGroup>
                                    {clientes.map((cliente) => (
                                    <CommandItem
                                        key={cliente.id}
                                        value={cliente.nome}
                                        onSelect={() => handleSelectParte(cliente.nome)}
                                        disabled={partes.includes(cliente.nome)}
                                    >
                                        {cliente.nome}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormDescription>
                        {partes.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {partes.map(parte => (
                                    <Badge key={parte} variant="secondary" className='gap-1'>
                                        {parte}
                                        <button onClick={() => handleRemoveParte(parte)} className='rounded-full hover:bg-muted-foreground/20'>
                                            <X className='h-3 w-3'/>
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        ) : "Nenhuma parte selecionada."}
                    </FormDescription>
                     <FormMessage />
                    </FormItem>
                )}
            />

            
             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Ato
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

