from typing import Literal
from typing import Literal
from tenacity import retry, wait_exponential, stop_after_attempt
from tenacity import retry, wait_exponential, stop_after_attempt
'\nPersonalized Learning Demo - Cloud Run + Firebase Hosting Deployment\n\nThis script deploys the demo to Cloud Run and configures Firebase Hosting\nto route traffic to it, providing a clean URL for internal sharing.\n\nAuthentication:\n  Uses Identity-Aware Proxy (IAP) for Google-managed authentication.\n  Users must sign in with their Google account to access the demo.\n\nPrerequisites:\n  - gcloud CLI installed and authenticated\n  - firebase CLI installed (npm install -g firebase-tools)\n  - Firebase project linked to your GCP project\n  - OAuth consent screen configured (script will guide you)\n\nRequired environment variables:\n  GOOGLE_CLOUD_PROJECT - Your GCP project ID\n\nOptional environment variables:\n  AGENT_ENGINE_PROJECT_NUMBER - Project number for Agent Engine\n  AGENT_ENGINE_RESOURCE_ID - Resource ID of deployed agent\n  IAP_ALLOWED_USERS - Comma-separated list of allowed user emails\n  IAP_ALLOWED_DOMAIN - Domain to allow (e.g., "google.com")\n\nUsage:\n  python deploy_hosting.py                      # Deploy everything\n  python deploy_hosting.py --cloud-run-only     # Deploy only Cloud Run\n  python deploy_hosting.py --firebase-only      # Deploy only Firebase Hosting\n  python deploy_hosting.py --service-name NAME  # Custom service name\n  python deploy_hosting.py --allow-domain google.com  # Allow domain access\n'
import os
import sys
import json
import shutil
import argparse
import subprocess
import time
from pathlib import Path
DEFAULT_SERVICE_NAME = 'enriq-portfolio-agent'
DEFAULT_REGION = 'us-central1'

def run_command(cmd: list[str], check: bool=True, capture: bool=False) -> subprocess.CompletedProcess:
    """Run a shell command and optionally capture output."""
    print(f"  → {' '.join(cmd)}")
    return subprocess.run(cmd, check=check, capture_output=capture, text=True)

def get_project_id() -> str:
    """Get GCP project ID from environment or gcloud config."""
    project_id = os.environ.get('GOOGLE_CLOUD_PROJECT')
    if project_id:
        return project_id
    result = run_command(['gcloud', 'config', 'get-value', 'project'], check=False, capture=True)
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip()
    return None

def check_prerequisites() -> dict:
    """Check that required tools are installed."""
    tools = {}
    result = run_command(['gcloud', '--version'], check=False, capture=True)
    tools['gcloud'] = result.returncode == 0
    result = run_command(['firebase', '--version'], check=False, capture=True)
    tools['firebase'] = result.returncode == 0
    return tools

def prepare_build_context(demo_dir: Path) -> Path:
    """
    Prepare the build context by copying the A2UI dependency.
    Returns the path to the prepared directory.
    """
    print('\nPreparing build context...')
    a2ui_source = demo_dir / 'renderers' / 'lit'
    a2ui_dest = demo_dir / 'a2ui-web-lib'
    if not a2ui_source.exists():
        print(f'ERROR: A2UI web-lib not found at {a2ui_source}')
        sys.exit(1)
    if a2ui_dest.exists():
        print(f'  Removing old {a2ui_dest}')
        shutil.rmtree(a2ui_dest)
    print(f'  Copying {a2ui_source} → {a2ui_dest}')
    shutil.copytree(a2ui_source, a2ui_dest, ignore=shutil.ignore_patterns('node_modules', '.git'))
    print('  Build context ready')
    return demo_dir

def cleanup_build_context(demo_dir: Path):
    """Remove the temporary A2UI copy after deployment."""
    a2ui_dest = demo_dir / 'a2ui-web-lib'
    if a2ui_dest.exists():
        print(f'\nCleaning up {a2ui_dest}')
        shutil.rmtree(a2ui_dest)

