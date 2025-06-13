from datetime import datetime
import uuid
from mongoengine import Document, StringField, DateTimeField, DictField, connect
from typing import Optional
import os


class Session(Document):
    """Database model for agent sessions."""
    
    meta = {'collection': 'sessions'}
    
    # Store UUID as string in MongoDB
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_dir = StringField(unique=True, required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    device_id = StringField()  # Optional device identifier

    def __init__(
        self, id: uuid.UUID = None, workspace_dir: str = None, device_id: Optional[str] = None, **kwargs
    ):
        """Initialize a session with a UUID and workspace directory.

        Args:
            id: The UUID for the session
            workspace_dir: The workspace directory path
            device_id: Optional device identifier
        """
        super().__init__(**kwargs)
        if id:
            self.id = str(id)  # Convert UUID to string for storage
        if workspace_dir:
            self.workspace_dir = workspace_dir
        if device_id:
            self.device_id = device_id


class Event(Document):
    """Database model for agent events."""
    
    meta = {'collection': 'events'}

    # Store UUID as string in MongoDB
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = StringField(required=True)
    timestamp = DateTimeField(default=datetime.utcnow)
    event_type = StringField(required=True)
    event_payload = DictField(required=True)  # MongoDB native dict/JSON support

    def __init__(self, session_id: uuid.UUID = None, event_type: str = None, event_payload: dict = None, **kwargs):
        """Initialize an event.

        Args:
            session_id: The UUID of the session this event belongs to
            event_type: The type of event
            event_payload: The event payload as a dictionary
        """
        super().__init__(**kwargs)
        if session_id:
            self.session_id = str(session_id)  # Convert UUID to string for storage
        if event_type:
            self.event_type = event_type
        if event_payload:
            self.event_payload = event_payload


def init_db(mongodb_url: str = None):
    """Initialize the database connection."""
    if mongodb_url is None:
        mongodb_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/ii_agent')
    
    connect(host=mongodb_url)
