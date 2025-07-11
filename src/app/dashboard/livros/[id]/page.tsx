
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAtosByLivroId, type Ato, getLivroById, type Livro, getClientes, type Cliente } from '@/services/apiClientLocal';
import { useParams, useRouter } from 'next/navigation';
import Loading from './loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Search, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ValidationDialog } from '@/components/dashboard/validation-dialog';
import { AtoFormDialog } from '@/components/dashboard/ato-form-dialog';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
    role: string;
}

export default function DetalhesLivroPage() {
    const [livro, setLivro] = useState<Livro | null>(null);
    const [atos, setAtos] = useState<Ato[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAto, setSelectedAto] = useState<Ato | null>(null);
    const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
    const [isAtoFormOpen, setIsAtoFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [user, setUser] = useState<UserProfile | null>(null);
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const livroId = params.id as string;

     useEffect(() => {
        const userData = localStorage.getItem("actnexus_user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const loadData = useCallback(async () => {
        if (!livroId) return;
        setIsLoading(true);
        try {
            const [livroData, atosData, clientesData] = await Promise.all([
                getLivroById(livroId),
                getAtosByLivroId(livroId),
                getClientes()
            ]);

            if (!livroData) {
                router.push('/dashboard/livros');
                return;
            }
            
            setLivro(livroData);
            setAtos(atosData);
            setClientes(clientesData);
        } catch (error) {
            console.error("Falha ao buscar dados do livro:", error);
        } finally {
            setIsLoading(false);
        }
    }, [livroId, router]);


    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAtoCreated = () => {
        setIsAtoFormOpen(false);
        toast({
            title: 'Sucesso!',
            description: 'Novo ato cadastrado no livro.',
        });
        loadData(); // Recarrega a lista de atos e dados do livro
    }

    const handleValidationClick = (ato: Ato) => {
        setSelectedAto(ato);
        setIsValidationDialogOpen(true);
    };

    const filteredAtos = useMemo(() => {
        if (!searchTerm) {
            return atos;
        }
        return atos.filter(ato => 
            ato.tipoAto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ato.partes.some(parte => parte.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [atos, searchTerm]);


    if (isLoading) {
        return <Loading />;
    }

    if (!livro) {
        return <div className="text-center p-8">Livro não encontrado.</div>;
    }
    
    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Voltar</span>
                        </Button>
                        <div>
                            <h1 className="font-headline text-3xl font-bold tracking-tight">
                                Livro {livro.numero.toString().padStart(3, '0')}/{livro.ano}
                            </h1>
                            <p className="text-muted-foreground">
                                Visualize e gerencie os atos registrados neste livro.
                            </p>
                        </div>
                    </div>
                    {user?.role === 'admin' && (
                        <Button onClick={() => setIsAtoFormOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Novo Ato
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Atos Registrados</CardTitle>
                        <CardDescription>
                            Total de {filteredAtos.length} de {livro.totalAtos} atos encontrados neste livro.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar por tipo de ato ou partes..." 
                                    className="pl-8" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Ato Nº</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Partes Envolvidas</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAtos.length > 0 ? (
                                        filteredAtos.map((ato) => (
                                            <TableRow key={ato.id}>
                                                <TableCell className="font-medium">{ato.numeroAto.toString().padStart(3, '0')}</TableCell>
                                                <TableCell>{ato.tipoAto}</TableCell>
                                                <TableCell>{new Date(ato.dataAto).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        {ato.partes.map(parte => <span key={parte}>{parte}</span>)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleValidationClick(ato)}>
                                                        <FileText className="h-4 w-4" />
                                                        <span className="sr-only">Validar Ato</span>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                Nenhum ato encontrado com os critérios de busca.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {selectedAto && (
                <ValidationDialog 
                    isOpen={isValidationDialogOpen} 
                    setIsOpen={setIsValidationDialogOpen} 
                    ato={selectedAto} 
                />
            )}
            {livro && (
                <AtoFormDialog 
                    isOpen={isAtoFormOpen}
                    setIsOpen={setIsAtoFormOpen}
                    onAtoCreated={handleAtoCreated}
                    livro={livro}
                    clientes={clientes}
                />
            )}
        </>
    );
}
