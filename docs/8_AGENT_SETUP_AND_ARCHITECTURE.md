# WokAI OS - 8-Agent Setup, Architecture & Testing Guide

This document provides a comprehensive step-by-step guide to starting, configuring, and testing the **8-Agent Workflow System** and **Google Colab GPU Model Server**, along with the architectural rationale for how Vercel Serverless Functions interact with GPU inference servers.

---

## 🏗️ Architectural Overview & Why Vercel is NOT Used for AI Model Running

### The Problem: Vercel Serverless Limits
1. **No GPU Access**: Vercel Serverless Functions run on standard CPU-only AWS Lambda / Vercel Edge compute. They do not possess Nvidia GPUs required to load 7B–8B open-source AI models into VRAM.
2. **Package & Memory Limits**: Vercel Serverless Functions have a maximum uncompressed deployment limit of **250 MB**. Open-source 7B parameter models (such as `Qwen2.5-7B-Instruct` or `Llama-3.1-8B`) are **~4.5 GB to 15 GB** in size.
3. **Execution Timeouts**: Vercel Hobby/Pro serverless functions have strict execution timeout limits (10s to 60s max).

### The Solution: Hybrid Conductor Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   VERCEL SERVERLESS FUNCTION                │
│                 (Lightweight API Orchestrator)              │
│                                                             │
│  • Manages 8-Agent Pipeline State                           │
│  • Executes GCP Web APIs (Docs, Gmail, Calendar, Drive)     │
│  • Holds Google OAuth & Firebase Security Credentials       │
│  • Streams Live Execution Logs to User Browser UI           │
└──────────────────────────────┬──────────────────────────────┘
                               │
               (HTTP POST /generate over Tunnel)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             GOOGLE COLAB / LIGHTNING AI GPU SERVER          │
│                (Dedicated Nvidia T4 GPU - 16GB VRAM)        │
│                                                             │
│  • Runs Qwen2.5-7B-Instruct / Llama-3.1-8B (4-bit NF4)       │
│  • Performs fast 7B Model Prompt & JSON Generation          │
│  • Runs Anti-Shutdown Keep-Alive Heartbeat Daemon           │
└─────────────────────────────────────────────────────────────┘
```

- **Vercel Serverless Functions** handle the **API Conductor** role: fast request streaming, security, GCP API integrations (Google Docs, Gmail, Calendar, Drive), and subagent coordination.
- **Google Colab / Lightning AI** handles the **GPU Heavy Lifting**: loading and running 7B open-source models on an Nvidia T4 GPU.

---

## ⚡ The 8-Agent Execution Pipeline

1. **`YOUGYE`** *(Sufficiency & Memory Agent)*: Evaluates prompt completeness. If information is missing, asks clarifying questions and saves context in memory.
2. **`TIVERE`** *(Fast Ack Agent)*: Dispatches instant user acknowledgement (*"Starting subtask execution now..."*).
3. **`VICHAR`** *(Task Decomposition Agent)*: Decomposes the goal into ranked subtasks (`#1`, `#2`, ...).
4. **`DRISTHI`** *(Tool Synthesizer Agent)*: Maps subtasks to GCP APIs (Docs, Gmail, Calendar, Drive) and synthesizes tool parameters.
5. **`KRIYA`** *(GCP API Execution Agent)*: Runs GCP API handlers directly on Vercel Serverless Functions using Sahayata's drafted payloads.
6. **`SAHAYATA`** *(Content Generator Agent)*: Synthesizes detailed text bodies (document body, email text) in parallel with Kriya.
7. **`MULYE`** *(Audit & Progress Agent)*: Evaluates subtask execution status and broadcasts progress reports.
8. **`SAMPARN`** *(Final Presentation Agent)*: Formulates the final summary report and presents results to the user.

---

## 🚀 Step-by-Step Setup & Testing Guide

### Step 1: Start WokAI OS Local App
Open your local terminal in the project directory:
```bash
npm run dev
```
The app will be live at `http://localhost:3000`.

---

### Step 2: Configure Google Colab GPU Server

1. Open [Google Colab](https://colab.research.google.com/).
2. Select **Runtime > Change runtime type**, choose **T4 GPU**, and click **Save**.
3. Create **Cell 1** to install dependencies:
```bash
!pip install -q torch transformers bitsandbytes fastapi uvicorn pydantic nest_asyncio requests
```
4. Create **Cell 2** and paste the server script from `docs/colab_gpu_server.py`:
```python
import os, time, datetime, torch, requests, uvicorn, nest_asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from threading import Thread

app = FastAPI(title="WokAI GPU Model Server")
# Pre-quantized 4-bit model: Only ~4.3 GB download, runs lightning fast without RAM limits!
MODEL_ID = "unsloth/Qwen2.5-7B-Instruct-bnb-4bit"

print(f"🚀 Loading {MODEL_ID} on T4 GPU...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, device_map="auto", trust_remote_code=True, torch_dtype=torch.float16)

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 1024
    temperature: float = 0.3

class GenerateResponse(BaseModel):
    text: str

@app.get("/")
def health(): return {"status": "ok", "model": MODEL_ID}

@app.get("/ping")
def ping(): return {"status": "alive", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}

@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    messages = [{"role": "system", "content": "You are WokAI OS Core Model Server."}, {"role": "user", "content": req.prompt}]
    prompt_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt_text, return_tensors="pt").to("cuda")
    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=req.max_tokens, temperature=req.temperature)
    return GenerateResponse(text=tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True))

def keep_alive_loop():
    while True:
        try: requests.get("http://localhost:8000/ping", timeout=5)
        except: pass
        time.sleep(30)

Thread(target=lambda: uvicorn.run(app, host="0.0.0.0", port=8000), daemon=True).start()
Thread(target=keep_alive_loop, daemon=True).start()
print("✅ Server & Heartbeat running on port 8000!")
```
5. Create **Cell 3** to launch public tunnel (Option A: LocalTunnel with `-y` auto-confirm):
```bash
!npx -y localtunnel --port 8000
```
*Or Option B: Cloudflare Tunnel (100% auto-start, no password prompt)*:
```bash
!wget -q -O cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x cloudflared
!./cloudflared tunnel --url http://localhost:8000
```
Copy the public URL generated (e.g. `https://xxxx.trycloudflare.com` or `https://xxxx.loca.lt`).

---

### Step 3: Link Public GPU URL to WokAI OS

In your project `.env.local` file (or Vercel Project Environment Variables):
```env
MODEL_SERVER_URL=https://bright-swans-sing.loca.lt
```

---

### Step 4: Testing & Verification

#### Test A: Verify GPU Heartbeat Control
1. Open `http://localhost:3000/settings`.
2. Find the **Google Colab GPU Heartbeat** card.
3. Verify live pings incrementing every 25 seconds.
4. Click **Stop Heartbeat** to pause, and **Start Heartbeat** to resume.

#### Test B: Verify 8-Agent Execution Flow
1. Open `http://localhost:3000/chat`.
2. Submit a request:
   > *"Create a document on AI trends in 2026 and email a summary to my team"*
3. Verify all 8 agents in the Work Conductor Execution Log:
   - `YOUGYE` (Context Check)
   - `TIVERE` (Fast Ack)
   - `VICHAR` (Task Breakdown)
   - `DRISTHI` (GCP Tool Selection)
   - `KRIYA` & `SAHAYATA` (API Execution & Content Payload)
   - `MULYE` (Audit Verification)
   - `SAMPARN` (Final Synthesis Report)
