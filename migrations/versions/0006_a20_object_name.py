from alembic import op
import sqlalchemy as sa

revision = "0006_a20_object_name"
down_revision = "0005_a20_objects_and_versions"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("objects", sa.Column("name", sa.Text(), nullable=False, server_default=sa.text("''")))

def downgrade():
    op.drop_column("objects", "name")
