## Requirements
- Docker Compose
- Python 3.10+
- Node.js 18+ (for frontend)
- At least one of the following:
  - Anthropic API key, or
  - Google Gemini API key, or  
  - Google Cloud project with Vertex AI API enabled

## Best Practices:
- For best performance, we recommend using Claude 4.0 Sonnet or Claude Opus 4.0 models.
- For fast and cheap, we recommend using GPT4.1 from OpenAI.
- Gemini 2.5 Pro is a good balance between performance and cost.

## Environment

You need to set up 2 `.env` files to run both frontend and backend
**Shortcut:** Check file `.env.example` for example of `.env` file.

### Frontend Environment Variables

For the frontend, create a `.env` file in the frontend directory, point to the port of your backend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend Environment Variables

For the backend, create a `.env` file in the root directory with the following variables. Here are the required variables needed to run this project:


```bash
# Required API Keys - Choose one based on your LLM provider:
# Option 1: For Claude models via Anthropic
ANTHROPIC_API_KEY=your_anthropic_key

# Option 2: For Gemini models via Google
GEMINI_API_KEY=your_gemini_key

# Option 3: For OpenAI models
OPENAI_API_KEY=your_openai_key

# Search Provider API Key
TAVILY_API_KEY=your_tavily_key

STATIC_FILE_BASE_URL=http://localhost:8000/
```

We also support other search and crawl provider such as FireCrawl and SerpAPI (Optional but yield better performance):
```bash
JINA_API_KEY=your_jina_key
FIRECRAWL_API_KEY=your_firecrawl_key
SERPAPI_API_KEY=your_serpapi_key 
```

We are supporting image generation and video generation tool by Vertex AI (Optional, good for more creative output), to use this, you need to set up the following variables:
```bash
MEDIA_GCS_OUTPUT_BUCKET=gs://your_bucket_here
MEDIA_GCP_PROJECT_ID=your_vertex_project_id
MEDIA_GCP_LOCATION=your_vertex_location
```

Image Search Tool  (Optional, good for more beautiful output)
```
SERPAPI_API_KEY=your_serpapi_key 
```


## Installation

### Docker Installation (Recommended)

1. Clone the repository
2. Set up the 2 environment files as mentioned in the above step
3. If you are using Anthropic Client run
```
chmod +x start.sh stop.sh
./start.sh 
```
If you are using Vertex, run with these variables
```
GOOGLE_APPLICATION_CREDENTIALS=absolute-path-to-credential \
PROJECT_ID=project-id \
REGION=region \
./start.sh
```
*Note: Due to a bug in the latest docker, if you receive and error, try running with `--force-recreate`. For example `./start.sh --force-recreate `*

After running start.sh, you can check your application at: localhost:3000

Run `./stop.sh` to tear down the service.

### Manual Installation
1. Clone the repository
2. Set up Python environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -e .
   ```

3. Set up frontend (optional):
   ```bash
   cd frontend
   npm install
   ```

### Command Line Interface

If you want to use anthropic client, set `ANTHROPIC_API_KEY` in `.env` file and run:
```bash
python cli.py 
```

If you want to use vertex, set `GOOGLE_APPLICATION_CREDENTIALS` and run:
```bash
GOOGLE_APPLICATION_CREDENTIALS=path-to-your-credential
python cli.py --project-id YOUR_PROJECT_ID --region YOUR_REGION
```

Options:
- `--project-id`: Google Cloud project ID
- `--region`: Google Cloud region (e.g., us-east5)
- `--workspace`: Path to the workspace directory (default: ./workspace)
- `--needs-permission`: Require permission before executing commands
- `--minimize-stdout-logs`: Reduce the amount of logs printed to stdout

### Web Interface

1. Start the WebSocket server:

When using Anthropic client:
```bash
python ws_server.py --port 8000
```

When using Vertex:
```bash
GOOGLE_APPLICATION_CREDENTIALS=path-to-your-credential \
python ws_server.py --port 8000 --project-id YOUR_PROJECT_ID --region YOUR_REGION
```

2. Start the frontend (in a separate terminal):

```bash
cd frontend
npm run dev
```

3. Open your browser to http://localhost:3000

## Project Structure

- `cli.py`: Command-line interface
- `ws_server.py`: WebSocket server for the frontend
- `src/ii_agent/`: Core agent implementation
  - `agents/`: Agent implementations
  - `llm/`: LLM client interfaces
  - `tools/`: Tool implementations
  - `utils/`: Utility functions

## Conclusion

The II-Agent framework, architected around the reasoning capabilities of large language models like Claude 4.0 Sonnet or Gemini 2.5 Pro, presents a comprehensive and robust methodology for building versatile AI agents. Through its synergistic combination of a powerful LLM, a rich set of execution capabilities, an explicit mechanism for planning and reflection, and intelligent context management strategies, II-Agent is well-equipped to address a wide spectrum of complex, multi-step tasks. Its open-source nature and extensible design provide a strong foundation for continued research and development in the rapidly evolving field of agentic AI.

## Acknowledgement

We would like to express our sincere gratitude to the following projects and individuals for their invaluable contributions that have helped shape this project:

- **AugmentCode**: We have incorporated and adapted several key components from the [AugmentCode project](https://github.com/augmentcode/augment-swebench-agent). AugmentCode focuses on SWE-bench, a benchmark that tests AI systems on real-world software engineering tasks from GitHub issues in popular open-source projects. Their system provides tools for bash command execution, file operations, and sequential problem-solving capabilities designed specifically for software engineering tasks.

- **Manus**: Our system prompt architecture draws inspiration from Manus's work, which has helped us create more effective and contextually aware AI interactions.

- **Index Browser Use**: We have built upon and extended the functionality of the [Index Browser Use project](https://github.com/lmnr-ai/index/tree/main), particularly in our web interaction and browsing capabilities. Their foundational work has enabled us to create more sophisticated web-based agent behaviors.

We are committed to open source collaboration and believe in acknowledging the work that has helped us build this project. If you feel your work has been used in this project but hasn't been properly acknowledged, please reach out to us.