def deploy_cloud_run(project_id: str, service_name: str, region: str, min_instances: str='0') -> str:
    """Deploy the frontend + API server to Cloud Run."""
    print('\n' + '=' * 60)
    print('DEPLOYING TO CLOUD RUN')
    print('=' * 60)
    demo_dir = Path(__file__).parent.resolve()
    print(f'\nProject: {project_id}')
    print(f'Service: {service_name}')
    print(f'Region: {region}')
    print(f'Source: {demo_dir}')
    print('\nEnabling required APIs...')
    run_command(['gcloud', 'services', 'enable', 'run.googleapis.com', 'cloudbuild.googleapis.com', 'artifactregistry.googleapis.com', 'iap.googleapis.com', 'aiplatform.googleapis.com', '--project', project_id, '--quiet'], check=False)
    print('\nConfiguring IAM permissions for Cloud Build...')
    result = run_command(['gcloud', 'projects', 'describe', project_id, '--format', 'value(projectNumber)'], capture=True, check=False)
    project_number = result.stdout.strip() if result.returncode == 0 else None
    if project_number:
        compute_sa = f'{project_number}-compute@developer.gserviceaccount.com'
        run_command(['gcloud', 'projects', 'add-iam-policy-binding', project_id, '--member', f'serviceAccount:{compute_sa}', '--role', 'roles/storage.objectViewer', '--condition', 'None', '--quiet'], check=False)
        run_command(['gcloud', 'projects', 'add-iam-policy-binding', project_id, '--member', f'serviceAccount:{compute_sa}', '--role', 'roles/logging.logWriter', '--condition', 'None', '--quiet'], check=False)
        cloudbuild_sa = f'{project_number}@cloudbuild.gserviceaccount.com'
        run_command(['gcloud', 'projects', 'add-iam-policy-binding', project_id, '--member', f'serviceAccount:{cloudbuild_sa}', '--role', 'roles/storage.objectViewer', '--condition', 'None', '--quiet'], check=False)
        run_command(['gcloud', 'projects', 'add-iam-policy-binding', project_id, '--member', f'serviceAccount:{cloudbuild_sa}', '--role', 'roles/artifactregistry.writer', '--condition', 'None', '--quiet'], check=False)
        print('\nGranting Vertex AI permissions to Cloud Run service account...')
        run_command(['gcloud', 'projects', 'add-iam-policy-binding', project_id, '--member', f'serviceAccount:{compute_sa}', '--role', 'roles/aiplatform.user', '--condition', 'None', '--quiet'], check=False)
    print('Waiting for API and IAM permissions to propagate (30 seconds)...')
    time.sleep(30)
    prepare_build_context(demo_dir)
    try:
        agent_project_number = os.environ.get('AGENT_ENGINE_PROJECT_NUMBER', '')
        agent_resource_id = os.environ.get('AGENT_ENGINE_RESOURCE_ID', '')
        env_vars = [f'GOOGLE_CLOUD_PROJECT={project_id}', f'GOOGLE_CLOUD_LOCATION={region}']
        if agent_project_number:
            env_vars.append(f'AGENT_ENGINE_PROJECT_NUMBER={agent_project_number}')
        if agent_resource_id:
            env_vars.append(f'AGENT_ENGINE_RESOURCE_ID={agent_resource_id}')
        cmd = ['gcloud', 'run', 'deploy', service_name, '--source', str(demo_dir), '--region', region, '--project', project_id, '--allow-unauthenticated', '--memory', '1Gi', '--timeout', '300', '--min-instances', min_instances, '--quiet']
        for env_var in env_vars:
            cmd.extend(['--set-env-vars', env_var])
        run_command(cmd)
        result = run_command(['gcloud', 'run', 'services', 'describe', service_name, '--region', region, '--project', project_id, '--format', 'value(status.url)'], capture=True)
        service_url = result.stdout.strip()
        print(f'\nCloud Run URL: {service_url}')
        return service_url
    finally:
        cleanup_build_context(demo_dir)

def configure_iap_access(project_id: str, service_name: str, region: str, allowed_users: list[str]=None, allowed_domain: str=None):
    """
    Configure IAP access for the Cloud Run service.

    For Cloud Run, IAP works through Cloud Run's built-in IAM.
    We grant the 'Cloud Run Invoker' role to allowed users/domains.

    Args:
        project_id: GCP project ID
        service_name: Cloud Run service name
        region: GCP region
        allowed_users: List of user emails to grant access
        allowed_domain: Domain to grant access (e.g., "google.com")
    """
    print('\n' + '=' * 60)
    print('CONFIGURING IAP ACCESS')
    print('=' * 60)
    members_to_add = []
    if allowed_users:
        for user in allowed_users:
            members_to_add.append(f'user:{user}')
            print(f'  Adding user: {user}')
    if allowed_domain:
        members_to_add.append(f'domain:{allowed_domain}')
        print(f'  Adding domain: {allowed_domain}')
    if not members_to_add:
        print('\n  No users or domain specified for IAP access.')
        print('  The service will be protected but no one can access it yet.')
        print('\n  To grant access later, use:')
        print(f'    gcloud run services add-iam-policy-binding {service_name} \\')
        print(f"      --region={region} --member='user:EMAIL' --role='roles/run.invoker'")
        print(f'\n  Or for a domain:')
        print(f'    gcloud run services add-iam-policy-binding {service_name} \\')
        print(f"      --region={region} --member='domain:DOMAIN' --role='roles/run.invoker'")
        return
    for member in members_to_add:
        print(f'\n  Granting Cloud Run Invoker to {member}...')
        run_command(['gcloud', 'run', 'services', 'add-iam-policy-binding', service_name, '--region', region, '--project', project_id, '--member', member, '--role', 'roles/run.invoker', '--quiet'], check=False)
    print('\n  IAP access configured successfully.')

