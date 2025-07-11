
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Loader2, MessageSquareQuote, CalendarIcon } from 'lucide-react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateAto, type Ato, type Averbacao } from '@/services/apiClientLocal';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  texto: z.string().min(10, { message: 'A averbação deve ter pelo menos 10 caracteres.' }),
  dataAverbacao: z.date({
    required_error: "A data da averbação é obrigatória.",
  }),
});

type FormData = z.infer<typeof formSchema>;

interface AtoFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAtoSaved: () => void;
  atoToEdit: Ato | null;
}

export function AtoFormDialog({
  isOpen,
  setIsOpen,
  onAtoSaved,
  atoToEdit,
}: AtoFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        texto: "",
    }
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);


  const onSubmit = async (data: FormData) => {
    if (!atoToEdit) return;

    setIsSubmitting(true);
    try {
        const novaAverbacao: Averbacao = {
            ...data,
            dataAverbacao: format(data.dataAverbacao, "yyyy-MM-dd"),
            dataRegistro: new Date().toISOString(),
        }
      await updateAto(atoToEdit.id, novaAverbacao);
      onAtoSaved();
    } catch (error) {
        console.error("Falha ao salvar averbação:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: `Não foi possível adicionar a averbação. Tente novamente.`,
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consultar e Averbar Folha</DialogTitle>
          <DialogDescription>
            Visualize os dados originais da folha e adicione novas averbações. Os dados originais não podem ser alterados.
          </DialogDescription>
        </DialogHeader>
        
        {/* Dados Originais para Consulta */}
        <fieldset disabled className="mt-4 space-y-4 rounded-lg border p-4 group">
            <legend className="-ml-1 px-1 text-sm font-medium">Dados Originais da Folha</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Nº da Folha</Label>
                    <Input readOnly value={atoToEdit?.numeroAto.toString().padStart(3,'0')} className="group-disabled:opacity-100" />
                </div>
                <div className="space-y-2">
                    <Label>Tipo do Ato</Label>
                    <Input readOnly value={atoToEdit?.tipoAto} className="group-disabled:opacity-100" />
                </div>
                 <div className="space-y-2">
                    <Label>Data do Ato</Label>
                    <Input readOnly value={atoToEdit ? format(new Date(atoToEdit.dataAto), 'dd/MM/yyyy') : ''} className="group-disabled:opacity-100" />
                </div>
            </div>
             <div className="space-y-2">
                <Label>Partes Envolvidas</Label>
                <div className="min-h-[40px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
                    {atoToEdit?.partes.join(', ')}
                </div>
            </div>
        </fieldset>
        
        {/* Averbações existentes */}
        {atoToEdit?.averbacoes && atoToEdit.averbacoes.length > 0 && (
            <div className='space-y-2'>
                <Label>Averbações Existentes</Label>
                <div className="max-h-32 overflow-y-auto space-y-2 rounded-md border p-3 bg-muted/50">
                    {atoToEdit.averbacoes.map((av, index) => (
                        <div key={index} className="text-xs border-b pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                           <p><span className='font-semibold'>AV.{index+1}:</span> {av.texto}</p>
                           <div className="flex justify-between text-muted-foreground mt-1">
                             <span>Data do Fato: {av.dataAverbacao ? format(parseISO(av.dataAverbacao), 'dd/MM/yyyy') : 'N/A'}</span>
                             <span>Registro: {av.dataRegistro ? format(parseISO(av.dataRegistro), "dd/MM/yyyy 'às' HH:mm") : 'N/A'}</span>
                           </div>
                        </div>
                    ))}
                </div>
            </div>
        )}


        {/* Formulário para nova averbação */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="texto"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Adicionar Nova Averbação</FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder="Digite o texto da nova averbação, retificação ou observação relevante a esta folha..."
                            className="min-h-[100px]"
                            {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="dataAverbacao"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data da Averbação</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
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
            
             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareQuote className="mr-2 h-4 w-4" />}
                    Salvar Averbação
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
