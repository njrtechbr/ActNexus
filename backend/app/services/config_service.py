from typing import Optional, List, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from fastapi import HTTPException, status
from app.models.config import AppConfig
from app.schemas.config import AppConfigCreate, AppConfigUpdate
from app.core.logging import logger
import json


class ConfigService:
    """Serviço para gerenciamento de configurações da aplicação."""
    
    # Cache em memória para configurações frequentemente acessadas
    _config_cache: Dict[str, Any] = {}
    _cache_enabled = True
    
    @staticmethod
    def _invalidate_cache(chave: Optional[str] = None):
        """Invalida cache de configuração."""
        if not ConfigService._cache_enabled:
            return
            
        if chave:
            ConfigService._config_cache.pop(chave, None)
        else:
            ConfigService._config_cache.clear()
    
    @staticmethod
    async def create_config(
        session: AsyncSession,
        config_data: AppConfigCreate
    ) -> AppConfig:
        """Cria uma nova configuração."""
        try:
            # Verificar se a chave já existe
            existing_config = await ConfigService.get_config_by_key(
                session, config_data.chave
            )
            if existing_config:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Configuração com chave '{config_data.chave}' já existe"
                )
            
            # Validar valor JSON se fornecido
            if config_data.valor:
                try:
                    json.loads(json.dumps(config_data.valor))
                except (TypeError, ValueError) as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Valor da configuração deve ser um JSON válido: {str(e)}"
                    )
            
            config = AppConfig(
                chave=config_data.chave,
                valor=config_data.valor,
                descricao=config_data.descricao,
                categoria=config_data.categoria,
                publico=config_data.publico or False,
                editavel=config_data.editavel or True
            )
            
            session.add(config)
            await session.commit()
            await session.refresh(config)
            
            # Invalidar cache
            ConfigService._invalidate_cache(config.chave)
            
            logger.info(f"Configuração criada: {config.chave}")
            
            return config
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao criar configuração: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_config_by_id(session: AsyncSession, config_id: int) -> Optional[AppConfig]:
        """Busca configuração por ID."""
        try:
            result = await session.execute(
                select(AppConfig).where(AppConfig.id == config_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar configuração por ID {config_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_config_by_key(session: AsyncSession, chave: str) -> Optional[AppConfig]:
        """Busca configuração por chave."""
        try:
            result = await session.execute(
                select(AppConfig).where(AppConfig.chave == chave)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Erro ao buscar configuração por chave {chave}: {str(e)}")
            return None
    
    @staticmethod
    async def get_config_value(
        session: AsyncSession, 
        chave: str, 
        default: Any = None,
        use_cache: bool = True
    ) -> Any:
        """Obtém valor de uma configuração."""
        try:
            # Verificar cache primeiro
            if use_cache and ConfigService._cache_enabled and chave in ConfigService._config_cache:
                return ConfigService._config_cache[chave]
            
            config = await ConfigService.get_config_by_key(session, chave)
            
            if config:
                value = config.valor
                # Adicionar ao cache
                if use_cache and ConfigService._cache_enabled:
                    ConfigService._config_cache[chave] = value
                return value
            
            return default
            
        except Exception as e:
            logger.error(f"Erro ao obter valor da configuração {chave}: {str(e)}")
            return default
    
    @staticmethod
    async def set_config_value(
        session: AsyncSession,
        chave: str,
        valor: Any,
        criar_se_nao_existir: bool = True
    ) -> AppConfig:
        """Define valor de uma configuração."""
        try:
            config = await ConfigService.get_config_by_key(session, chave)
            
            if config:
                # Atualizar configuração existente
                if not config.editavel:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Configuração '{chave}' não é editável"
                    )
                
                config.valor = valor
                await session.commit()
                await session.refresh(config)
                
            elif criar_se_nao_existir:
                # Criar nova configuração
                config = AppConfig(
                    chave=chave,
                    valor=valor,
                    categoria="Sistema",
                    publico=False,
                    editavel=True
                )
                
                session.add(config)
                await session.commit()
                await session.refresh(config)
                
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Configuração '{chave}' não encontrada"
                )
            
            # Invalidar cache
            ConfigService._invalidate_cache(chave)
            
            logger.info(f"Valor da configuração '{chave}' atualizado")
            
            return config
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao definir valor da configuração {chave}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def update_config(
        session: AsyncSession,
        config_id: int,
        config_data: AppConfigUpdate
    ) -> AppConfig:
        """Atualiza dados da configuração."""
        try:
            config = await ConfigService.get_config_by_id(session, config_id)
            if not config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Configuração não encontrada"
                )
            
            if not config.editavel:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Configuração não é editável"
                )
            
            # Validar valor JSON se fornecido
            if config_data.valor is not None:
                try:
                    json.loads(json.dumps(config_data.valor))
                except (TypeError, ValueError) as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Valor da configuração deve ser um JSON válido: {str(e)}"
                    )
            
            # Atualizar campos
            update_data = config_data.model_dump(exclude_unset=True)
            config.update_from_dict(update_data)
            
            await session.commit()
            await session.refresh(config)
            
            # Invalidar cache
            ConfigService._invalidate_cache(config.chave)
            
            logger.info(f"Configuração atualizada: {config.chave}")
            
            return config
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar configuração {config_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def list_configs(
        session: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        categoria: Optional[str] = None,
        publico: Optional[bool] = None,
        editavel: Optional[bool] = None,
        search: Optional[str] = None
    ) -> tuple[List[AppConfig], int]:
        """Lista configurações com filtros e paginação."""
        try:
            # Construir query base
            query = select(AppConfig)
            
            # Aplicar filtros
            conditions = []
            
            if categoria:
                conditions.append(AppConfig.categoria == categoria)
            
            if publico is not None:
                conditions.append(AppConfig.publico == publico)
            
            if editavel is not None:
                conditions.append(AppConfig.editavel == editavel)
            
            if search:
                search_term = f"%{search}%"
                conditions.append(
                    or_(
                        AppConfig.chave.ilike(search_term),
                        AppConfig.descricao.ilike(search_term)
                    )
                )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Contar total
            count_query = select(func.count(AppConfig.id))
            if conditions:
                count_query = count_query.where(and_(*conditions))
            
            count_result = await session.execute(count_query)
            total = count_result.scalar()
            
            # Aplicar paginação e ordenação
            query = query.order_by(
                AppConfig.categoria, 
                AppConfig.chave
            ).offset(skip).limit(limit)
            
            result = await session.execute(query)
            configs = result.scalars().all()
            
            return list(configs), total
            
        except Exception as e:
            logger.error(f"Erro ao listar configurações: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_configs_by_category(
        session: AsyncSession,
        categoria: str
    ) -> List[AppConfig]:
        """Obtém todas as configurações de uma categoria."""
        try:
            result = await session.execute(
                select(AppConfig)
                .where(AppConfig.categoria == categoria)
                .order_by(AppConfig.chave)
            )
            return list(result.scalars().all())
            
        except Exception as e:
            logger.error(f"Erro ao obter configurações da categoria {categoria}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def get_public_configs(session: AsyncSession) -> List[AppConfig]:
        """Obtém todas as configurações públicas."""
        try:
            result = await session.execute(
                select(AppConfig)
                .where(AppConfig.publico == True)
                .order_by(AppConfig.categoria, AppConfig.chave)
            )
            return list(result.scalars().all())
            
        except Exception as e:
            logger.error(f"Erro ao obter configurações públicas: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def bulk_update_configs(
        session: AsyncSession,
        updates: List[Dict[str, Any]]
    ) -> List[AppConfig]:
        """Atualiza múltiplas configurações em lote."""
        try:
            updated_configs = []
            
            for update_data in updates:
                chave = update_data.get('chave')
                valor = update_data.get('valor')
                
                if not chave:
                    continue
                
                config = await ConfigService.get_config_by_key(session, chave)
                if config and config.editavel:
                    config.valor = valor
                    updated_configs.append(config)
            
            await session.commit()
            
            # Invalidar todo o cache
            ConfigService._invalidate_cache()
            
            logger.info(f"Atualizadas {len(updated_configs)} configurações em lote")
            
            return updated_configs
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao atualizar configurações em lote: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def export_configs(
        session: AsyncSession,
        categoria: Optional[str] = None
    ) -> Dict[str, Any]:
        """Exporta configurações para backup."""
        try:
            query = select(AppConfig)
            
            if categoria:
                query = query.where(AppConfig.categoria == categoria)
            
            result = await session.execute(query.order_by(AppConfig.categoria, AppConfig.chave))
            configs = result.scalars().all()
            
            export_data = {
                "versao": "1.0",
                "data_export": str(func.now()),
                "categoria": categoria,
                "configuracoes": [
                    {
                        "chave": config.chave,
                        "valor": config.valor,
                        "descricao": config.descricao,
                        "categoria": config.categoria,
                        "publico": config.publico,
                        "editavel": config.editavel
                    }
                    for config in configs
                ]
            }
            
            logger.info(f"Exportadas {len(configs)} configurações")
            
            return export_data
            
        except Exception as e:
            logger.error(f"Erro ao exportar configurações: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def import_configs(
        session: AsyncSession,
        import_data: Dict[str, Any],
        sobrescrever: bool = False
    ) -> Dict[str, int]:
        """Importa configurações de backup."""
        try:
            configuracoes = import_data.get('configuracoes', [])
            
            criadas = 0
            atualizadas = 0
            ignoradas = 0
            
            for config_data in configuracoes:
                chave = config_data.get('chave')
                if not chave:
                    ignoradas += 1
                    continue
                
                existing_config = await ConfigService.get_config_by_key(session, chave)
                
                if existing_config:
                    if sobrescrever and existing_config.editavel:
                        existing_config.valor = config_data.get('valor')
                        existing_config.descricao = config_data.get('descricao')
                        atualizadas += 1
                    else:
                        ignoradas += 1
                else:
                    new_config = AppConfig(
                        chave=chave,
                        valor=config_data.get('valor'),
                        descricao=config_data.get('descricao'),
                        categoria=config_data.get('categoria', 'Sistema'),
                        publico=config_data.get('publico', False),
                        editavel=config_data.get('editavel', True)
                    )
                    session.add(new_config)
                    criadas += 1
            
            await session.commit()
            
            # Invalidar todo o cache
            ConfigService._invalidate_cache()
            
            result = {
                "criadas": criadas,
                "atualizadas": atualizadas,
                "ignoradas": ignoradas
            }
            
            logger.info(f"Importação concluída: {result}")
            
            return result
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao importar configurações: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    async def delete_config(session: AsyncSession, config_id: int) -> bool:
        """Exclui uma configuração."""
        try:
            config = await ConfigService.get_config_by_id(session, config_id)
            if not config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Configuração não encontrada"
                )
            
            if not config.editavel:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Configuração não pode ser excluída"
                )
            
            chave = config.chave
            await session.delete(config)
            await session.commit()
            
            # Invalidar cache
            ConfigService._invalidate_cache(chave)
            
            logger.info(f"Configuração excluída: {chave}")
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro ao excluir configuração {config_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor"
            )
    
    @staticmethod
    def clear_cache():
        """Limpa o cache de configurações."""
        ConfigService._invalidate_cache()
        logger.info("Cache de configurações limpo")
    
    @staticmethod
    def disable_cache():
        """Desabilita o cache de configurações."""
        ConfigService._cache_enabled = False
        ConfigService._invalidate_cache()
        logger.info("Cache de configurações desabilitado")
    
    @staticmethod
    def enable_cache():
        """Habilita o cache de configurações."""
        ConfigService._cache_enabled = True
        logger.info("Cache de configurações habilitado")