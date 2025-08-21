"""initial schema

Revision ID: 0001_init
Revises: 
Create Date: 2025-08-21 00:00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_init'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('doc_uid', sa.String(length=64), nullable=False, unique=True),
        sa.Column('cdm', sa.JSON(), nullable=False),
        sa.Column('schema_id', sa.String(length=64), nullable=True),
        sa.Column('schema_version', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_documents_doc_uid', 'documents', ['doc_uid'], unique=True)

    op.create_table(
        'files',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('sha256', sa.String(length=64), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('mime', sa.String(length=128), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_files_sha256', 'files', ['sha256'], unique=False)

    op.create_table(
        'rules',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('rule_id', sa.String(length=128), nullable=False, unique=True),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('version', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_rules_rule_id', 'rules', ['rule_id'], unique=True)

def downgrade() -> None:
    op.drop_index('ix_rules_rule_id', table_name='rules')
    op.drop_table('rules')
    op.drop_index('ix_files_sha256', table_name='files')
    op.drop_table('files')
    op.drop_index('ix_documents_doc_uid', table_name='documents')
    op.drop_table('documents')
