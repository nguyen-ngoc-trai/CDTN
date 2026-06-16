"""Initial migration – tạo bảng ml_models, transactions, predictions

Revision ID: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'ml_models',
        sa.Column('id',          sa.Integer(),     primary_key=True),
        sa.Column('name',        sa.String(100),   nullable=False),
        sa.Column('filename',    sa.String(200),   nullable=False, unique=True),
        sa.Column('algorithm',   sa.String(50),    nullable=False),
        sa.Column('description', sa.Text(),        nullable=True),
        sa.Column('is_active',   sa.Boolean(),     server_default='false', nullable=False),
        sa.Column('uploaded_at', sa.DateTime(),    server_default=sa.func.now()),
    )

    op.create_table(
        'transactions',
        sa.Column('id',           sa.Integer(), primary_key=True),
        sa.Column('time_seconds', sa.Float(),   nullable=False),
        sa.Column('amount',       sa.Float(),   nullable=False),
        *[sa.Column(f'v{i}', sa.Float()) for i in range(1, 29)],
        sa.Column('actual_class', sa.Integer(), nullable=True),
        sa.Column('created_at',   sa.DateTime(), server_default=sa.func.now()),
        sa.Column('source',       sa.String(50), server_default='api'),
        sa.Column('note',         sa.Text(),     nullable=True),
    )

    op.create_table(
        'predictions',
        sa.Column('id',                sa.Integer(),  primary_key=True),
        sa.Column('transaction_id',    sa.Integer(),  sa.ForeignKey('transactions.id'), unique=True, index=True),
        sa.Column('ml_model_id',       sa.Integer(),  sa.ForeignKey('ml_models.id'),    nullable=True, index=True),
        sa.Column('fraud_probability', sa.Float(),    nullable=False),
        sa.Column('is_fraud',          sa.Boolean(),  nullable=False),
        sa.Column('risk_level',        sa.String(10), nullable=False),
        sa.Column('model_version',     sa.String(100), nullable=True),
        sa.Column('predicted_at',      sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('predictions')
    op.drop_table('transactions')
    op.drop_table('ml_models')
