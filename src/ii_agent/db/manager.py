from contextlib import contextmanager
from typing import Optional, Generator
import uuid
from pathlib import Path
from mongoengine import DoesNotExist
from ii_agent.db.models import Session, Event, init_db
from ii_agent.core.event import EventType, RealtimeEvent
import os


class DatabaseManager:
    """Manager class for database operations."""

    def __init__(self, mongodb_url: str = None):
        """Initialize the database manager.

        Args:
            mongodb_url: MongoDB connection URL
        """
        if mongodb_url is None:
            mongodb_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/ii_agent')
        
        # Initialize MongoDB connection
        init_db(mongodb_url)

    @contextmanager
    def get_session(self) -> Generator[None, None, None]:
        """Context manager for database operations.
        
        Note: MongoDB doesn't require explicit session management like SQLAlchemy,
        but we keep this for compatibility with existing code.
        """
        try:
            yield None
        except Exception:
            raise

    def create_session(
        self,
        session_uuid: uuid.UUID,
        workspace_path: Path,
        device_id: Optional[str] = None,
    ) -> tuple[uuid.UUID, Path]:
        """Create a new session with a UUID-based workspace directory.

        Args:
            session_uuid: The UUID for the session
            workspace_path: The path to the workspace directory
            device_id: Optional device identifier for the session

        Returns:
            A tuple of (session_uuid, workspace_path)
        """
        # Create session in database
        db_session = Session(
            id=session_uuid, 
            workspace_dir=str(workspace_path), 
            device_id=device_id
        )
        db_session.save()

        return session_uuid, workspace_path

    def save_event(self, session_id: uuid.UUID, event: RealtimeEvent) -> uuid.UUID:
        """Save an event to the database.

        Args:
            session_id: The UUID of the session this event belongs to
            event: The event to save

        Returns:
            The UUID of the created event
        """
        db_event = Event(
            session_id=session_id,
            event_type=event.type.value,
            event_payload=event.model_dump(),
        )
        db_event.save()
        return uuid.UUID(db_event.id)

    def get_session_events(self, session_id: uuid.UUID) -> list[Event]:
        """Get all events for a session.

        Args:
            session_id: The UUID of the session

        Returns:
            A list of events for the session
        """
        return list(Event.objects(session_id=str(session_id)).order_by('timestamp'))

    def get_session_by_workspace(self, workspace_dir: str) -> Optional[Session]:
        """Get a session by its workspace directory.

        Args:
            workspace_dir: The workspace directory path

        Returns:
            The session if found, None otherwise
        """
        try:
            return Session.objects(workspace_dir=workspace_dir).first()
        except DoesNotExist:
            return None

    def get_session_by_id(self, session_id: uuid.UUID) -> Optional[Session]:
        """Get a session by its UUID.

        Args:
            session_id: The UUID of the session

        Returns:
            The session if found, None otherwise
        """
        try:
            return Session.objects(id=str(session_id)).first()
        except DoesNotExist:
            return None

    def get_session_by_device_id(self, device_id: str) -> Optional[Session]:
        """Get a session by its device ID.

        Args:
            device_id: The device identifier

        Returns:
            The session if found, None otherwise
        """
        try:
            return Session.objects(device_id=device_id).first()
        except DoesNotExist:
            return None

    def delete_session_events(self, session_id: uuid.UUID) -> None:
        """Delete all events for a session.

        Args:
            session_id: The UUID of the session to delete events for
        """
        Event.objects(session_id=str(session_id)).delete()

    def delete_events_from_last_to_user_message(self, session_id: uuid.UUID) -> None:
        """Delete events from the most recent event backwards to the last user message (inclusive).
        This preserves the conversation history before the last user message.
        Args:
            session_id: The UUID of the session to delete events for
        """
        # Find the last user message event
        last_user_event = Event.objects(
            session_id=str(session_id),
            event_type=EventType.USER_MESSAGE.value
        ).order_by('-timestamp').first()

        if last_user_event:
            # Delete all events after and including the last user message
            Event.objects(
                session_id=str(session_id),
                timestamp__gte=last_user_event.timestamp
            ).delete()
        else:
            # If no user message found, delete all events
            Event.objects(session_id=str(session_id)).delete()
