#!/usr/bin/env python3
"""
FastAPI WebSocket Server for the Agent.

This script provides a WebSocket interface for interacting with the Agent,
allowing real-time communication with a frontend application.
"""

import os
import argparse
import asyncio
import json
import logging
import uuid
from pathlib import Path
from typing import Dict, List, Set, Any, Optional
from dotenv import load_dotenv

load_dotenv()

import uvicorn
from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
    Request,
    HTTPException,
)

from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import anyio
import base64
import jwt
from datetime import datetime

from ii_agent.core.event import RealtimeEvent, EventType
from ii_agent.db.models import Session, Event
from ii_agent.utils.constants import DEFAULT_MODEL, UPLOAD_FOLDER_NAME
from utils import parse_common_args, create_workspace_manager_for_connection
from ii_agent.agents.anthropic_fc import AnthropicFC
from ii_agent.agents.base import BaseAgent
from ii_agent.llm.base import LLMClient
from ii_agent.utils import WorkspaceManager
from ii_agent.llm import get_client
from ii_agent.utils.prompt_generator import enhance_user_prompt

from fastapi.staticfiles import StaticFiles

from ii_agent.llm.context_manager.llm_summarizing import LLMSummarizingContextManager
from ii_agent.llm.context_manager.amortized_forgetting import (
    AmortizedForgettingContextManager,
)
from ii_agent.llm.token_counter import TokenCounter
from ii_agent.db.manager import DatabaseManager
from ii_agent.tools import get_system_tools
from ii_agent.prompts.system_prompt import SYSTEM_PROMPT, SYSTEM_PROMPT_WITH_SEQ_THINKING

MAX_OUTPUT_TOKENS_PER_TURN = 32000
MAX_TURNS = 200