def update_firebase_config(service_name: str, region: str):
    """Update firebase.json with the correct service configuration."""
    firebase_json_path = Path(__file__).parent / 'firebase.json'
    config = {'hosting': {'public': 'public', 'ignore': ['firebase.json', '**/.*', '**/node_modules/**'], 'rewrites': [{'source': '**', 'run': {'serviceId': service_name, 'region': region}}]}}
    with open(firebase_json_path, 'w') as f:
        json.dump(config, f, indent=2)
        f.write('\n')
    print(f'Updated {firebase_json_path}')

def update_firebaserc(project_id: str):
    """Update .firebaserc with the project ID."""
    firebaserc_path = Path(__file__).parent / '.firebaserc'
    config = {'projects': {'default': project_id}}
    with open(firebaserc_path, 'w') as f:
        json.dump(config, f, indent=2)
        f.write('\n')
    print(f'Updated {firebaserc_path}')

def deploy_firebase_hosting(project_id: str):
    """Deploy Firebase Hosting configuration."""
    print('\n' + '=' * 60)
    print('DEPLOYING FIREBASE HOSTING')
    print('=' * 60)
    print(f'\nProject: {project_id}')
    print()
    run_command(['firebase', 'deploy', '--only', 'hosting', '--project', project_id], check=True)

def main():
    parser = argparse.ArgumentParser(description='Deploy the Personalized Learning Demo to Cloud Run + Firebase Hosting')
    parser.add_argument('--project', type=str, default=None, help='GCP project ID (defaults to GOOGLE_CLOUD_PROJECT or gcloud config)')
    parser.add_argument('--service-name', type=str, default=DEFAULT_SERVICE_NAME, help=f'Cloud Run service name (default: {DEFAULT_SERVICE_NAME})')
    parser.add_argument('--region', type=str, default=DEFAULT_REGION, help=f'GCP region (default: {DEFAULT_REGION})')
    parser.add_argument('--cloud-run-only', action='store_true', help='Only deploy to Cloud Run, skip Firebase Hosting')
    parser.add_argument('--firebase-only', action='store_true', help='Only deploy Firebase Hosting (assumes Cloud Run is already deployed)')
    parser.add_argument('--allow-domain', type=str, default=os.environ.get('IAP_ALLOWED_DOMAIN'), help="Domain to allow access (e.g., 'google.com'). Also reads from IAP_ALLOWED_DOMAIN env var.")
    parser.add_argument('--allow-users', type=str, default=os.environ.get('IAP_ALLOWED_USERS'), help='Comma-separated list of user emails to allow. Also reads from IAP_ALLOWED_USERS env var.')
    parser.add_argument('--min-instances', type=str, default=os.environ.get('CLOUD_RUN_MIN_INSTANCES', '0'), help='Minimum number of Cloud Run instances (default: 0). Set to 1 to prevent cold starts.')
    args = parser.parse_args()
    project_id = args.project or get_project_id()
    if not project_id:
        print('ERROR: No project ID found.')
        print('Set GOOGLE_CLOUD_PROJECT environment variable or use --project flag')
        sys.exit(1)
    print('Checking prerequisites...')
    tools = check_prerequisites()
    if not args.firebase_only and (not tools['gcloud']):
        print('ERROR: gcloud CLI not found. Install from https://cloud.google.com/sdk')
        sys.exit(1)
    if not args.cloud_run_only and (not tools['firebase']):
        print('ERROR: firebase CLI not found. Install with: npm install -g firebase-tools')
        sys.exit(1)
    os.chdir(Path(__file__).parent)
    if not args.firebase_only:
        deploy_cloud_run(project_id, args.service_name, args.region, args.min_instances)
        if args.cloud_run_only and (args.allow_users or args.allow_domain):
            allowed_users = args.allow_users.split(',') if args.allow_users else None
            configure_iap_access(project_id, args.service_name, args.region, allowed_users=allowed_users, allowed_domain=args.allow_domain)
    if not args.cloud_run_only:
        update_firebase_config(args.service_name, args.region)
        update_firebaserc(project_id)
        deploy_firebase_hosting(project_id)
    print('\n' + '=' * 60)
    print('DEPLOYMENT COMPLETE')
    print('=' * 60)
    if not args.cloud_run_only:
        print(f'\n✅ Demo is live at: https://{project_id}.web.app')
        print(f'\nAccess is controlled by Firebase Authentication.')
        print(f'Users must sign in with a @google.com account (configurable in src/firebase-auth.ts).')
    if args.cloud_run_only:
        print(f'\nCloud Run service: {args.service_name}')
        print(f'Region: {args.region}')
        if args.allow_domain or args.allow_users:
            print(f'\nAuthentication: IAP-protected')
            if args.allow_domain:
                print(f'  Allowed domain: {args.allow_domain}')
            if args.allow_users:
                print(f'  Allowed users: {args.allow_users}')
        else:
            print(f'\n⚠️  Cloud Run deployed with --no-allow-unauthenticated.')
            print(f'   Grant access with: gcloud run services add-iam-policy-binding {args.service_name} \\')
            print(f"     --region={args.region} --member='user:EMAIL' --role='roles/run.invoker'")
    print()
if __name__ == '__main__':
    main()