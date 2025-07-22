from typing import Optional, BinaryIO, Dict, Any
from fastapi import HTTPException, status, UploadFile
from app.core.config import settings
from app.core.logging import logger
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config
from datetime import datetime, timedelta
import uuid
import os
import mimetypes


class MinIOService:
    """Serviço para gerenciamento de arquivos no MinIO."""
    
    def __init__(self):
        """Inicializa o cliente MinIO."""
        try:
            # Configuração do cliente S3 para MinIO
            self.s3_client = boto3.client(
                's3',
                endpoint_url=settings.MINIO_ENDPOINT,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY,
                config=Config(
                    signature_version='s3v4',
                    region_name='us-east-1'  # MinIO usa região padrão
                ),
                verify=False  # Para desenvolvimento local
            )
            
            # Bucket padrão para livros
            self.default_bucket = "actnexus-livros"
            
            logger.info("Cliente MinIO inicializado com sucesso")
            
        except Exception as e:
            logger.error(f"Erro ao inicializar cliente MinIO: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao conectar com o serviço de armazenamento"
            )
    
    async def ensure_bucket_exists(self, bucket_name: str) -> bool:
        """Garante que o bucket existe, criando se necessário."""
        try:
            # Verificar se o bucket existe
            self.s3_client.head_bucket(Bucket=bucket_name)
            logger.debug(f"Bucket '{bucket_name}' já existe")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            
            if error_code == '404':
                # Bucket não existe, criar
                try:
                    self.s3_client.create_bucket(Bucket=bucket_name)
                    logger.info(f"Bucket '{bucket_name}' criado com sucesso")
                    return True
                except ClientError as create_error:
                    logger.error(f"Erro ao criar bucket '{bucket_name}': {str(create_error)}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Erro ao criar bucket: {str(create_error)}"
                    )
            else:
                logger.error(f"Erro ao verificar bucket '{bucket_name}': {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao acessar bucket: {str(e)}"
                )
    
    def _generate_object_name(self, original_filename: str, prefix: str = "") -> str:
        """Gera um nome único para o objeto."""
        # Extrair extensão do arquivo
        _, ext = os.path.splitext(original_filename)
        
        # Gerar UUID único
        unique_id = str(uuid.uuid4())
        
        # Adicionar timestamp para garantir unicidade
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Construir nome do objeto
        if prefix:
            object_name = f"{prefix}/{timestamp}_{unique_id}{ext}"
        else:
            object_name = f"{timestamp}_{unique_id}{ext}"
        
        return object_name
    
    async def upload_file(
        self,
        file: UploadFile,
        bucket_name: Optional[str] = None,
        object_name: Optional[str] = None,
        prefix: str = ""
    ) -> Dict[str, Any]:
        """Faz upload de um arquivo para o MinIO."""
        try:
            # Usar bucket padrão se não especificado
            if not bucket_name:
                bucket_name = self.default_bucket
            
            # Garantir que o bucket existe
            await self.ensure_bucket_exists(bucket_name)
            
            # Gerar nome do objeto se não fornecido
            if not object_name:
                object_name = self._generate_object_name(file.filename, prefix)
            
            # Detectar tipo MIME
            content_type = file.content_type
            if not content_type:
                content_type, _ = mimetypes.guess_type(file.filename)
                if not content_type:
                    content_type = 'application/octet-stream'
            
            # Ler conteúdo do arquivo
            file_content = await file.read()
            file_size = len(file_content)
            
            # Metadados do arquivo
            metadata = {
                'original-filename': file.filename,
                'upload-timestamp': datetime.now().isoformat(),
                'file-size': str(file_size)
            }
            
            # Fazer upload
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=object_name,
                Body=file_content,
                ContentType=content_type,
                Metadata=metadata
            )
            
            logger.info(f"Arquivo '{file.filename}' enviado como '{object_name}' no bucket '{bucket_name}'")
            
            return {
                "bucket_name": bucket_name,
                "object_name": object_name,
                "original_filename": file.filename,
                "file_size": file_size,
                "content_type": content_type,
                "upload_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro ao fazer upload do arquivo '{file.filename}': {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao fazer upload do arquivo: {str(e)}"
            )
    
    async def upload_file_content(
        self,
        file_content: bytes,
        filename: str,
        bucket_name: Optional[str] = None,
        object_name: Optional[str] = None,
        content_type: Optional[str] = None,
        prefix: str = ""
    ) -> Dict[str, Any]:
        """Faz upload de conteúdo de arquivo para o MinIO."""
        try:
            # Usar bucket padrão se não especificado
            if not bucket_name:
                bucket_name = self.default_bucket
            
            # Garantir que o bucket existe
            await self.ensure_bucket_exists(bucket_name)
            
            # Gerar nome do objeto se não fornecido
            if not object_name:
                object_name = self._generate_object_name(filename, prefix)
            
            # Detectar tipo MIME
            if not content_type:
                content_type, _ = mimetypes.guess_type(filename)
                if not content_type:
                    content_type = 'application/octet-stream'
            
            file_size = len(file_content)
            
            # Metadados do arquivo
            metadata = {
                'original-filename': filename,
                'upload-timestamp': datetime.now().isoformat(),
                'file-size': str(file_size)
            }
            
            # Fazer upload
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=object_name,
                Body=file_content,
                ContentType=content_type,
                Metadata=metadata
            )
            
            logger.info(f"Conteúdo do arquivo '{filename}' enviado como '{object_name}' no bucket '{bucket_name}'")
            
            return {
                "bucket_name": bucket_name,
                "object_name": object_name,
                "original_filename": filename,
                "file_size": file_size,
                "content_type": content_type,
                "upload_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro ao fazer upload do conteúdo do arquivo '{filename}': {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao fazer upload do arquivo: {str(e)}"
            )
    
    def create_presigned_url(
        self,
        bucket_name: str,
        object_name: str,
        expiration: int = 3600,
        method: str = 'GET'
    ) -> str:
        """Cria uma URL pré-assinada para acesso ao arquivo."""
        try:
            # Mapear método HTTP para operação S3
            operation_map = {
                'GET': 'get_object',
                'PUT': 'put_object',
                'DELETE': 'delete_object'
            }
            
            operation = operation_map.get(method.upper(), 'get_object')
            
            # Gerar URL pré-assinada
            presigned_url = self.s3_client.generate_presigned_url(
                operation,
                Params={'Bucket': bucket_name, 'Key': object_name},
                ExpiresIn=expiration
            )
            
            logger.debug(f"URL pré-assinada criada para '{object_name}' (expiração: {expiration}s)")
            
            return presigned_url
            
        except Exception as e:
            logger.error(f"Erro ao criar URL pré-assinada para '{object_name}': {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao gerar URL de acesso: {str(e)}"
            )
    
    def get_file_info(
        self,
        bucket_name: str,
        object_name: str
    ) -> Dict[str, Any]:
        """Obtém informações sobre um arquivo."""
        try:
            response = self.s3_client.head_object(Bucket=bucket_name, Key=object_name)
            
            return {
                "bucket_name": bucket_name,
                "object_name": object_name,
                "file_size": response.get('ContentLength', 0),
                "content_type": response.get('ContentType', ''),
                "last_modified": response.get('LastModified', '').isoformat() if response.get('LastModified') else '',
                "etag": response.get('ETag', '').strip('"'),
                "metadata": response.get('Metadata', {})
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Arquivo não encontrado"
                )
            else:
                logger.error(f"Erro ao obter informações do arquivo '{object_name}': {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao acessar arquivo: {str(e)}"
                )
    
    def download_file(
        self,
        bucket_name: str,
        object_name: str
    ) -> bytes:
        """Baixa um arquivo do MinIO."""
        try:
            response = self.s3_client.get_object(Bucket=bucket_name, Key=object_name)
            file_content = response['Body'].read()
            
            logger.debug(f"Arquivo '{object_name}' baixado do bucket '{bucket_name}'")
            
            return file_content
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Arquivo não encontrado"
                )
            else:
                logger.error(f"Erro ao baixar arquivo '{object_name}': {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao baixar arquivo: {str(e)}"
                )
    
    def delete_file(
        self,
        bucket_name: str,
        object_name: str
    ) -> bool:
        """Exclui um arquivo do MinIO."""
        try:
            self.s3_client.delete_object(Bucket=bucket_name, Key=object_name)
            
            logger.info(f"Arquivo '{object_name}' excluído do bucket '{bucket_name}'")
            
            return True
            
        except ClientError as e:
            logger.error(f"Erro ao excluir arquivo '{object_name}': {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao excluir arquivo: {str(e)}"
            )
    
    def list_files(
        self,
        bucket_name: str,
        prefix: str = "",
        max_keys: int = 1000
    ) -> List[Dict[str, Any]]:
        """Lista arquivos em um bucket."""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            files = []
            for obj in response.get('Contents', []):
                files.append({
                    "object_name": obj['Key'],
                    "file_size": obj['Size'],
                    "last_modified": obj['LastModified'].isoformat(),
                    "etag": obj['ETag'].strip('"')
                })
            
            logger.debug(f"Listados {len(files)} arquivos no bucket '{bucket_name}' com prefixo '{prefix}'")
            
            return files
            
        except ClientError as e:
            logger.error(f"Erro ao listar arquivos no bucket '{bucket_name}': {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao listar arquivos: {str(e)}"
            )
    
    def copy_file(
        self,
        source_bucket: str,
        source_object: str,
        dest_bucket: str,
        dest_object: str
    ) -> bool:
        """Copia um arquivo entre buckets ou dentro do mesmo bucket."""
        try:
            copy_source = {'Bucket': source_bucket, 'Key': source_object}
            
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=dest_bucket,
                Key=dest_object
            )
            
            logger.info(f"Arquivo copiado de '{source_bucket}/{source_object}' para '{dest_bucket}/{dest_object}'")
            
            return True
            
        except ClientError as e:
            logger.error(f"Erro ao copiar arquivo: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao copiar arquivo: {str(e)}"
            )
    
    def get_bucket_stats(self, bucket_name: str) -> Dict[str, Any]:
        """Obtém estatísticas de um bucket."""
        try:
            # Listar todos os objetos para calcular estatísticas
            paginator = self.s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(Bucket=bucket_name)
            
            total_objects = 0
            total_size = 0
            file_types = {}
            
            for page in page_iterator:
                for obj in page.get('Contents', []):
                    total_objects += 1
                    total_size += obj['Size']
                    
                    # Contar tipos de arquivo
                    _, ext = os.path.splitext(obj['Key'])
                    ext = ext.lower() if ext else 'sem_extensao'
                    file_types[ext] = file_types.get(ext, 0) + 1
            
            return {
                "bucket_name": bucket_name,
                "total_objects": total_objects,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "file_types": file_types
            }
            
        except ClientError as e:
            logger.error(f"Erro ao obter estatísticas do bucket '{bucket_name}': {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao obter estatísticas: {str(e)}"
            )


# Instância global do serviço MinIO
minio_service = MinIOService()