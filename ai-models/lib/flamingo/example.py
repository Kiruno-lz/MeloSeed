#!/opt/miniconda3/envs/flamingo/bin/python
import os
import torch
import transformers.models.musicflamingo.modeling_musicflamingo
from torch.amp import autocast

# --- Monkeypatch for MPS compatibility ---
# MPS does not support float64, which is used by default in apply_rotary_emb.
# We patch it to use float32 on MPS devices, but keep computations in appropriate precision.

# Helper function needed for apply_rotary_emb
def rotate_half(x):
    x = x.reshape(*x.shape[:-1], -1, 2)
    x1, x2 = x.unbind(dim=-1)
    x = torch.stack((-x2, x1), dim=-1)
    return x.flatten(-2)

@autocast("mps", enabled=False)
def apply_rotary_emb_patched(freqs, t, start_index=0, scale=1.0, seq_dim=-2):
    ori_dtype = t.dtype
    # Use float32 instead of float64 if on MPS
    if t.device.type == "mps":
        embed_dtype = torch.float32
    else:
        embed_dtype = torch.float64
        
    t = t.to(embed_dtype)
    if t.ndim == 3:
        seq_len = t.shape[seq_dim]
        if freqs.ndim == 2:
            freqs = freqs[-seq_len:].to(t)
        else:
            freqs = freqs.to(t)

    rot_dim = freqs.shape[-1]
    end_index = start_index + rot_dim

    assert rot_dim <= t.shape[-1], (
        f"feature dimension {t.shape[-1]} is not of sufficient size to rotate in all the positions {rot_dim}"
    )

    t_left, t, t_right = t[..., :start_index], t[..., start_index:end_index], t[..., end_index:]
    t = (t * freqs.cos() * scale) + (rotate_half(t) * freqs.sin() * scale)
    return torch.cat((t_left, t, t_right), dim=-1).to(ori_dtype)

# Apply the patch
transformers.models.musicflamingo.modeling_musicflamingo.apply_rotary_emb = apply_rotary_emb_patched
transformers.models.musicflamingo.modeling_musicflamingo.rotate_half = rotate_half

# --- Main Script ---

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# print("Current working directory:", os.getcwd())

from transformers import MusicFlamingoForConditionalGeneration, AutoProcessor

model_id = "../ckpt/music-flamingo-2601-hf"
processor = AutoProcessor.from_pretrained(model_id)

# Load model in float16 to save memory and improve speed on MPS
# This avoids the default bfloat16 which might be slower or emulated on some MPS versions
model = MusicFlamingoForConditionalGeneration.from_pretrained(
    model_id, 
    device_map="auto",
    torch_dtype=torch.float16
)

conversation = [
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "Describe this track in full detail - tell me the genre, tempo, and key, then dive into the instruments, production style, and overall mood it creates."},
            # {"type": "audio", "path": "https://huggingface.co/datasets/nvidia/AudioSkills/resolve/main/assets/song_1.mp3"},
            {"type": "audio", "path": "/Users/kiruno/Documents/_code/vibe/MeloSeed/public/assets/music_long.mp3"},
        ],
    }
]

inputs = processor.apply_chat_template(
    conversation,
    tokenize=True,
    add_generation_prompt=True,
    return_dict=True,
).to(model.device)

# Ensure inputs are in the same dtype as the model (float16)
# This is crucial for performance and to avoid type mismatch errors
for k, v in inputs.items():
    if isinstance(v, torch.Tensor) and v.is_floating_point():
        inputs[k] = v.to(dtype=model.dtype)

outputs = model.generate(**inputs, max_new_tokens=500)

decoded_outputs = processor.batch_decode(outputs[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)
print(decoded_outputs)
