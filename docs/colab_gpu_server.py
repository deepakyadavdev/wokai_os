"""
WokAI OS - Fast Google Colab GPU Model Server (Lightweight 4-bit)
==================================================================
This lightweight script uses pre-quantized 4-bit weights (`unsloth/Qwen2.5-7B-Instruct-bnb-4bit`).
- Download Size: ~4.3 GB (instead of 15.2 GB!)
- CPU RAM Usage: < 4.5 GB (Zero RAM Red Line!)
- Load Time: < 30 seconds on Google Colab T4 GPU.

Requirements in Colab cell:
!pip install -q torch transformers bitsandbytes fastapi uvicorn pydantic nest_asyncio requests
"""

import os
import time
import datetime
import torch
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import uvicorn
import nest_asyncio
from threading import Thread

app = FastAPI(title="WokAI Fast GPU Model Server")

# Pre-quantized 4-bit model: Only ~4.3 GB download, runs lightning fast on Colab T4 GPU!
MODEL_ID = "unsloth/Qwen2.5-7B-Instruct-bnb-4bit"

print(f"🚀 Fast Loading Pre-Quantized Model: {MODEL_ID} on Nvidia T4 GPU...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    device_map="auto",
    trust_remote_code=True,
    torch_dtype=torch.float16
)

HEARTBEAT_ACTIVE = True

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 1024
    temperature: float = 0.3

class GenerateResponse(BaseModel):
    text: str

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "model": MODEL_ID,
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "heartbeatActive": HEARTBEAT_ACTIVE
    }

@app.get("/ping")
def ping():
    return {
        "status": "alive",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "gpu_memory_used_mb": torch.cuda.memory_allocated() / (1024 * 1024) if torch.cuda.is_available() else 0
    }

@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    try:
        messages = [
            {"role": "system", "content": "You are WokAI OS Core Model Server. Output strictly valid JSON format when requested."},
            {"role": "user", "content": req.prompt}
        ]
        
        prompt_text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        inputs = tokenizer(prompt_text, return_tensors="pt").to("cuda")
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=req.max_tokens,
                temperature=req.temperature,
                do_sample=req.temperature > 0,
                pad_token_id=tokenizer.eos_token_id
            )
            
        generated_tokens = outputs[0][inputs.input_ids.shape[1]:]
        generated_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)
        
        return GenerateResponse(text=generated_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def keep_alive_loop():
    """Background heartbeat loop to prevent Colab runtime from disconnecting due to inactivity."""
    while True:
        if HEARTBEAT_ACTIVE:
            try:
                requests.get("http://localhost:8000/ping", timeout=5)
                print(f"💓 [Colab Heartbeat Ping] Runtime active at {datetime.datetime.now().strftime('%H:%M:%S')}")
            except Exception:
                pass
        time.sleep(30)

def run_server():
    nest_asyncio.apply()
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    server_thread = Thread(target=run_server, daemon=True)
    server_thread.start()

    heartbeat_thread = Thread(target=keep_alive_loop, daemon=True)
    heartbeat_thread.start()
    
    print("\n✅ Fast WokAI Model Server & Heartbeat Loop running on port 8000!")
    print("🌐 Run in Colab next cell to expose public URL:")
    print("!npx -y localtunnel --port 8000")
    print("OR using Cloudflare Tunnel:")
    print("!wget -q -O cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x cloudflared && ./cloudflared tunnel --url http://localhost:8000")
