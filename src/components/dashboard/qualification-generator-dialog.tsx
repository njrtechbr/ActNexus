
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Wand2, ClipboardCopy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { type Cliente, type CampoAdicionalCliente } from '@/services/apiClientLocal';
import { generateQualification } from '@/lib/actions';
import { Textarea } from '../ui/textarea';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

const formSchema = z.object({
  selectedFields: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'Você deve selecionar pelo menos um campo.',
  }),
});

type FormData = z.infer<typeof formSchema>;

interface QualificationGeneratorDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  cliente: Cliente;
}

export function QualificationGeneratorDialog({
  isOpen,
  setIsOpen,
  cliente,
}: QualificationGeneratorDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const { toast } = useToast();
  const { copy } = useCopyToClipboard();

  const allFields = cliente.dadosAdicionais || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedFields: allFields.map(f => f.label), // Seleciona todos por padrão
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        selectedFields: allFields.map(f => f.label),
      });
      setGeneratedText("");
    }
  }, [isOpen, form, allFields]);

  const onSubmit = async (data: FormData) => {
    setIsGenerating(true);
    setGeneratedText("");

    const fieldsToGenerate: CampoAdicionalCliente[] = allFields.filter(field =>
      data.selectedFields.includes(field.label)
    );

    try {
      const result = await generateQualification({
        clientName: cliente.nome,
        fields: fieldsToGenerate,
      });
      setGeneratedText(result.qualificationText);
    } catch (error) {
      console.error("Falha ao gerar qualificação:", error);
      toast({
        variant: 'destructive',
        title: 'Erro de IA',
        description: 'Não foi possível gerar o texto da qualificação.',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleCopy = () => {
    if(!generatedText) return;
    copy(generatedText);
    toast({
        title: 'Copiado!',
        description: 'O texto da qualificação foi copiado para a área de transferência.',
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerador de Qualificação por IA</DialogTitle>
          <DialogDescription>
            Selecione os campos que deseja incluir e a IA irá gerar o texto de qualificação para <strong>{cliente.nome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="selectedFields"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base font-semibold">Campos para Incluir</FormLabel>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-h-48 overflow-y-auto pr-2">
                    {allFields.map((item) => (
                      <FormField
                        key={item.label}
                        control={form.control}
                        name="selectedFields"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.label}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.label)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.label])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.label
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{item.label}</FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  {form.formState.errors.selectedFields && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.selectedFields.message}</p>
                  )}
                </FormItem>
              )}
            />

            {generatedText && (
                <div className="space-y-2">
                    <FormLabel className='text-base font-semibold'>Texto Gerado</FormLabel>
                    <div className='relative'>
                        <Textarea 
                            readOnly
                            value={generatedText}
                            className='min-h-[120px] bg-muted pr-10'
                        />
                         <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleCopy}>
                            <ClipboardCopy className="h-4 w-4"/>
                            <span className="sr-only">Copiar Texto</span>
                        </Button>
                    </div>
                </div>
            )}


            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Gerar Texto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
