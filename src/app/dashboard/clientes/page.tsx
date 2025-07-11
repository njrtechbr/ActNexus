"use client";

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function ClientesPage() {

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-headline text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
                    <p className="text-muted-foreground">
                        Adicione, consulte e gerencie os clientes do cartório.
                    </p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Cliente
                </Button>
            </div>

            {/* A tabela de clientes e o formulário de cadastro serão adicionados aqui nos próximos passos. */}
            <div className="flex h-96 items-center justify-center rounded-md border border-dashed">
                <div className="text-center text-muted-foreground">
                    <p className="font-semibold">Em breve</p>
                    <p className="text-sm">A listagem de clientes aparecerá aqui.</p>
                </div>
            </div>
        </div>
    );
}
