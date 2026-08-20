import urllib.request
import json

data = json.dumps({"username":"admin","password":"admin123"}).encode('utf-8')
req = urllib.request.Request("http://localhost:8080/api/v1/auth/login", data=data, headers={'Content-Type': 'application/json'})
response = urllib.request.urlopen(req)
token = json.loads(response.read())['data']['accessToken']

req = urllib.request.Request("http://localhost:8080/api/v1/purchase-orders?size=20", headers={'Authorization': 'Bearer ' + token})
response = urllib.request.urlopen(req)
pos = json.loads(response.read())['data']['content']
po_id = pos[0]['id']

update_data = json.dumps({"completedGauges": 10, "rejectedGauges": 2, "scrappedGauges": 1}).encode('utf-8')
update_req = urllib.request.Request(f"http://localhost:8080/api/v1/purchase-orders/{po_id}", data=update_data, headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}, method='PUT')
update_res = urllib.request.urlopen(update_req)
print(json.dumps(json.loads(update_res.read())['data'], indent=2))


