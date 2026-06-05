import os
import sys
import json
import urllib.request
import urllib.error
import zipfile

OWNER = "MrResolution"
REPO = "Os_capstone-CPU-scheduling-sim-"
ARTIFACT_NAME = "cpusim-deb-package"
ENV_FILE = ".env"

def get_token():
    # Try reading from environment variable or .env file
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        return token
        
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r") as f:
            for line in f:
                if line.startswith("GITHUB_TOKEN="):
                    return line.strip().split("=", 1)[1]
                    
    print("\n==========================================================================")
    print("To download the build artifact from GitHub, you need a GitHub Personal Access Token (PAT).")
    print("You can generate one quickly at: https://github.com/settings/tokens")
    print("Ensure you grant it 'repo' (for private) or 'actions' (read) permissions.")
    print("==========================================================================\n")
    token = input("Enter your GitHub Personal Access Token (PAT): ").strip()
    if token:
        with open(ENV_FILE, "a") as f:
            f.write(f"\nGITHUB_TOKEN={token}\n")
        return token
    return None

def fetch_json(url, token):
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "Python-urllib")
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        if e.code in [401, 403]:
            print("Auth failed. Check if your token is valid and has correct permissions.")
        return None
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def download_artifact(url, token, dest_path):
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("User-Agent", "Python-urllib")
    
    print("Downloading artifact zip file...")
    try:
        with urllib.request.urlopen(req) as response:
            with open(dest_path, "wb") as f:
                f.write(response.read())
        print("Download completed successfully.")
        return True
    except Exception as e:
        print(f"Failed to download: {e}")
        return False

def main():
    token = get_token()
    if not token:
        print("GitHub token is required to proceed.")
        return
        
    print("Checking for latest workflow runs...")
    runs_url = f"https://api.github.com/repos/{OWNER}/{REPO}/actions/runs"
    runs_data = fetch_json(runs_url, token)
    if not runs_data or not runs_data.get("workflow_runs"):
        print("No workflow runs found.")
        return
        
    # Find the most recent run for Build Linux .deb Package
    target_run = None
    for run in runs_data["workflow_runs"]:
        if "Build Linux" in run["name"] or "build-linux" in run.get("path", ""):
            target_run = run
            break
            
    if not target_run:
        print("No build-linux workflow run found.")
        return
        
    print(f"Found workflow run #{target_run['run_number']} (Status: {target_run['status']}, Conclusion: {target_run['conclusion']})")
    
    if target_run["status"] != "completed":
        print("The workflow run is still in progress on GitHub. Please wait a minute and run this script again.")
        return
        
    if target_run["conclusion"] != "success":
        print(f"The workflow run finished with conclusion: {target_run['conclusion']}. Check the logs on GitHub.")
        return
        
    # Get artifacts for this run
    artifacts_url = target_run["artifacts_url"]
    artifacts_data = fetch_json(artifacts_url, token)
    if not artifacts_data or not artifacts_data.get("artifacts"):
        print("No artifacts found for this run.")
        return
        
    target_artifact = None
    for artifact in artifacts_data["artifacts"]:
        if artifact["name"] == ARTIFACT_NAME:
            target_artifact = artifact
            break
            
    if not target_artifact:
        print(f"Artifact '{ARTIFACT_NAME}' not found.")
        return
        
    # Create release directory
    os.makedirs("release", exist_ok=True)
    zip_path = os.path.join("release", "deb_package.zip")
    
    # Download zip file
    download_url = target_artifact["archive_download_url"]
    if download_artifact(download_url, token, zip_path):
        print("Extracting package...")
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall("release")
            print("Extraction completed.")
            os.remove(zip_path)
            
            print("\nFiles in release folder:")
            found_any = False
            for f in os.listdir("release"):
                if f.endswith(".deb"):
                    print(f" -> release/{f} (Ready!)")
                    found_any = True
            if not found_any:
                print(" No .deb files found in extraction output.")
        except Exception as e:
            print(f"Failed to extract files: {e}")

if __name__ == "__main__":
    main()
