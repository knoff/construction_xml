"""add schemas table

Revision ID: 0002_schemas
Revises: 0001_init
Create Date: 2025-08-21  17:15:00

"""
from alembic import op
import sqlalchemy as sa


revision = '0002_schemas'
down_revision = '0001_init'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'schemas',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('version', sa.String, nullable=True),
        sa.Column('namespace', sa.String, nullable=True),
        sa.Column('description', sa.String, nullable=True),
        sa.Column('file_path', sa.String, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )


def downgrade():
    op.drop_table('schemas')
