"""Optional loopback-only cache for this exact public image, never an arbitrary proxy.

Use when a trusted workstation can download an official blob faster than the cloud.
Upload that blob as CACHE/<sha256 hex>.blob. Every file and manifest is hash checked.
No user credentials, Docker daemon settings, or existing containers are accessed.
"""
import argparse
import hashlib
import http.server
import json
import pathlib
import shutil
import threading
import urllib.request

REPO = 'mlikiowa/napcat-docker'
DIGEST = 'sha256:69c5ca84ec226d658d0d5cd19997c6c89169da3206faa2948c2dc67d669b6406'
API = 'https://registry-1.docker.io/v2/' + REPO
parser = argparse.ArgumentParser()
parser.add_argument('--cache', required=True)
parser.add_argument('--port', type=int, default=25000)
args = parser.parse_args()
cache = pathlib.Path(args.cache).resolve()
cache.mkdir(parents=True, exist_ok=True)

def fetch(route):
    # Anonymous public registry bearer; never print it or accept client-supplied URLs.
    with urllib.request.urlopen('https://auth.docker.io/token?service=registry.docker.io&scope=repository:'+REPO+':pull', timeout=30) as r:
        token = json.load(r)['token']
    req = urllib.request.Request(API+route, headers={'Authorization':'Bearer '+token, 'Accept':'application/vnd.docker.distribution.manifest.v2+json'})
    return urllib.request.urlopen(req, timeout=120)

manifest_file = cache / (DIGEST.split(':')[1]+'.manifest.json')
if manifest_file.exists():
    manifest = manifest_file.read_bytes()
else:
    with fetch('/manifests/'+DIGEST) as response:
        manifest = response.read()
assert 'sha256:'+hashlib.sha256(manifest).hexdigest() == DIGEST, 'Manifest hash mismatch'
metadata = json.loads(manifest)
blobs = {item['digest']:item for item in [metadata['config'], *metadata['layers']]}
locks = {digest:threading.Lock() for digest in blobs}
verified = set()

def blob_file(digest):
    with locks[digest]:
        dest = cache / (digest.split(':')[1]+'.blob')
        if digest in verified:
            return dest
        if not dest.exists():
            tmp = dest.with_suffix('.partial')
            with fetch('/blobs/'+digest) as source, tmp.open('wb') as out:
                shutil.copyfileobj(source, out, 1024*1024)
            tmp.replace(dest)
        h = hashlib.sha256()
        with dest.open('rb') as source:
            for chunk in iter(lambda:source.read(1024*1024), b''):
                h.update(chunk)
        if dest.stat().st_size != blobs[digest]['size'] or 'sha256:'+h.hexdigest() != digest:
            raise ValueError('Cached public blob does not match official manifest')
        verified.add(digest)
        return dest

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_HEAD(self):
        self.reply(False)

    def do_GET(self):
        self.reply(True)

    def reply(self, body):
        route = self.path.split('?',1)[0]
        try:
            file = None
            if route.rstrip('/') == '/v2':
                data, kind, digest = b'{}', 'application/json', None
            elif route == '/v2/'+REPO+'/manifests/'+DIGEST:
                data, kind, digest = manifest, metadata['mediaType'], DIGEST
            elif route.startswith('/v2/'+REPO+'/blobs/') and route.rsplit('/',1)[-1] in blobs:
                digest = route.rsplit('/',1)[-1]
                file, data, kind = blob_file(digest), None, 'application/octet-stream'
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type',kind)
            self.send_header('Content-Length',str(file.stat().st_size if file else len(data)))
            self.send_header('Docker-Distribution-Api-Version','registry/2.0')
            if digest:
                self.send_header('Docker-Content-Digest',digest)
            self.end_headers()
            if body:
                if file:
                    with file.open('rb') as source:
                        shutil.copyfileobj(source,self.wfile,1024*1024)
                else:
                    self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as error:
            print('Relay request failed: '+type(error).__name__, flush=True)
            self.send_error(502)

print('Fixed official manifest verified; serving loopback port '+str(args.port),flush=True)
http.server.ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
