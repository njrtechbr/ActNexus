from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status, UploadFile, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import logger
from app.services.minio_service import minio_service
from app.services.langflow_service import langflow_service
from app.services.livro_service import LivroService
from app.services.ato_service import AtoService
from app.services.ai_usage_service import AiUsageService
from app.models.livro import Livro
from app.models.ato import Ato
from app.schemas.livro import LivroUpdate
from app.schemas.ato import AtoCreate
from datetime import datetime
import asyncio
import json


class PDFProcessorService:
    """Serviço para processamento de PDFs com IA."""
    
    def __init__(self):
        """Inicializa o serviço de processamento de PDF."""
        self.livro_service = LivroService()
        self.ato_service = AtoService()
        self.ai_usage_service = AiUsageService()
        
        logger.info("Serviço de processamento de PDF inicializado")
    
    async def upload_and_process_pdf(
        self,
        file: UploadFile,
        livro_id: int,
        db: AsyncSession,
        background_tasks: BackgroundTasks,
        process_immediately: bool = True
    ) -> Dict[str, Any]:
        """Faz upload de um PDF e inicia o processamento."""
        try:
            # Verificar se o arquivo é um PDF
            if not file.content_type or 'pdf' not in file.content_type.lower():
                if not file.filename or not file.filename.lower().endswith('.pdf'):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Apenas arquivos PDF são aceitos"
                    )
            
            # Verificar se o livro existe
            livro = await self.livro_service.get_by_id(db, livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            # Fazer upload do arquivo para MinIO
            logger.info(f"Iniciando upload de PDF para livro {livro_id}")
            
            upload_result = await minio_service.upload_file(
                file=file,
                prefix=f"livros/{livro_id}"
            )
            
            # Atualizar livro com informações do PDF
            livro_update = LivroUpdate(
                url_pdf_original=upload_result["object_name"],
                status="processando",
                metadados_arquivo={
                    "nome_original": upload_result["original_filename"],
                    "tamanho_bytes": upload_result["file_size"],
                    "tipo_conteudo": upload_result["content_type"],
                    "data_upload": upload_result["upload_timestamp"],
                    "bucket": upload_result["bucket_name"]
                }
            )
            
            updated_livro = await self.livro_service.update(db, livro_id, livro_update)
            
            logger.info(f"PDF enviado com sucesso para livro {livro_id}: {upload_result['object_name']}")
            
            # Iniciar processamento em background se solicitado
            if process_immediately:
                background_tasks.add_task(
                    self.process_pdf_background,
                    livro_id,
                    upload_result["bucket_name"],
                    upload_result["object_name"]
                )
                logger.info(f"Processamento em background iniciado para livro {livro_id}")
            
            return {
                "livro_id": livro_id,
                "upload_info": upload_result,
                "status": "uploaded",
                "processing_started": process_immediately,
                "message": "PDF enviado com sucesso" + (" e processamento iniciado" if process_immediately else "")
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro no upload de PDF para livro {livro_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro no upload do PDF: {str(e)}"
            )
    
    async def process_pdf_background(
        self,
        livro_id: int,
        bucket_name: str,
        object_name: str
    ) -> None:
        """Processa um PDF em background usando LangFlow."""
        from app.db.session import get_db_session
        
        async with get_db_session() as db:
            try:
                logger.info(f"Iniciando processamento em background - Livro {livro_id}")
                
                # Registrar início do processamento de IA
                ai_log_data = {
                    "operacao": "process_pdf",
                    "modelo": "langflow_pdf_processor",
                    "prompt": f"Processar PDF do livro {livro_id}",
                    "dados_entrada": {
                        "livro_id": livro_id,
                        "bucket": bucket_name,
                        "object": object_name
                    },
                    "status": "iniciado"
                }
                
                ai_log = await self.ai_usage_service.create_log(db, ai_log_data)
                
                # Gerar URL pré-assinada para o PDF
                pdf_url = minio_service.create_presigned_url(
                    bucket_name=bucket_name,
                    object_name=object_name,
                    expiration=3600  # 1 hora
                )
                
                logger.debug(f"URL pré-assinada gerada para livro {livro_id}")
                
                # Obter contexto adicional do livro
                livro = await self.livro_service.get_by_id(db, livro_id)
                additional_context = {
                    "livro_numero": livro.numero,
                    "livro_ano": livro.ano,
                    "livro_tipo": livro.tipo,
                    "cartorio_info": {
                        "nome": "Cartório ActNexus",  # Pode ser configurável
                        "cidade": "São Paulo",
                        "estado": "SP"
                    }
                }
                
                # Processar PDF com LangFlow
                start_time = datetime.now()
                
                try:
                    langflow_result = await langflow_service.process_pdf(
                        pdf_url=pdf_url,
                        livro_id=livro_id,
                        additional_context=additional_context
                    )
                    
                    end_time = datetime.now()
                    processing_time = (end_time - start_time).total_seconds()
                    
                    logger.info(f"LangFlow processou PDF com sucesso - Livro {livro_id}")
                    
                    # Atualizar log de IA com sucesso
                    await self.ai_usage_service.update_log(
                        db,
                        ai_log.id,
                        {
                            "status": "concluido",
                            "dados_resposta": langflow_result,
                            "tempo_resposta_ms": int(processing_time * 1000),
                            "tokens_entrada": len(pdf_url) // 4,  # Estimativa
                            "tokens_saida": len(str(langflow_result)) // 4,  # Estimativa
                            "custo_estimado": processing_time * 0.01  # Estimativa
                        }
                    )
                    
                    # Processar resultado e atualizar banco de dados
                    await self._process_langflow_result(
                        db, livro_id, langflow_result
                    )
                    
                    logger.info(f"Processamento concluído com sucesso - Livro {livro_id}")
                    
                except Exception as langflow_error:
                    logger.error(f"Erro no processamento LangFlow - Livro {livro_id}: {str(langflow_error)}")
                    
                    # Atualizar log de IA com erro
                    await self.ai_usage_service.update_log(
                        db,
                        ai_log.id,
                        {
                            "status": "erro",
                            "mensagem_erro": str(langflow_error),
                            "tempo_resposta_ms": int((datetime.now() - start_time).total_seconds() * 1000)
                        }
                    )
                    
                    # Atualizar status do livro para erro
                    await self.livro_service.update_processing_status(
                        db,
                        livro_id,
                        "erro",
                        error_message=f"Erro no processamento de IA: {str(langflow_error)}"
                    )
                    
                    raise langflow_error
                    
            except Exception as e:
                logger.error(f"Erro no processamento em background - Livro {livro_id}: {str(e)}")
                
                # Tentar atualizar status do livro para erro
                try:
                    await self.livro_service.update_processing_status(
                        db,
                        livro_id,
                        "erro",
                        error_message=f"Erro no processamento: {str(e)}"
                    )
                except Exception as update_error:
                    logger.error(f"Erro ao atualizar status do livro {livro_id}: {str(update_error)}")
    
    async def _process_langflow_result(
        self,
        db: AsyncSession,
        livro_id: int,
        langflow_result: Dict[str, Any]
    ) -> None:
        """Processa o resultado do LangFlow e atualiza o banco de dados."""
        try:
            # Extrair metadados do livro
            livro_metadata = langflow_result.get("livro_metadata", {})
            atos_data = langflow_result.get("atos", [])
            processing_stats = langflow_result.get("processing_stats", {})
            
            # Atualizar metadados do livro
            livro_update_data = {
                "status": "concluido",
                "metadados_processamento": {
                    "data_processamento": datetime.now().isoformat(),
                    "total_atos_extraidos": len(atos_data),
                    "tempo_processamento_segundos": processing_stats.get("processing_time", 0),
                    "confianca_media": processing_stats.get("confidence_avg", 0.0),
                    "versao_ia": "langflow_v1"
                }
            }
            
            # Adicionar metadados extraídos se disponíveis
            if livro_metadata:
                if "numero" in livro_metadata:
                    livro_update_data["numero"] = livro_metadata["numero"]
                if "ano" in livro_metadata:
                    livro_update_data["ano"] = livro_metadata["ano"]
                if "tipo" in livro_metadata:
                    livro_update_data["tipo"] = livro_metadata["tipo"]
                if "data_abertura" in livro_metadata:
                    livro_update_data["data_abertura"] = livro_metadata["data_abertura"]
                if "data_encerramento" in livro_metadata:
                    livro_update_data["data_encerramento"] = livro_metadata["data_encerramento"]
            
            # Atualizar livro
            livro_update = LivroUpdate(**livro_update_data)
            await self.livro_service.update(db, livro_id, livro_update)
            
            logger.info(f"Metadados do livro {livro_id} atualizados")
            
            # Criar atos extraídos
            atos_criados = []
            for ato_data in atos_data:
                try:
                    ato_create = AtoCreate(
                        livro_id=livro_id,
                        numero=ato_data.get("numero"),
                        tipo=ato_data.get("tipo", "Não especificado"),
                        data_ato=ato_data.get("data_ato"),
                        conteudo_original=ato_data.get("conteudo_original", ""),
                        conteudo_markdown=ato_data.get("conteudo_markdown", ""),
                        partes=ato_data.get("partes", []),
                        observacoes=ato_data.get("observacoes", ""),
                        status_ia=ato_data.get("status_ia", "processado"),
                        confianca_ia=ato_data.get("confianca_ia", 0.0)
                    )
                    
                    ato_criado = await self.ato_service.create(db, ato_create)
                    atos_criados.append(ato_criado)
                    
                    logger.debug(f"Ato {ato_data.get('numero')} criado para livro {livro_id}")
                    
                except Exception as ato_error:
                    logger.error(f"Erro ao criar ato {ato_data.get('numero')} do livro {livro_id}: {str(ato_error)}")
                    # Continuar com os outros atos mesmo se um falhar
                    continue
            
            logger.info(f"Processamento concluído - Livro {livro_id}: {len(atos_criados)} atos criados")
            
        except Exception as e:
            logger.error(f"Erro ao processar resultado do LangFlow para livro {livro_id}: {str(e)}")
            raise
    
    async def reprocess_pdf(
        self,
        livro_id: int,
        db: AsyncSession,
        background_tasks: BackgroundTasks,
        force: bool = False
    ) -> Dict[str, Any]:
        """Reprocessa um PDF já enviado."""
        try:
            # Verificar se o livro existe e tem PDF
            livro = await self.livro_service.get_by_id(db, livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            if not livro.url_pdf_original:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Livro não possui PDF para reprocessar"
                )
            
            # Verificar se já está processando
            if livro.status == "processando" and not force:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Livro já está sendo processado. Use force=true para forçar reprocessamento"
                )
            
            # Atualizar status para processando
            await self.livro_service.update_processing_status(
                db, livro_id, "processando"
            )
            
            # Extrair informações do bucket
            bucket_name = livro.metadados_arquivo.get("bucket", "actnexus-livros")
            object_name = livro.url_pdf_original
            
            # Iniciar reprocessamento em background
            background_tasks.add_task(
                self.process_pdf_background,
                livro_id,
                bucket_name,
                object_name
            )
            
            logger.info(f"Reprocessamento iniciado para livro {livro_id}")
            
            return {
                "livro_id": livro_id,
                "status": "reprocessing_started",
                "message": "Reprocessamento iniciado com sucesso"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro no reprocessamento do livro {livro_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro no reprocessamento: {str(e)}"
            )
    
    async def get_processing_status(
        self,
        livro_id: int,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Obtém o status de processamento de um livro."""
        try:
            livro = await self.livro_service.get_by_id(db, livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            # Obter estatísticas dos atos
            atos_stats = await self.ato_service.get_stats_by_livro(db, livro_id)
            
            # Obter logs de IA relacionados
            ai_logs = await self.ai_usage_service.get_logs_by_operation(
                db, "process_pdf", {"livro_id": livro_id}
            )
            
            return {
                "livro_id": livro_id,
                "status": livro.status,
                "has_pdf": bool(livro.url_pdf_original),
                "processing_metadata": livro.metadados_processamento or {},
                "file_metadata": livro.metadados_arquivo or {},
                "atos_stats": atos_stats,
                "ai_processing_logs": [
                    {
                        "id": log.id,
                        "status": log.status,
                        "created_at": log.created_at.isoformat(),
                        "processing_time_ms": log.tempo_resposta_ms,
                        "error_message": log.mensagem_erro
                    }
                    for log in ai_logs
                ],
                "last_updated": livro.updated_at.isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter status de processamento do livro {livro_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao obter status: {str(e)}"
            )
    
    async def download_pdf(
        self,
        livro_id: int,
        db: AsyncSession,
        generate_presigned: bool = True
    ) -> Dict[str, Any]:
        """Gera URL para download do PDF ou retorna o conteúdo."""
        try:
            livro = await self.livro_service.get_by_id(db, livro_id)
            if not livro:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Livro não encontrado"
                )
            
            if not livro.url_pdf_original:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="PDF não encontrado para este livro"
                )
            
            bucket_name = livro.metadados_arquivo.get("bucket", "actnexus-livros")
            object_name = livro.url_pdf_original
            
            if generate_presigned:
                # Gerar URL pré-assinada para download
                download_url = minio_service.create_presigned_url(
                    bucket_name=bucket_name,
                    object_name=object_name,
                    expiration=3600,  # 1 hora
                    method='GET'
                )
                
                return {
                    "livro_id": livro_id,
                    "download_url": download_url,
                    "expires_in_seconds": 3600,
                    "file_info": {
                        "original_filename": livro.metadados_arquivo.get("nome_original", "documento.pdf"),
                        "file_size": livro.metadados_arquivo.get("tamanho_bytes", 0),
                        "content_type": livro.metadados_arquivo.get("tipo_conteudo", "application/pdf")
                    }
                }
            else:
                # Baixar arquivo diretamente
                file_content = minio_service.download_file(
                    bucket_name=bucket_name,
                    object_name=object_name
                )
                
                return {
                    "livro_id": livro_id,
                    "file_content": file_content,
                    "file_info": {
                        "original_filename": livro.metadados_arquivo.get("nome_original", "documento.pdf"),
                        "file_size": len(file_content),
                        "content_type": livro.metadados_arquivo.get("tipo_conteudo", "application/pdf")
                    }
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erro no download do PDF do livro {livro_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro no download: {str(e)}"
            )


# Instância global do serviço de processamento de PDF
pdf_processor = PDFProcessorService()