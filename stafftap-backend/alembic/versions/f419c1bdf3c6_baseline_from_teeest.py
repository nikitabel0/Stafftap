"""baseline from teeest

Revision ID: f419c1bdf3c6
Revises: 
Create Date: 2025-07-07 11:46:01.963629

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f419c1bdf3c6'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    pass

def downgrade():
    pass