app = FastAPI(title="Agent WebSocket API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# Create a logger
logger = logging.getLogger("websocket_server")
logger.setLevel(logging.DEBUG)

# Add a console handler if not already present
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

# Active WebSocket connections
active_connections: Set[WebSocket] = set()

# Active agents for each connection
active_agents: Dict[WebSocket, BaseAgent] = {}

# Active agent tasks
active_tasks: Dict[WebSocket, asyncio.Task] = {}

# Store message processors for each connection
message_processors: Dict[WebSocket, asyncio.Task] = {}

# Store global args for use in endpoint
global_args = None


def authenticate_request(request: Request) -> Dict[str, Any]:
    """Extract and validate NextAuth JWT token from request headers.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Dict containing user information
        
    Raises:
        HTTPException: If authentication fails
    """
    headers = request.headers
    auth_header = headers.get("Authorization")
    if not auth_header:
        logger.error("Authorization header missing")
        raise HTTPException(
            status_code=401, detail="Authorization header missing"
        )
    
    logger.debug(f"Auth header: {auth_header[:50]}...")  # Log first 50 chars for debugging
    
    # Extract token from "Bearer <token>" format
    try:
        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            logger.error(f"Invalid Authorization header format: {auth_header[:50]}...")
            raise HTTPException(
                status_code=401, detail="Invalid Authorization header format. Expected 'Bearer <token>'"
            )
        token = parts[1]
    except IndexError:
        logger.error(f"Failed to parse Authorization header: {auth_header[:50]}...")
        raise HTTPException(
            status_code=401, detail="Invalid Authorization header format"
        )
    
    # Check if token is empty
    if not token or token.strip() == "":
        logger.error("Empty token provided")
        raise HTTPException(
            status_code=401, detail="Empty token provided"
        )
    
    # Decode the NextAuth JWT token to get user info
    user_info = decode_nextauth_token(token)
    if not user_info:
        raise HTTPException(
            status_code=401, detail="Invalid or expired token"
        )
    
    return user_info


def decode_nextauth_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify NextAuth JWT token.
    
    Args:
        token: The JWT token from NextAuth
        
    Returns:
        Dict containing user information if valid, None otherwise
    """
    try:
        # Log the token format for debugging (only first and last 10 chars for security)
        logger.debug(f"Token format: {token[:10]}...{token[-10:] if len(token) > 20 else token}")
        logger.debug(f"Token length: {len(token)}")
        
        # Get the NextAuth secret from environment
        secret = os.getenv('NEXTAUTH_SECRET')
        if not secret:
            logger.error("NEXTAUTH_SECRET not found in environment variables")
            return None
        
        # Decode the JWT token without verification first to see the structure
        unverified = jwt.decode(token, options={"verify_signature": False})
        logger.debug(f"Unverified token contents: {unverified}")
        
        # Now decode with verification using HS256 (NextAuth's default)
        decoded = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_exp": True}  # Verify expiration
        )
        
        # Extract user information
        user_info = {
            "name": decoded.get("name"),
            "email": decoded.get("email"),
            "sub": decoded.get("sub"),  # Subject (user ID)
            "iat": decoded.get("iat"),  # Issued at
            "exp": decoded.get("exp"),  # Expires at
            "jti": decoded.get("jti"),  # JWT ID
        }
        
        logger.info(f"Successfully decoded token for user: {user_info.get('email')}")
        return user_info
        
    except jwt.ExpiredSignatureError:
        logger.error("JWT token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid JWT token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error decoding JWT token: {str(e)}")
        return None


def map_model_name_to_client(model_name: str, ws_content: Dict[str, Any]) -> LLMClient:
    """Create an LLM client based on the model name and configuration.
    
    Args:
        model_name: The name of the model to use
        ws_content: Dictionary containing configuration options like thinking_tokens
        
    Returns:
        LLMClient: Configured LLM client instance
        
    Raises:
        ValueError: If the model name is not supported
    """
    if "claude" in model_name:
        return get_client(
            "anthropic-direct",
            model_name=model_name,
            use_caching=False,
            project_id=global_args.project_id,
            region=global_args.region,
            thinking_tokens=ws_content.get("thinking_tokens", 0),
        )
    elif "gemini" in model_name:
        return get_client(
            "gemini-direct",
            model_name=model_name,
            project_id=global_args.project_id,
            region=global_args.region,
        )
    elif model_name in ["o3", "o4-mini", "gpt-4.1", "gpt-4o"]:
        return get_client(
            "openai-direct",
            model_name=model_name,
            azure_model=ws_content.get("azure_model", True),
            cot_model=ws_content.get("cot_model", False),
        )
    else:
        raise ValueError(f"Unknown model name: {model_name}")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)

    workspace_manager, session_uuid = create_workspace_manager_for_connection(
        global_args.workspace, global_args.use_container_workspace
    )
    print(f"Workspace manager created: {workspace_manager}")

    try:    
        # Initial connection message with session info
        await websocket.send_json(
            RealtimeEvent(
                type=EventType.CONNECTION_ESTABLISHED,
                content={
                    "message": "Connected to Agent WebSocket Server",
                    "workspace_path": str(workspace_manager.root),
                },
            ).model_dump()
        )

        # Process messages from the client
        while True:
            # Receive and parse message
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                content = message.get("content", {})

                if msg_type == "init_agent":
                    model_name = content.get("model_name", DEFAULT_MODEL)
                    # Initialize LLM client
                    client = map_model_name_to_client(model_name, content)

                    # Create a new agent for this connection
                    tool_args = content.get("tool_args", {})
                    agent = create_agent_for_connection(
                        client, session_uuid, workspace_manager, websocket, tool_args
                    )
                    active_agents[websocket] = agent

                    # Start message processor for this connection
                    message_processor = agent.start_message_processing()
                    message_processors[websocket] = message_processor
                    await websocket.send_json(
                        RealtimeEvent(
                            type=EventType.AGENT_INITIALIZED,
                            content={"message": "Agent initialized"},
                        ).model_dump()
                    )

                elif msg_type == "query":
                    # Check if there's an active task for this connection
                    if websocket in active_tasks and not active_tasks[websocket].done():
                        await websocket.send_json(
                            RealtimeEvent(
                                type=EventType.ERROR,
                                content={
                                    "message": "A query is already being processed"
                                },
                            ).model_dump()
                        )
                        continue

                    # Process a query to the agent
                    user_input = content.get("text", "")
                    resume = content.get("resume", False)
                    files = content.get("files", [])

                    # Send acknowledgment
                    await websocket.send_json(
                        RealtimeEvent(
                            type=EventType.PROCESSING,
                            content={"message": "Processing your request..."},
                        ).model_dump()
                    )

                    # Run the agent with the query in a separate task
                    task = asyncio.create_task(
                        run_agent_async(websocket, user_input, resume, files)
                    )
                    active_tasks[websocket] = task

                elif msg_type == "workspace_info":
                    # Send information about the current workspace
                    if workspace_manager:
                        await websocket.send_json(
                            RealtimeEvent(
                                type=EventType.WORKSPACE_INFO,
                                content={
                                    "path": str(workspace_manager.root),
                                },
                            ).model_dump()
                        )
                    else:
                        await websocket.send_json(
                            RealtimeEvent(
                                type=EventType.ERROR,
                                content={"message": "Workspace not initialized"},
                            ).model_dump()
                        )

                elif msg_type == "ping":
                    # Simple ping to keep connection alive
                    await websocket.send_json(
                        RealtimeEvent(type=EventType.PONG, content={}).model_dump()
                    )

                elif msg_type == "cancel":
                    # Get the agent for this connection
                    agent = active_agents.get(websocket)
                    if not agent:
                        await websocket.send_json(
                            RealtimeEvent(
                                type=EventType.ERROR,
                                content={
                                    "message": "No active agent for this connection"
                                },
                            ).model_dump()
                        )
                        continue

                    agent.cancel()

                    # Send acknowledgment that cancellation was received
                    await websocket.send_json(
                        RealtimeEvent(
                            type=EventType.SYSTEM,
                            content={"message": "Query cancelled"},
                        ).model_dump()
                    )

                elif msg_type == "edit_query":
                    # Get the agent for this connection
                    agent = active_agents.get(websocket)
                    if not agent:
                        await websocket.send_json(
                            RealtimeEvent(
                                type=EventType.ERROR,
                                content={
                                    "message": "No active agent for this connection"
                                },
                            ).model_dump()
                        )
                        continue

                    # Cancel the agent
                    agent.cancel()

                    # Clear the agent's history from last turn to last user message
                    agent.history.clear_from_last_to_user_message()

                    # Delete events from database up to last user message if we have a session ID
                    if agent.session_id:
                        try:
                            agent.db_manager.delete_events_from_last_to_user_message(
                                agent.session_id
                            )
                            await websocket.send_json(
                                RealtimeEvent(
                                    type=EventType.SYSTEM,
                                    content={
                                        "message": "Session history cleared from last event to last user message"
                                    },
                                ).model_dump()
                            )
                        except Exception as e:
                            logger.error(f"Error deleting session events: {str(e)}")
                            await websocket.send_json(
                                RealtimeEvent(
                                    type=EventType.ERROR,
                                    content={
                                        "message": f"Error clearing history: {str(e)}"
                                    },
                                ).model_dump()
                            )
                    else:
                        await websocket.send_json(
                            RealtimeEvent(
                                type=EventType.ERROR,
                                content={"message": "No active session to clear"},
                            ).model_dump()
                        )

                    # Send acknowledgment that query editing was received
                    await websocket.send_json(
                        RealtimeEvent(
                            type=EventType.SYSTEM,
                            content={"message": "Query editing mode activated"},
                        ).model_dump()
                    )

                    # Check if there's an active task for this connection
                    if websocket in active_tasks and not active_tasks[websocket].done():
                        await websocket.send_json(
                            RealtimeEvent(
                                type=EventType.ERROR,
                                content={
                                    "message": "A query is already being processed"
                                },
                            ).model_dump()
                        )
                        continue

                    # Process a query to the agent
                    user_input = content.get("text", "")
                    resume = content.get("resume", False)
                    files = content.get("files", [])

                    # Send acknowledgment
                    await websocket.send_json(
                        RealtimeEvent(
                            type=EventType.PROCESSING,
                            content={"message": "Processing your request..."},
                        ).model_dump()
                    )

                    # Run the agent with the query in a separate task
                    task = asyncio.create_task(
                        run_agent_async(websocket, user_input, resume, files)
                    )
                    active_tasks[websocket] = task

                elif msg_type == "enhance_prompt":
                    # Process a request to enhance a prompt using an LLM
                    model_name = content.get("model_name", DEFAULT_MODEL)
                    user_input = content.get("text", "")
                    files = content.get("files", [])
                    # Initialize LLM client
                    client = map_model_name_to_client(model_name, content)
                    
                    # Call the enhance_prompt function from the module
                    success, message, enhanced_prompt = await enhance_user_prompt(
                        client=client,
                        user_input=user_input,
                        files=files,
                    )

                    if success and enhanced_prompt:
                        # Send the enhanced prompt back to the client
                        await websocket.send_json(
                            RealtimeEvent(
                                type=EventType.PROMPT_GENERATED,
                                content={
                                    "result": enhanced_prompt,
                                    "original_request": user_input,
                                },
                            ).model_dump()
                        )
                    else:
                        # Send error message
                        await websocket.send_json(
                            RealtimeEvent(
                                type=EventType.ERROR,
                                content={"message": message},
                            ).model_dump()
                        )

                else:
                    # Unknown message type
                    await websocket.send_json(
                        RealtimeEvent(
                            type=EventType.ERROR,
                            content={"message": f"Unknown message type: {msg_type}"},
                        ).model_dump()
                    )

            except json.JSONDecodeError:
                await websocket.send_json(
                    RealtimeEvent(
                        type=EventType.ERROR, content={"message": "Invalid JSON format"}
                    ).model_dump()
                )
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                await websocket.send_json(
                    RealtimeEvent(
                        type=EventType.ERROR,
                        content={"message": f"Error processing request: {str(e)}"},
                    ).model_dump()
                )

    except WebSocketDisconnect:
        # Handle disconnection
        logger.info("Client disconnected")
        cleanup_connection(websocket)
    except Exception as e:
        # Handle other exceptions
        logger.error(f"WebSocket error: {str(e)}")
        cleanup_connection(websocket)


async def run_agent_async(
    websocket: WebSocket, user_input: str, resume: bool = False, files: List[str] = []
):
    """Run the agent asynchronously and send results back to the websocket."""
    agent = active_agents.get(websocket)

    if not agent:
        await websocket.send_json(
            RealtimeEvent(
                type=EventType.ERROR,
                content={"message": "Agent not initialized for this connection"},
            ).model_dump()
        )
        return

    try:
        # Add user message to the event queue to save to database
        agent.message_queue.put_nowait(
            RealtimeEvent(type=EventType.USER_MESSAGE, content={"text": user_input})
        )
        # Run the agent with the query
        await anyio.to_thread.run_sync(
            agent.run_agent, user_input, files, resume, abandon_on_cancel=True
        )

    except Exception as e:
        logger.error(f"Error running agent: {str(e)}")
        import traceback

        traceback.print_exc()
        await websocket.send_json(
            RealtimeEvent(
                type=EventType.ERROR,
                content={"message": f"Error running agent: {str(e)}"},
            ).model_dump()
        )
    finally:
        # Clean up the task reference
        if websocket in active_tasks:
            del active_tasks[websocket]


def cleanup_connection(websocket: WebSocket):
    """Clean up resources associated with a websocket connection."""
    # Remove from active connections
    if websocket in active_connections:
        active_connections.remove(websocket)

    # Set websocket to None in the agent but keep the message processor running
    if websocket in active_agents:
        agent = active_agents[websocket]
        agent.websocket = (
            None  # This will prevent sending to websocket but keep processing
        )
        # Don't cancel the message processor - it will continue saving to database
        if websocket in message_processors:
            del message_processors[websocket]  # Just remove the reference

    # Cancel any running tasks
    if websocket in active_tasks and not active_tasks[websocket].done():
        active_tasks[websocket].cancel()
        del active_tasks[websocket]

    # Remove agent for this connection
    if websocket in active_agents:
        del active_agents[websocket]


def create_agent_for_connection(
    client: LLMClient,
    session_id: uuid.UUID,
    workspace_manager: WorkspaceManager,
    websocket: WebSocket,
    tool_args: Dict[str, Any],
):
    """Create a new agent instance for a websocket connection."""
    global global_args
    token = websocket.query_params.get("token")
    if not token:
        raise HTTPException(
            status_code=401, detail="Unauthorized"
        )
    user_info = decode_nextauth_token(token)
    user_email = user_info.get("email")
    # user_name = user_info.get("name")
    device_id = user_email
    # Setup logging
    logger_for_agent_logs = logging.getLogger(f"agent_logs_{id(websocket)}")
    logger_for_agent_logs.setLevel(logging.DEBUG)
    # Prevent propagation to root logger to avoid duplicate logs
    logger_for_agent_logs.propagate = False

    # Ensure we don't duplicate handlers
    if not logger_for_agent_logs.handlers:
        logger_for_agent_logs.addHandler(logging.FileHandler(global_args.logs_path))
        if not global_args.minimize_stdout_logs:
            logger_for_agent_logs.addHandler(logging.StreamHandler())

    # Initialize database manager
    db_manager = DatabaseManager()

    # Create a new session and get its workspace directory
    db_manager.create_session(
        device_id=device_id,
        session_uuid=session_id,
        workspace_path=workspace_manager.root,
    )
    logger_for_agent_logs.info(
        f"Created new session {session_id} with workspace at {workspace_manager.root}"
    )

    # Initialize token counter
    token_counter = TokenCounter()

    if global_args.context_manager == "llm-summarizing":
        context_manager = LLMSummarizingContextManager(
            client=client,
            token_counter=token_counter,
            logger=logger_for_agent_logs,
            token_budget=120_000,
        )
    elif global_args.context_manager == "amortized-forgetting":
        context_manager = AmortizedForgettingContextManager(
            token_counter=token_counter,
            logger=logger_for_agent_logs,
            token_budget=120_000,
        )
    else:
        raise ValueError(f"Unknown context manager type: {global_args.context_manager}")

    # Initialize agent with websocket
    queue = asyncio.Queue()
    tools = get_system_tools(
        client=client,
        workspace_manager=workspace_manager,
        message_queue=queue,
        container_id=global_args.docker_container_id,
        ask_user_permission=global_args.needs_permission,
        tool_args=tool_args,
    )
    agent = AnthropicFC(
        system_prompt=SYSTEM_PROMPT_WITH_SEQ_THINKING if tool_args.get("sequential_thinking", False) else SYSTEM_PROMPT,
        client=client,
        tools=tools,
        workspace_manager=workspace_manager,
        message_queue=queue,
        logger_for_agent_logs=logger_for_agent_logs,
        context_manager=context_manager,
        max_output_tokens_per_turn=MAX_OUTPUT_TOKENS_PER_TURN,
        max_turns=MAX_TURNS,
        websocket=websocket,
        session_id=session_id,  # Pass the session_id from database manager
    )

    # Store the session ID in the agent for event tracking
    agent.session_id = session_id

    return agent


def setup_workspace(app, workspace_path):
    try:
        app.mount(
            "/workspace",
            StaticFiles(directory=workspace_path, html=True),
            name="workspace",
        )
    except RuntimeError:
        # Directory might not exist yet
        os.makedirs(workspace_path, exist_ok=True)
        app.mount(
            "/workspace",
            StaticFiles(directory=workspace_path, html=True),
            name="workspace",
        )


def main():
    """Main entry point for the WebSocket server."""
    global global_args

    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="WebSocket Server for interacting with the Agent"
    )
    parser = parse_common_args(parser)
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to run the server on",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to run the server on",
    )
    args = parser.parse_args()
    global_args = args

    setup_workspace(app, args.workspace)

    # Start the FastAPI server
    logger.info(f"Starting WebSocket server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)


@app.post("/api/upload")
async def upload_file_endpoint(request: Request):
    """API endpoint for uploading a single file to the workspace.

    Expects a JSON payload with:
    - session_id: UUID of the session/workspace
    - file: Object with path and content properties
    """
    try:
        data = await request.json()
        session_id = data.get("session_id")
        file_info = data.get("file")
        user_info = authenticate_request(request)
        user_email = user_info.get("email")

        if not session_id:
            return JSONResponse(
                status_code=400, content={"error": "session_id is required"}
            )

        if not file_info:
            return JSONResponse(
                status_code=400, content={"error": "No file provided for upload"}
            )

        # Find the workspace path for this session
        workspace_path = Path(global_args.workspace).resolve() / session_id
        if not workspace_path.exists():
            return JSONResponse(
                status_code=404,
                content={"error": f"Workspace not found for session: {session_id}"},
            )

        # Create the upload directory if it doesn't exist
        upload_dir = workspace_path / UPLOAD_FOLDER_NAME
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = file_info.get("path", "")
        file_content = file_info.get("content", "")

        if not file_path:
            return JSONResponse(
                status_code=400, content={"error": "File path is required"}
            )

        # Ensure the file path is relative to the workspace
        if Path(file_path).is_absolute():
            file_path = Path(file_path).name

        # Create the full path within the upload directory
        original_path = upload_dir / file_path
        full_path = original_path

        # Handle filename collision by adding a suffix
        if full_path.exists():
            base_name = full_path.stem
            extension = full_path.suffix
            counter = 1

            # Keep incrementing counter until we find a unique filename
            while full_path.exists():
                new_filename = f"{base_name}_{counter}{extension}"
                full_path = upload_dir / new_filename
                counter += 1

            # Update the file_path to reflect the new name
            file_path = f"{full_path.relative_to(upload_dir)}"

        # Ensure any subdirectories exist
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Check if content is base64 encoded (for binary files)
        if file_content.startswith("data:"):
            # Handle data URLs (e.g., "data:application/pdf;base64,...")
            # Split the header from the base64 content
            header, encoded = file_content.split(",", 1)

            # Decode the content
            decoded = base64.b64decode(encoded)

            # Write binary content
            with open(full_path, "wb") as f:
                f.write(decoded)
        else:
            # Write text content
            with open(full_path, "w") as f:
                f.write(file_content)

        # Log the upload
        logger.info(f"File uploaded to {full_path}")

        # Return the path relative to the workspace for client use
        relative_path = f"/{UPLOAD_FOLDER_NAME}/{file_path}"

        return {
            "message": "File uploaded successfully",
            "file": {"path": relative_path, "saved_path": str(full_path)},
        }

    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return JSONResponse(
            status_code=500, content={"error": f"Error uploading file: {str(e)}"}
        )


@app.get("/api/sessions")
async def get_sessions_by_device_id(request: Request):
    """Get all sessions for a specific device ID, sorted by creation time descending.
    For each session, also includes the first user message if available.

    Args:
        device_id: The device identifier to look up sessions for

    Returns:
        A list of sessions with their details and first user message, sorted by creation time descending
    """
    try:
        # Authenticate the request and get user info
        user_info = authenticate_request(request)
        
        # Initialize database manager
        db_manager = DatabaseManager()
        
        # You now have access to user information:
        user_email = user_info.get("email")
        user_name = user_info.get("name")
        logger.info(f"Request from authenticated user: {user_name} ({user_email})")
        
        # Extract device_id from the request parameters
        device_id = user_email
        if not device_id:
            raise HTTPException(
                status_code=400, detail="device_id parameter is required"
            )

        # Get all sessions for this device, sorted by created_at descending
        sessions_data = []
        sessions = Session.objects(device_id=device_id).order_by('-created_at')
        
        for session in sessions:
            # Find the first user message for this session
            first_user_event = Event.objects(
                session_id=session.id,
                event_type="user_message"
            ).order_by('timestamp').first()
            
            first_message = ""
            if first_user_event and first_user_event.event_payload:
                first_message = first_user_event.event_payload.get("content", {}).get("text", "")
            
            session_data = {
                "id": session.id,
                "workspace_dir": session.workspace_dir,
                "created_at": session.created_at,
                "device_id": session.device_id,
                "first_message": first_message,
            }
            sessions_data.append(session_data)

        return {"sessions": sessions_data}

    except Exception as e:
        logger.error(f"Error retrieving sessions: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving sessions: {str(e)}"
        )


@app.get("/api/sessions/{session_id}/events")
async def get_session_events(session_id: str, request: Request):
    """Get all events for a specific session ID, sorted by timestamp ascending.

    Args:
        session_id: The session identifier to look up events for
        request: FastAPI Request object for authentication

    Returns:
        A list of events with their details, sorted by timestamp ascending
    """
    try:
        # Authenticate the request and get user info
        user_info = authenticate_request(request)
        
        # Log the authenticated user accessing session events
        user_email = user_info.get("email")
        user_name = user_info.get("name")
        logger.info(f"User {user_name} ({user_email}) accessing events for session {session_id}")

        # Get all events for this session, sorted by timestamp ascending
        events = Event.objects(session_id=session_id, device_id=user_email).order_by('timestamp')
        
        # Get the session to get workspace_dir
        session = Session.objects(id=session_id).first()
        workspace_dir = session.workspace_dir if session else ""

        # Convert events to a list of dictionaries
        event_list = []
        for e in events:
            event_list.append(
                {
                    "id": e.id,
                    "session_id": e.session_id,
                    "timestamp": e.timestamp.isoformat(),
                    "event_type": e.event_type,
                    "event_payload": e.event_payload,
                    "workspace_dir": workspace_dir,
                }
            )

        return {"events": event_list}

    except Exception as e:
        logger.error(f"Error retrieving events: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving events: {str(e)}"
        )


@app.get("/api/debug-auth")
async def debug_auth(request: Request):
    """Debug endpoint to test authentication token parsing."""
    try:
        headers = request.headers
        auth_header = headers.get("Authorization")
        
        return JSONResponse({
            "auth_header_present": bool(auth_header),
            "auth_header_format": auth_header[:50] + "..." if auth_header and len(auth_header) > 50 else auth_header,
            "auth_header_length": len(auth_header) if auth_header else 0,
            "has_bearer": auth_header.startswith("Bearer ") if auth_header else False,
            "token_segments": len(auth_header.split(" ")[1].split(".")) if auth_header and " " in auth_header else 0,
        })
    except Exception as e:
        return JSONResponse({
            "error": str(e),
            "auth_header_present": bool(request.headers.get("Authorization")),
        })


if __name__ == "__main__":
    main()