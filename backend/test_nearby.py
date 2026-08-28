import urllib.request
import json
import sys
url = 'http://127.0.0.1:5000/api/vendors/nearby?lat=13.0827&lng=80.2707'
try:
    with urllib.request.urlopen(url, timeout=10) as r:
        data = json.load(r)
        print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print('ERROR', e, file=sys.stderr)
    sys.exit(1)
