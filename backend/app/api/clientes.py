from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.auth import get_current_user
from app.services.cliente_service import ClienteService, ContatoService, EnderecoService
from app.schemas.cliente import (
    ClienteCreate, ClienteUpdate, ClienteResponse, ClienteListResponse,
    ClienteWithDetails, ClienteSearchRequest, ClientesByNamesRequest,
    ClientesByNamesResponse, ContatoCreate, ContatoUpdate, ContatoResponse,
    EnderecoCreate, EnderecoUpdate, EnderecoResponse, DocumentoClienteCreate,
    DocumentoClienteUpdate, DocumentoClienteResponse, ObservacaoCreate,
    ObservacaoUpdate, ObservacaoResponse, CampoAdicionalClienteCreate,
    CampoAdicionalClienteUpdate, CampoAdicionalClienteResponse
)
from app.schemas import MessageResponse
from app.models.user import User
from app.core.logging import logger

router = APIRouter(prefix="/clientes", tags=["clientes"])
cliente_service = ClienteService()
contato_service = ContatoService()
endereco_service = EnderecoService()


@router.post("/", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
async def create_cliente(
    cliente_data: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Criar um novo cliente."""
    try:
        cliente = await cliente_service.create(db, cliente_data)
        logger.info(f"Cliente criado: {cliente.nome} ({cliente.cpf_cnpj}) por {current_user.email}")
        return cliente
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=ClienteListResponse)
async def list_clientes(
    tipo: Optional[str] = Query(None, description="Filtrar por tipo (pessoa_fisica, pessoa_juridica)"),
    status: Optional[str] = Query(None, description="Filtrar por status (ativo, inativo)"),
    busca: Optional[str] = Query(None, description="Buscar por nome, CPF/CNPJ ou email"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar clientes com filtros e paginação."""
    filters = {}
    if tipo:
        filters["tipo"] = tipo
    if status:
        filters["status"] = status
    if busca:
        filters["busca"] = busca
    
    result = await cliente_service.list_clientes(
        db, filters=filters, page=page, size=size
    )
    
    return result


@router.get("/stats")
async def get_cliente_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter estatísticas de clientes."""
    stats = await cliente_service.get_stats(db)
    return stats


@router.post("/search", response_model=ClienteListResponse)
async def search_clientes(
    search_request: ClienteSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Buscar clientes com critérios avançados."""
    try:
        result = await cliente_service.list_clientes(
            db,
            filters=search_request.filters or {},
            page=search_request.page,
            size=search_request.size
        )
        
        logger.info(f"Busca de clientes realizada por {current_user.email}")
        
        return result
        
    except Exception as e:
        logger.error(f"Erro na busca de clientes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na busca: {str(e)}"
        )


@router.post("/by-names", response_model=ClientesByNamesResponse)
async def get_clientes_by_names(
    request: ClientesByNamesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Buscar clientes por lista de nomes."""
    try:
        result = await cliente_service.get_by_names(db, request.nomes)
        
        response = ClientesByNamesResponse(
            clientes=result,
            total_encontrados=len(result),
            nomes_buscados=request.nomes
        )
        
        logger.info(f"Busca por nomes realizada por {current_user.email}: {len(request.nomes)} nomes")
        
        return response
        
    except Exception as e:
        logger.error(f"Erro na busca por nomes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na busca: {str(e)}"
        )


@router.get("/{cliente_id}", response_model=ClienteResponse)
async def get_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter cliente por ID."""
    cliente = await cliente_service.get_by_id(db, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return cliente


@router.get("/{cliente_id}/details", response_model=ClienteWithDetails)
async def get_cliente_with_details(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter cliente com todos os detalhes relacionados."""
    cliente = await cliente_service.get_with_details(db, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return cliente


@router.get("/cpf-cnpj/{cpf_cnpj}", response_model=ClienteResponse)
async def get_cliente_by_cpf_cnpj(
    cpf_cnpj: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter cliente por CPF/CNPJ."""
    cliente = await cliente_service.get_by_cpf_cnpj(db, cpf_cnpj)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return cliente


@router.put("/{cliente_id}", response_model=ClienteResponse)
async def update_cliente(
    cliente_id: int,
    cliente_data: ClienteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar cliente por ID."""
    try:
        updated_cliente = await cliente_service.update(db, cliente_id, cliente_data)
        if not updated_cliente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente não encontrado"
            )
        
        # Adicionar evento ao histórico
        await cliente_service.add_event(
            db, cliente_id, "atualizacao", f"Cliente atualizado por {current_user.email}"
        )
        
        logger.info(f"Cliente {cliente_id} atualizado por {current_user.email}")
        return updated_cliente
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Endpoints para contatos

@router.post("/{cliente_id}/contatos", response_model=ContatoResponse, status_code=status.HTTP_201_CREATED)
async def add_contato(
    cliente_id: int,
    contato_data: ContatoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adicionar contato a um cliente."""
    try:
        # Definir cliente_id no contato
        contato_data.cliente_id = cliente_id
        
        contato = await contato_service.create(db, contato_data)
        
        # Adicionar evento ao histórico
        await cliente_service.add_event(
            db, cliente_id, "contato_adicionado", 
            f"Contato {contato.tipo} adicionado por {current_user.email}"
        )
        
        logger.info(f"Contato adicionado ao cliente {cliente_id} por {current_user.email}")
        return contato
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{cliente_id}/contatos")
async def list_contatos(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar contatos de um cliente."""
    # Verificar se o cliente existe
    cliente = await cliente_service.get_by_id(db, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return cliente.contatos


@router.put("/contatos/{contato_id}", response_model=ContatoResponse)
async def update_contato(
    contato_id: int,
    contato_data: ContatoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar contato por ID."""
    try:
        updated_contato = await contato_service.update(db, contato_id, contato_data)
        if not updated_contato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contato não encontrado"
            )
        
        # Adicionar evento ao histórico
        await cliente_service.add_event(
            db, updated_contato.cliente_id, "contato_atualizado",
            f"Contato {updated_contato.tipo} atualizado por {current_user.email}"
        )
        
        logger.info(f"Contato {contato_id} atualizado por {current_user.email}")
        return updated_contato
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/contatos/{contato_id}", response_model=MessageResponse)
async def delete_contato(
    contato_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Excluir contato."""
    try:
        # Obter contato antes de excluir para o log
        contato = await contato_service.get_by_id(db, contato_id)
        if not contato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contato não encontrado"
            )
        
        cliente_id = contato.cliente_id
        
        success = await contato_service.delete(db, contato_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contato não encontrado"
            )
        
        # Adicionar evento ao histórico
        await cliente_service.add_event(
            db, cliente_id, "contato_removido",
            f"Contato {contato.tipo} removido por {current_user.email}"
        )
        
        logger.info(f"Contato {contato_id} excluído por {current_user.email}")
        return MessageResponse(message="Contato excluído com sucesso")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao excluir contato {contato_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir contato: {str(e)}"
        )


# Endpoints para endereços

@router.post("/{cliente_id}/enderecos", response_model=EnderecoResponse, status_code=status.HTTP_201_CREATED)
async def add_endereco(
    cliente_id: int,
    endereco_data: EnderecoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adicionar endereço a um cliente."""
    try:
        # Definir cliente_id no endereço
        endereco_data.cliente_id = cliente_id
        
        endereco = await endereco_service.create(db, endereco_data)
        
        # Adicionar evento ao histórico
        await cliente_service.add_event(
            db, cliente_id, "endereco_adicionado",
            f"Endereço {endereco.tipo} adicionado por {current_user.email}"
        )
        
        logger.info(f"Endereço adicionado ao cliente {cliente_id} por {current_user.email}")
        return endereco
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{cliente_id}/enderecos")
async def list_enderecos(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar endereços de um cliente."""
    # Verificar se o cliente existe
    cliente = await cliente_service.get_by_id(db, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return cliente.enderecos


@router.put("/enderecos/{endereco_id}", response_model=EnderecoResponse)
async def update_endereco(
    endereco_id: int,
    endereco_data: EnderecoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar endereço por ID."""
    try:
        updated_endereco = await endereco_service.update(db, endereco_id, endereco_data)
        if not updated_endereco:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Endereço não encontrado"
            )
        
        # Adicionar evento ao histórico
        await cliente_service.add_event(
            db, updated_endereco.cliente_id, "endereco_atualizado",
            f"Endereço {updated_endereco.tipo} atualizado por {current_user.email}"
        )
        
        logger.info(f"Endereço {endereco_id} atualizado por {current_user.email}")
        return updated_endereco
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/enderecos/{endereco_id}", response_model=MessageResponse)
async def delete_endereco(
    endereco_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Excluir endereço."""
    try:
        # Obter endereço antes de excluir para o log
        endereco = await endereco_service.get_by_id(db, endereco_id)
        if not endereco:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Endereço não encontrado"
            )
        
        cliente_id = endereco.cliente_id
        
        success = await endereco_service.delete(db, endereco_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Endereço não encontrado"
            )
        
        # Adicionar evento ao histórico
        await cliente_service.add_event(
            db, cliente_id, "endereco_removido",
            f"Endereço {endereco.tipo} removido por {current_user.email}"
        )
        
        logger.info(f"Endereço {endereco_id} excluído por {current_user.email}")
        return MessageResponse(message="Endereço excluído com sucesso")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao excluir endereço {endereco_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir endereço: {str(e)}"
        )


# Endpoints para eventos/histórico

@router.get("/{cliente_id}/eventos")
async def get_cliente_eventos(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter histórico de eventos de um cliente."""
    # Verificar se o cliente existe
    cliente = await cliente_service.get_by_id(db, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return cliente.eventos


@router.post("/{cliente_id}/eventos", response_model=MessageResponse)
async def add_cliente_evento(
    cliente_id: int,
    tipo: str = Query(..., description="Tipo do evento"),
    descricao: str = Query(..., description="Descrição do evento"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adicionar evento ao histórico de um cliente."""
    try:
        await cliente_service.add_event(
            db, cliente_id, tipo, f"{descricao} (por {current_user.email})"
        )
        
        logger.info(f"Evento '{tipo}' adicionado ao cliente {cliente_id} por {current_user.email}")
        
        return MessageResponse(message="Evento adicionado com sucesso")
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao adicionar evento ao cliente {cliente_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao adicionar evento: {str(e)}"
        )