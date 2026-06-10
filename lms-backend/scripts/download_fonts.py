import os
import urllib.request

def download_fonts():
    font_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "assets", "fonts"))
    os.makedirs(font_dir, exist_ok=True)
    
    fonts = {
        "Roboto-Regular.ttf": "https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf",
        "Roboto-Bold.ttf": "https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf"
    }
    
    for filename, url in fonts.items():
        dest_path = os.path.join(font_dir, filename)
        if not os.path.exists(dest_path):
            print(f"Downloading {filename} from {url}...")
            try:
                urllib.request.urlretrieve(url, dest_path)
                print(f"Downloaded {filename} to {dest_path}")
            except Exception as e:
                print(f"Failed to download {filename}: {e}")
        else:
            print(f"{filename} already exists at {dest_path}")

if __name__ == "__main__":
    download_fonts()
