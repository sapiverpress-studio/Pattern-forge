import importlib, os, sys, time, tempfile, unittest
from pathlib import Path
from fastapi.testclient import TestClient

root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'knit-service'))
os.environ['KNIT_RENDER_TOKEN']='abcde0123456789abcde0123456789abcde'
os.environ['KNIT_DOWNLOAD_SIGNING_KEY']='fghij0123456789fghij0123456789fghij'
os.environ['KNIT_JOBS_PER_HOUR']='5'
import server

class LiveApiTests(unittest.TestCase):
    def setUp(self):
        with server._lock: server._jobs.clear();server._history.clear()
        self.client=TestClient(server.app)
        self.headers={'Authorization':'Bearer '+server.TOKEN}
    def test_auth_and_input(self):
        self.assertEqual(self.client.post('/v1/renders',json={}).status_code,401)
        self.assertEqual(self.client.post('/v1/renders',json={},headers={'Authorization':'Bearer nope'}).status_code,401)
        self.assertEqual(self.client.post('/v1/renders',json={'size':999999},headers=self.headers).status_code,422)
        self.assertEqual(self.client.post('/v1/renders',json={'colour':'bad'},headers=self.headers).status_code,422)
        self.assertTrue(self.client.get('/v1/health').json()['ok'])
    def test_queued_render_and_signed_download(self):
        orig=server.worker
        def fake(jid):
            with server._lock:
                job=server._jobs[jid]
                d=Path(tempfile.gettempdir())/f'knit-test-{jid}.png'
                d.write_bytes(b'\x89PNG\r\n\x1a\nunit-test-png')
                job.file=d
                job.status='ready'
        server.worker=fake
        try:
            response=self.client.post('/v1/renders',json={'size':5000,'gauge':'mega'},headers=self.headers)
            self.assertEqual(response.status_code,202)
            jid=response.json()['id'];self.assertEqual(len(jid),32)
            for i in range(100):
                job=self.client.get('/v1/renders/'+jid,headers=self.headers).json()
                if job['status']=='ready':break
                time.sleep(.01)
            self.assertEqual(job['status'],'ready')
            self.assertIn('download_url',job)
            url=job['download_url'].replace('http://testserver','')
            file=self.client.get(url)
            self.assertEqual(file.status_code,200)
            self.assertEqual(file.content[:8],b'\x89PNG\r\n\x1a\n')
            bad=self.client.get(url.replace('sig=','sig=abc'))
            self.assertEqual(bad.status_code,403)
        finally: server.worker=orig
    def test_capacity_and_fail_closed(self):
        with server._lock:
            server._history.extend([time.time()]*server.MAX_JOBS_PER_HOUR)
        self.assertEqual(self.client.post('/v1/renders',json={},headers=self.headers).status_code,429)
        prior=server.TOKEN
        try:
            server.TOKEN='short'
            self.assertEqual(self.client.post('/v1/renders',json={},headers=self.headers).status_code,503)
        finally:server.TOKEN=prior

if __name__=='__main__': unittest.main()
