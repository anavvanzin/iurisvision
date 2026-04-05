import os
import json
import torch
import clip
from PIL import Image
import numpy as np
from pathlib import Path

def generate_embeddings(image_dir: str, output_file: str, model_name: str = "ViT-B/32"):
    """
    Gera embeddings CLIP para todas as imagens em um diretório.
    
    Args:
        image_dir: Caminho para o diretório contendo as imagens do corpus.
        output_file: Caminho para salvar o arquivo JSON com os embeddings.
        model_name: Versão do modelo CLIP a ser utilizada.
    """
    # Configura o device (GPU se disponível, senão CPU)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[*] Inicializando CLIP ({model_name}) no device: {device}")
    
    # Carrega o modelo e a função de pré-processamento
    model, preprocess = clip.load(model_name, device=device)
    
    # Prepara os caminhos das imagens
    image_paths = list(Path(image_dir).glob("*.*"))
    valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    image_paths = [p for p in image_paths if p.suffix.lower() in valid_extensions]
    
    print(f"[*] Encontradas {len(image_paths)} imagens válidas em {image_dir}")
    
    embeddings_dict = {}
    
    # Desativa o cálculo de gradientes para inferência
    with torch.no_grad():
        for i, img_path in enumerate(image_paths):
            try:
                # Carrega e pré-processa a imagem
                image = Image.open(img_path).convert("RGB")
                image_input = preprocess(image).unsqueeze(0).to(device)
                
                # Gera as features da imagem
                image_features = model.encode_image(image_input)
                
                # Normaliza as features (L2 normalization) para facilitar o cálculo de similaridade por cosseno
                image_features /= image_features.norm(dim=-1, keepdim=True)
                
                # Converte para lista Python para serialização JSON
                embedding_list = image_features.cpu().numpy().flatten().tolist()
                
                # Armazena usando o nome do arquivo como chave
                embeddings_dict[img_path.name] = embedding_list
                
                if (i + 1) % 10 == 0:
                    print(f"    Processado {i + 1}/{len(image_paths)}...")
                    
            except Exception as e:
                print(f"[!] Erro ao processar {img_path.name}: {e}")
                
    # Garante que o diretório de saída exista
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Salva os embeddings em formato JSON
    print(f"[*] Salvando embeddings em {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(embeddings_dict, f, ensure_ascii=False, indent=2)
        
    print("[*] Concluído com sucesso!")

if __name__ == "__main__":
    # Caminhos padrão baseados na estrutura do IURIS VISIO
    # Ajuste conforme necessário ao rodar localmente
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    CORPUS_IMAGES_DIR = BASE_DIR / "corpus" / "images"
    OUTPUT_EMBEDDINGS_FILE = BASE_DIR / "data" / "processed" / "clip_embeddings.json"
    
    # Cria diretórios de teste caso não existam (para evitar erros na primeira execução)
    os.makedirs(CORPUS_IMAGES_DIR, exist_ok=True)
    
    generate_embeddings(
        image_dir=str(CORPUS_IMAGES_DIR),
        output_file=str(OUTPUT_EMBEDDINGS_FILE)
    )
